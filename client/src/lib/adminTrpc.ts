/**
 * Admin tRPC client — identical to the main trpc client but injects
 * the x-admin-token header on every request so the backend can
 * authenticate admin procedures without Manus OAuth.
 */
import { createTRPCReact } from "@trpc/react-query";
import { httpBatchLink } from "@trpc/client";
import superjson from "superjson";
import type { AppRouter } from "../../../server/routers";

export const adminTrpc = createTRPCReact<AppRouter>();

export function createAdminTrpcClient(adminToken: string) {
  return adminTrpc.createClient({
    links: [
      httpBatchLink({
        url: "/api/trpc",
        transformer: superjson,
        headers() {
          return {
            "x-admin-token": adminToken,
          };
        },
        fetch(input, init) {
          return globalThis.fetch(input, {
            ...(init ?? {}),
            credentials: "include",
          });
        },
      }),
    ],
  });
}

export const ADMIN_TOKEN_KEY = "lm_admin_token";
