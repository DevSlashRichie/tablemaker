import { Hono } from "hono";
import { getDB } from "../db";
import * as schema from '../db/schema';
import { Bindings } from "../state";
import { eq, desc } from 'drizzle-orm';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { Resend } from 'resend';

export const gamesPublicRoute = new Hono<{ Bindings: Bindings }>();

async function sendConfirmationEmail(db: any, registrationId: string, env: Bindings, isUpdate = false) {
  const reg = await db.query.registrations.findFirst({
    where: eq(schema.registrations.id, registrationId),
    with: {
      table: {
        with: {
          game: true
        }
      }
    }
  });

  if (!reg) throw new Error('Registro no encontrado');

  const resend = new Resend(env.EMAIL_API_KEY);
  await resend.emails.send({
    from: env.EMAIL_FROM,
    to: reg.email,
    subject: isUpdate ? '[ACTUALIZACIÓN] Confirmación de registro' : 'Confirmación de registro',
    html: `
      ${isUpdate ? `
        <div style="background-color: #fff3cd; border: 1px solid #ffeeba; color: #856404; padding: 15px; margin-bottom: 20px; border-radius: 4px; font-family: sans-serif;">
          <strong>Nota importante:</strong> Estamos reenviando este correo con información actualizada o corregida sobre el horario del evento. Por favor, toma en cuenta los detalles a continuación.
        </div>
      ` : ''}
      <h1>¡Estás registrado!</h1>
      <p>Hola ${reg.name},</p>
      <p>Tu registro para la mesa <strong>${reg.table.title}</strong> ha sido confirmado.</p>
      <p>Detalles del evento:</p>
      <ul>
        <li>Mesa: ${reg.table.title}</li>
        <li>Fecha y hora: ${reg.table.game.eventTimestamp.toLocaleString('es-MX', {
      dateStyle: 'full',
      timeStyle: 'short',
      timeZone: 'America/Mexico_City'
    })}</li>
        <li>Lugar: ${reg.table.game.location}</li>
      </ul>
      <p>¡Nos vemos ahí!</p>
    `
  });
}

// POST registration
const registerSchema = z.object({
  tableId: z.uuidv7(),
  name: z.string(),
  email: z.email(),
  phone: z.string().optional(),
  turnstileToken: z.string()
});

gamesPublicRoute.post('/register', zValidator('json', registerSchema), async (c) => {
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
  let registrationId: string;
  try {
    const res = await db.insert(schema.registrations).values({
      tableId,
      name,
      email,
      phone
    }).returning();
    registrationId = res[0].id;
  } catch (e: any) {
    if (e.message?.includes('UNIQUE')) {
      return c.json({ error: 'Ya estás registrado en esta mesa.' }, 400);
    }
    throw e;
  }

  // 4. Send Confirmation Email
  await sendConfirmationEmail(db, registrationId, c.env);

  return c.json({ success: true, message: 'Registro exitoso. Revisa tu correo electrónico.' });
});

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

gamesAdminRoute.delete('/registrations/:id', async (c) => {
  const db = getDB(c.env.DB);
  const id = c.req.param('id');
  await db.delete(schema.registrations).where(eq(schema.registrations.id, id));
  return c.json({ success: true });
});

gamesAdminRoute.post('/registrations/:id/resend', async (c) => {
  const db = getDB(c.env.DB);
  const id = c.req.param('id');
  try {
    await sendConfirmationEmail(db, id, c.env, true);
    return c.json({ success: true });
  } catch (e: any) {
    return c.json({ error: e.message || 'Error al reenviar el correo' }, 400);
  }
});

