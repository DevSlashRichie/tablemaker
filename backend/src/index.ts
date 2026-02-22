import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { jwt, sign, verify } from 'hono/jwt';
import { getCookie, setCookie } from 'hono/cookie';
import { getDB } from './db';
import * as schema from './db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';

type Bindings = {
  DB: D1Database;
  BUCKET: R2Bucket;
  JWT_SECRET: string;
  ADMIN_PASSWORD?: string;
  TURNSTILE_SECRET_KEY: string;
  EMAIL_API_KEY: string;
};

const app = new Hono<{ Bindings: Bindings }>().basePath('/api');

app.use('*', cors({
  origin: (origin) => origin,
  credentials: true,
}));

// --- Public Routes ---

// GET active game
app.get('/game/active', async (c) => {
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
      }
    }
  });

  if (!activeGame) {
    return c.json({ error: 'No hay eventos activos en este momento.' }, 404);
  }

  return c.json(activeGame);
});

// POST registration
const registerSchema = z.object({
  tableId: z.uuidv7(),
  name: z.string(),
  email: z.email(),
  phone: z.string().optional(),
  turnstileToken: z.string()
});

app.post('/register', zValidator('json', registerSchema), async (c) => {
  const { tableId, email, phone, turnstileToken, name } = c.req.valid('json');
  const db = getDB(c.env.DB);

  // 1. Validate Turnstile
  const verifyRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body: JSON.stringify({
      secret: c.env.TURNSTILE_SECRET_KEY,
      response: turnstileToken
    }),
    headers: { 'Content-Type': 'application/json' }
  });
  const verifyData: any = await verifyRes.json();
  if (!verifyData.success) {
    return c.json({ error: 'Captcha inválido' }, 400);
  }

  // 2. Check if game is open and table has space
  const table = await db.query.tables.findFirst({
    where: eq(schema.tables.id, tableId),
    with: {
      game: true,
      registrations: true
    }
  });

  if (!table || table.isArchived || table.game.isArchived) {
    return c.json({ error: 'Esta mesa no está disponible.' }, 400);
  }

  if (table.registrations.length >= table.maxPlayers) {
    return c.json({ error: 'Lo sentimos, esta mesa ya está llena.' }, 400);
  }

  const now = new Date();
  if (now < table.game.startRegistrationDate || now > table.game.endRegistrationDate) {
    return c.json({ error: 'El periodo de registro para este evento ha finalizado o aún no ha comenzado.' }, 400);
  }

  // 3. Register
  try {
    await db.insert(schema.registrations).values({
      tableId,
      name,
      email,
      phone
    });
  } catch (e: any) {
    if (e.message?.includes('UNIQUE')) {
      return c.json({ error: 'Ya estás registrado en esta mesa.' }, 400);
    }
    throw e;
  }

  // 4. Send Confirmation Email (Placeholder logic)
  // TODO: Implement actual email sending via provider
  console.log(`Sending confirmation to ${email} for table ${table.title}`);

  return c.json({ success: true, message: 'Registro exitoso. Revisa tu correo electrónico.' });
});

// --- Admin Routes ---

app.post('/admin/login', zValidator('json', z.object({ password: z.string() })), async (c) => {
  const { password } = c.req.valid('json');
  if (password !== (c.env.ADMIN_PASSWORD || 'admin')) {
    return c.json({ error: 'Credenciales inválidas' }, 401);
  }

  const token = await sign({ role: 'admin' }, c.env.JWT_SECRET);
  setCookie(c, 'token', token, {
    httpOnly: true,
    secure: true,
    sameSite: 'None',
    path: '/',
    maxAge: 60 * 60 * 24, // 1 day
  });

  return c.json({ success: true });
});

// Admin Middleware
const adminAuth = async (c: any, next: any) => {
  const token = getCookie(c, 'token');
  if (!token) {
    console.log('[Auth] No token cookie found');
    return c.json({ error: 'Unauthorized' }, 401);
  }
  try {
    await verify(token, c.env.JWT_SECRET, "HS256");
    await next();
  } catch (e) {
    console.error('[Auth] JWT Verification failed:', e);
    return c.json({ error: 'Unauthorized' }, 401);
  }
};

