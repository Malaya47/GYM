import PDFDocument from "pdfkit";

export interface AgreementPdfData {
  contractNumber: string;
  customerNumber: string;
  memberName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  address: string;
  emergencyContact: string;
  planName: string;
  planDuration: string;
  planPrice: number;
  currency: string;
  additionalPlans: { name: string; duration: string; price: number }[];
  registrationFee: number;
  discountAmount: number;
  discountLabel: string;
  total: number;
  startDate: string;
  endDate: string;
  paymentFrequency: string;
  signatureDataUrl: string; // base64 data URL
  guardianSignatureDataUrl?: string;
  isMinor: boolean;
  submittedAt: string;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "-";
  const d = new Date(dateStr + "T00:00:00");
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function money(currency: string, amount: number): string {
  return `${currency} ${amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

export function generateAgreementPdf(data: AgreementPdfData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const red = "#b91c1c";
    const dark = "#111827";
    const gray = "#6b7280";

    // ── Header ──────────────────────────────────────────────
    doc.rect(0, 0, doc.page.width, 72).fill("#100a0a");

    doc
      .fillColor("#ef4444")
      .fontSize(16)
      .font("Helvetica-Bold")
      .text("SENTINATORS", 50, 22);

    doc
      .fillColor("#ffffff")
      .fontSize(8)
      .font("Helvetica")
      .text("Keep Pumping Gym", 50, 42);

    doc
      .fillColor("#ffffff")
      .fontSize(10)
      .font("Helvetica-Bold")
      .text("MEMBERSHIP AGREEMENT", 0, 27, { align: "right" });

    doc.moveDown(0);

    // ── Title ────────────────────────────────────────────────
    doc.y = 90;
    doc
      .fillColor(dark)
      .fontSize(14)
      .font("Helvetica-Bold")
      .text("Membership Registration Agreement", { align: "center" });

    doc.moveDown(0.4);
    doc
      .fillColor(gray)
      .fontSize(9)
      .font("Helvetica")
      .text(`Submitted: ${data.submittedAt}`, { align: "center" });

    doc.moveDown(1);

    // ── Helper: section title ────────────────────────────────
    function sectionTitle(title: string) {
      doc
        .fillColor(red)
        .fontSize(10)
        .font("Helvetica-Bold")
        .text(title.toUpperCase());
      doc
        .moveTo(50, doc.y)
        .lineTo(doc.page.width - 50, doc.y)
        .strokeColor("#e5e7eb")
        .lineWidth(0.5)
        .stroke();
      doc.moveDown(0.4);
    }

    // ── Helper: row ──────────────────────────────────────────
    function row(label: string, value: string) {
      const y = doc.y;
      doc
        .fillColor(gray)
        .fontSize(8)
        .font("Helvetica")
        .text(label + ":", 50, y, { width: 140, continued: false });
      doc
        .fillColor(dark)
        .fontSize(8)
        .font("Helvetica-Bold")
        .text(value || "-", 200, y, { width: 340 });
      doc.moveDown(0.35);
    }

    // ── Contract Info ────────────────────────────────────────
    sectionTitle("Contract Information");
    row("Contract No.", data.contractNumber);
    row("Customer No.", data.customerNumber);
    row("Date of Submission", data.submittedAt);

    doc.moveDown(0.6);

    // ── Member Details ───────────────────────────────────────
    sectionTitle("Member Details");
    row("Full Name", data.memberName);
    row("Email", data.email);
    row("Phone", data.phone || "-");
    row("Date of Birth", data.dateOfBirth ? formatDate(data.dateOfBirth) : "-");
    row("Address", data.address || "-");
    row("Emergency Contact", data.emergencyContact || "-");

    doc.moveDown(0.6);

    // ── Plan Details ─────────────────────────────────────────
    sectionTitle("Membership Plan");
    row("Plan", data.planName);
    row("Duration", data.planDuration);
    row("Start Date", formatDate(data.startDate));
    row("End Date", data.endDate ? formatDate(data.endDate) : "-");
    row("Payment Frequency", data.paymentFrequency);

    if (data.additionalPlans.length > 0) {
      doc.moveDown(0.3);
      doc
        .fillColor(gray)
        .fontSize(8)
        .font("Helvetica")
        .text("Additional Plans:", 50);
      data.additionalPlans.forEach((ap) => {
        doc
          .fillColor(dark)
          .fontSize(8)
          .font("Helvetica")
          .text(
            `  • ${ap.name || ap.duration}  —  ${money(data.currency, ap.price)}`,
            50,
          );
      });
    }

    doc.moveDown(0.6);

    // ── Payment Summary ──────────────────────────────────────
    sectionTitle("Payment Summary");
    row("Plan Price", money(data.currency, data.planPrice));

    if (data.additionalPlans.length > 0) {
      const addTotal = data.additionalPlans.reduce((s, p) => s + p.price, 0);
      row("Additional Plans", money(data.currency, addTotal));
    }

    row("Registration Fee", money(data.currency, data.registrationFee));

    if (data.discountAmount > 0) {
      row(
        `${data.discountLabel}`,
        `- ${money(data.currency, data.discountAmount)}`,
      );
    }

    // Total line
    doc.moveDown(0.2);
    doc
      .moveTo(50, doc.y)
      .lineTo(doc.page.width - 50, doc.y)
      .strokeColor("#d1d5db")
      .lineWidth(0.5)
      .stroke();
    doc.moveDown(0.3);

    const totalY = doc.y;
    doc
      .fillColor(dark)
      .fontSize(10)
      .font("Helvetica-Bold")
      .text("Total Amount:", 50, totalY, { continued: false });
    doc
      .fillColor(red)
      .fontSize(10)
      .font("Helvetica-Bold")
      .text(money(data.currency, data.total), 200, totalY);

    doc.moveDown(1);

    // ── Contract Conditions ──────────────────────────────────
    // Add a new page if there isn't enough room for the conditions block
    if (doc.y > doc.page.height - 220) {
      doc.addPage();
    }

    sectionTitle("Contract Conditions");

    const conditions: { title: string; text: string }[] = [
      {
        title: "Term",
        text: "The selected membership begins on the start date and runs for the agreed term. An automatic extension occurs only if no timely cancellation is made.",
      },
      {
        title: "Notice Period",
        text: "Cancellation must be declared in writing and must be received at least 4 weeks before the end of the respective term.",
      },
      {
        title: "Payment Obligation",
        text: "The membership fee is to be paid in advance according to the chosen payment method and due date. In case of late payment, we reserve the right to charge reminder fees and suspend the membership.",
      },
      {
        title: "House Rules",
        text: "The membership is subject to the house rules of the gym. These are posted in the studio and can be viewed on our website. With your signature, you acknowledge these rules.",
      },
      {
        title: "Liability",
        text: "The gym is not liable for items brought in. Use of the equipment is at your own risk. Parents are liable for their children.",
      },
      {
        title: "Data Protection",
        text: "Your data will be used exclusively for contract processing and member support. Further information can be found in our privacy policy.",
      },
      {
        title: "Health Responsibility",
        text: "With your signature, you confirm that you are healthy enough to participate in training. In case of doubt, we recommend a medical clarification.",
      },
    ];

    conditions.forEach(({ title, text }) => {
      // Start a new page if this condition won't fit
      if (doc.y > doc.page.height - 80) {
        doc.addPage();
      }
      doc.fillColor(dark).fontSize(8.5).font("Helvetica-Bold").text(title, 50);
      doc
        .fillColor(gray)
        .fontSize(8)
        .font("Helvetica")
        .text(text, 50, undefined, { width: doc.page.width - 100 });
      doc.moveDown(0.5);
    });

    doc.moveDown(0.6);

    // ── Signature ────────────────────────────────────────────
    sectionTitle("Member Signature");

    // Check if there's enough space for signature, add page if needed
    if (doc.y > doc.page.height - 160) {
      doc.addPage();
    }

    if (
      data.signatureDataUrl &&
      data.signatureDataUrl.startsWith("data:image/")
    ) {
      try {
        const base64Data = data.signatureDataUrl.replace(
          /^data:image\/\w+;base64,/,
          "",
        );
        const imgBuffer = Buffer.from(base64Data, "base64");
        const sigY = doc.y;
        doc.image(imgBuffer, 50, sigY, { width: 200, height: 60 });
        doc.y = sigY + 70;
      } catch {
        doc
          .fillColor(gray)
          .fontSize(8)
          .text("[Signature captured electronically]", 50);
        doc.moveDown(0.5);
      }
    }

    doc
      .moveTo(50, doc.y)
      .lineTo(250, doc.y)
      .strokeColor("#111827")
      .lineWidth(1)
      .stroke();
    doc.moveDown(0.3);
    doc
      .fillColor(gray)
      .fontSize(8)
      .font("Helvetica")
      .text(`${data.memberName} — Member Signature`, 50);

    // Guardian signature (for minors)
    if (data.isMinor && data.guardianSignatureDataUrl) {
      doc.moveDown(0.8);
      doc
        .fillColor(red)
        .fontSize(9)
        .font("Helvetica-Bold")
        .text("GUARDIAN / PARENT SIGNATURE");

      try {
        const base64Data = data.guardianSignatureDataUrl.replace(
          /^data:image\/\w+;base64,/,
          "",
        );
        const imgBuffer = Buffer.from(base64Data, "base64");
        const sigY = doc.y;
        doc.image(imgBuffer, 50, sigY, { width: 200, height: 60 });
        doc.y = sigY + 70;
      } catch {
        doc
          .fillColor(gray)
          .fontSize(8)
          .text("[Guardian signature captured electronically]", 50);
        doc.moveDown(0.5);
      }

      doc
        .moveTo(50, doc.y)
        .lineTo(250, doc.y)
        .strokeColor("#111827")
        .lineWidth(1)
        .stroke();
      doc.moveDown(0.3);
      doc
        .fillColor(gray)
        .fontSize(8)
        .font("Helvetica")
        .text("Guardian / Parent Signature", 50);
    }

    doc.moveDown(1.2);

    // ── Footer ───────────────────────────────────────────────
    doc
      .fillColor(gray)
      .fontSize(7.5)
      .font("Helvetica")
      .text(
        "This document is generated electronically and constitutes a binding membership agreement. " +
          "Please retain this copy for your records.",
        50,
        undefined,
        { align: "center", width: doc.page.width - 100 },
      );

    doc.end();
  });
}
