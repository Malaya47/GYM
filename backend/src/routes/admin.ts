import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma";
import { requireAdmin, AuthRequest } from "../middleware/auth";

const router = Router();

// ─── POST /api/admin/login ───────────────────────────────
router.post("/login", async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required" });
      return;
    }

    const admin = await prisma.admin.findUnique({ where: { email } });
    if (!admin) {
      res.status(401).json({ error: "Invalid admin credentials" });
      return;
    }

    const valid = await bcrypt.compare(password, admin.password);
    if (!valid) {
      res.status(401).json({ error: "Invalid admin credentials" });
      return;
    }

    const token = jwt.sign(
      { adminId: admin.id, isAdmin: true },
      process.env.JWT_ADMIN_SECRET as string,
      { expiresIn: "8h" },
    );

    res.json({
      message: "Admin login successful",
      token,
      admin: { id: admin.id, name: admin.name, email: admin.email },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Login failed" });
  }
});

// ─── GET /api/admin/me ──────────────────────────────────
router.get(
  "/me",
  requireAdmin,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const admin = await prisma.admin.findUnique({
        where: { id: req.userId },
        select: { id: true, name: true, email: true },
      });
      if (!admin) {
        res.status(404).json({ error: "Admin not found" });
        return;
      }
      res.json({ admin });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch admin" });
    }
  },
);

// ─── GET /api/admin/stats ────────────────────────────────
router.get(
  "/stats",
  requireAdmin,
  async (_req: AuthRequest, res: Response): Promise<void> => {
    try {
      const [
        totalUsers,
        pendingMemberships,
        approvedMemberships,
        pendingOrders,
        approvedOrders,
        totalOrders,
      ] = await Promise.all([
        prisma.user.count(),
        prisma.membershipPurchase.count({ where: { status: "PENDING" } }),
        prisma.membershipPurchase.count({ where: { status: "APPROVED" } }),
        prisma.order.count({ where: { status: "PENDING" } }),
        prisma.order.count({ where: { status: "APPROVED" } }),
        prisma.order.count(),
      ]);

      res.json({
        totalUsers,
        pendingMemberships,
        approvedMemberships,
        pendingOrders,
        approvedOrders,
        totalOrders,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  },
);

// ─── GET /api/admin/users ────────────────────────────────
router.get(
  "/users",
  requireAdmin,
  async (_req: AuthRequest, res: Response): Promise<void> => {
    try {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          dateOfBirth: true,
          gender: true,
          goal: true,
          createdAt: true,
          _count: { select: { memberships: true, orders: true } },
        },
        orderBy: { createdAt: "desc" },
      });
      res.json({ users });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  },
);

// ─── GET /api/admin/users/:id ───────────────────────────
router.get(
  "/users/:id",
  requireAdmin,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({ error: "Invalid user id" });
        return;
      }

      const user = await prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          dateOfBirth: true,
          gender: true,
          weight: true,
          height: true,
          goal: true,
          experience: true,
          createdAt: true,
          memberships: {
            include: { plan: true },
            orderBy: { createdAt: "desc" },
          },
          orders: {
            include: { items: { include: { product: true } } },
            orderBy: { createdAt: "desc" },
          },
        },
      });

      if (!user) {
        res.status(404).json({ error: "User not found" });
        return;
      }

      // Enrich memberships with additional plan details
      const allAdditionalIds = Array.from(
        new Set(user.memberships.flatMap((m) => m.additionalPlanIds)),
      );
      const additionalPlansMap: Record<number, any> = {};
      if (allAdditionalIds.length > 0) {
        const additionalPlans = await prisma.membershipPlan.findMany({
          where: { id: { in: allAdditionalIds } },
        });
        additionalPlans.forEach((p) => {
          additionalPlansMap[p.id] = p;
        });
      }

      const enrichedUser = {
        ...user,
        memberships: user.memberships.map((m) => ({
          ...m,
          additionalPlans: m.additionalPlanIds
            .map((pid) => additionalPlansMap[pid])
            .filter(Boolean),
        })),
      };

      res.json({ user: enrichedUser });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch user details" });
    }
  },
);

