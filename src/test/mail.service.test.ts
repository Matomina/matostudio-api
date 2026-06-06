import { beforeEach, describe, expect, it, vi } from "vitest";

const mockSend = vi.hoisted(() => vi.fn());

vi.mock("resend", () => ({
  Resend: vi.fn().mockImplementation(function (this: { emails: { send: typeof mockSend } }) {
    this.emails = { send: mockSend };
  }),
}));

vi.mock("../config/env.js", () => ({
  env: {
    resendApiKey: "re_test_key",
    mailFrom: "MatoStudio <noreply@matostudio.fr>",
    mailTo: "contact@matostudio.fr",
    frontendUrl: "https://matostudio.fr",
    adminDashboardUrl: "https://matostudio.fr/admin",
  },
}));

// prisma mock so logEmail fire-and-forget does not blow up
vi.mock("../db/prisma.js", () => ({
  prisma: {
    emailLog: { create: vi.fn().mockResolvedValue({}) },
  },
}));

import { sendContactEmail, sendQuoteAdminNotification } from "../services/mail.service.js";

const validContact = {
  name: "Test User",
  email: "test@example.com",
  phone: "+33600000000",
  projectType: "Site vitrine",
  budget: "2000-5000 EUR",
  timeline: "1 mois",
  message: "Bonjour, je souhaite un devis.",
};

const validQuote = {
  name: "Test User",
  email: "test@example.com",
  phone: "+33600000000",
  projectType: "E-commerce",
  pageCount: 5,
  options: ["seo"],
  deadline: "flexible",
  estimate: 1290,
  message: "Projet boutique.",
};

beforeEach(() => {
  mockSend.mockReset();
  mockSend.mockResolvedValue({ data: { id: "resend-test-id" }, error: null });
});

describe("sendContactEmail", () => {
  it("returns mode:resend when Resend succeeds", async () => {
    const result = await sendContactEmail(validContact);
    expect(result).toEqual(expect.objectContaining({ mode: "resend", sent: true }));
  });

  it("calls Resend with correct from/to/replyTo/subject", async () => {
    await sendContactEmail(validContact);
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "MatoStudio <noreply@matostudio.fr>",
        to: "contact@matostudio.fr",
        replyTo: validContact.email,
        subject: expect.stringContaining(validContact.name),
      }),
    );
  });

  it("throws when Resend returns an error object", async () => {
    mockSend.mockResolvedValueOnce({
      data: null,
      error: { message: "API key invalid", name: "validation_error" },
    });
    await expect(sendContactEmail(validContact)).rejects.toThrow("Resend error");
  });
});

describe("sendQuoteAdminNotification", () => {
  it("returns mode:resend when Resend succeeds", async () => {
    const result = await sendQuoteAdminNotification(validQuote, {
      leadId: "lead-001",
      reference: "DEVIS-20260607-TEST",
    });
    expect(result).toEqual({ mode: "resend", sent: true });
  });

  it("calls Resend with correct from/to and reference in subject", async () => {
    await sendQuoteAdminNotification(validQuote, {
      leadId: "lead-001",
      reference: "DEVIS-20260607-TEST",
    });
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "MatoStudio <noreply@matostudio.fr>",
        to: "contact@matostudio.fr",
        subject: expect.stringContaining("DEVIS-20260607-TEST"),
      }),
    );
  });

  it("throws when Resend returns an error object", async () => {
    mockSend.mockResolvedValueOnce({
      data: null,
      error: { message: "Rate limit exceeded", name: "rate_limit_exceeded" },
    });
    await expect(
      sendQuoteAdminNotification(validQuote, {
        leadId: "lead-001",
        reference: "DEVIS-20260607-TEST",
      }),
    ).rejects.toThrow("Resend error");
  });
});
