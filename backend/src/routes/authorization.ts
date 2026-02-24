import { getCookie } from "hono/cookie";
import { verify } from "hono/jwt";

// Admin Middleware
export const adminAuthMiddleware = async (c: any, next: any) => {
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

