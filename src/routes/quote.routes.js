import { Router } from "express";
import { ZodError } from "zod";
import { quoteSchema } from "../schemas/quote.schema.js";
import { sendQuoteEmail } from "../services/mail.service.js";
export const quoteRouter = Router();
quoteRouter.post("/api/quote", async (request, response) => {
    try {
        const payload = quoteSchema.parse(request.body);
        const result = await sendQuoteEmail(payload);
        response.status(200).json({
            success: true,
            message: "Quote request received.",
            delivery: result.mode,
        });
    }
    catch (error) {
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
//# sourceMappingURL=quote.routes.js.map