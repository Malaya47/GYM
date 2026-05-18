import { Router, Response } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { transporter } from "../lib/mailer";
import {
  generateAgreementPdf,
  AgreementPdfData,
} from "../lib/generateAgreementPdf";

const router = Router();

function parseStartDate(value: unknown) {
  if (!value || typeof value !== "string") return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function computeEndDate(startDate: Date, duration: string): Date | null {
  const match = duration
    .toLowerCase()
    .trim()
    .match(/^(\d+)\s*(month|year|day|week)/);
  if (!match) return null;
  const num = parseInt(match[1]);
  const unit = match[2];
  const end = new Date(startDate);
  if (unit === "month") end.setMonth(end.getMonth() + num);
  else if (unit === "year") end.setFullYear(end.getFullYear() + num);
  else if (unit === "day") end.setDate(end.getDate() + num);
  else if (unit === "week") end.setDate(end.getDate() + num * 7);
  return end;
}

// ─── GET /api/membership/plans ──────────────────────────
// Public – list all active membership plans
router.get("/plans", async (_req, res: Response): Promise<void> => {
  try {
    const plans = await prisma.membershipPlan.findMany({
      where: { isActive: true },
      orderBy: { id: "asc" },
    });
    res.json({ plans });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch plans" });
  }
});

// ─── POST /api/membership/purchase ──────────────────────
// Auth required – user purchases a plan
router.post(
  "/purchase",
  requireAuth,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const {
        planId,
        additionalPlanIds,
        registrationFee,
        totalAmount,
        signatureDataUrl,
        registrationDetails,
        paymentFrequency,
      } = req.body;

      if (!planId) {
        res.status(400).json({ error: "planId is required" });
        return;
      }

      const plan = await prisma.membershipPlan.findUnique({
        where: { id: Number(planId) },
      });
      if (!plan || !plan.isActive) {
        res.status(404).json({ error: "Plan not found or inactive" });
        return;
      }

      // Validate and fetch additional plans
      const additionalIds: number[] = Array.isArray(additionalPlanIds)
        ? additionalPlanIds.map(Number).filter((n) => Number.isFinite(n))
        : [];

      let additionalPlans: (typeof plan)[] = [];
      if (additionalIds.length > 0) {
        additionalPlans = await prisma.membershipPlan.findMany({
          where: {
            id: { in: additionalIds },
            isActive: true,
            category: "ADDITIONAL",
          },
        });
        if (additionalPlans.length !== additionalIds.length) {
          res.status(400).json({
            error: "One or more additional plans are invalid or inactive",
          });
          return;
        }
      }

      // Check for existing pending/approved purchase
      const existing = await prisma.membershipPurchase.findFirst({
        where: {
          userId: req.userId,
          planId: Number(planId),
          status: { in: ["PENDING", "APPROVED"] },
        },
      });
      if (existing) {
        res.status(409).json({
          error: "You already have an active or pending purchase for this plan",
        });
        return;
      }

      const details =
        registrationDetails &&
        typeof registrationDetails === "object" &&
        !Array.isArray(registrationDetails)
          ? (registrationDetails as Record<string, unknown>)
          : {};

      // Validate startDate — required and must not be in the past
      const parsedStartDate = parseStartDate(details.startDate);
      if (!parsedStartDate) {
        res.status(400).json({ error: "A valid start date is required." });
        return;
      }
      const todayMidnight = new Date();
      todayMidnight.setHours(0, 0, 0, 0);
      if (parsedStartDate < todayMidnight) {
        res.status(400).json({ error: "Start date cannot be in the past." });
        return;
      }

      // Validate endDate is consistent with plan duration (if provided)
      const endDateStr =
        typeof details.endDate === "string" ? details.endDate : null;
      if (endDateStr) {
        const parsedEndDate = new Date(endDateStr);
        if (!Number.isNaN(parsedEndDate.getTime())) {
          const expectedEnd = computeEndDate(parsedStartDate, plan.duration);
          if (expectedEnd) {
            const diffDays =
              Math.abs(parsedEndDate.getTime() - expectedEnd.getTime()) /
              (1000 * 60 * 60 * 24);
            if (diffDays > 3) {
              res.status(400).json({
                error: "End date does not match the selected plan duration.",
              });
              return;
            }
          }
        }
      }

      const resolvedRegistrationFee =
        registrationFee !== undefined ? Number(registrationFee) : 0;

      const additionalTotal = additionalPlans.reduce(
        (sum, p) => sum + p.price,
        0,
      );

      const resolvedTotalAmount =
        totalAmount !== undefined
          ? Number(totalAmount)
          : plan.price + additionalTotal + resolvedRegistrationFee;

      const additionalNotes =
        additionalPlans.length > 0
          ? `Additional plans: ${additionalPlans.map((p) => `${p.name || p.duration} (${p.currency} ${p.price})`).join(", ")}`
          : null;

      const purchase = await prisma.membershipPurchase.create({
        data: {
          userId: req.userId as number,
          planId: Number(planId),
          additionalPlanIds: additionalIds,
          status: "PENDING",
          registrationFee: Number.isFinite(resolvedRegistrationFee)
            ? resolvedRegistrationFee
            : 0,
          totalAmount: Number.isFinite(resolvedTotalAmount)
            ? resolvedTotalAmount
            : plan.price + additionalTotal,
          startDate: parsedStartDate,
          endDate: endDateStr
            ? new Date(endDateStr)
            : computeEndDate(parsedStartDate, plan.duration),
          emergencyContact:
            typeof details.emergencyContact === "string"
              ? details.emergencyContact
              : null,
          address: typeof details.address === "string" ? details.address : null,
          acceptedAgreement: details.acceptedAgreement === true,
          acceptedTerms: details.acceptedTerms === true,
          signatureDataUrl:
            typeof signatureDataUrl === "string" ? signatureDataUrl : null,
          paymentFrequency:
            typeof paymentFrequency === "string" &&
            ["MONTHLY", "QUARTERLY", "YEARLY"].includes(paymentFrequency)
              ? paymentFrequency
              : "MONTHLY",
          registrationDetails: details as Prisma.InputJsonValue,
          notes: [
            `Registration fee: ${plan.currency} ${
              Number.isFinite(resolvedRegistrationFee)
                ? resolvedRegistrationFee
                : 0
            }`,
            details.startDate && endDateStr
              ? `Membership period: ${details.startDate} to ${endDateStr}`
              : details.startDate
                ? `Start date: ${details.startDate}`
                : null,
            additionalNotes,
            `Total submitted: ${plan.currency} ${
              Number.isFinite(resolvedTotalAmount)
                ? resolvedTotalAmount
                : plan.price + additionalTotal
            }`,
            signatureDataUrl ? "Signature captured: Yes" : null,
            Object.keys(details).length > 0
              ? `Registration details: ${JSON.stringify(details)}`
              : null,
          ]
            .filter(Boolean)
            .join("\n"),
        },
        include: { plan: true },
      });

      res.status(201).json({
        message: "Membership purchase submitted. Awaiting admin approval.",
        purchase: { ...purchase, additionalPlans },
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Purchase failed" });
    }
  },
);

// ─── GET /api/membership/my-purchases ───────────────────
// Auth required – user sees their own purchases
router.get(
  "/my-purchases",
  requireAuth,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const purchases = await prisma.membershipPurchase.findMany({
        where: { userId: req.userId },
        include: { plan: true },
        orderBy: { createdAt: "desc" },
      });
      res.json({ purchases });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch purchases" });
    }
  },
);