const admin = new Hono<{ Bindings: Bindings }>();
admin.use('*', adminAuth);

admin.post('/logout', (c) => {
  setCookie(c, 'token', '', {
    httpOnly: true,
    secure: false,
    sameSite: 'None',
    path: '/',
    maxAge: 0,
  });
  return c.json({ success: true });
});

// Games
admin.get('/games', async (c) => {
  const db = getDB(c.env.DB);
  return c.json(await db.query.games.findMany({ orderBy: [desc(schema.games.createdAt)] }));
});

const gameSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  headerImageUrl: z.url().optional(),
  startRegistrationDate: z.iso.datetime(),
  endRegistrationDate: z.iso.datetime(),
});

admin.post('/games', zValidator('json', gameSchema), async (c) => {
  const db = getDB(c.env.DB);
  const data = c.req.valid('json');
  const res = await db.insert(schema.games).values({
    ...data,
    startRegistrationDate: new Date(data.startRegistrationDate),
    endRegistrationDate: new Date(data.endRegistrationDate),
  }).returning();
  return c.json(res[0]);
});

admin.put('/games/:id', zValidator('json', gameSchema), async (c) => {
  const db = getDB(c.env.DB);
  const id = c.req.param('id');
  const data = c.req.valid('json');
  await db.update(schema.games).set({
    ...data,
    startRegistrationDate: new Date(data.startRegistrationDate),
    endRegistrationDate: new Date(data.endRegistrationDate),
    updatedAt: new Date(),
  }).where(eq(schema.games.id, id));
  return c.json({ success: true });
});

admin.post('/games/:id/archive', async (c) => {
  const db = getDB(c.env.DB);
  const id = c.req.param('id');
  await db.update(schema.games).set({ isArchived: true, updatedAt: new Date() }).where(eq(schema.games.id, id));
  return c.json({ success: true });
});

// Tables
admin.get('/tables', async (c) => {
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

admin.post('/tables', zValidator('json', tableSchema), async (c) => {
  const db = getDB(c.env.DB);
  const data = c.req.valid('json');
  const res = await db.insert(schema.tables).values(data).returning();
  return c.json(res[0]);
});

admin.put('/tables/:id', zValidator('json', tableSchema), async (c) => {
  const db = getDB(c.env.DB);
  const id = c.req.param('id');
  const data = c.req.valid('json');
  await db.update(schema.tables).set({ ...data, updatedAt: new Date() }).where(eq(schema.tables.id, id));
  return c.json({ success: true });
});

admin.post('/tables/:id/archive', async (c) => {
  const db = getDB(c.env.DB);
  const id = c.req.param('id');
  await db.update(schema.tables).set({ isArchived: true, updatedAt: new Date() }).where(eq(schema.tables.id, id));
  return c.json({ success: true });
});

// Export CSV
admin.get('/export/csv', async (c) => {
  const db = getDB(c.env.DB);
  const { gameId, tableId } = c.req.query();

  const regs = await db.query.registrations.findMany({
    where: (registrations, { eq, and }) => {
      // Logic for filtering
      if (tableId) return eq(registrations.tableId, tableId);
      return undefined; // We'll filter gameId after join because of Drizzle limitations in one-shot query sometimes
    },
    with: {
      table: {
        with: { game: true }
      }
    }
  });

  // Filter by gameId manually if provided
  const filteredRegs = gameId
    ? regs.filter(r => r.table.gameId === gameId)
    : regs;

  const header = 'Game,Table,Name,Email,Phone,Date\n';
  const rows = filteredRegs.map(r =>
    `"${r.table.game.title}","${r.table.title}","${r.name}","${r.email}","${r.phone || ''}","${r.createdAt.toISOString()}"`
  ).join('\n');

  const filename = tableId ? `registrations-table-${tableId}.csv` : (gameId ? `registrations-game-${gameId}.csv` : 'all-registrations.csv');

  return new Response(header + rows, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
});
app.route('/admin', admin);

export default app;
