import bcrypt from "bcryptjs";
import request from "supertest";
import { beforeAll, describe, expect, it, vi } from "vitest";

const TEST_PASSWORD = "test-admin-password";

beforeAll(() => {
  process.env.JWT_SECRET = "test-jwt-secret-32-chars-minimum-ok!";
  process.env.ADMIN_PASS_HASH = bcrypt.hashSync(TEST_PASSWORD, 10);
});

vi.mock("../services/stripe.service.js", () => ({
  createCheckoutSession: vi.fn().mockResolvedValue({
    sessionId: "cs_test_fake",
    checkoutUrl: "https://checkout.stripe.com/test",
    qrCodeDataUrl: "data:image/png;base64,fakeqr",
  }),
}));

vi.mock("../services/mail.service.js", () => ({
  sendPaymentRequestEmail: vi.fn().mockResolvedValue({ mode: "dev", sent: false }),
  sendPaymentConfirmationEmail: vi.fn().mockResolvedValue({ mode: "dev", sent: false }),
}));

const MOCK_QUOTE_LEAD = vi.hoisted(() => ({
  id: "lead-001",
  type: "quote",
  name: "Jean Dupont",
  email: "jean@example.com",
  phone: null,
  projectType: "Portfolio",
  budget: null,
  timeline: null,
  pageCount: 3,
  options: "[]",
  deadline: "flexible",
  estimate: 690,
  message: null,
  status: "new",
  internalNote: null,
  reference: "DEVIS-20260607-ABCD",
  finalAmount: null,
  createdAt: new Date("2026-06-07T00:00:00.000Z"),
  updatedAt: new Date("2026-06-07T00:00:00.000Z"),
}));

vi.mock("../db/prisma.js", () => ({
  prisma: {
    lead: {
      create: vi.fn().mockResolvedValue({ id: "lead-001" }),
      findMany: vi.fn().mockResolvedValue([MOCK_QUOTE_LEAD]),
      findUnique: vi.fn().mockResolvedValue(MOCK_QUOTE_LEAD),
      update: vi
        .fn()
        .mockResolvedValue({ ...MOCK_QUOTE_LEAD, status: "approved", finalAmount: 890 }),
      count: vi.fn().mockResolvedValue(1),
      groupBy: vi.fn().mockResolvedValue([{ status: "new", type: "quote", _count: { id: 1 } }]),
    },
    paymentRequest: {
      findUnique: vi.fn().mockResolvedValue(null),
      upsert: vi.fn().mockResolvedValue({
        id: "pr-001",
        leadId: "lead-001",
        amount: 890,
        currency: "eur",
        stripeCheckoutSessionId: "cs_test_fake",
        checkoutUrl: "https://checkout.stripe.com/test",
        status: "CREATED",
      }),
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

  it("sets cookie with SameSite=Lax in non-production environment", async () => {
    const res = await request(app).post("/api/admin/auth/login").send({ password: TEST_PASSWORD });
    expect(res.status).toBe(200);
    const cookieHeader = res.headers["set-cookie"];
    const cookie = Array.isArray(cookieHeader) ? cookieHeader[0] : (cookieHeader as string);
    expect(cookie.toLowerCase()).toContain("samesite=lax");
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

  it("clears cookie with SameSite=Lax in non-production environment", async () => {
    const res = await request(app).post("/api/admin/auth/logout");
    expect(res.status).toBe(200);
    const cookieHeader = res.headers["set-cookie"];
    const cookie = Array.isArray(cookieHeader) ? cookieHeader[0] : (cookieHeader as string);
    expect(cookie.toLowerCase()).toContain("samesite=lax");
  });
});

describe("PATCH /api/admin/leads/:id/approve", () => {
  it("returns 401 without auth", async () => {
    const res = await request(app)
      .patch("/api/admin/leads/lead-001/approve")
      .send({ finalAmount: 890 });
    expect(res.status).toBe(401);
  });

  it("approves lead with finalAmount and returns updated lead", async () => {
    const cookie = await loginAndGetCookie();
    const res = await request(app)
      .patch("/api/admin/leads/lead-001/approve")
      .set("Cookie", cookie)
      .send({ finalAmount: 890 });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.lead.finalAmount).toBe(890);
    expect(res.body.lead.status).toBe("approved");
  });

  it("rejects negative finalAmount", async () => {
    const cookie = await loginAndGetCookie();
    const res = await request(app)
      .patch("/api/admin/leads/lead-001/approve")
      .set("Cookie", cookie)
      .send({ finalAmount: -1 });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("rejects missing finalAmount", async () => {
    const cookie = await loginAndGetCookie();
    const res = await request(app)
      .patch("/api/admin/leads/lead-001/approve")
      .set("Cookie", cookie)
      .send({});
    expect(res.status).toBe(400);
  });
});

describe("POST /api/admin/leads/:id/payment-request", () => {
  it("returns 401 without auth", async () => {
    const res = await request(app).post("/api/admin/leads/lead-001/payment-request");
    expect(res.status).toBe(401);
  });

  it("creates payment request and returns checkoutUrl", async () => {
    const { prisma } = await import("../db/prisma.js");
    vi.mocked(prisma.lead.findUnique).mockResolvedValueOnce({
      ...MOCK_QUOTE_LEAD,
      finalAmount: 890,
    });

    const cookie = await loginAndGetCookie();
    const res = await request(app)
      .post("/api/admin/leads/lead-001/payment-request")
      .set("Cookie", cookie);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.paymentRequest.checkoutUrl).toBe("https://checkout.stripe.com/test");
  });

  it("returns 400 when lead has no finalAmount set", async () => {
    const { prisma } = await import("../db/prisma.js");
    vi.mocked(prisma.lead.findUnique).mockResolvedValueOnce({
      ...MOCK_QUOTE_LEAD,
      finalAmount: null,
    });

    const cookie = await loginAndGetCookie();
    const res = await request(app)
      .post("/api/admin/leads/lead-001/payment-request")
      .set("Cookie", cookie);
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("returns 409 when lead is already PAID", async () => {
    const { prisma } = await import("../db/prisma.js");
    vi.mocked(prisma.lead.findUnique).mockResolvedValueOnce({
      ...MOCK_QUOTE_LEAD,
      finalAmount: 890,
    });
    vi.mocked(prisma.paymentRequest.findUnique).mockResolvedValueOnce({
      id: "pr-001",
      leadId: "lead-001",
      status: "PAID",
      amount: 890,
      currency: "eur",
      stripeCheckoutSessionId: "cs_done",
      stripePaymentIntentId: "pi_done",
      checkoutUrl: "https://checkout.stripe.com/done",
      qrCodeDataUrl: null,
      createdAt: new Date(),
      paidAt: new Date(),
    });

    const cookie = await loginAndGetCookie();
    const res = await request(app)
      .post("/api/admin/leads/lead-001/payment-request")
      .set("Cookie", cookie);
    expect(res.status).toBe(409);
  });

  it("response does not expose stripeSecretKey or internal secrets", async () => {
    const { prisma } = await import("../db/prisma.js");
    vi.mocked(prisma.lead.findUnique).mockResolvedValueOnce({
      ...MOCK_QUOTE_LEAD,
      finalAmount: 890,
    });

    const cookie = await loginAndGetCookie();
    const res = await request(app)
      .post("/api/admin/leads/lead-001/payment-request")
      .set("Cookie", cookie);
    const body = JSON.stringify(res.body);
    expect(body).not.toContain("sk_");
    expect(body).not.toContain("whsec_");
    expect(body).not.toContain("qrCodeDataUrl");
  });
});