// ─── GET /api/admin/memberships ──────────────────────────
router.get(
  "/memberships",
  requireAdmin,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { status } = req.query as { status?: string };
      const where = status ? { status: status.toUpperCase() as any } : {};
      const purchases = await prisma.membershipPurchase.findMany({
        where,
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
          plan: true,
        },
        orderBy: { createdAt: "desc" },
      });

      // Attach additional plan details for each purchase
      const allAdditionalIds = Array.from(
        new Set(purchases.flatMap((p) => p.additionalPlanIds)),
      );
      const additionalPlansMap: Record<number, any> = {};
      if (allAdditionalIds.length > 0) {
        const additionalPlans = await prisma.membershipPlan.findMany({
          where: { id: { in: allAdditionalIds } },
        });
        additionalPlans.forEach((p) => {
          additionalPlansMap[p.id] = p;
        });
      }

      const enriched = purchases.map((p) => ({
        ...p,
        additionalPlans: p.additionalPlanIds
          .map((id) => additionalPlansMap[id])
          .filter(Boolean),
      }));

      res.json({ purchases: enriched });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch memberships" });
    }
  },
);

// ─── PATCH /api/admin/memberships/:id ───────────────────
// body: { status: "APPROVED" | "REJECTED", notes?: string }
router.patch(
  "/memberships/:id",
  requireAdmin,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const id = Number(req.params.id);
      const { status, notes } = req.body;

      if (!["APPROVED", "REJECTED"].includes(status)) {
        res.status(400).json({ error: "status must be APPROVED or REJECTED" });
        return;
      }

      const purchase = await prisma.membershipPurchase.update({
        where: { id },
        data: { status, notes: notes || null },
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
          plan: true,
        },
      });

      res.json({ message: `Membership ${status.toLowerCase()}`, purchase });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to update membership status" });
    }
  },
);

// ─── GET /api/admin/orders ───────────────────────────────
router.get(
  "/orders",
  requireAdmin,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { status } = req.query as { status?: string };
      const where = status ? { status: status.toUpperCase() as any } : {};
      const orders = await prisma.order.findMany({
        where,
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
          items: { include: { product: true } },
        },
        orderBy: { createdAt: "desc" },
      });
      res.json({ orders });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch orders" });
    }
  },
);

// ─── PATCH /api/admin/orders/:id ─────────────────────────
// body: { status: "APPROVED" | "REJECTED", notes?: string }
router.patch(
  "/orders/:id",
  requireAdmin,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const id = Number(req.params.id);
      const { status, notes } = req.body;

      if (!["APPROVED", "REJECTED"].includes(status)) {
        res.status(400).json({ error: "status must be APPROVED or REJECTED" });
        return;
      }

      // Fetch the current order to check its existing status and items
      const existing = await prisma.order.findUnique({
        where: { id },
        include: { items: true },
      });

      if (!existing) {
        res.status(404).json({ error: "Order not found" });
        return;
      }

      // Only decrement stock when transitioning to APPROVED for the first time
      if (status === "APPROVED" && existing.status !== "APPROVED") {
        // Validate stock is still sufficient before approving
        for (const item of existing.items) {
          const product = await prisma.product.findUnique({
            where: { id: item.productId },
          });
          if (!product || product.stock < item.quantity) {
            res.status(400).json({
              error: `Insufficient stock for product id ${item.productId}. Cannot approve.`,
            });
            return;
          }
        }

        // Decrement stock for each item
        await Promise.all(
          existing.items.map((item) =>
            prisma.product.update({
              where: { id: item.productId },
              data: { stock: { decrement: item.quantity } },
            }),
          ),
        );
      }

      // If reverting from APPROVED to REJECTED, restore stock
      if (status === "REJECTED" && existing.status === "APPROVED") {
        await Promise.all(
          existing.items.map((item) =>
            prisma.product.update({
              where: { id: item.productId },
              data: { stock: { increment: item.quantity } },
            }),
          ),
        );
      }

      const order = await prisma.order.update({
        where: { id },
        data: { status, notes: notes || null },
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
          items: { include: { product: true } },
        },
      });

      res.json({ message: `Order ${status.toLowerCase()}`, order });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to update order status" });
    }
  },
);

