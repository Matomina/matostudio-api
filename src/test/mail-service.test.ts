import { describe, expect, it } from "vitest";

import {
  buildContactEmailHtml,
  buildContactEmailText,
  buildQuoteEmailHtml,
  buildQuoteEmailText,
  escapeHtml,
} from "../services/mail.service.js";

const contactPayload = {
  name: "Alice Dupont",
  email: "alice@example.com",
  phone: "+33600000000",
  projectType: "Site vitrine",
  budget: "2000 EUR",
  timeline: "1 mois",
  message: "Bonjour, projet urgent.",
};

const quotePayload = {
  name: "Bob Martin",
  email: "bob@example.com",
  phone: "",
  projectType: "E-commerce",
  pageCount: 5,
  options: ["seo"],
  deadline: "flexible",
  estimate: 1290,
  message: "",
};

describe("escapeHtml", () => {
  it("escapes <", () => {
    expect(escapeHtml("<script>")).toBe("&lt;script&gt;");
  });

  it("escapes >", () => {
    expect(escapeHtml(">")).toBe("&gt;");
  });

  it("escapes &", () => {
    expect(escapeHtml("a & b")).toBe("a &amp; b");
  });

  it('escapes "', () => {
    expect(escapeHtml('"quoted"')).toBe("&quot;quoted&quot;");
  });

  it("escapes '", () => {
    expect(escapeHtml("it's")).toBe("it&#039;s");
  });

  it("returns plain string unchanged", () => {
    expect(escapeHtml("hello world")).toBe("hello world");
  });
});

describe("buildContactEmailText", () => {
  it("includes name and email", () => {
    const text = buildContactEmailText(contactPayload);
    expect(text).toContain("Alice Dupont");
    expect(text).toContain("alice@example.com");
  });

  it("includes message", () => {
    const text = buildContactEmailText(contactPayload);
    expect(text).toContain("Bonjour, projet urgent.");
  });
});

describe("buildContactEmailHtml", () => {
  it("is valid HTML containing contact fields", () => {
    const html = buildContactEmailHtml(contactPayload);
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("Alice Dupont");
    expect(html).toContain("alice@example.com");
    expect(html).toContain("Site vitrine");
  });

  it("escapes special characters in user input", () => {
    const html = buildContactEmailHtml({
      ...contactPayload,
      name: '<script>alert("xss")</script>',
      message: "a & b",
    });
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("a &amp; b");
  });
});

describe("buildQuoteEmailText", () => {
  it("includes name and estimate", () => {
    const text = buildQuoteEmailText(quotePayload);
    expect(text).toContain("Bob Martin");
    expect(text).toContain("1290");
  });

  it("includes page count and options", () => {
    const text = buildQuoteEmailText(quotePayload);
    expect(text).toContain("5");
    expect(text).toContain("seo");
  });
});

describe("buildQuoteEmailHtml", () => {
  it("is valid HTML containing quote fields", () => {
    const html = buildQuoteEmailHtml(quotePayload);
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("Bob Martin");
    expect(html).toContain("E-commerce");
    expect(html).toContain("1290");
  });

  it("escapes special characters in user input", () => {
    const html = buildQuoteEmailHtml({
      ...quotePayload,
      name: '<img src=x onerror="alert(1)">',
    });
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;img");
  });
});
