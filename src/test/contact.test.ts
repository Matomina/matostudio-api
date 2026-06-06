import request from "supertest";
import { describe, expect, it } from "vitest";

import { app } from "../app.js";

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
});
