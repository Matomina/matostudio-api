import { Router } from "express";
import { ZodError } from "zod";

import { prisma } from "../db/prisma.js";
import { contactSchema } from "../schemas/contact.schema.js";
import { sendContactEmail } from "../services/mail.service.js";

export const contactRouter = Router();

contactRouter.post("/api/contact", async (request, response) => {
  try {
    const payload = contactSchema.parse(request.body);

    await prisma.lead.create({
      data: {
        type: "contact",
        name: payload.name,
        email: payload.email,
        phone: payload.phone || null,
        projectType: payload.projectType,
        budget: payload.budget,
        timeline: payload.timeline,
        message: payload.message,
      },
    });

    let delivery: "smtp" | "dev" | "failed" = "failed";
    try {
      const result = await sendContactEmail(payload);
      delivery = result.mode as "smtp" | "dev";
    } catch (emailError) {
      console.error("[CONTACT_EMAIL_SEND_FAILED]", emailError);
    }

    response.status(200).json({
      success: true,
      message: "Contact request received.",
      delivery,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      response.status(400).json({
        success: false,
        error: "Invalid contact payload.",
        issues: error.issues,
      });
      return;
    }

    console.error(error);

    response.status(500).json({
      success: false,
      error: "Unable to process contact request.",
    });
  }
});
