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

  smtpHost: process.env.SMTP_HOST,
  smtpPort: Number(process.env.SMTP_PORT ?? 587),
  smtpSecure: process.env.SMTP_SECURE === "true",
  smtpUser: process.env.SMTP_USER,
  smtpPass: process.env.SMTP_PASS,

  mailFrom: process.env.MAIL_FROM,
  mailTo: process.env.MAIL_TO,
};
