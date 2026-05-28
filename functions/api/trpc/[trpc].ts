// Cloudflare Pages Function — handles all /api/trpc/<procedure> requests
// in production. Local dev (`pnpm dev`) uses the Express server in
// server/_core/index.ts; this file is the production equivalent.
//
// Why this is so short: Express in LM is a thin wrapper around tRPC.
// tRPC's own fetch adapter is Workers-native and handles the same
// procedures directly, no Express required at runtime.

import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "../../../server/routers";
import type { TrpcContext } from "../../../server/_core/context";

// Env vars bound from the Cloudflare Pages dashboard.
type Env = {
  DATABASE_URL: string;
  ADMIN_PASSWORD: string;
  SMTP_HOST?: string;
  SMTP_PORT?: string;
  SMTP_USER?: string;
  SMTP_PASS?: string;
};

type PagesContext = {
  request: Request;
  env: Env;
};

/** Normalize Web Fetch Headers into the Record shape Express uses. */
function headersToRecord(headers: Headers): Record<string, string> {
  const out: Record<string, string> = {};
  headers.forEach((value, key) => {
    out[key.toLowerCase()] = value;
  });
  return out;
}

export async function onRequest({
  request,
  env,
}: PagesContext): Promise<Response> {
  // Bridge Cloudflare's typed env bindings into process.env so existing
  // server-side code (Drizzle's @neondatabase/serverless reads DATABASE_URL
  // via process.env, etc.) keeps working unchanged.
  // Use ??= so we only assign on first request per isolate, not every request.
  process.env.DATABASE_URL ??= env.DATABASE_URL;
  process.env.ADMIN_PASSWORD ??= env.ADMIN_PASSWORD;
  if (env.SMTP_HOST) process.env.SMTP_HOST ??= env.SMTP_HOST;
  if (env.SMTP_PORT) process.env.SMTP_PORT ??= env.SMTP_PORT;
  if (env.SMTP_USER) process.env.SMTP_USER ??= env.SMTP_USER;
  if (env.SMTP_PASS) process.env.SMTP_PASS ??= env.SMTP_PASS;

  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req: request,
    router: appRouter,
    createContext: (): TrpcContext => ({
      req: { headers: headersToRecord(request.headers) },
      user: null,
    }),
    onError({ error, path }) {
      console.error(`[tRPC] Error on ${path}:`, error);
    },
  });
}
