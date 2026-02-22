import { sqliteTable, text, integer, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { sql, relations } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';

export const games = sqliteTable('games', {
  id: text('id').primaryKey().$defaultFn(() => uuidv7()),
  title: text('title').notNull(),
  description: text('description').notNull(),
  headerImageUrl: text('header_image_url'),
  startRegistrationDate: integer('start_registration_date', { mode: 'timestamp' }).notNull(),
  endRegistrationDate: integer('end_registration_date', { mode: 'timestamp' }).notNull(),
  isArchived: integer('is_archived', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now') * 1000)`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now') * 1000)`),
});

export const gamesRelations = relations(games, ({ many }) => ({
  tables: many(tables),
}));

export const tables = sqliteTable('tables', {
  id: text('id').primaryKey().$defaultFn(() => uuidv7()),
  gameId: text('game_id').notNull().references(() => games.id),
  title: text('title').notNull(),
  description: text('description').notNull(),
  imageUrl: text('image_url'),
  maxPlayers: integer('max_players').notNull().default(5), // New column
  isArchived: integer('is_archived', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now') * 1000)`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now') * 1000)`),
});

export const tablesRelations = relations(tables, ({ one, many }) => ({
  game: one(games, {
    fields: [tables.gameId],
    references: [games.id],
  }),
  registrations: many(registrations),
}));

export const registrations = sqliteTable('registrations', {
  id: text('id').primaryKey().$defaultFn(() => uuidv7()),
  tableId: text('table_id').notNull().references(() => tables.id),
  name: text('name').notNull(),
  email: text('email').notNull(),
  phone: text('phone'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now') * 1000)`),
}, (table) => ({
  uniqueReg: uniqueIndex('unique_table_email').on(table.tableId, table.email),
}));

export const registrationsRelations = relations(registrations, ({ one }) => ({
  table: one(tables, {
    fields: [registrations.tableId],
    references: [tables.id],
  }),
}));
