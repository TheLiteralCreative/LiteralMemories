/**
 * Unit tests for the quotes.save tRPC procedure.
 * Mocks the database and email helpers to test the procedure in isolation.
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock("./quotesDb", () => ({
  insertSavedQuote: vi.fn().mockResolvedValue(42),
  updateQuoteEmailStatus: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("./email", () => ({
  sendEstimateEmail: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("./_core/notification", () => ({
  notifyOwner: vi.fn().mockResolvedValue(true),
}));

// ── Helpers ────────────────────────────────────────────────────────────────────

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

const sampleInput = {
  clientName: "Jane Smith",
  clientEmail: "jane@example.com",
  clientPhone: "(555) 123-4567",
  projectNotes: "Wedding VHS tapes from 1987",
  pricingTier: "standard",
  lineItems: [
    {
      category: "Media Digitization",
      name: "SP-VHS / Beta Tape",
      quantity: 3,
      unitPrice: 25,
      total: 75,
    },
  ],
  deliveryItems: [{ name: "8GB Thumb Drive", price: 15 }],
  subtotal: 90,
  accountCredit: 0,
  shippingRate: 0,
  serviceAdjustments: 0,
  estimatedTotal: 90,
  deposit: 45,
  balance: 45,
  rawState: JSON.stringify({ services: {}, delivery: {} }),
};

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("quotes.save", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("saves a quote and returns success with a quoteId", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.quotes.save(sampleInput);

    expect(result.success).toBe(true);
    expect(result.quoteId).toBe(42);
    expect(result.emailSent).toBe(true);
  });

  it("still returns success even when email sending fails", async () => {
    const { sendEstimateEmail } = await import("./email");
    vi.mocked(sendEstimateEmail).mockRejectedValueOnce(new Error("SMTP error"));

    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.quotes.save(sampleInput);

    expect(result.success).toBe(true);
    expect(result.emailSent).toBe(false);
  });

  it("rejects input with a missing name", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.quotes.save({ ...sampleInput, clientName: "" })
    ).rejects.toThrow();
  });

  it("rejects input with an invalid email", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.quotes.save({ ...sampleInput, clientEmail: "not-an-email" })
    ).rejects.toThrow();
  });
});
