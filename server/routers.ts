import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { insertSavedQuote, updateQuoteEmailStatus } from "./quotesDb";
import { sendEstimateEmail, type EstimateLineItem } from "./email";
import { notifyOwner } from "./_core/notification";

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
  /** Full raw calculator state for future reference */
  rawState: z.string(),
});

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
     * Persists to DB, sends confirmation email to client and owner,
     * and fires an owner notification.
     */
    save: publicProcedure
      .input(saveQuoteInputSchema)
      .mutation(async ({ input }) => {
        // 1. Persist to database
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

        // 2. Send emails (best-effort — don't fail the save if email fails)
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

        // 3. Update email status in DB
        await updateQuoteEmailStatus(quoteId, emailStatus);

        // 4. Notify owner via Manus notification system (in-app alert)
        try {
          await notifyOwner({
            title: `New Quote Saved — ${input.clientName}`,
            content: `${input.clientName} (${input.clientEmail}) saved a quote for $${input.estimatedTotal.toFixed(2)}. Email: ${emailStatus}.`,
          });
        } catch {
          // Non-critical — ignore notification failures
        }

        return {
          success: true,
          quoteId,
          emailSent: emailStatus === "sent",
        };
      }),
  }),
});

export type AppRouter = typeof appRouter;
