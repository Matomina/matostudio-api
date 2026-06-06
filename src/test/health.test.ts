import request from "supertest";
import { describe, expect, it, vi } from "vitest";

vi.mock("../db/prisma.js", () => ({
  prisma: { lead: { create: vi.fn().mockResolvedValue({ id: "test-id" }) } },
}));

import { app } from "../app.js";

describe("GET /health", () => {
  it("returns 200 with status ok", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(res.body.service).toBe("matostudio-api");
    expect(typeof res.body.timestamp).toBe("string");
  });
});
