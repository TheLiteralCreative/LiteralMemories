import { desc, eq, like, or } from "drizzle-orm";
import { getDb } from "./db";
import { savedQuotes, InsertSavedQuote, SavedQuote } from "../drizzle/schema";

/**
 * Insert a new saved quote record into the database.
 * Returns the inserted quote's auto-generated ID.
 */
export async function insertSavedQuote(data: InsertSavedQuote): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [inserted] = await db.insert(savedQuotes).values(data).returning({ id: savedQuotes.id });
  return inserted?.id ?? 0;
}

/**
 * Update the emailSent status for a saved quote.
 */
export async function updateQuoteEmailStatus(
  id: number,
  status: "sent" | "failed"
): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db
    .update(savedQuotes)
    .set({ emailSent: status })
    .where(eq(savedQuotes.id, id));
}

/**
 * List all saved quotes, newest first.
 * Optionally filter by a search string (matches name or email).
 */
export async function listSavedQuotes(opts?: {
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<SavedQuote[]> {
  const db = await getDb();
  if (!db) return [];

  const { search, limit = 50, offset = 0 } = opts ?? {};

  let query = db
    .select()
    .from(savedQuotes)
    .orderBy(desc(savedQuotes.createdAt))
    .limit(limit)
    .offset(offset);

  if (search && search.trim().length > 0) {
    const pattern = `%${search.trim()}%`;
    query = query.where(
      or(
        like(savedQuotes.clientName, pattern),
        like(savedQuotes.clientEmail, pattern)
      )
    ) as typeof query;
  }

  return query;
}

/**
 * Count all saved quotes (for pagination).
 */
export async function countSavedQuotes(search?: string): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  const { count } = await import("drizzle-orm");

  let query = db.select({ total: count() }).from(savedQuotes);

  if (search && search.trim().length > 0) {
    const pattern = `%${search.trim()}%`;
    query = query.where(
      or(
        like(savedQuotes.clientName, pattern),
        like(savedQuotes.clientEmail, pattern)
      )
    ) as typeof query;
  }

  const result = await query;
  return result[0]?.total ?? 0;
}

/**
 * Get a single quote by ID.
 */
export async function getSavedQuoteById(id: number): Promise<SavedQuote | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(savedQuotes)
    .where(eq(savedQuotes.id, id))
    .limit(1);

  return result[0];
}

/**
 * Update the admin status of a quote (contacted / archived / new).
 */
export async function updateQuoteAdminStatus(
  id: number,
  status: "new" | "contacted" | "archived"
): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db
    .update(savedQuotes)
    .set({ adminStatus: status })
    .where(eq(savedQuotes.id, id));
}
