import nodemailer from "nodemailer";
import { env } from "../config/env.js";
function hasSmtpConfig() {
    return Boolean(env.smtpHost && env.smtpUser && env.smtpPass && env.mailFrom && env.mailTo);
}
function createTransporter() {
    return nodemailer.createTransport({
        host: env.smtpHost,
        port: env.smtpPort,
        secure: env.smtpSecure,
        auth: {
            user: env.smtpUser,
            pass: env.smtpPass,
        },
    });
}
export async function sendContactEmail(payload) {
    const subject = `Nouvelle demande MatoStudio - ${payload.name}`;
    const text = [
        "Nouvelle demande de contact MatoStudio",
        "",
        `Nom : ${payload.name}`,
        `Email : ${payload.email}`,
        `T�l�phone : ${payload.phone || "Non renseign�"}`,
        `Type de projet : ${payload.projectType}`,
        `Budget : ${payload.budget}`,
        `D�lai : ${payload.timeline}`,
        "",
        "Message :",
        payload.message,
    ].join("\n");
    if (!hasSmtpConfig()) {
        console.log("[CONTACT_EMAIL_DEV_MODE]");
        console.log(text);
        return {
            mode: "dev",
            sent: false,
        };
    }
    const transporter = createTransporter();
    await transporter.sendMail({
        from: env.mailFrom,
        to: env.mailTo,
        replyTo: payload.email,
        subject,
        text,
    });
    return {
        mode: "smtp",
        sent: true,
    };
}
export async function sendQuoteEmail(payload) {
    const subject = `Nouvelle estimation MatoStudio - ${payload.name}`;
    const text = [
        "Nouvelle demande de devis MatoStudio",
        "",
        `Nom : ${payload.name}`,
        `Email : ${payload.email}`,
        `T�l�phone : ${payload.phone || "Non renseign�"}`,
        `Type de projet : ${payload.projectType}`,
        `Nombre de pages : ${payload.pageCount}`,
        `Options : ${payload.options.length > 0 ? payload.options.join(", ") : "Aucune"}`,
        `D�lai souhait� : ${payload.deadline}`,
        `Estimation indicative : ${payload.estimate} �`,
        "",
        "Message :",
        payload.message || "Non renseign�",
    ].join("\n");
    if (!hasSmtpConfig()) {
        console.log("[QUOTE_EMAIL_DEV_MODE]");
        console.log(text);
        return {
            mode: "dev",
            sent: false,
        };
    }
    const transporter = createTransporter();
    await transporter.sendMail({
        from: env.mailFrom,
        to: env.mailTo,
        replyTo: payload.email,
        subject,
        text,
    });
    return {
        mode: "smtp",
        sent: true,
    };
}
//# sourceMappingURL=mail.service.js.map