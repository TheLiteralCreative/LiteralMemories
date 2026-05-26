import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  // Authentication is performed at the route level via the x-admin-token
  // header (see requireAdminToken in server/routers.ts). When Cloudflare
  // Access is layered in front of /admin in production, the verified user
  // email will also be available via the Cf-Access-Authenticated-User-Email
  // header — this createContext function is the right place to read it then.
  return {
    req: opts.req,
    res: opts.res,
    user: null,
  };
}
