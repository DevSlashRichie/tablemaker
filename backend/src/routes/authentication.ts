import { Hono } from "hono";
import { Bindings } from "../state";
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';

import { sign } from 'hono/jwt';
import { setCookie } from 'hono/cookie';

export const authenticationRoutes = new Hono<{ Bindings: Bindings }>();

// --- Admin Routes ---

authenticationRoutes.post('/login', zValidator('json', z.object({ 
  password: z.string(),
  turnstileToken: z.string()
})), async (c) => {
  const { password, turnstileToken } = c.req.valid('json');

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

  // 2. Check password
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