// ══════════════════════════════════════════════════════════
// CONTENT MANAGEMENT ENDPOINTS
// ══════════════════════════════════════════════════════════

// ─── GET  /api/admin/content/text ──────────────────────
router.get(
  "/content/text",
  requireAdmin,
  async (_req: AuthRequest, res: Response): Promise<void> => {
    try {
      const rows = await prisma.siteContent.findMany({
        orderBy: { section: "asc" },
      });
      res.json(rows);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch text content" });
    }
  },
);

// ─── PUT  /api/admin/content/text/:key ─────────────────
router.put(
  "/content/text/:key",
  requireAdmin,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { value, section } = req.body;
      const row = await prisma.siteContent.upsert({
        where: { key: req.params.key as string },
        update: { value, ...(section ? { section } : {}) },
        create: {
          key: req.params.key as string,
          value,
          section: section || "general",
        },
      });
      res.json(row);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to update text content" });
    }
  },
);

// ─── PUT  /api/admin/content/text/bulk ─────────────────
// body: { updates: [{ key, value, section }] }
router.put(
  "/content/text",
  requireAdmin,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { updates } = req.body as {
        updates: { key: string; value: string; section: string }[];
      };
      await Promise.all(
        updates.map((u) =>
          prisma.siteContent.upsert({
            where: { key: u.key },
            update: { value: u.value, section: u.section },
            create: { key: u.key, value: u.value, section: u.section },
          }),
        ),
      );
      res.json({ message: "Text content updated" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to bulk-update text content" });
    }
  },
);

// ─── STATS ─────────────────────────────────────────────
router.get(
  "/content/stats",
  requireAdmin,
  async (_req: AuthRequest, res: Response): Promise<void> => {
    try {
      const rows = await prisma.stat.findMany({ orderBy: { order: "asc" } });
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: "Failed" });
    }
  },
);

router.post(
  "/content/stats",
  requireAdmin,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { value, label, order } = req.body;
      const row = await prisma.stat.create({
        data: { value, label, order: order ?? 0 },
      });
      res.json(row);
    } catch (err) {
      res.status(500).json({ error: "Failed" });
    }
  },
);

router.put(
  "/content/stats/:id",
  requireAdmin,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const row = await prisma.stat.update({
        where: { id: Number(req.params.id) },
        data: req.body,
      });
      res.json(row);
    } catch (err) {
      res.status(500).json({ error: "Failed" });
    }
  },
);

router.delete(
  "/content/stats/:id",
  requireAdmin,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      await prisma.stat.delete({ where: { id: Number(req.params.id) } });
      res.json({ message: "Deleted" });
    } catch (err) {
      res.status(500).json({ error: "Failed" });
    }
  },
);

// ─── TRAINERS ──────────────────────────────────────────
router.get(
  "/content/trainers",
  requireAdmin,
  async (_req: AuthRequest, res: Response): Promise<void> => {
    try {
      const rows = await prisma.trainer.findMany({ orderBy: { order: "asc" } });
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: "Failed" });
    }
  },
);

router.post(
  "/content/trainers",
  requireAdmin,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { name, role, description, image, order } = req.body;
      const row = await prisma.trainer.create({
        data: { name, role, description, image, order: order ?? 0 },
      });
      res.json(row);
    } catch (err) {
      res.status(500).json({ error: "Failed" });
    }
  },
);

