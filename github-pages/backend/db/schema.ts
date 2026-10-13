import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
export const preferences = sqliteTable("preferences", { key: text("key").primaryKey(), payload: text("payload").notNull(), revision: integer("revision").notNull().default(0), updatedAt: text("updated_at").notNull() });
export const records = sqliteTable("records", { id: text("id").primaryKey(), collection: text("collection").notNull(), payload: text("payload").notNull(), revision: integer("revision").notNull().default(0), deleted: integer("deleted").notNull().default(0), createdBy: text("created_by").notNull(), updatedAt: text("updated_at").notNull() }, (t) => [index("records_collection_idx").on(t.collection)]);

export const authSessions=sqliteTable("auth_sessions",{tokenHash:text("token_hash").primaryKey(),expires:integer("expires").notNull()});
export const authLimits=sqliteTable("auth_limits",{id:text("id").primaryKey(),failures:integer("failures").notNull(),resetAt:integer("reset_at").notNull()});
