import "dotenv/config";

function getEnv(name: string, fallback?: string) {
  const value = process.env[name] ?? fallback;

  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }

  return value;
}

function parseOrigins(value?: string) {
  return (value ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

const defaultFrontendOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "https://matostudio.fr",
  "https://www.matostudio.fr",
];

const configuredFrontendOrigins = parseOrigins(
  process.env.FRONTEND_ORIGINS ?? process.env.FRONTEND_ORIGIN,
);

export const env = {
  nodeEnv: getEnv("NODE_ENV", "development"),
  port: Number(getEnv("PORT", "3000")),
  frontendOrigins:
    configuredFrontendOrigins.length > 0 ? configuredFrontendOrigins : defaultFrontendOrigins,

  resendApiKey: process.env.RESEND_API_KEY,

  mailFrom: process.env.MAIL_FROM,
  mailTo: process.env.MAIL_TO,

  stripeSecretKey: process.env.STRIPE_SECRET_KEY,
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  stripeCurrency: process.env.STRIPE_CURRENCY ?? "eur",

  paymentSuccessUrl: process.env.PAYMENT_SUCCESS_URL ?? "https://matostudio.fr/paiement/succes",
  paymentCancelUrl: process.env.PAYMENT_CANCEL_URL ?? "https://matostudio.fr/paiement/annule",
  frontendUrl: process.env.FRONTEND_URL ?? "https://matostudio.fr",
  adminDashboardUrl: process.env.ADMIN_DASHBOARD_URL ?? "https://matostudio.fr/admin/dashboard",
};
