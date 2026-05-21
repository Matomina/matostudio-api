import "dotenv/config";
function getEnv(name, fallback) {
    const value = process.env[name] ?? fallback;
    if (!value) {
        throw new Error(`Missing environment variable: ${name}`);
    }
    return value;
}
export const env = {
    nodeEnv: getEnv("NODE_ENV", "development"),
    port: Number(getEnv("PORT", "3000")),
    frontendOrigin: getEnv("FRONTEND_ORIGIN", "http://localhost:5173"),
    smtpHost: process.env.SMTP_HOST,
    smtpPort: Number(process.env.SMTP_PORT ?? 587),
    smtpSecure: process.env.SMTP_SECURE === "true",
    smtpUser: process.env.SMTP_USER,
    smtpPass: process.env.SMTP_PASS,
    mailFrom: process.env.MAIL_FROM,
    mailTo: process.env.MAIL_TO,
};
//# sourceMappingURL=env.js.map