router.put(
  "/content/trainers/:id",
  requireAdmin,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const row = await prisma.trainer.update({
        where: { id: Number(req.params.id) },
        data: req.body,
      });
      res.json(row);
    } catch (err) {
      res.status(500).json({ error: "Failed" });
    }
  },
);

router.delete(
  "/content/trainers/:id",
  requireAdmin,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      await prisma.trainer.delete({ where: { id: Number(req.params.id) } });
      res.json({ message: "Deleted" });
    } catch (err) {
      res.status(500).json({ error: "Failed" });
    }
  },
);

// ─── TESTIMONIALS ──────────────────────────────────────
router.get(
  "/content/testimonials",
  requireAdmin,
  async (_req: AuthRequest, res: Response): Promise<void> => {
    try {
      const rows = await prisma.testimonial.findMany({
        orderBy: { order: "asc" },
      });
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: "Failed" });
    }
  },
);

router.post(
  "/content/testimonials",
  requireAdmin,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { name, role, rating, content, image, order } = req.body;
      const row = await prisma.testimonial.create({
        data: {
          name,
          role,
          rating: rating ?? 5,
          content,
          image,
          order: order ?? 0,
        },
      });
      res.json(row);
    } catch (err) {
      res.status(500).json({ error: "Failed" });
    }
  },
);

router.put(
  "/content/testimonials/:id",
  requireAdmin,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const row = await prisma.testimonial.update({
        where: { id: Number(req.params.id) },
        data: req.body,
      });
      res.json(row);
    } catch (err) {
      res.status(500).json({ error: "Failed" });
    }
  },
);

router.delete(
  "/content/testimonials/:id",
  requireAdmin,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      await prisma.testimonial.delete({ where: { id: Number(req.params.id) } });
      res.json({ message: "Deleted" });
    } catch (err) {
      res.status(500).json({ error: "Failed" });
    }
  },
);

// ─── BLOG POSTS ────────────────────────────────────────
router.get(
  "/content/blog",
  requireAdmin,
  async (_req: AuthRequest, res: Response): Promise<void> => {
    try {
      const rows = await prisma.blogPost.findMany({
        orderBy: { createdAt: "desc" },
      });
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: "Failed" });
    }
  },
);

router.post(
  "/content/blog",
  requireAdmin,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { title, excerpt, content, image } = req.body;
      const row = await prisma.blogPost.create({
        data: { title, excerpt, content, image },
      });
      res.json(row);
    } catch (err) {
      res.status(500).json({ error: "Failed" });
    }
  },
);

router.put(
  "/content/blog/:id",
  requireAdmin,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const row = await prisma.blogPost.update({
        where: { id: Number(req.params.id) },
        data: req.body,
      });
      res.json(row);
    } catch (err) {
      res.status(500).json({ error: "Failed" });
    }
  },
);

router.delete(
  "/content/blog/:id",
  requireAdmin,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      await prisma.blogPost.delete({ where: { id: Number(req.params.id) } });
      res.json({ message: "Deleted" });
    } catch (err) {
      res.status(500).json({ error: "Failed" });
    }
  },
);

// ─── GALLERY ───────────────────────────────────────────
router.get(
  "/content/gallery",
  requireAdmin,
  async (_req: AuthRequest, res: Response): Promise<void> => {
    try {
      const rows = await prisma.galleryImage.findMany({
        orderBy: { order: "asc" },
      });
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: "Failed" });
    }
  },
);

router.post(
  "/content/gallery",
  requireAdmin,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { src, alt, category, gridCol, gridRow, order } = req.body;
      const row = await prisma.galleryImage.create({
        data: {
          src,
          alt,
          category: category ?? "All",
          gridCol,
          gridRow,
          order: order ?? 0,
        },
      });
      res.json(row);
    } catch (err) {
      res.status(500).json({ error: "Failed" });
    }
  },
);

