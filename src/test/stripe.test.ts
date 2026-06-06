import request from "supertest";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const mockConstructEvent = vi.hoisted(() => vi.fn());
const mockPaymentRequestUpdate = vi.hoisted(() => vi.fn());
const mockLeadUpdate = vi.hoisted(() => vi.fn());
const mockLeadFindUnique = vi.hoisted(() => vi.fn());
const mockPaymentRequestFindUnique = vi.hoisted(() => vi.fn());

vi.mock("stripe", () => ({
  default: vi.fn().mockImplementation(function (this: {
    webhooks: { constructEvent: typeof mockConstructEvent };
  }) {
    this.webhooks = { constructEvent: mockConstructEvent };
  }),
}));

vi.mock("../db/prisma.js", () => ({
  prisma: {
    paymentRequest: {
      findUnique: mockPaymentRequestFindUnique,
      update: mockPaymentRequestUpdate,
    },
    lead: {
      update: mockLeadUpdate,
      findUnique: mockLeadFindUnique,
    },
  },
}));

vi.mock("../services/mail.service.js", () => ({
  sendPaymentConfirmationEmail: vi.fn().mockResolvedValue({ mode: "dev", sent: false }),
}));

vi.mock("../config/env.js", () => ({
  env: {
    nodeEnv: "test",
    port: 3000,
    frontendOrigins: ["http://localhost:5173"],
    stripeSecretKey: "sk_test_fake",
    stripeWebhookSecret: "whsec_test_fake",
    stripeCurrency: "eur",
    paymentSuccessUrl: "http://localhost:5173/succes",
    paymentCancelUrl: "http://localhost:5173/annule",
    frontendUrl: "http://localhost:5173",
    adminDashboardUrl: "http://localhost:5173/admin",
    resendApiKey: undefined,
    mailFrom: undefined,
    mailTo: undefined,
  },
}));

import { app } from "../app.js";

const FAKE_LEAD = {
  id: "lead-001",
  name: "Jean Dupont",
  email: "jean@example.com",
  reference: "DEVIS-20260607-ABCD",
  finalAmount: 1290,
  projectType: "Portfolio",
};

const buildSessionEvent = (quoteId: string, paymentIntent = "pi_test_123") =>
  ({
    type: "checkout.session.completed",
    data: {
      object: {
        metadata: { quoteId },
        payment_intent: paymentIntent,
      },
    },
  }) as unknown as import("stripe").default.Event;

beforeAll(() => {
  mockPaymentRequestFindUnique.mockResolvedValue({
    id: "pr-001",
    leadId: "lead-001",
    status: "SENT",
  });
  mockPaymentRequestUpdate.mockResolvedValue({ id: "pr-001", status: "PAID" });
  mockLeadUpdate.mockResolvedValue({ ...FAKE_LEAD, status: "paid" });
  mockLeadFindUnique.mockResolvedValue(FAKE_LEAD);
});

// Reset constructEvent mock between tests to avoid mock queue bleed-over
beforeEach(() => {
  mockConstructEvent.mockReset();
  // Default: throw invalid signature (safe default)
  mockConstructEvent.mockImplementation(() => {
    throw new Error("Invalid signature");
  });
});

describe("POST /api/stripe/webhook", () => {
  it("returns 400 when stripe-signature is missing", async () => {
    // constructEvent won't be called — early return due to missing header
    const res = await request(app)
      .post("/api/stripe/webhook")
      .set("Content-Type", "application/json")
      .send(JSON.stringify({}));
    expect(res.status).toBe(400);
  });

  it("returns 400 with invalid signature", async () => {
    mockConstructEvent.mockImplementationOnce(() => {
      throw new Error("Invalid signature");
    });
    const res = await request(app)
      .post("/api/stripe/webhook")
      .set("stripe-signature", "bad_sig")
      .set("Content-Type", "application/json")
      .send(Buffer.from(JSON.stringify({})));
    expect(res.status).toBe(400);
  });

  it("marks PaymentRequest and Lead as PAID on checkout.session.completed", async () => {
    mockConstructEvent.mockReturnValueOnce(buildSessionEvent("lead-001")); // override default throw

    const res = await request(app)
      .post("/api/stripe/webhook")
      .set("stripe-signature", "whsec_test")
      .set("Content-Type", "application/json")
      .send(Buffer.from(JSON.stringify({})));

    expect(res.status).toBe(200);
    expect(res.body.received).toBe(true);
    expect(mockPaymentRequestUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { leadId: "lead-001" },
        data: expect.objectContaining({ status: "PAID" }),
      }),
    );
    expect(mockLeadUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "lead-001" },
        data: { status: "paid" },
      }),
    );
  });

  it("is idempotent — ignores already PAID payment requests", async () => {
    mockPaymentRequestFindUnique.mockResolvedValueOnce({
      id: "pr-001",
      leadId: "lead-001",
      status: "PAID",
    });
    mockConstructEvent.mockReturnValueOnce(buildSessionEvent("lead-001")); // override default throw
    mockPaymentRequestUpdate.mockClear();

    const res = await request(app)
      .post("/api/stripe/webhook")
      .set("stripe-signature", "whsec_test")
      .set("Content-Type", "application/json")
      .send(Buffer.from(JSON.stringify({})));

    expect(res.status).toBe(200);
    expect(mockPaymentRequestUpdate).not.toHaveBeenCalled();
  });

  it("acknowledges events without quoteId in metadata", async () => {
    mockConstructEvent.mockReturnValueOnce({
      // override default throw
      type: "checkout.session.completed",
      data: { object: { metadata: {}, payment_intent: "pi_other" } },
    });

    const res = await request(app)
      .post("/api/stripe/webhook")
      .set("stripe-signature", "whsec_test")
      .set("Content-Type", "application/json")
      .send(Buffer.from(JSON.stringify({})));

    expect(res.status).toBe(200);
    expect(res.body.received).toBe(true);
  });

  it("acknowledges unhandled event types without error", async () => {
    mockConstructEvent.mockReturnValueOnce({
      type: "payment_intent.created",
      data: { object: {} },
    });

    const res = await request(app)
      .post("/api/stripe/webhook")
      .set("stripe-signature", "whsec_test")
      .set("Content-Type", "application/json")
      .send(Buffer.from(JSON.stringify({})));

    expect(res.status).toBe(200);
    expect(res.body.received).toBe(true);
  });
});
