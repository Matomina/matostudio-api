import Stripe from "stripe";
import QRCode from "qrcode";

import { env } from "../config/env.js";

function getStripeClient(): Stripe {
  if (!env.stripeSecretKey) {
    throw new Error("Missing environment variable: STRIPE_SECRET_KEY");
  }
  return new Stripe(env.stripeSecretKey);
}

export async function createCheckoutSession(lead: {
  id: string;
  name: string;
  email: string;
  reference: string | null;
  projectType: string;
  finalAmount: number;
}): Promise<{
  sessionId: string;
  checkoutUrl: string;
  qrCodeDataUrl: string;
}> {
  const stripe = getStripeClient();
  const reference = lead.reference ?? lead.id;
  const amountCents = Math.round(lead.finalAmount * 100);

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    customer_email: lead.email,
    line_items: [
      {
        price_data: {
          currency: env.stripeCurrency,
          unit_amount: amountCents,
          product_data: {
            name: `MatoStudio — ${lead.projectType}`,
            description: `Référence devis : ${reference}`,
          },
        },
        quantity: 1,
      },
    ],
    metadata: {
      quoteId: lead.id,
      quoteReference: reference,
      customerEmail: lead.email,
    },
    success_url: env.paymentSuccessUrl,
    cancel_url: env.paymentCancelUrl,
    expires_at: Math.floor(Date.now() / 1000) + 24 * 60 * 60, // 24h
  });

  const checkoutUrl = session.url!;
  const qrCodeDataUrl = await QRCode.toDataURL(checkoutUrl, {
    errorCorrectionLevel: "M",
    margin: 2,
    width: 256,
  });

  return { sessionId: session.id, checkoutUrl, qrCodeDataUrl };
}
