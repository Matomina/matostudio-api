import { Router } from "express";
import Stripe from "stripe";

import { env } from "../config/env.js";
import { prisma } from "../db/prisma.js";
import { sendPaymentConfirmationEmail } from "../services/mail.service.js";

export const stripeRouter = Router();

// POST /api/stripe/webhook
// Raw body required — registered in app.ts before express.json()
stripeRouter.post("/api/stripe/webhook", async (request, response) => {
  const sig = request.headers["stripe-signature"] as string | undefined;

  if (!env.stripeWebhookSecret) {
    console.error("[STRIPE_WEBHOOK] STRIPE_WEBHOOK_SECRET not configured");
    response.status(500).json({ error: "Webhook not configured." });
    return;
  }

  if (!sig) {
    response.status(400).json({ error: "Missing stripe-signature header." });
    return;
  }

  const stripe = new Stripe(env.stripeSecretKey!);

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(request.body as Buffer, sig, env.stripeWebhookSecret);
  } catch (err) {
    console.error("[STRIPE_WEBHOOK_INVALID_SIG]", err instanceof Error ? err.message : err);
    response.status(400).json({ error: "Invalid webhook signature." });
    return;
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const quoteId = session.metadata?.quoteId;

    if (!quoteId) {
      // Not our session — acknowledge and ignore
      response.status(200).json({ received: true });
      return;
    }

    try {
      const paymentRequest = await prisma.paymentRequest.findUnique({
        where: { leadId: quoteId },
      });

      // Idempotency — already processed
      if (paymentRequest?.status === "PAID") {
        response.status(200).json({ received: true });
        return;
      }

      const paymentIntentId =
        typeof session.payment_intent === "string" ? session.payment_intent : null;

      await prisma.paymentRequest.update({
        where: { leadId: quoteId },
        data: {
          status: "PAID",
          paidAt: new Date(),
          stripePaymentIntentId: paymentIntentId,
        },
      });

      await prisma.lead.update({
        where: { id: quoteId },
        data: { status: "paid" },
      });

      const lead = await prisma.lead.findUnique({ where: { id: quoteId } });
      if (lead) {
        sendPaymentConfirmationEmail({
          id: lead.id,
          name: lead.name,
          email: lead.email,
          reference: lead.reference,
          finalAmount: lead.finalAmount,
          projectType: lead.projectType,
        }).catch((err: unknown) => console.error("[PAYMENT_CONFIRMATION_EMAIL_FAILED]", err));
      }
    } catch (err) {
      console.error("[STRIPE_WEBHOOK_PROCESSING_ERROR]", err);
      response.status(500).json({ error: "Failed to process webhook." });
      return;
    }
  }

  response.status(200).json({ received: true });
});
