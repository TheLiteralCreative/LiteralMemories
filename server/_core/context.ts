import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";

/**
 * Transport-agnostic tRPC context.
 *
 * Both the Express adapter (local dev — see server/_core/index.ts) and the
 * Cloudflare Pages Function (production — see functions/api/trpc/[trpc].ts)
 * produce contexts of this shape.
 *
 * Procedures should only depend on what's defined here. They should NOT
 * assume a particular transport's full req/res objects exist.
 */
export type TrpcContext = {
  /**
   * Just enough of the request shape for procedures to read auth headers.
   * Both Express's req.headers and a normalized Web Fetch headers map
   * satisfy this type.
   */
  req: {
    headers: Record<string, string | string[] | undefined>;
  };
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  // Authentication is performed at the route level via the x-admin-token
  // header (see requireAdminToken in server/routers.ts). When Cloudflare
  // Access is layered in front of /admin in production, the verified user
  // email will be available via the Cf-Access-Authenticated-User-Email
  // header.
  return {
    req: {
      headers: opts.req.headers as Record<string, string | string[] | undefined>,
    },
    user: null,
  };
}