router.put(
  "/content/gallery/:id",
  requireAdmin,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const row = await prisma.galleryImage.update({
        where: { id: Number(req.params.id) },
        data: req.body,
      });
      res.json(row);
    } catch (err) {
      res.status(500).json({ error: "Failed" });
    }
  },
);

router.delete(
  "/content/gallery/:id",
  requireAdmin,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      await prisma.galleryImage.delete({
        where: { id: Number(req.params.id) },
      });
      res.json({ message: "Deleted" });
    } catch (err) {
      res.status(500).json({ error: "Failed" });
    }
  },
);

// ─── ACHIEVEMENTS ──────────────────────────────────────
router.get(
  "/content/achievements",
  requireAdmin,
  async (_req: AuthRequest, res: Response): Promise<void> => {
    try {
      const rows = await prisma.achievement.findMany({
        orderBy: { order: "asc" },
      });
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: "Failed" });
    }
  },
);

router.post(
  "/content/achievements",
  requireAdmin,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { image, title, order } = req.body;
      const row = await prisma.achievement.create({
        data: { image, title, order: order ?? 0 },
      });
      res.json(row);
    } catch (err) {
      res.status(500).json({ error: "Failed" });
    }
  },
);

router.put(
  "/content/achievements/:id",
  requireAdmin,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const row = await prisma.achievement.update({
        where: { id: Number(req.params.id) },
        data: req.body,
      });
      res.json(row);
    } catch (err) {
      res.status(500).json({ error: "Failed" });
    }
  },
);

router.delete(
  "/content/achievements/:id",
  requireAdmin,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      await prisma.achievement.delete({ where: { id: Number(req.params.id) } });
      res.json({ message: "Deleted" });
    } catch (err) {
      res.status(500).json({ error: "Failed" });
    }
  },
);

// ─── WHY CHOOSE US FEATURES ────────────────────────────
router.get(
  "/content/why-features",
  requireAdmin,
  async (_req: AuthRequest, res: Response): Promise<void> => {
    try {
      const rows = await prisma.whyChooseUsFeature.findMany({
        orderBy: { order: "asc" },
      });
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: "Failed" });
    }
  },
);

router.post(
  "/content/why-features",
  requireAdmin,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { icon, title, description, order } = req.body;
      const row = await prisma.whyChooseUsFeature.create({
        data: { icon, title, description, order: order ?? 0 },
      });
      res.json(row);
    } catch (err) {
      res.status(500).json({ error: "Failed" });
    }
  },
);

router.put(
  "/content/why-features/:id",
  requireAdmin,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const row = await prisma.whyChooseUsFeature.update({
        where: { id: Number(req.params.id) },
        data: req.body,
      });
      res.json(row);
    } catch (err) {
      res.status(500).json({ error: "Failed" });
    }
  },
);

router.delete(
  "/content/why-features/:id",
  requireAdmin,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      await prisma.whyChooseUsFeature.delete({
        where: { id: Number(req.params.id) },
      });
      res.json({ message: "Deleted" });
    } catch (err) {
      res.status(500).json({ error: "Failed" });
    }
  },
);

// ─── EVENT HIGHLIGHTS ──────────────────────────────────
router.get(
  "/content/event-highlights",
  requireAdmin,
  async (_req: AuthRequest, res: Response): Promise<void> => {
    try {
      const rows = await prisma.eventHighlight.findMany({
        orderBy: { order: "asc" },
      });
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: "Failed" });
    }
  },
);

router.post(
  "/content/event-highlights",
  requireAdmin,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { title, description, videoUrl, image, isMain, order } = req.body;
      const row = await prisma.eventHighlight.create({
        data: {
          title,
          description,
          videoUrl,
          image,
          isMain: isMain ?? false,
          order: order ?? 0,
        },
      });
      res.json(row);
    } catch (err) {
      res.status(500).json({ error: "Failed" });
    }
  },
);

