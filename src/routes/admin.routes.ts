import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { ZodError } from "zod";

import { prisma } from "../db/prisma.js";
import { requireAuth, ADMIN_COOKIE } from "../middleware/auth.middleware.js";
import { adminLoginSchema, leadStatusSchema, leadNoteSchema } from "../schemas/admin.schema.js";

export const adminRouter = Router();

const COOKIE_MAX_AGE = 8 * 60 * 60 * 1000; // 8 hours

// POST /api/admin/auth/login
adminRouter.post("/api/admin/auth/login", async (request, response) => {
  const secret = process.env.JWT_SECRET;
  const passHash = process.env.ADMIN_PASS_HASH;

  if (!secret || !passHash) {
    response.status(503).json({ success: false, error: "Admin auth not configured." });
    return;
  }

  try {
    const { password } = adminLoginSchema.parse(request.body);
    const valid = await bcrypt.compare(password, passHash);

    if (!valid) {
      response.status(401).json({ success: false, error: "Invalid credentials." });
      return;
    }

    const token = jwt.sign({ role: "admin" }, secret, { expiresIn: "8h" });

    response.cookie(ADMIN_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: COOKIE_MAX_AGE,
    });

    response.status(200).json({ success: true });
  } catch (error) {
    if (error instanceof ZodError) {
      response.status(400).json({ success: false, error: "Invalid payload." });
      return;
    }
    console.error(error);
    response.status(500).json({ success: false, error: "Login failed." });
  }
});

// POST /api/admin/auth/logout
adminRouter.post("/api/admin/auth/logout", (_request, response) => {
  response.clearCookie(ADMIN_COOKIE, { httpOnly: true, sameSite: "strict" });
  response.status(200).json({ success: true });
});

// GET /api/admin/auth/me
adminRouter.get("/api/admin/auth/me", requireAuth, (_request, response) => {
  response.status(200).json({ success: true, role: "admin" });
});

// GET /api/admin/stats
adminRouter.get("/api/admin/stats", requireAuth, async (_request, response) => {
  try {
    const [total, byStatus, byType] = await Promise.all([
      prisma.lead.count(),
      prisma.lead.groupBy({ by: ["status"], _count: { id: true } }),
      prisma.lead.groupBy({ by: ["type"], _count: { id: true } }),
    ]);

    const statusCounts = Object.fromEntries(byStatus.map((row) => [row.status, row._count.id]));

    const typeCounts = Object.fromEntries(byType.map((row) => [row.type, row._count.id]));

    response.status(200).json({
      success: true,
      stats: {
        total,
        new: statusCounts.new ?? 0,
        to_call: statusCounts.to_call ?? 0,
        in_discussion: statusCounts.in_discussion ?? 0,
        quote_sent: statusCounts.quote_sent ?? 0,
        won: statusCounts.won ?? 0,
        lost: statusCounts.lost ?? 0,
        archived: statusCounts.archived ?? 0,
        contact: typeCounts.contact ?? 0,
        quote: typeCounts.quote ?? 0,
      },
    });
  } catch (error) {
    console.error(error);
    response.status(500).json({ success: false, error: "Failed to fetch stats." });
  }
});

// GET /api/admin/leads
adminRouter.get("/api/admin/leads", requireAuth, async (request, response) => {
  try {
    const type = request.query.type as string | undefined;
    const status = request.query.status as string | undefined;

    const leads = await prisma.lead.findMany({
      where: {
        ...(type ? { type } : {}),
        ...(status ? { status } : {}),
      },
      orderBy: { createdAt: "desc" },
    });

    response.status(200).json({ success: true, leads });
  } catch (error) {
    console.error(error);
    response.status(500).json({ success: false, error: "Failed to fetch leads." });
  }
});

// GET /api/admin/leads/:id
adminRouter.get("/api/admin/leads/:id", requireAuth, async (request, response) => {
  try {
    const lead = await prisma.lead.findUnique({ where: { id: String(request.params.id) } });

    if (!lead) {
      response.status(404).json({ success: false, error: "Lead not found." });
      return;
    }

    response.status(200).json({ success: true, lead });
  } catch (error) {
    console.error(error);
    response.status(500).json({ success: false, error: "Failed to fetch lead." });
  }
});

// PATCH /api/admin/leads/:id/status
adminRouter.patch("/api/admin/leads/:id/status", requireAuth, async (request, response) => {
  try {
    const { status } = leadStatusSchema.parse(request.body);
    const lead = await prisma.lead.update({
      where: { id: String(request.params.id) },
      data: { status },
    });
    response.status(200).json({ success: true, lead });
  } catch (error) {
    if (error instanceof ZodError) {
      response.status(400).json({ success: false, error: "Invalid status value." });
      return;
    }
    console.error(error);
    response.status(500).json({ success: false, error: "Failed to update status." });
  }
});

// PATCH /api/admin/leads/:id/note
adminRouter.patch("/api/admin/leads/:id/note", requireAuth, async (request, response) => {
  try {
    const { internalNote } = leadNoteSchema.parse(request.body);
    const lead = await prisma.lead.update({
      where: { id: String(request.params.id) },
      data: { internalNote: internalNote ?? null },
    });
    response.status(200).json({ success: true, lead });
  } catch (error) {
    if (error instanceof ZodError) {
      response.status(400).json({ success: false, error: "Invalid note payload." });
      return;
    }
    console.error(error);
    response.status(500).json({ success: false, error: "Failed to update note." });
  }
});
