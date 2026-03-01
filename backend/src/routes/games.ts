import { Hono } from "hono";
import { getDB } from "../db";
import * as schema from '../db/schema';
import { Bindings } from "../state";
import { eq, desc } from 'drizzle-orm';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';

export const gamesPublicRoute = new Hono<{ Bindings: Bindings }>();

// GET active game
gamesPublicRoute.get('/active', async (c) => {
  const db = getDB(c.env.DB);
  const now = new Date();

  const activeGame = await db.query.games.findFirst({
    where: (games, { and, eq, lte, gte }) => and(
      eq(games.isArchived, false),
      lte(games.startRegistrationDate, now),
      gte(games.endRegistrationDate, now)
    ),
    with: {
      tables: {
        where: (tables, { eq }) => eq(tables.isArchived, false),
        with: { registrations: true }
      },
    }
  });

  if (!activeGame) {
    return c.json({ error: 'No hay eventos activos en este momento.' }, 404);
  }

  return c.json(activeGame);
});

export const gamesAdminRoute = new Hono<{ Bindings: Bindings }>();

// Games
gamesAdminRoute.get('/', async (c) => {
  const db = getDB(c.env.DB);
  return c.json(await db.query.games.findMany({ orderBy: [desc(schema.games.createdAt)] }));
});

const gameSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  headerImageUrl: z.url().optional(),
  eventTimestamp: z.iso.datetime(),
  location: z.string().min(1),
  startRegistrationDate: z.iso.datetime(),
  endRegistrationDate: z.iso.datetime(),
});

gamesAdminRoute.post('/', zValidator('json', gameSchema), async (c) => {
  const db = getDB(c.env.DB);
  const data = c.req.valid('json');
  const res = await db.insert(schema.games).values({
    ...data,
    eventTimestamp: new Date(data.eventTimestamp),
    startRegistrationDate: new Date(data.startRegistrationDate),
    endRegistrationDate: new Date(data.endRegistrationDate),
  }).returning();
  return c.json(res[0]);
});

gamesAdminRoute.put('/:id', zValidator('json', gameSchema), async (c) => {
  const db = getDB(c.env.DB);
  const id = c.req.param('id');
  const data = c.req.valid('json');
  await db.update(schema.games).set({
    ...data,
    eventTimestamp: new Date(data.eventTimestamp),
    startRegistrationDate: new Date(data.startRegistrationDate),
    endRegistrationDate: new Date(data.endRegistrationDate),
    updatedAt: new Date(),
  }).where(eq(schema.games.id, id));
  return c.json({ success: true });
});

gamesAdminRoute.post('/:id/archive', async (c) => {
  const db = getDB(c.env.DB);
  const id = c.req.param('id');
  await db.update(schema.games).set({ isArchived: true, updatedAt: new Date() }).where(eq(schema.games.id, id));
  return c.json({ success: true });
});

