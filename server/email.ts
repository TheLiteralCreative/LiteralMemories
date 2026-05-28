/**
 * Email utility for Literal Memories Pricing Calculator.
 *
 * STATUS: Stubbed for Cloudflare Pages Functions deploy.
 *
 * The original implementation used nodemailer + SMTP, which can't run on
 * Cloudflare Workers (no raw TCP sockets). To unblock the deploy, this
 * file is temporarily stubbed: types stay, but `sendEstimateEmail` throws
 * a clear error. The caller in server/routers.ts has a try/catch that
 * records the quote with `emailSent: 'failed'` when this throws, so the
 * calculator continues to save quotes normally.
 *
 * To re-enable email after the migration:
 *   1. Sign up for Resend (https://resend.com/), get an API key
 *   2. Add RESEND_API_KEY to .env locally and Cloudflare Pages env vars
 *   3. Replace this file with a Resend-based implementation
 *      (Resend has a fetch-based SDK that works natively on Workers)
 */

export interface EstimateLineItem {
  category: string;
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface EstimateEmailPayload {
  clientName: string;
  clientEmail: string;
  clientPhone?: string;
  projectNotes?: string;
  tier: string;
  lineItems: EstimateLineItem[];
  deliveryItems: { name: string; price: number }[];
  subtotal: number;
  accountCredit: number;
  shippingRate: number;
  serviceAdjustments: number;
  estimatedTotal: number;
  deposit: number;
  balance: number;
}

export async function sendEstimateEmail(
  _payload: EstimateEmailPayload
): Promise<void> {
  // Intentionally throws — caller's try/catch handles graceful degradation.
  // See file-level comment for re-enable path.
  throw new Error(
    "Email sending is temporarily disabled in the Cloudflare Pages deployment. " +
      "Quote was saved successfully; replace server/email.ts with a Resend " +
      "implementation to re-enable."
  );
}