// ─── POST /api/membership/send-agreement-email ──────────
// Auth required – generate PDF and email signed agreement to user + gym owner
router.post(
  "/send-agreement-email",
  requireAuth,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const {
        contractNumber,
        customerNumber,
        memberName,
        email,
        phone,
        dateOfBirth,
        address,
        emergencyContact,
        planName,
        planDuration,
        planPrice,
        currency,
        additionalPlans,
        registrationFee,
        discountAmount,
        discountLabel,
        total,
        startDate,
        endDate,
        paymentFrequency,
        signatureDataUrl,
        guardianSignatureDataUrl,
        isMinor,
        contractImageBase64,
        contractPdfBase64,
      } = req.body as AgreementPdfData & {
        email: string;
        contractImageBase64?: string;
        contractPdfBase64?: string;
      };

      // Basic validation
      if (!email || !planName) {
        res.status(400).json({ error: "Missing required fields" });
        return;
      }

      let pdfBuffer: Buffer;

      if (contractPdfBase64 && typeof contractPdfBase64 === "string") {
        // Frontend generated a proper PDF via jspdf — decode and use directly
        const base64Data = contractPdfBase64.replace(/^data:application\/pdf;base64,/, "");
        pdfBuffer = Buffer.from(base64Data, "base64");
      } else if (contractImageBase64 && typeof contractImageBase64 === "string") {
        // Legacy: embed the JPEG screenshot of the contract page into a PDF using pdfkit
        const base64Data = contractImageBase64.replace(/^data:image\/jpeg;base64,/, "");
        const imgBuffer = Buffer.from(base64Data, "base64");

        // Parse JPEG dimensions from SOF marker
        const getJpegDims = (buf: Buffer): { w: number; h: number } => {
          let i = 2; // skip FFD8
          while (i < buf.length - 8) {
            if (buf[i] !== 0xff) break;
            const marker = buf[i + 1];
            if (marker === 0xc0 || marker === 0xc2) {
              return { h: buf.readUInt16BE(i + 5), w: buf.readUInt16BE(i + 7) };
            }
            i += 2 + buf.readUInt16BE(i + 2);
          }
          return { w: 1240, h: 1754 }; // A4 fallback at 150dpi
        };
        const { w: imgW, h: imgH } = getJpegDims(imgBuffer);

        pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const PDFDocument = require("pdfkit") as typeof import("pdfkit");
          const pageW = 595.28; // A4 width in points
          const pageH = 841.89; // A4 height in points
          const doc = new PDFDocument({ autoFirstPage: false, margin: 0 });
          const chunks: Buffer[] = [];
          doc.on("data", (c: Buffer) => chunks.push(c));
          doc.on("end", () => resolve(Buffer.concat(chunks)));
          doc.on("error", reject);

          const scaledFullH = (imgH / imgW) * pageW;
          if (scaledFullH <= pageH) {
            // Fits on one page
            doc.addPage({ size: [pageW, pageH] });
            doc.image(imgBuffer, 0, 0, { width: pageW });
          } else {
            // Split into A4 pages by offsetting the image vertically
            const pxPerPage = (pageH / pageW) * imgW;
            let yPx = 0;
            while (yPx < imgH) {
              doc.addPage({ size: [pageW, pageH] });
              const yPt = -(yPx / imgW) * pageW;
              doc.image(imgBuffer, 0, yPt, { width: pageW });
              yPx += pxPerPage;
            }
          }
          doc.end();
        });
      } else {
        // Fallback: generate a summary PDF server-side
        const submittedAt = new Date().toLocaleString("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
        const pdfData: AgreementPdfData = {
          contractNumber,
          customerNumber,
          memberName,
          email,
          phone,
          dateOfBirth,
          address,
          emergencyContact,
          planName,
          planDuration,
          planPrice: Number(planPrice) || 0,
          currency,
          additionalPlans: Array.isArray(additionalPlans) ? additionalPlans : [],
          registrationFee: Number(registrationFee) || 0,
          discountAmount: Number(discountAmount) || 0,
          discountLabel: discountLabel || "Discount",
          total: Number(total) || 0,
          startDate,
          endDate,
          paymentFrequency,
          signatureDataUrl: signatureDataUrl || "",
          guardianSignatureDataUrl,
          isMinor: Boolean(isMinor),
          submittedAt,
        };
        pdfBuffer = await generateAgreementPdf(pdfData);
      }

      const ownerEmail = process.env.OWNER_EMAIL;
      if (!ownerEmail) {
        res.status(500).json({ error: "Owner email not configured on server" });
        return;
      }

      const subject = `Membership Agreement – ${memberName} (${contractNumber})`;
      const bodyText =
        `A new membership agreement has been signed.\n\n` +
        `Member: ${memberName}\nEmail: ${email}\nContract No: ${contractNumber}\n` +
        `Plan: ${planName} (${planDuration})\nTotal: ${currency} ${total}\n` +
        `Start Date: ${startDate}\n\nPlease find the signed agreement attached.`;

      const attachment = {
        filename: `Agreement-${contractNumber}.pdf`,
        content: pdfBuffer,
        contentType: "application/pdf",
      };

      // Send to user
      await transporter.sendMail({
        from: `"Sentinators Gym" <${process.env.SMTP_USER}>`,
        to: email,
        subject,
        text:
          `Dear ${memberName},\n\nThank you for signing your membership agreement. ` +
          `Please find your signed agreement attached.\n\n` +
          `Contract No: ${contractNumber}\nPlan: ${planName}\nStart Date: ${startDate}\n\n` +
          `Welcome to Sentinators Gym! We look forward to seeing you.\n\nTeam Sentinators`,
        attachments: [attachment],
      });

      // Send to gym owner
      await transporter.sendMail({
        from: `"Sentinators Gym" <${process.env.SMTP_USER}>`,
        to: ownerEmail,
        subject,
        text: bodyText,
        attachments: [attachment],
      });

      res.json({ message: "Agreement emailed successfully" });
    } catch (err) {
      console.error("send-agreement-email error:", err);
      res.status(500).json({ error: "Failed to send agreement email" });
    }
  },
);

export default router;