router.put(
  "/content/event-highlights/:id",
  requireAdmin,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const row = await prisma.eventHighlight.update({
        where: { id: Number(req.params.id) },
        data: req.body,
      });
      res.json(row);
    } catch (err) {
      res.status(500).json({ error: "Failed" });
    }
  },
);

router.delete(
  "/content/event-highlights/:id",
  requireAdmin,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      await prisma.eventHighlight.delete({
        where: { id: Number(req.params.id) },
      });
      res.json({ message: "Deleted" });
    } catch (err) {
      res.status(500).json({ error: "Failed" });
    }
  },
);

// ─── TRAINING ZONES ────────────────────────────────────
router.get(
  "/content/training-zones",
  requireAdmin,
  async (_req: AuthRequest, res: Response): Promise<void> => {
    try {
      const rows = await prisma.trainingZone.findMany({
        orderBy: { order: "asc" },
      });
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: "Failed" });
    }
  },
);

router.post(
  "/content/training-zones",
  requireAdmin,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { image, alt, order } = req.body;
      const row = await prisma.trainingZone.create({
        data: { image, alt, order: order ?? 0 },
      });
      res.json(row);
    } catch (err) {
      res.status(500).json({ error: "Failed" });
    }
  },
);

router.put(
  "/content/training-zones/:id",
  requireAdmin,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const row = await prisma.trainingZone.update({
        where: { id: Number(req.params.id) },
        data: req.body,
      });
      res.json(row);
    } catch (err) {
      res.status(500).json({ error: "Failed" });
    }
  },
);

router.delete(
  "/content/training-zones/:id",
  requireAdmin,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      await prisma.trainingZone.delete({
        where: { id: Number(req.params.id) },
      });
      res.json({ message: "Deleted" });
    } catch (err) {
      res.status(500).json({ error: "Failed" });
    }
  },
);

// ─── SHOP PRODUCTS ─────────────────────────────────────
// Features are stored as String[] in DB but serialized as comma-separated string for the admin panel.

function parseFeatures(val: unknown): string[] {
  if (Array.isArray(val)) return val.map(String);
  if (typeof val === "string")
    return val
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  return [];
}

function serializeProduct(p: {
  id: number;
  name: string;
  price: number;
  currency: string;
  image: string | null;
  category: string;
  features: string[];
  stock: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}) {
  return { ...p, features: p.features.join(", ") };
}

router.get(
  "/content/products",
  requireAdmin,
  async (_req: AuthRequest, res: Response): Promise<void> => {
    try {
      const rows = await prisma.product.findMany({ orderBy: { id: "asc" } });
      res.json(rows.map(serializeProduct));
    } catch (err) {
      res.status(500).json({ error: "Failed" });
    }
  },
);

router.post(
  "/content/products",
  requireAdmin,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { name, price, currency, image, category, features, stock } =
        req.body;
      const row = await prisma.product.create({
        data: {
          name,
          price: Number(price),
          currency: currency || "CHF",
          image: image || null,
          category: category || "General",
          features: parseFeatures(features),
          stock: Number(stock) || 100,
        },
      });
      res.json(serializeProduct(row));
    } catch (err) {
      res.status(500).json({ error: "Failed" });
    }
  },
);

router.put(
  "/content/products/:id",
  requireAdmin,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { features, price, stock, ...rest } = req.body;
      const row = await prisma.product.update({
        where: { id: Number(req.params.id) },
        data: {
          ...rest,
          ...(price !== undefined ? { price: Number(price) } : {}),
          ...(stock !== undefined ? { stock: Number(stock) } : {}),
          ...(features !== undefined
            ? { features: parseFeatures(features) }
            : {}),
        },
      });
      res.json(serializeProduct(row));
    } catch (err) {
      res.status(500).json({ error: "Failed" });
    }
  },
);

router.delete(
  "/content/products/:id",
  requireAdmin,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      await prisma.product.delete({ where: { id: Number(req.params.id) } });
      res.json({ message: "Deleted" });
    } catch (err) {
      res.status(500).json({ error: "Failed" });
    }
  },
);

