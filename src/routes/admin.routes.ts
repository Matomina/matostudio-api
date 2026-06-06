import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { ZodError } from "zod";

import { prisma } from "../db/prisma.js";
import { requireAuth, ADMIN_COOKIE } from "../middleware/auth.middleware.js";
import {
  adminLoginSchema,
  leadStatusSchema,
  leadNoteSchema,
  approveLeadSchema,
} from "../schemas/admin.schema.js";
import { createCheckoutSession } from "../services/stripe.service.js";
import { sendPaymentRequestEmail } from "../services/mail.service.js";

export const adminRouter = Router();

const COOKIE_MAX_AGE = 8 * 60 * 60 * 1000; // 8 hours
const isProduction = process.env.NODE_ENV === "production";

// SameSite=None+Secure required for cross-site cookie between matostudio.fr and matostudio-api.onrender.com
const adminCookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: (isProduction ? "none" : "lax") as "none" | "lax",
  path: "/",
  maxAge: COOKIE_MAX_AGE,
};

const adminClearCookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: (isProduction ? "none" : "lax") as "none" | "lax",
  path: "/",
};

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

    response.cookie(ADMIN_COOKIE, token, adminCookieOptions);

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
  response.clearCookie(ADMIN_COOKIE, adminClearCookieOptions);
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

// PATCH /api/admin/leads/:id/approve
adminRouter.patch("/api/admin/leads/:id/approve", requireAuth, async (request, response) => {
  try {
    const { finalAmount, adminNotes } = approveLeadSchema.parse(request.body);
    const lead = await prisma.lead.update({
      where: { id: String(request.params.id) },
      data: {
        status: "approved",
        finalAmount,
        ...(adminNotes !== undefined ? { internalNote: adminNotes || null } : {}),
      },
    });
    response.status(200).json({ success: true, lead });
  } catch (error) {
    if (error instanceof ZodError) {
      response.status(400).json({ success: false, error: "Invalid approval payload." });
      return;
    }
    console.error(error);
    response.status(500).json({ success: false, error: "Failed to approve lead." });
  }
});

// POST /api/admin/leads/:id/payment-request
adminRouter.post("/api/admin/leads/:id/payment-request", requireAuth, async (request, response) => {
  try {
    const lead = await prisma.lead.findUnique({
      where: { id: String(request.params.id) },
    });

    if (!lead) {
      response.status(404).json({ success: false, error: "Lead not found." });
      return;
    }

    if (lead.type !== "quote") {
      response
        .status(400)
        .json({ success: false, error: "Only quotes can have payment requests." });
      return;
    }

    if (lead.finalAmount === null) {
      response.status(400).json({
        success: false,
        error:
          "finalAmount must be set before creating a payment request. Use PATCH /approve first.",
      });
      return;
    }

    const existing = await prisma.paymentRequest.findUnique({
      where: { leadId: lead.id },
    });
    if (existing?.status === "PAID") {
      response.status(409).json({ success: false, error: "This quote has already been paid." });
      return;
    }

    const { sessionId, checkoutUrl, qrCodeDataUrl } = await createCheckoutSession({
      id: lead.id,
      name: lead.name,
      email: lead.email,
      reference: lead.reference,
      projectType: lead.projectType,
      finalAmount: lead.finalAmount,
    });

    const paymentRequest = await prisma.paymentRequest.upsert({
      where: { leadId: lead.id },
      create: {
        leadId: lead.id,
        amount: lead.finalAmount,
        currency: "eur",
        stripeCheckoutSessionId: sessionId,
        checkoutUrl,
        qrCodeDataUrl,
        status: "CREATED",
      },
      update: {
        stripeCheckoutSessionId: sessionId,
        checkoutUrl,
        qrCodeDataUrl,
        status: "CREATED",
        paidAt: null,
      },
    });

    await prisma.lead.update({
      where: { id: lead.id },
      data: { status: "payment_requested" },
    });

    let deliveryClient: "resend" | "dev" | "failed" = "failed";
    try {
      const result = await sendPaymentRequestEmail({
        id: lead.id,
        name: lead.name,
        email: lead.email,
        reference: lead.reference,
        finalAmount: lead.finalAmount,
        projectType: lead.projectType,
        estimate: lead.estimate,
        checkoutUrl,
      });
      deliveryClient = result.mode as "resend" | "dev";
    } catch (emailErr) {
      console.error("[PAYMENT_REQUEST_EMAIL_FAILED]", emailErr);
    }

    response.status(200).json({
      success: true,
      paymentRequest: {
        id: paymentRequest.id,
        amount: paymentRequest.amount,
        checkoutUrl: paymentRequest.checkoutUrl,
        status: paymentRequest.status,
      },
      delivery: { client: deliveryClient },
    });
  } catch (error) {
    console.error(error);
    response.status(500).json({ success: false, error: "Failed to create payment request." });
  }
});
