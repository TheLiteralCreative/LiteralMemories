/**
 * SMTP connection validation test.
 * Verifies that the configured Purelymail SMTP credentials can establish
 * a real connection to the mail server. This test requires live env vars.
 */

import { describe, expect, it } from "vitest";
import nodemailer from "nodemailer";
import * as dotenv from "dotenv";

// Load .env if present (local dev); in production env vars are injected directly
dotenv.config();

describe("SMTP connection", () => {
  it("can verify the Purelymail SMTP connection with provided credentials", async () => {
    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT ?? "465", 10);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    // Skip gracefully if credentials are not configured in this environment
    if (!host || !user || !pass) {
      console.warn("[SMTP Test] Skipping — SMTP env vars not set");
      return;
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });

    // verify() opens a connection and authenticates — throws on failure
    await expect(transporter.verify()).resolves.toBe(true);
  }, 15_000); // 15s timeout for network round-trip
});
