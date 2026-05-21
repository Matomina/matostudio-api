import { Router } from "express";
import { ZodError } from "zod";

import { contactSchema } from "../schemas/contact.schema.js";
import { sendContactEmail } from "../services/mail.service.js";

export const contactRouter = Router();

contactRouter.post("/api/contact", async (request, response) => {
  try {
    const payload = contactSchema.parse(request.body);
    const result = await sendContactEmail(payload);

    response.status(200).json({
      success: true,
      message: "Contact request received.",
      delivery: result.mode,
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
