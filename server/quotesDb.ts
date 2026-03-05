import { getDb } from "./db";
import { savedQuotes, InsertSavedQuote, SavedQuote } from "../drizzle/schema";

/**
 * Insert a new saved quote record into the database.
 * Returns the inserted quote's auto-generated ID.
 */
export async function insertSavedQuote(data: InsertSavedQuote): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(savedQuotes).values(data);
  // mysql2 returns insertId on the result header
  const insertId = (result as unknown as [{ insertId: number }])[0]?.insertId ?? 0;
  return insertId;
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

  const { eq } = await import("drizzle-orm");
  await db
    .update(savedQuotes)
    .set({ emailSent: status })
    .where(eq(savedQuotes.id, id));
}
