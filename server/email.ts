/**
 * Email utility for Literal Memories Pricing Calculator
 * Uses Nodemailer with SMTP credentials provided via environment variables.
 * Sends estimate emails to both the client and Joel@literalmemories.com.
 */

import nodemailer from "nodemailer";

const OWNER_EMAIL = "Joel@literalmemories.com";
const OWNER_BCC_EMAIL = "Joel@literalcreative.com";
const OWNER_SMS_GATEWAY = "6153640630@tmomail.net"; // T-Mobile SMS-to-email gateway

function getTransporter() {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT ?? "587", 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    throw new Error("SMTP configuration is incomplete. Please set SMTP_HOST, SMTP_USER, and SMTP_PASS.");
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

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

function buildHtmlEmail(payload: EstimateEmailPayload, isOwner: boolean): string {
  const greeting = isOwner
    ? `<p>A new estimate request was submitted via the Literal Memories pricing calculator.</p>`
    : `<p>Thank you for using the Literal Memories pricing calculator, ${payload.clientName}. Here is a copy of your estimate for your records.</p>`;

  const lineItemRows = payload.lineItems
    .map(
      (item) => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #e8e0d4;">${item.category}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e8e0d4;">${item.name}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e8e0d4;text-align:center;">${item.quantity}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e8e0d4;text-align:right;">$${item.unitPrice.toFixed(2)}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e8e0d4;text-align:right;font-weight:600;">$${item.total.toFixed(2)}</td>
      </tr>`
    )
    .join("");

  const deliveryRows = payload.deliveryItems
    .map(
      (d) => `
      <tr>
        <td colspan="4" style="padding:8px 12px;border-bottom:1px solid #e8e0d4;">📦 ${d.name}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e8e0d4;text-align:right;font-weight:600;">$${d.price.toFixed(2)}</td>
      </tr>`
    )
    .join("");

  const adjustmentRows = [
    payload.accountCredit > 0
      ? `<tr><td colspan="4" style="padding:6px 12px;color:#666;">Account Credit</td><td style="padding:6px 12px;text-align:right;color:#16a34a;">−$${payload.accountCredit.toFixed(2)}</td></tr>`
      : "",
    payload.shippingRate > 0
      ? `<tr><td colspan="4" style="padding:6px 12px;color:#666;">Shipping</td><td style="padding:6px 12px;text-align:right;">+$${payload.shippingRate.toFixed(2)}</td></tr>`
      : "",
    payload.serviceAdjustments !== 0
      ? `<tr><td colspan="4" style="padding:6px 12px;color:#666;">Service Adjustments</td><td style="padding:6px 12px;text-align:right;${payload.serviceAdjustments < 0 ? "color:#16a34a;" : ""}">${payload.serviceAdjustments < 0 ? "−" : "+"}$${Math.abs(payload.serviceAdjustments).toFixed(2)}</td></tr>`
      : "",
  ].join("");

  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5efe0;font-family:'Helvetica Neue',Arial,sans-serif;">
  <div style="max-width:640px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    
    <!-- Header -->
    <div style="background:#2d5a3d;padding:32px 40px;">
      <p style="margin:0 0 4px;font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#c4a84a;">Legacy Media Digitization</p>
      <h1 style="margin:0;font-size:28px;color:#fff;font-weight:700;">Literal Memories</h1>
      <p style="margin:8px 0 0;font-size:14px;color:rgba(255,255,255,0.7);">Service Estimate</p>
    </div>

    <!-- Body -->
    <div style="padding:32px 40px;">
      ${greeting}

      <!-- Client Info -->
      <div style="background:#f9f5ee;border-radius:8px;padding:16px 20px;margin:20px 0;">
        <p style="margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#8b7355;">Client Information</p>
        <p style="margin:4px 0;font-size:14px;"><strong>Name:</strong> ${payload.clientName}</p>
        <p style="margin:4px 0;font-size:14px;"><strong>Email:</strong> ${payload.clientEmail}</p>
        ${payload.clientPhone ? `<p style="margin:4px 0;font-size:14px;"><strong>Phone:</strong> ${payload.clientPhone}</p>` : ""}
        ${payload.projectNotes ? `<p style="margin:4px 0;font-size:14px;"><strong>Notes:</strong> ${payload.projectNotes}</p>` : ""}
        <p style="margin:8px 0 0;font-size:13px;color:#8b7355;"><strong>Pricing Tier:</strong> ${payload.tier}</p>
      </div>

      <!-- Line Items Table -->
      <h2 style="font-size:16px;color:#2c1f0e;margin:24px 0 12px;">Services Requested</h2>
      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        <thead>
          <tr style="background:#f9f5ee;">
            <th style="padding:8px 12px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#8b7355;">Category</th>
            <th style="padding:8px 12px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#8b7355;">Service</th>
            <th style="padding:8px 12px;text-align:center;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#8b7355;">Qty/Hrs</th>
            <th style="padding:8px 12px;text-align:right;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#8b7355;">Unit Price</th>
            <th style="padding:8px 12px;text-align:right;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#8b7355;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${lineItemRows}
          ${deliveryRows}
        </tbody>
      </table>

      <!-- Totals -->
      <table style="width:100%;border-collapse:collapse;font-size:14px;margin-top:8px;">
        <tr><td colspan="4" style="padding:8px 12px;color:#666;">Subtotal</td><td style="padding:8px 12px;text-align:right;font-weight:600;">$${payload.subtotal.toFixed(2)}</td></tr>
        ${adjustmentRows}
        <tr style="border-top:2px solid #2d5a3d;">
          <td colspan="4" style="padding:12px 12px;font-size:16px;font-weight:700;color:#2c1f0e;">Estimated Total</td>
          <td style="padding:12px 12px;text-align:right;font-size:18px;font-weight:700;color:#2d5a3d;">$${payload.estimatedTotal.toFixed(2)}</td>
        </tr>
        <tr style="background:#f9f5ee;">
          <td colspan="4" style="padding:8px 12px;color:#2c1f0e;">Deposit Due (50% — upon approval)</td>
          <td style="padding:8px 12px;text-align:right;font-weight:700;color:#c4a84a;">$${payload.deposit.toFixed(2)}</td>
        </tr>
        <tr>
          <td colspan="4" style="padding:8px 12px;color:#666;">Balance (due at delivery)</td>
          <td style="padding:8px 12px;text-align:right;color:#666;">$${payload.balance.toFixed(2)}</td>
        </tr>
      </table>

      <!-- Disclaimer -->
      <p style="margin:24px 0 0;font-size:12px;color:#999;line-height:1.6;">
        This is an <em>estimate only</em>. Final pricing is confirmed upon project review. 
        Adjusted hours or quantities may affect the final invoice.
      </p>
    </div>

    <!-- Footer -->
    <div style="background:#f9f5ee;padding:20px 40px;border-top:1px solid #e8e0d4;">
      <p style="margin:0;font-size:12px;color:#8b7355;">
        <strong>Literal Memories</strong> · Legacy Media Digitization Services<br>
        Questions? Contact us at <a href="mailto:Joel@literalmemories.com" style="color:#2d5a3d;">Joel@literalmemories.com</a>
      </p>
    </div>
  </div>
</body>
</html>`;
}

export async function sendEstimateEmail(payload: EstimateEmailPayload): Promise<void> {
  const transporter = getTransporter();

  const subject = `Literal Memories — Estimate for ${payload.clientName}`;

  // Send to client
  await transporter.sendMail({
    from: `"Literal Memories" <${process.env.SMTP_USER}>`,
    to: payload.clientEmail,
    subject,
    html: buildHtmlEmail(payload, false),
  });

  // Send copy to owner with BCC to secondary email
  await transporter.sendMail({
    from: `"Literal Memories" <${process.env.SMTP_USER}>`,
    to: OWNER_EMAIL,
    bcc: [OWNER_BCC_EMAIL],
    subject: `[New Estimate] ${subject}`,
    html: buildHtmlEmail(payload, true),
    text: `New Literal Memories estimate from ${payload.clientName} (${payload.clientEmail}${payload.clientPhone ? " / " + payload.clientPhone : ""}). Total: $${payload.estimatedTotal.toFixed(2)}.`,
  });

  // Send a separate plain-text-only SMS notification via T-Mobile email-to-SMS gateway.
  // SMS gateways silently drop HTML emails — this must be text-only with no HTML at all.
  const smsText = `LiteralMemories: New quote from ${payload.clientName}${payload.clientPhone ? " (" + payload.clientPhone + ")" : ""} — $${payload.estimatedTotal.toFixed(2)}. Check Joel@literalmemories.com`;
  await transporter.sendMail({
    from: `"Literal Memories" <${process.env.SMTP_USER}>`,
    to: OWNER_SMS_GATEWAY,
    subject: "", // SMS gateways ignore the subject line
    text: smsText,
    // Explicitly set no HTML so the gateway cannot fall back to rendering it
    html: undefined,
  });
}
