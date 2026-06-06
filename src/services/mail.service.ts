import { Resend } from "resend";

import { env } from "../config/env.js";
import { prisma } from "../db/prisma.js";
import type { ContactPayload } from "../schemas/contact.schema.js";
import type { QuotePayload } from "../schemas/quote.schema.js";

// ─── Email types ────────────────────────────────────────────────────────────
export const EMAIL_TYPE = {
  CONTACT_NOTIFICATION_ADMIN: "CONTACT_NOTIFICATION_ADMIN",
  QUOTE_NOTIFICATION_ADMIN: "QUOTE_NOTIFICATION_ADMIN",
  QUOTE_CONFIRMATION_CLIENT: "QUOTE_CONFIRMATION_CLIENT",
  PAYMENT_REQUEST_CLIENT: "PAYMENT_REQUEST_CLIENT",
  PAYMENT_CONFIRMATION_CLIENT: "PAYMENT_CONFIRMATION_CLIENT",
} as const;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function hasResendConfig() {
  return Boolean(env.resendApiKey && env.mailFrom && env.mailTo);
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

async function sendViaResend(options: {
  to: string;
  subject: string;
  text: string;
  html: string;
  replyTo?: string;
}): Promise<{ messageId: string | undefined }> {
  const resend = new Resend(env.resendApiKey!);
  const { data, error } = await resend.emails.send({
    from: env.mailFrom!,
    to: options.to,
    ...(options.replyTo ? { replyTo: options.replyTo } : {}),
    subject: options.subject,
    text: options.text,
    html: options.html,
  });
  if (error) {
    throw new Error(`Resend error: ${error.message}`);
  }
  return { messageId: data?.id };
}

function logEmail(opts: {
  leadId: string;
  type: string;
  recipient: string;
  subject: string;
  status: "sent" | "failed";
  providerMessageId?: string;
  errorMessage?: string;
}): void {
  prisma.emailLog
    .create({
      data: {
        leadId: opts.leadId,
        type: opts.type,
        recipient: opts.recipient,
        subject: opts.subject,
        status: opts.status,
        providerMessageId: opts.providerMessageId ?? null,
        errorMessage: opts.errorMessage ?? null,
        sentAt: opts.status === "sent" ? new Date() : null,
      },
    })
    .catch((err: unknown) => console.error("[EMAIL_LOG_WRITE_FAILED]", err));
}

// ─── Email builders ───────────────────────────────────────────────────────────

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

// ─── Send functions ───────────────────────────────────────────────────────────

export async function sendContactEmail(payload: ContactPayload) {
  const subject = `Nouvelle demande MatoStudio - ${payload.name}`;
  const text = buildContactEmailText(payload);
  const html = buildContactEmailHtml(payload);

  if (!hasResendConfig()) {
    console.log("[CONTACT_EMAIL_DEV_MODE]");
    console.log(text);
    return { mode: "dev", sent: false };
  }

  const { messageId } = await sendViaResend({
    to: env.mailTo!,
    subject,
    text,
    html,
    replyTo: payload.email,
  });
  return { mode: "resend", sent: true, messageId };
}

/** Admin notification when a quote is submitted. */
export async function sendQuoteAdminNotification(
  payload: QuotePayload,
  opts: { leadId: string; reference: string },
) {
  const subject = `Nouveau devis MatoStudio - ${opts.reference} - ${payload.name}`;
  const text = buildQuoteEmailText(payload);
  const html = buildQuoteAdminHtml(payload, opts.reference);

  if (!hasResendConfig()) {
    console.log("[QUOTE_ADMIN_NOTIFICATION_DEV_MODE]");
    console.log(text);
    logEmail({
      leadId: opts.leadId,
      type: EMAIL_TYPE.QUOTE_NOTIFICATION_ADMIN,
      recipient: env.mailTo ?? "dev",
      subject,
      status: "sent",
    });
    return { mode: "dev", sent: false };
  }

  try {
    const { messageId } = await sendViaResend({ to: env.mailTo!, subject, text, html });
    logEmail({
      leadId: opts.leadId,
      type: EMAIL_TYPE.QUOTE_NOTIFICATION_ADMIN,
      recipient: env.mailTo!,
      subject,
      status: "sent",
      providerMessageId: messageId,
    });
    return { mode: "resend", sent: true };
  } catch (err) {
    logEmail({
      leadId: opts.leadId,
      type: EMAIL_TYPE.QUOTE_NOTIFICATION_ADMIN,
      recipient: env.mailTo!,
      subject,
      status: "failed",
      errorMessage: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}

/** Client confirmation after quote submission. */
export async function sendQuoteClientConfirmation(
  payload: QuotePayload,
  opts: { leadId: string; reference: string },
) {
  const subject = `Votre demande de devis a bien été reçue — ${opts.reference}`;
  const text = buildQuoteClientConfirmationText(payload, opts.reference);
  const html = buildQuoteClientConfirmationHtml(payload, opts.reference);

  if (!hasResendConfig()) {
    console.log("[QUOTE_CLIENT_CONFIRMATION_DEV_MODE]");
    console.log(text);
    logEmail({
      leadId: opts.leadId,
      type: EMAIL_TYPE.QUOTE_CONFIRMATION_CLIENT,
      recipient: payload.email,
      subject,
      status: "sent",
    });
    return { mode: "dev", sent: false };
  }

  try {
    const { messageId } = await sendViaResend({
      to: payload.email,
      subject,
      text,
      html,
      replyTo: env.mailTo,
    });
    logEmail({
      leadId: opts.leadId,
      type: EMAIL_TYPE.QUOTE_CONFIRMATION_CLIENT,
      recipient: payload.email,
      subject,
      status: "sent",
      providerMessageId: messageId,
    });
    return { mode: "resend", sent: true };
  } catch (err) {
    logEmail({
      leadId: opts.leadId,
      type: EMAIL_TYPE.QUOTE_CONFIRMATION_CLIENT,
      recipient: payload.email,
      subject,
      status: "failed",
      errorMessage: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}

/** Payment request email sent to client after admin approves the quote. */
export async function sendPaymentRequestEmail(lead: {
  id: string;
  name: string;
  email: string;
  reference: string | null;
  finalAmount: number | null;
  projectType: string;
  estimate: number | null;
  checkoutUrl: string;
}) {
  const reference = lead.reference ?? "N/A";
  const amount = lead.finalAmount ?? lead.estimate ?? 0;
  const subject = `Votre devis est validé — Paiement sécurisé — ${reference}`;
  const text = buildPaymentRequestText(lead, reference, amount, lead.checkoutUrl);
  const html = buildPaymentRequestHtml(
    { name: lead.name, projectType: lead.projectType, checkoutUrl: lead.checkoutUrl },
    reference,
    amount,
  );

  if (!hasResendConfig()) {
    console.log("[PAYMENT_REQUEST_EMAIL_DEV_MODE]");
    console.log(text);
    logEmail({
      leadId: lead.id,
      type: EMAIL_TYPE.PAYMENT_REQUEST_CLIENT,
      recipient: lead.email,
      subject,
      status: "sent",
    });
    return { mode: "dev", sent: false };
  }

  try {
    const { messageId } = await sendViaResend({
      to: lead.email,
      subject,
      text,
      html,
      replyTo: env.mailTo,
    });
    logEmail({
      leadId: lead.id,
      type: EMAIL_TYPE.PAYMENT_REQUEST_CLIENT,
      recipient: lead.email,
      subject,
      status: "sent",
      providerMessageId: messageId,
    });
    return { mode: "resend", sent: true };
  } catch (err) {
    logEmail({
      leadId: lead.id,
      type: EMAIL_TYPE.PAYMENT_REQUEST_CLIENT,
      recipient: lead.email,
      subject,
      status: "failed",
      errorMessage: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}

/** Payment confirmation email sent to client after Stripe webhook. */
export async function sendPaymentConfirmationEmail(lead: {
  id: string;
  name: string;
  email: string;
  reference: string | null;
  finalAmount: number | null;
  projectType: string;
}) {
  const reference = lead.reference ?? "N/A";
  const amount = lead.finalAmount ?? 0;
  const subject = `Paiement confirmé — ${reference}`;
  const text = buildPaymentConfirmationText(lead, reference, amount);
  const html = buildPaymentConfirmationHtml(lead, reference, amount);

  if (!hasResendConfig()) {
    console.log("[PAYMENT_CONFIRMATION_EMAIL_DEV_MODE]");
    console.log(text);
    logEmail({
      leadId: lead.id,
      type: EMAIL_TYPE.PAYMENT_CONFIRMATION_CLIENT,
      recipient: lead.email,
      subject,
      status: "sent",
    });
    return { mode: "dev", sent: false };
  }

  try {
    const { messageId } = await sendViaResend({
      to: lead.email,
      subject,
      text,
      html,
      replyTo: env.mailTo,
    });
    logEmail({
      leadId: lead.id,
      type: EMAIL_TYPE.PAYMENT_CONFIRMATION_CLIENT,
      recipient: lead.email,
      subject,
      status: "sent",
      providerMessageId: messageId,
    });
    return { mode: "resend", sent: true };
  } catch (err) {
    logEmail({
      leadId: lead.id,
      type: EMAIL_TYPE.PAYMENT_CONFIRMATION_CLIENT,
      recipient: lead.email,
      subject,
      status: "failed",
      errorMessage: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}

// ─── HTML templates ────────────────────────────────────────────────────────────

function buildQuoteAdminHtml(payload: QuotePayload, reference: string): string {
  const options =
    payload.options.length > 0 ? payload.options.map(escapeHtml).join(", ") : "Aucune";
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Nouveau devis — ${escapeHtml(reference)}</title></head>
<body style="font-family:sans-serif;color:#222;max-width:600px;margin:0 auto;padding:24px">
  <h2 style="color:#1a1a1a;margin-bottom:4px">Nouveau devis — ${escapeHtml(reference)}</h2>
  <p style="color:#666;margin-top:0;margin-bottom:24px">Reçu via le simulateur MatoStudio</p>
  <table style="border-collapse:collapse;width:100%">
    ${htmlRow("Référence", reference)}
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
  <h3 style="margin-top:24px">Message client</h3>
  <p style="white-space:pre-wrap;background:#f5f5f5;padding:16px;border-radius:4px">${escapeHtml(payload.message || "Non renseigné")}</p>
  <p style="margin-top:24px">
    <a href="${escapeHtml(env.adminDashboardUrl ?? "")}" style="background:#1a1a1a;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600">Voir dans le dashboard →</a>
  </p>
</body>
</html>`;
}

function buildQuoteClientConfirmationText(payload: QuotePayload, reference: string): string {
  return [
    `Bonjour ${payload.name},`,
    "",
    "Nous avons bien reçu votre demande de devis.",
    `Référence : ${reference}`,
    "",
    "Résumé de votre demande :",
    `  Type de projet : ${payload.projectType}`,
    `  Nombre de pages : ${payload.pageCount}`,
    `  Options : ${payload.options.length > 0 ? payload.options.join(", ") : "Aucune"}`,
    `  Délai souhaité : ${payload.deadline}`,
    `  Estimation indicative : ${payload.estimate} €`,
    "",
    "Notre équipe reviendra vers vous dans les 24 à 48 heures ouvrées.",
    "",
    "À bientôt,",
    "L'équipe MatoStudio",
  ].join("\n");
}

function buildQuoteClientConfirmationHtml(payload: QuotePayload, reference: string): string {
  const options =
    payload.options.length > 0 ? payload.options.map(escapeHtml).join(", ") : "Aucune";
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Votre demande de devis — ${escapeHtml(reference)}</title></head>
<body style="font-family:sans-serif;color:#222;max-width:600px;margin:0 auto;padding:24px">
  <h2 style="color:#1a1a1a;margin-bottom:4px">Demande bien reçue ✓</h2>
  <p style="color:#666;margin-top:0">Bonjour <strong>${escapeHtml(payload.name)}</strong>, nous avons enregistré votre demande de devis.</p>
  <div style="background:#f9f9f9;border-left:4px solid #1a1a1a;padding:16px;border-radius:4px;margin-bottom:24px">
    <strong>Référence :</strong> ${escapeHtml(reference)}
  </div>
  <h3>Résumé de votre demande</h3>
  <table style="border-collapse:collapse;width:100%">
    ${htmlRow("Type de projet", payload.projectType)}
    ${htmlRow("Nombre de pages", String(payload.pageCount))}
    <tr>
      <th style="text-align:left;padding:8px 16px 8px 0;border-bottom:1px solid #eee;white-space:nowrap">Options</th>
      <td style="padding:8px 0;border-bottom:1px solid #eee">${options}</td>
    </tr>
    ${htmlRow("Délai souhaité", payload.deadline)}
    ${htmlRow("Estimation indicative", `${payload.estimate} €`)}
  </table>
  <p style="margin-top:24px;color:#444">Notre équipe reviendra vers vous dans les <strong>24 à 48 heures ouvrées</strong>.</p>
  <p style="color:#888;font-size:13px;margin-top:32px;border-top:1px solid #eee;padding-top:16px">
    MatoStudio · <a href="${escapeHtml(env.frontendUrl)}" style="color:#888">${escapeHtml(env.frontendUrl)}</a>
  </p>
</body>
</html>`;
}

function buildPaymentRequestText(
  lead: { name: string; projectType: string },
  reference: string,
  amount: number,
  checkoutUrl: string,
): string {
  return [
    `Bonjour ${lead.name},`,
    "",
    "Votre devis a été validé. Vous pouvez maintenant procéder au paiement sécurisé.",
    "",
    `Référence : ${reference}`,
    `Prestation : ${lead.projectType}`,
    `Montant à régler : ${amount} €`,
    "",
    "Lien de paiement sécurisé :",
    checkoutUrl,
    "",
    "Ce lien est valable 24 heures.",
    "",
    "À bientôt,",
    "L'équipe MatoStudio",
  ].join("\n");
}

function buildPaymentRequestHtml(
  lead: { name: string; projectType: string; checkoutUrl: string },
  reference: string,
  amount: number,
): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Paiement sécurisé — ${escapeHtml(reference)}</title></head>
<body style="font-family:sans-serif;color:#222;max-width:600px;margin:0 auto;padding:24px">
  <h2 style="color:#1a1a1a;margin-bottom:4px">Votre devis est validé ✓</h2>
  <p style="color:#666;margin-top:0">Bonjour <strong>${escapeHtml(lead.name)}</strong>, vous pouvez maintenant procéder au paiement.</p>
  <div style="background:#f9f9f9;border-left:4px solid #1a1a1a;padding:16px;border-radius:4px;margin-bottom:24px">
    <p style="margin:0"><strong>Référence :</strong> ${escapeHtml(reference)}</p>
    <p style="margin:8px 0 0"><strong>Prestation :</strong> ${escapeHtml(lead.projectType)}</p>
    <p style="margin:8px 0 0;font-size:18px"><strong>Montant :</strong> ${amount} €</p>
  </div>
  <p style="text-align:center;margin:32px 0">
    <a href="${escapeHtml(lead.checkoutUrl)}"
       style="background:#635bff;color:#fff;padding:16px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:16px;display:inline-block">
      Payer maintenant — ${amount} €
    </a>
  </p>
  <p style="color:#666;font-size:13px;text-align:center">Paiement sécurisé par Stripe · Ce lien est valable 24 heures</p>
  <p style="color:#444;font-size:13px;margin-top:24px">
    Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br>
    <a href="${escapeHtml(lead.checkoutUrl)}" style="color:#635bff;word-break:break-all">${escapeHtml(lead.checkoutUrl)}</a>
  </p>
  <p style="color:#888;font-size:13px;margin-top:32px;border-top:1px solid #eee;padding-top:16px">
    MatoStudio · <a href="${escapeHtml(env.frontendUrl)}" style="color:#888">${escapeHtml(env.frontendUrl)}</a>
  </p>
</body>
</html>`;
}

function buildPaymentConfirmationText(
  lead: { name: string; projectType: string },
  reference: string,
  amount: number,
): string {
  return [
    `Bonjour ${lead.name},`,
    "",
    "Nous avons bien reçu votre paiement. Merci !",
    "",
    `Référence : ${reference}`,
    `Prestation : ${lead.projectType}`,
    `Montant réglé : ${amount} €`,
    "",
    "Notre équipe va prendre en charge votre projet et vous contactera sous 24 heures ouvrées.",
    "",
    "À très bientôt,",
    "L'équipe MatoStudio",
  ].join("\n");
}

function buildPaymentConfirmationHtml(
  lead: { name: string; projectType: string },
  reference: string,
  amount: number,
): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Paiement confirmé — ${escapeHtml(reference)}</title></head>
<body style="font-family:sans-serif;color:#222;max-width:600px;margin:0 auto;padding:24px">
  <h2 style="color:#1a1a1a;margin-bottom:4px">Paiement confirmé ✓</h2>
  <p style="color:#666;margin-top:0">Bonjour <strong>${escapeHtml(lead.name)}</strong>, nous avons bien reçu votre règlement.</p>
  <div style="background:#f0fdf4;border-left:4px solid #16a34a;padding:16px;border-radius:4px;margin-bottom:24px">
    <p style="margin:0"><strong>Référence :</strong> ${escapeHtml(reference)}</p>
    <p style="margin:8px 0 0"><strong>Prestation :</strong> ${escapeHtml(lead.projectType)}</p>
    <p style="margin:8px 0 0;font-size:18px;color:#16a34a"><strong>Montant réglé :</strong> ${amount} €</p>
  </div>
  <p style="color:#444">Notre équipe va prendre en charge votre projet et vous contactera sous <strong>24 heures ouvrées</strong>.</p>
  <p style="color:#888;font-size:13px;margin-top:32px;border-top:1px solid #eee;padding-top:16px">
    MatoStudio · <a href="${escapeHtml(env.frontendUrl)}" style="color:#888">${escapeHtml(env.frontendUrl)}</a>
  </p>
</body>
</html>`;
}
