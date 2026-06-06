import request from "supertest";
import { describe, expect, it, vi } from "vitest";

vi.mock("express-rate-limit", () => ({
  default: () => (_req: unknown, _res: unknown, next: () => void) => next(),
}));

vi.mock("../db/prisma.js", () => ({
  prisma: {
    lead: {
      create: vi.fn().mockResolvedValue({ id: "test-id", reference: "DEVIS-20260607-TEST" }),
    },
  },
}));

vi.mock("../services/mail.service.js", () => ({
  sendQuoteAdminNotification: vi.fn().mockResolvedValue({ mode: "dev", sent: false }),
  sendQuoteClientConfirmation: vi.fn().mockResolvedValue({ mode: "dev", sent: false }),
}));

import { app } from "../app.js";
import { prisma } from "../db/prisma.js";
import {
  sendQuoteAdminNotification,
  sendQuoteClientConfirmation,
} from "../services/mail.service.js";

const validQuote = {
  name: "Test User",
  email: "test@example.com",
  phone: "+33600000000",
  projectType: "E-commerce",
  pageCount: 5,
  options: ["seo", "content"],
  deadline: "flexible",
  estimate: 1290,
  message: "Projet de boutique en ligne.",
};

describe("POST /api/quote", () => {
  it("accepts a valid payload and returns reference", async () => {
    const res = await request(app).post("/api/quote").send(validQuote);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.reference).toMatch(/^DEVIS-\d{8}-[A-Z0-9]{4}$/);
  });

  it("rejects an invalid pageCount (zero)", async () => {
    const res = await request(app)
      .post("/api/quote")
      .send({ ...validQuote, pageCount: 0 });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("rejects a negative estimate", async () => {
    const res = await request(app)
      .post("/api/quote")
      .send({ ...validQuote, estimate: -100 });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("rejects a missing required field (name)", async () => {
    const { name: _name, ...withoutName } = validQuote;
    const res = await request(app).post("/api/quote").send(withoutName);
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("accepts the frontend-compatible payload shape", async () => {
    const frontendPayload = {
      name: "Matomina",
      email: "matomina@example.com",
      phone: "",
      projectType: "Portfolio",
      pageCount: 3,
      options: [],
      deadline: "standard",
      estimate: 690,
      message: "",
    };
    const res = await request(app).post("/api/quote").send(frontendPayload);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("calls sendQuoteAdminNotification with correct data", async () => {
    await request(app).post("/api/quote").send(validQuote);
    expect(sendQuoteAdminNotification).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Test User", email: "test@example.com" }),
      expect.objectContaining({ reference: expect.stringMatching(/^DEVIS-/) }),
    );
  });

  it("calls sendQuoteClientConfirmation with correct data", async () => {
    await request(app).post("/api/quote").send(validQuote);
    expect(sendQuoteClientConfirmation).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Test User", email: "test@example.com" }),
      expect.objectContaining({ reference: expect.stringMatching(/^DEVIS-/) }),
    );
  });

  it("responds 200 with delivery.admin:failed even if admin email throws", async () => {
    vi.mocked(sendQuoteAdminNotification).mockRejectedValueOnce(new Error("Resend unreachable"));
    const res = await request(app).post("/api/quote").send(validQuote);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.delivery.admin).toBe("failed");
  });

  it("responds 200 with delivery.client:failed even if client email throws", async () => {
    vi.mocked(sendQuoteClientConfirmation).mockRejectedValueOnce(new Error("Resend unreachable"));
    const res = await request(app).post("/api/quote").send(validQuote);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.delivery.client).toBe("failed");
  });

  it("returns 500 if lead creation fails", async () => {
    vi.mocked(prisma.lead.create).mockRejectedValueOnce(new Error("DB error"));
    const res = await request(app).post("/api/quote").send(validQuote);
    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
  });
});
