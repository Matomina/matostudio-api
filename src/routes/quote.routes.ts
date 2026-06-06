import { Router } from "express";
import { ZodError } from "zod";

import { prisma } from "../db/prisma.js";
import { quoteSchema } from "../schemas/quote.schema.js";
import {
  sendQuoteAdminNotification,
  sendQuoteClientConfirmation,
} from "../services/mail.service.js";

export const quoteRouter = Router();

function generateReference(): string {
  const d = new Date();
  const date = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const suffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `DEVIS-${date}-${suffix}`;
}

quoteRouter.post("/api/quote", async (request, response) => {
  try {
    const payload = quoteSchema.parse(request.body);
    const reference = generateReference();

    const lead = await prisma.lead.create({
      data: {
        type: "quote",
        name: payload.name,
        email: payload.email,
        phone: payload.phone || null,
        projectType: payload.projectType,
        pageCount: payload.pageCount,
        options: JSON.stringify(payload.options),
        deadline: payload.deadline,
        estimate: payload.estimate,
        message: payload.message || null,
        reference,
      },
    });

    let deliveryAdmin: "resend" | "dev" | "failed" = "failed";
    let deliveryClient: "resend" | "dev" | "failed" = "failed";

    try {
      const result = await sendQuoteAdminNotification(payload, {
        leadId: lead.id,
        reference,
      });
      deliveryAdmin = result.mode as "resend" | "dev";
    } catch (err) {
      console.error("[QUOTE_ADMIN_NOTIFICATION_FAILED]", err);
    }

    try {
      const result = await sendQuoteClientConfirmation(payload, {
        leadId: lead.id,
        reference,
      });
      deliveryClient = result.mode as "resend" | "dev";
    } catch (err) {
      console.error("[QUOTE_CLIENT_CONFIRMATION_FAILED]", err);
    }

    response.status(200).json({
      success: true,
      quoteId: lead.id,
      reference,
      message: "Votre demande de devis a bien été envoyée.",
      delivery: { admin: deliveryAdmin, client: deliveryClient },
    });
  } catch (error) {
    if (error instanceof ZodError) {
      response.status(400).json({
        success: false,
        error: "Invalid quote payload.",
        issues: error.issues,
      });
      return;
    }

    console.error(error);

    response.status(500).json({
      success: false,
      error: "Unable to process quote request.",
    });
  }
});
