import nodemailer from "nodemailer";

import { env } from "../config/env.js";
import type { ContactPayload } from "../schemas/contact.schema.js";
import type { QuotePayload } from "../schemas/quote.schema.js";

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

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function htmlRow(label: string, value: string): string {
  return `<tr>
    <th style="text-align:left;padding:8px 16px 8px 0;border-bottom:1px solid #eee;white-space:nowrap">${label}</th>
    <td style="padding:8px 0;border-bottom:1px solid #eee">${escapeHtml(value)}</td>
  </tr>`;
}

export function buildContactEmailText(payload: ContactPayload): string {
  return [
    "Nouvelle demande de contact MatoStudio",
    "",
    `Nom : ${payload.name}`,
    `Email : ${payload.email}`,
    `Téléphone : ${payload.phone || "Non renseigné"}`,
    `Type de projet : ${payload.projectType}`,
    `Budget : ${payload.budget}`,
    `Délai : ${payload.timeline}`,
    "",
    "Message :",
    payload.message,
  ].join("\n");
}

export function buildContactEmailHtml(payload: ContactPayload): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Demande de contact MatoStudio</title></head>
<body style="font-family:sans-serif;color:#222;max-width:600px;margin:0 auto;padding:24px">
  <h2 style="color:#1a1a1a;margin-bottom:24px">Nouvelle demande de contact</h2>
  <table style="border-collapse:collapse;width:100%">
    ${htmlRow("Nom", payload.name)}
    ${htmlRow("Email", payload.email)}
    ${htmlRow("Téléphone", payload.phone || "Non renseigné")}
    ${htmlRow("Type de projet", payload.projectType)}
    ${htmlRow("Budget", payload.budget)}
    ${htmlRow("Délai", payload.timeline)}
  </table>
  <h3 style="margin-top:24px">Message</h3>
  <p style="white-space:pre-wrap;background:#f5f5f5;padding:16px;border-radius:4px">${escapeHtml(payload.message)}</p>
</body>
</html>`;
}

export function buildQuoteEmailText(payload: QuotePayload): string {
  return [
    "Nouvelle demande de devis MatoStudio",
    "",
    `Nom : ${payload.name}`,
    `Email : ${payload.email}`,
    `Téléphone : ${payload.phone || "Non renseigné"}`,
    `Type de projet : ${payload.projectType}`,
    `Nombre de pages : ${payload.pageCount}`,
    `Options : ${payload.options.length > 0 ? payload.options.join(", ") : "Aucune"}`,
    `Délai souhaité : ${payload.deadline}`,
    `Estimation indicative : ${payload.estimate} €`,
    "",
    "Message :",
    payload.message || "Non renseigné",
  ].join("\n");
}

export function buildQuoteEmailHtml(payload: QuotePayload): string {
  const options =
    payload.options.length > 0 ? payload.options.map(escapeHtml).join(", ") : "Aucune";

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Demande de devis MatoStudio</title></head>
<body style="font-family:sans-serif;color:#222;max-width:600px;margin:0 auto;padding:24px">
  <h2 style="color:#1a1a1a;margin-bottom:24px">Nouvelle demande de devis</h2>
  <table style="border-collapse:collapse;width:100%">
    ${htmlRow("Nom", payload.name)}
    ${htmlRow("Email", payload.email)}
    ${htmlRow("Téléphone", payload.phone || "Non renseigné")}
    ${htmlRow("Type de projet", payload.projectType)}
    ${htmlRow("Nombre de pages", String(payload.pageCount))}
    <tr>
      <th style="text-align:left;padding:8px 16px 8px 0;border-bottom:1px solid #eee;white-space:nowrap">Options</th>
      <td style="padding:8px 0;border-bottom:1px solid #eee">${options}</td>
    </tr>
    ${htmlRow("Délai souhaité", payload.deadline)}
    ${htmlRow("Estimation indicative", `${payload.estimate} €`)}
  </table>
  <h3 style="margin-top:24px">Message</h3>
  <p style="white-space:pre-wrap;background:#f5f5f5;padding:16px;border-radius:4px">${escapeHtml(payload.message || "Non renseigné")}</p>
</body>
</html>`;
}

export async function sendContactEmail(payload: ContactPayload) {
  const subject = `Nouvelle demande MatoStudio - ${payload.name}`;
  const text = buildContactEmailText(payload);
  const html = buildContactEmailHtml(payload);

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
    html,
  });

  return {
    mode: "smtp",
    sent: true,
  };
}

export async function sendQuoteEmail(payload: QuotePayload) {
  const subject = `Nouvelle estimation MatoStudio - ${payload.name}`;
  const text = buildQuoteEmailText(payload);
  const html = buildQuoteEmailHtml(payload);

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
    html,
  });

  return {
    mode: "smtp",
    sent: true,
  };
}