// ─── SHOP PRODUCT CATEGORIES (Tabs) ─────────────────────
router.get(
  "/content/product-categories",
  requireAdmin,
  async (_req: AuthRequest, res: Response): Promise<void> => {
    try {
      const rows = await prisma.productCategory.findMany({
        orderBy: { order: "asc" },
      });
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: "Failed" });
    }
  },
);

router.post(
  "/content/product-categories",
  requireAdmin,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { name, order } = req.body;
      const row = await prisma.productCategory.create({
        data: { name, order: order ?? 0 },
      });
      res.json(row);
    } catch (err) {
      res.status(500).json({ error: "Failed" });
    }
  },
);

router.put(
  "/content/product-categories/:id",
  requireAdmin,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { order, ...rest } = req.body;
      const row = await prisma.productCategory.update({
        where: { id: Number(req.params.id) },
        data: {
          ...rest,
          ...(order !== undefined ? { order: Number(order) } : {}),
        },
      });
      res.json(row);
    } catch (err) {
      res.status(500).json({ error: "Failed" });
    }
  },
);

router.delete(
  "/content/product-categories/:id",
  requireAdmin,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      await prisma.productCategory.delete({
        where: { id: Number(req.params.id) },
      });
      res.json({ message: "Deleted" });
    } catch (err) {
      res.status(500).json({ error: "Failed" });
    }
  },
);

// ─── MEMBERSHIP PLANS ─────────────────────────────────────────────────────
// features are stored as String[] but serialized as comma-separated for admin UI

function serializePlan(p: {
  id: number;
  name: string;
  duration: string;
  price: number;
  currency: string;
  features: string[];
  category: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}) {
  return { ...p, features: p.features.join(", ") };
}

router.get(
  "/content/membership-plans",
  requireAdmin,
  async (_req: AuthRequest, res: Response): Promise<void> => {
    try {
      const rows = await prisma.membershipPlan.findMany({
        orderBy: [{ category: "asc" }, { id: "asc" }],
      });
      res.json(rows.map(serializePlan));
    } catch (err) {
      res.status(500).json({ error: "Failed" });
    }
  },
);

router.post(
  "/content/membership-plans",
  requireAdmin,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { name, duration, price, currency, features, category, isActive } =
        req.body;
      const row = await prisma.membershipPlan.create({
        data: {
          name: name || "New Plan",
          duration: duration || "1 Month",
          price: Number(price) || 0,
          currency: currency || "CHF",
          features: parseFeatures(features),
          category: (category || "MEMBERSHIP") as any,
          isActive: isActive !== false,
        },
      });
      res.json(serializePlan(row));
    } catch (err) {
      res.status(500).json({ error: "Failed" });
    }
  },
);

router.put(
  "/content/membership-plans/:id",
  requireAdmin,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { features, price, isActive, ...rest } = req.body;
      const row = await prisma.membershipPlan.update({
        where: { id: Number(req.params.id) },
        data: {
          ...rest,
          ...(price !== undefined ? { price: Number(price) } : {}),
          ...(features !== undefined
            ? { features: parseFeatures(features) }
            : {}),
          ...(isActive !== undefined ? { isActive: Boolean(isActive) } : {}),
        },
      });
      res.json(serializePlan(row));
    } catch (err) {
      res.status(500).json({ error: "Failed" });
    }
  },
);

router.delete(
  "/content/membership-plans/:id",
  requireAdmin,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const id = Number(req.params.id);
      // Prevent deleting plans that have purchases attached
      const purchaseCount = await prisma.membershipPurchase.count({
        where: { planId: id },
      });
      if (purchaseCount > 0) {
        res.status(409).json({
          error: `Cannot delete – this plan has ${purchaseCount} purchase(s). Deactivate it instead.`,
        });
        return;
      }
      await prisma.membershipPlan.delete({ where: { id } });
      res.json({ message: "Deleted" });
    } catch (err) {
      res.status(500).json({ error: "Failed" });
    }
  },
);

