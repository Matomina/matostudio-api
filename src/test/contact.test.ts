import request from "supertest";
import { describe, expect, it, vi } from "vitest";

vi.mock("express-rate-limit", () => ({
  default: () => (_req: unknown, _res: unknown, next: () => void) => next(),
}));

vi.mock("../db/prisma.js", () => ({
  prisma: { lead: { create: vi.fn().mockResolvedValue({ id: "test-id" }) } },
}));

vi.mock("../services/mail.service.js", () => ({
  sendContactEmail: vi.fn().mockResolvedValue({ mode: "dev", sent: false }),
}));

import { app } from "../app.js";
import { prisma } from "../db/prisma.js";
import { sendContactEmail } from "../services/mail.service.js";

const validContact = {
  name: "Test User",
  email: "test@example.com",
  phone: "+33600000000",
  projectType: "Site vitrine",
  budget: "2000-5000 EUR",
  timeline: "1 mois",
  message: "Bonjour, je souhaite un devis pour mon projet web.",
};

describe("POST /api/contact", () => {
  it("accepts a valid payload", async () => {
    const res = await request(app).post("/api/contact").send(validContact);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("rejects an invalid email", async () => {
    const res = await request(app)
      .post("/api/contact")
      .send({ ...validContact, email: "not-an-email" });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("rejects a missing required field (name)", async () => {
    const { name: _name, ...withoutName } = validContact;
    const res = await request(app).post("/api/contact").send(withoutName);
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("rejects a missing required field (message)", async () => {
    const { message: _message, ...withoutMessage } = validContact;
    const res = await request(app).post("/api/contact").send(withoutMessage);
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("accepts the frontend-compatible payload shape", async () => {
    const frontendPayload = {
      name: "Matomina",
      email: "matomina@example.com",
      phone: "",
      projectType: "Portfolio",
      budget: "1000-3000 EUR",
      timeline: "2 semaines",
      message: "Demande de contact depuis le formulaire du site.",
    };
    const res = await request(app).post("/api/contact").send(frontendPayload);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("responds 200 with delivery:failed even if email send throws", async () => {
    vi.mocked(sendContactEmail).mockRejectedValueOnce(new Error("SMTP unreachable"));
    const res = await request(app).post("/api/contact").send(validContact);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.delivery).toBe("failed");
  });

  it("returns 500 if lead creation fails", async () => {
    vi.mocked(prisma.lead.create).mockRejectedValueOnce(new Error("DB error"));
    const res = await request(app).post("/api/contact").send(validContact);
    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
  });
});
