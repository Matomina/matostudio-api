import { Router } from "express";
import { ZodError } from "zod";

import { prisma } from "../db/prisma.js";
import { quoteSchema } from "../schemas/quote.schema.js";
import { sendQuoteEmail } from "../services/mail.service.js";

export const quoteRouter = Router();

quoteRouter.post("/api/quote", async (request, response) => {
  try {
    const payload = quoteSchema.parse(request.body);

    await prisma.lead.create({
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
      },
    });

    let delivery: "smtp" | "dev" | "failed" = "failed";
    try {
      const result = await sendQuoteEmail(payload);
      delivery = result.mode as "smtp" | "dev";
    } catch (emailError) {
      console.error("[QUOTE_EMAIL_SEND_FAILED]", emailError);
    }

    response.status(200).json({
      success: true,
      message: "Quote request received.",
      delivery,
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