// ─── FAQ ITEMS ─────────────────────────────────────────────────────────────

router.get(
  "/content/faqs",
  requireAdmin,
  async (_req: AuthRequest, res: Response): Promise<void> => {
    try {
      const rows = await prisma.faqItem.findMany({
        orderBy: { order: "asc" },
      });
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: "Failed" });
    }
  },
);

router.post(
  "/content/faqs",
  requireAdmin,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { question, answer, order } = req.body;
      const row = await prisma.faqItem.create({
        data: {
          question,
          answer,
          order: order ?? 0,
        },
      });
      res.json(row);
    } catch (err) {
      res.status(500).json({ error: "Failed" });
    }
  },
);

router.put(
  "/content/faqs/:id",
  requireAdmin,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { order, ...rest } = req.body;
      const row = await prisma.faqItem.update({
        where: { id: Number(req.params.id) },
        data: {
          ...rest,
          ...(order !== undefined ? { order: Number(order) } : {}),
        },
      });
      res.json(row);
    } catch (err) {
      res.status(500).json({ error: "Failed" });
    }
  },
);

router.delete(
  "/content/faqs/:id",
  requireAdmin,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      await prisma.faqItem.delete({ where: { id: Number(req.params.id) } });
      res.json({ message: "Deleted" });
    } catch (err) {
      res.status(500).json({ error: "Failed" });
    }
  },
);

// ─── PLAN CATEGORIES (dynamic, admin-managed) ──────────────────────────────

router.get(
  "/content/plan-categories",
  requireAdmin,
  async (_req: AuthRequest, res: Response): Promise<void> => {
    try {
      const rows = await prisma.planCategoryItem.findMany({
        orderBy: { order: "asc" },
      });
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: "Failed" });
    }
  },
);

router.post(
  "/content/plan-categories",
  requireAdmin,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { name, label, order } = req.body;
      if (!name || !label) {
        res.status(400).json({ error: "name and label are required" });
        return;
      }
      const row = await prisma.planCategoryItem.create({
        data: {
          name: name.trim().toUpperCase().replace(/\s+/g, "_"),
          label: label.trim(),
          order: order !== undefined ? Number(order) : 0,
        },
      });
      res.json(row);
    } catch (err: any) {
      if (err?.code === "P2002") {
        res
          .status(409)
          .json({ error: "A category with that name already exists" });
        return;
      }
      res.status(500).json({ error: "Failed" });
    }
  },
);

router.put(
  "/content/plan-categories/:id",
  requireAdmin,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { label, order } = req.body;
      const row = await prisma.planCategoryItem.update({
        where: { id: Number(req.params.id) },
        data: {
          ...(label !== undefined ? { label: label.trim() } : {}),
          ...(order !== undefined ? { order: Number(order) } : {}),
        },
      });
      res.json(row);
    } catch (err) {
      res.status(500).json({ error: "Failed" });
    }
  },
);

router.delete(
  "/content/plan-categories/:id",
  requireAdmin,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const id = Number(req.params.id);
      // Prevent deleting categories that have plans attached
      const category = await prisma.planCategoryItem.findUnique({
        where: { id },
      });
      if (!category) {
        res.status(404).json({ error: "Category not found" });
        return;
      }
      const planCount = await prisma.membershipPlan.count({
        where: { category: category.name },
      });
      if (planCount > 0) {
        res.status(409).json({
          error: `Cannot delete — ${planCount} plan(s) use this category. Reassign them first.`,
        });
        return;
      }
      await prisma.planCategoryItem.delete({ where: { id } });
      res.json({ message: "Deleted" });
    } catch (err) {
      res.status(500).json({ error: "Failed" });
    }
  },
);

export default router;
