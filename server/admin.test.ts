import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ── Mock ENV so tests don't depend on real secrets ─────────────────────────────
vi.mock("./_core/env", () => ({
  ENV: {
    adminPassword: "test-admin-password-123",
    cookieSecret: "test-secret",
    databaseUrl: "",
    oAuthServerUrl: "",
    ownerOpenId: "",
    isProduction: false,
    forgeApiUrl: "",
    forgeApiKey: "",
    appId: "",
  },
}));

// ── Mock DB helpers so tests don't need a real database ───────────────────────
vi.mock("./quotesDb", () => ({
  insertSavedQuote: vi.fn().mockResolvedValue(1),
  updateQuoteEmailStatus: vi.fn().mockResolvedValue(undefined),
  listSavedQuotes: vi.fn().mockResolvedValue([
    {
      id: 1,
      clientName: "Jane Smith",
      clientEmail: "jane@example.com",
      clientPhone: "555-1234",
      projectNotes: "Wedding tapes",
      pricingTier: "standard",
      quoteData: "{}",
      estimatedTotalCents: 24500,
      depositAmountCents: 12250,
      emailSent: "sent",
      adminStatus: "new",
      createdAt: new Date("2026-01-01"),
    },
  ]),
  countSavedQuotes: vi.fn().mockResolvedValue(1),
  getSavedQuoteById: vi.fn().mockResolvedValue({
    id: 1,
    clientName: "Jane Smith",
    clientEmail: "jane@example.com",
    clientPhone: "555-1234",
    projectNotes: "Wedding tapes",
    pricingTier: "standard",
    quoteData: "{}",
    estimatedTotalCents: 24500,
    depositAmountCents: 12250,
    emailSent: "sent",
    adminStatus: "new",
    createdAt: new Date("2026-01-01"),
  }),
  updateQuoteAdminStatus: vi.fn().mockResolvedValue(undefined),
}));

// ── Mock email and notification so tests don't send real emails ───────────────
vi.mock("./email", () => ({
  sendEstimateEmail: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("./_core/notification", () => ({
  notifyOwner: vi.fn().mockResolvedValue(true),
}));

// ── Helper: create a context with the given admin token header ─────────────────
function makeCtx(adminToken?: string): TrpcContext {
  return {
    user: null,
    req: {
      headers: adminToken ? { "x-admin-token": adminToken } : {},
      protocol: "https",
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("admin.login", () => {
  it("returns { valid: true } with the correct password", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.admin.login({ password: "test-admin-password-123" });
    expect(result).toEqual({ valid: true });
  });

  it("throws UNAUTHORIZED with a wrong password", async () => {
    const caller = appRouter.createCaller(makeCtx());
    await expect(
      caller.admin.login({ password: "wrong-password" })
    ).rejects.toThrow("Incorrect password");
  });

  it("throws UNAUTHORIZED with an empty password", async () => {
    const caller = appRouter.createCaller(makeCtx());
    await expect(
      caller.admin.login({ password: "" })
    ).rejects.toThrow("Incorrect password");
  });
});

describe("admin.listQuotes", () => {
  it("returns quotes when the correct admin token header is provided", async () => {
    const caller = appRouter.createCaller(makeCtx("test-admin-password-123"));
    const result = await caller.admin.listQuotes({ limit: 50, offset: 0 });
    expect(result.quotes).toHaveLength(1);
    expect(result.quotes[0]?.clientName).toBe("Jane Smith");
    expect(result.total).toBe(1);
  });

  it("throws UNAUTHORIZED when no admin token is provided", async () => {
    const caller = appRouter.createCaller(makeCtx());
    await expect(
      caller.admin.listQuotes({ limit: 50, offset: 0 })
    ).rejects.toThrow("Invalid admin credentials");
  });

  it("throws UNAUTHORIZED when a wrong admin token is provided", async () => {
    const caller = appRouter.createCaller(makeCtx("wrong-token"));
    await expect(
      caller.admin.listQuotes({ limit: 50, offset: 0 })
    ).rejects.toThrow("Invalid admin credentials");
  });
});

describe("admin.updateStatus", () => {
  it("updates a quote status with a valid admin token", async () => {
    const caller = appRouter.createCaller(makeCtx("test-admin-password-123"));
    const result = await caller.admin.updateStatus({ id: 1, status: "contacted" });
    expect(result).toEqual({ success: true });
  });

  it("throws UNAUTHORIZED without a valid admin token", async () => {
    const caller = appRouter.createCaller(makeCtx());
    await expect(
      caller.admin.updateStatus({ id: 1, status: "contacted" })
    ).rejects.toThrow("Invalid admin credentials");
  });
});
