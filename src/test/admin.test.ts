import bcrypt from "bcryptjs";
import request from "supertest";
import { beforeAll, describe, expect, it, vi } from "vitest";

const TEST_PASSWORD = "test-admin-password";

beforeAll(() => {
  process.env.JWT_SECRET = "test-jwt-secret-32-chars-minimum-ok!";
  process.env.ADMIN_PASS_HASH = bcrypt.hashSync(TEST_PASSWORD, 10);
});

vi.mock("../db/prisma.js", () => ({
  prisma: {
    lead: {
      create: vi.fn().mockResolvedValue({ id: "lead-001" }),
      findMany: vi.fn().mockResolvedValue([
        {
          id: "lead-001",
          type: "contact",
          name: "Jean Dupont",
          email: "jean@example.com",
          phone: null,
          projectType: "Site vitrine",
          budget: "2000-5000",
          timeline: "2-3 mois",
          pageCount: null,
          options: null,
          deadline: null,
          estimate: null,
          message: "Projet.",
          status: "new",
          internalNote: null,
          createdAt: "2026-06-06T00:00:00.000Z",
          updatedAt: "2026-06-06T00:00:00.000Z",
        },
      ]),
      findUnique: vi.fn().mockResolvedValue({
        id: "lead-001",
        type: "contact",
        name: "Jean Dupont",
        email: "jean@example.com",
        phone: null,
        projectType: "Site vitrine",
        budget: "2000-5000",
        timeline: "2-3 mois",
        pageCount: null,
        options: null,
        deadline: null,
        estimate: null,
        message: "Projet.",
        status: "new",
        internalNote: null,
        createdAt: "2026-06-06T00:00:00.000Z",
        updatedAt: "2026-06-06T00:00:00.000Z",
      }),
      update: vi.fn().mockResolvedValue({
        id: "lead-001",
        status: "in_discussion",
      }),
      count: vi.fn().mockResolvedValue(1),
      groupBy: vi.fn().mockResolvedValue([{ status: "new", type: "contact", _count: { id: 1 } }]),
    },
  },
}));

import { app } from "../app.js";

async function loginAndGetCookie(): Promise<string> {
  const res = await request(app).post("/api/admin/auth/login").send({ password: TEST_PASSWORD });
  expect(res.status).toBe(200);
  const setCookieHeader = res.headers["set-cookie"];
  return Array.isArray(setCookieHeader) ? setCookieHeader[0] : (setCookieHeader as string);
}

describe("POST /api/admin/auth/login", () => {
  it("returns 200 and sets cookie with correct password", async () => {
    const res = await request(app).post("/api/admin/auth/login").send({ password: TEST_PASSWORD });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.headers["set-cookie"]).toBeDefined();
  });

  it("returns 401 with wrong password", async () => {
    const res = await request(app)
      .post("/api/admin/auth/login")
      .send({ password: "wrong-password" });
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it("returns 400 with missing password", async () => {
    const res = await request(app).post("/api/admin/auth/login").send({});
    expect(res.status).toBe(400);
  });
});

describe("GET /api/admin/auth/me", () => {
  it("returns 401 without auth cookie", async () => {
    const res = await request(app).get("/api/admin/auth/me");
    expect(res.status).toBe(401);
  });

  it("returns 200 with valid auth cookie", async () => {
    const cookie = await loginAndGetCookie();
    const res = await request(app).get("/api/admin/auth/me").set("Cookie", cookie);
    expect(res.status).toBe(200);
    expect(res.body.role).toBe("admin");
  });
});

describe("GET /api/admin/leads", () => {
  it("returns 401 without auth", async () => {
    const res = await request(app).get("/api/admin/leads");
    expect(res.status).toBe(401);
  });

  it("returns leads list with auth", async () => {
    const cookie = await loginAndGetCookie();
    const res = await request(app).get("/api/admin/leads").set("Cookie", cookie);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.leads)).toBe(true);
  });
});

describe("GET /api/admin/leads/:id", () => {
  it("returns 401 without auth", async () => {
    const res = await request(app).get("/api/admin/leads/lead-001");
    expect(res.status).toBe(401);
  });

  it("returns lead detail with auth", async () => {
    const cookie = await loginAndGetCookie();
    const res = await request(app).get("/api/admin/leads/lead-001").set("Cookie", cookie);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.lead.id).toBe("lead-001");
  });
});

describe("GET /api/admin/stats", () => {
  it("returns 401 without auth", async () => {
    const res = await request(app).get("/api/admin/stats");
    expect(res.status).toBe(401);
  });

  it("returns stats with auth", async () => {
    const cookie = await loginAndGetCookie();
    const res = await request(app).get("/api/admin/stats").set("Cookie", cookie);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(typeof res.body.stats.total).toBe("number");
  });
});

describe("PATCH /api/admin/leads/:id/status", () => {
  it("returns 401 without auth", async () => {
    const res = await request(app)
      .patch("/api/admin/leads/lead-001/status")
      .send({ status: "in_discussion" });
    expect(res.status).toBe(401);
  });

  it("updates status with auth", async () => {
    const cookie = await loginAndGetCookie();
    const res = await request(app)
      .patch("/api/admin/leads/lead-001/status")
      .set("Cookie", cookie)
      .send({ status: "in_discussion" });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("rejects invalid status", async () => {
    const cookie = await loginAndGetCookie();
    const res = await request(app)
      .patch("/api/admin/leads/lead-001/status")
      .set("Cookie", cookie)
      .send({ status: "not-a-valid-status" });
    expect(res.status).toBe(400);
  });
});

describe("PATCH /api/admin/leads/:id/note", () => {
  it("returns 401 without auth", async () => {
    const res = await request(app)
      .patch("/api/admin/leads/lead-001/note")
      .send({ internalNote: "Note test" });
    expect(res.status).toBe(401);
  });

  it("updates note with auth", async () => {
    const cookie = await loginAndGetCookie();
    const res = await request(app)
      .patch("/api/admin/leads/lead-001/note")
      .set("Cookie", cookie)
      .send({ internalNote: "À rappeler jeudi" });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe("POST /api/admin/auth/logout", () => {
  it("clears cookie and returns 200", async () => {
    const cookie = await loginAndGetCookie();
    const res = await request(app).post("/api/admin/auth/logout").set("Cookie", cookie);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
