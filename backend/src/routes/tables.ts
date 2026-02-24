import { Hono } from "hono";
import { getDB } from "../db";
import * as schema from '../db/schema';
import { Bindings } from "../state";
import { eq, desc } from 'drizzle-orm';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';


export const tablesAdminRoutes = new Hono<{ Bindings: Bindings }>();


// Tables
tablesAdminRoutes.get('/', async (c) => {
  const db = getDB(c.env.DB);
  return c.json(await db.query.tables.findMany({
    with: { game: true, registrations: true },
    orderBy: [desc(schema.tables.createdAt)]
  }));
});

const tableSchema = z.object({
  gameId: z.uuidv7(),
  title: z.string().min(1),
  description: z.string().min(1),
  imageUrl: z.url().optional(),
  maxPlayers: z.number().int().min(1),
});

tablesAdminRoutes.post('/', zValidator('json', tableSchema), async (c) => {
  const db = getDB(c.env.DB);
  const data = c.req.valid('json');
  const res = await db.insert(schema.tables).values(data).returning();
  return c.json(res[0]);
});

tablesAdminRoutes.put('/:id', zValidator('json', tableSchema), async (c) => {
  const db = getDB(c.env.DB);
  const id = c.req.param('id');
  const data = c.req.valid('json');
  await db.update(schema.tables).set({ ...data, updatedAt: new Date() }).where(eq(schema.tables.id, id));
  return c.json({ success: true });
});

tablesAdminRoutes.post('/:id/archive', async (c) => {
  const db = getDB(c.env.DB);
  const id = c.req.param('id');
  await db.update(schema.tables).set({ isArchived: true, updatedAt: new Date() }).where(eq(schema.tables.id, id));
  return c.json({ success: true });
});
