import { Hono } from "hono";
import { getDB } from "../db";
import * as schema from '../db/schema';
import { Bindings } from "../state";
import { eq } from 'drizzle-orm';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';

import { sign } from 'hono/jwt';
import { setCookie } from 'hono/cookie';

export const authenticationRoutes = new Hono<{ Bindings: Bindings }>();

// POST registration
const registerSchema = z.object({
  tableId: z.uuidv7(),
  name: z.string(),
  email: z.email(),
  phone: z.string().optional(),
  turnstileToken: z.string()
});

authenticationRoutes.post('/register', zValidator('json', registerSchema), async (c) => {
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

authenticationRoutes.post('/login', zValidator('json', z.object({ password: z.string() })), async (c) => {
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


export const authenticationAdminRoutes = new Hono<{ Bindings: Bindings }>();

authenticationAdminRoutes.post('/logout', (c) => {
  setCookie(c, 'token', '', {
    httpOnly: true,
    secure: true,
    sameSite: 'None',
    path: '/',
    maxAge: 0,
  });
  return c.json({ success: true });
});
