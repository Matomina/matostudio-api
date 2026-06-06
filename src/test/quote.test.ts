import request from "supertest";
import { describe, expect, it, vi } from "vitest";

vi.mock("express-rate-limit", () => ({
  default: () => (_req: unknown, _res: unknown, next: () => void) => next(),
}));

vi.mock("../db/prisma.js", () => ({
  prisma: { lead: { create: vi.fn().mockResolvedValue({ id: "test-id" }) } },
}));

vi.mock("../services/mail.service.js", () => ({
  sendQuoteEmail: vi.fn().mockResolvedValue({ mode: "dev", sent: false }),
}));

import { app } from "../app.js";
import { prisma } from "../db/prisma.js";
import { sendQuoteEmail } from "../services/mail.service.js";

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
  it("accepts a valid payload", async () => {
    const res = await request(app).post("/api/quote").send(validQuote);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
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

  it("responds 200 with delivery:failed even if email send throws", async () => {
    vi.mocked(sendQuoteEmail).mockRejectedValueOnce(new Error("SMTP unreachable"));
    const res = await request(app).post("/api/quote").send(validQuote);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.delivery).toBe("failed");
  });

  it("returns 500 if lead creation fails", async () => {
    vi.mocked(prisma.lead.create).mockRejectedValueOnce(new Error("DB error"));
    const res = await request(app).post("/api/quote").send(validQuote);
    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
  });
});
