import { integer, pgEnum, pgTable, serial, text, timestamp, varchar } from "drizzle-orm/pg-core";

/** Role enum for users. Defined as a real Postgres enum type. */
export const userRoleEnum = pgEnum("user_role", ["user", "admin"]);

/** Email delivery status enum for saved quotes. */
export const emailSentEnum = pgEnum("email_sent_status", ["pending", "sent", "failed"]);

/** Admin workflow status enum for saved quotes. */
export const adminStatusEnum = pgEnum("admin_status", ["new", "contacted", "archived"]);

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = pgTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: serial("id").primaryKey(),
  /** Auth identifier returned by the auth provider. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: userRoleEnum("role").default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdate(() => new Date()),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Saved quotes from the pricing calculator.
 * Stores client contact info, the full calculator state as JSON,
 * and computed totals for quick display.
 */
export const savedQuotes = pgTable("saved_quotes", {
  id: serial("id").primaryKey(),
  /** Client contact info */
  clientName: varchar("clientName", { length: 255 }).notNull(),
  clientEmail: varchar("clientEmail", { length: 320 }).notNull(),
  clientPhone: varchar("clientPhone", { length: 64 }),
  projectNotes: text("projectNotes"),
  /** Pricing tier active at time of save (standard | bronze | silver | gold) */
  pricingTier: varchar("pricingTier", { length: 32 }).notNull(),
  /** Full calculator state stored as JSON string */
  quoteData: text("quoteData").notNull(),
  /** Computed totals stored in cents to avoid float issues */
  estimatedTotalCents: integer("estimatedTotalCents").notNull().default(0),
  depositAmountCents: integer("depositAmountCents").notNull().default(0),
  /** Email delivery status */
  emailSent: emailSentEnum("emailSent").default("pending").notNull(),
  /** Admin workflow status */
  adminStatus: adminStatusEnum("adminStatus").default("new").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SavedQuote = typeof savedQuotes.$inferSelect;
export type InsertSavedQuote = typeof savedQuotes.$inferInsert;
