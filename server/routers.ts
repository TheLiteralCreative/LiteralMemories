import { TRPCError } from "@trpc/server";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { ENV } from "./_core/env";
import { z } from "zod";
import {
  insertSavedQuote,
  updateQuoteEmailStatus,
  listSavedQuotes,
  countSavedQuotes,
  getSavedQuoteById,
  updateQuoteAdminStatus,
} from "./quotesDb";
import { sendEstimateEmail, type EstimateLineItem } from "./email";

// ── Zod schemas ────────────────────────────────────────────────────────────────

const lineItemSchema = z.object({
  category: z.string(),
  name: z.string(),
  quantity: z.number(),
  unitPrice: z.number(),
  total: z.number(),
});

const deliveryItemSchema = z.object({
  name: z.string(),
  price: z.number(),
});

const saveQuoteInputSchema = z.object({
  clientName: z.string().min(1, "Name is required"),
  clientEmail: z.string().email("A valid email is required"),
  clientPhone: z.string().optional(),
  projectNotes: z.string().optional(),
  pricingTier: z.string(),
  lineItems: z.array(lineItemSchema),
  deliveryItems: z.array(deliveryItemSchema),
  subtotal: z.number(),
  accountCredit: z.number(),
  shippingRate: z.number(),
  serviceAdjustments: z.number(),
  estimatedTotal: z.number(),
  deposit: z.number(),
  balance: z.number(),
  rawState: z.string(),
});

// ── Admin auth helper ──────────────────────────────────────────────────────────
// Simple password-based admin token: the client sends the password as a Bearer
// token in the x-admin-token header. The server compares it to ADMIN_PASSWORD.
// This is intentionally simple — no user accounts needed for a single-owner tool.

function requireAdminToken(ctx: { req: { headers: Record<string, string | string[] | undefined> } }) {
  const header = ctx.req.headers["x-admin-token"];
  const token = Array.isArray(header) ? header[0] : header;
  if (!token || token !== ENV.adminPassword) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid admin credentials" });
  }
}

// ── Router ─────────────────────────────────────────────────────────────────────

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  quotes: router({
    /**
     * Save a quote from the pricing calculator.
     */
    save: publicProcedure
      .input(saveQuoteInputSchema)
      .mutation(async ({ input }) => {
        const quoteId = await insertSavedQuote({
          clientName: input.clientName,
          clientEmail: input.clientEmail,
          clientPhone: input.clientPhone ?? null,
          projectNotes: input.projectNotes ?? null,
          pricingTier: input.pricingTier,
          quoteData: input.rawState,
          estimatedTotalCents: Math.round(input.estimatedTotal * 100),
          depositAmountCents: Math.round(input.deposit * 100),
          emailSent: "pending",
        });

        let emailStatus: "sent" | "failed" = "failed";
        try {
          await sendEstimateEmail({
            clientName: input.clientName,
            clientEmail: input.clientEmail,
            clientPhone: input.clientPhone,
            projectNotes: input.projectNotes,
            tier: input.pricingTier,
            lineItems: input.lineItems as EstimateLineItem[],
            deliveryItems: input.deliveryItems,
            subtotal: input.subtotal,
            accountCredit: input.accountCredit,
            shippingRate: input.shippingRate,
            serviceAdjustments: input.serviceAdjustments,
            estimatedTotal: input.estimatedTotal,
            deposit: input.deposit,
            balance: input.balance,
          });
          emailStatus = "sent";
        } catch (err) {
          console.error("[Email] Failed to send estimate email:", err);
        }

        await updateQuoteEmailStatus(quoteId, emailStatus);

        return {
          success: true,
          quoteId,
          emailSent: emailStatus === "sent",
        };
      }),
  }),

  admin: router({
    /**
     * Verify the admin password. Returns { valid: true } on success.
     */
    login: publicProcedure
      .input(z.object({ password: z.string() }))
      .mutation(({ input }) => {
        if (!ENV.adminPassword || input.password !== ENV.adminPassword) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Incorrect password" });
        }
        return { valid: true };
      }),

    /**
     * List all saved quotes with optional search and pagination.
     * Requires x-admin-token header.
     */
    listQuotes: publicProcedure
      .input(
        z.object({
          search: z.string().optional(),
          limit: z.number().min(1).max(100).default(50),
          offset: z.number().min(0).default(0),
        })
      )
      .query(async ({ input, ctx }) => {
        requireAdminToken(ctx);
        const [quotes, total] = await Promise.all([
          listSavedQuotes({ search: input.search, limit: input.limit, offset: input.offset }),
          countSavedQuotes(input.search),
        ]);
        return { quotes, total };
      }),

    /**
     * Get a single quote by ID with full detail.
     * Requires x-admin-token header.
     */
    getQuote: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input, ctx }) => {
        requireAdminToken(ctx);
        const quote = await getSavedQuoteById(input.id);
        if (!quote) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Quote not found" });
        }
        return quote;
      }),

    /**
     * Update the admin status of a quote.
     * Requires x-admin-token header.
     */
    updateStatus: publicProcedure
      .input(
        z.object({
          id: z.number(),
          status: z.enum(["new", "contacted", "archived"]),
        })
      )
      .mutation(async ({ input, ctx }) => {
        requireAdminToken(ctx);
        await updateQuoteAdminStatus(input.id, input.status);
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
