import request from "supertest";
import { describe, expect, it } from "vitest";

import { app } from "../app.js";

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
});
