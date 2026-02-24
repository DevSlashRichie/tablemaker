import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { Bindings } from './state';
import { adminAuthMiddleware } from './routes/authorization';
import { gamesAdminRoute, gamesPublicRoute } from './routes/games';
import { tablesAdminRoutes } from './routes/tables';
import { authenticationAdminRoutes, authenticationRoutes } from './routes/authentication';
import { exportAdminRoutes } from './routes/export';


const app = new Hono<{ Bindings: Bindings }>().basePath('/api');

app.use('*', cors({
  origin: (origin) => origin,
  credentials: true,
}));


const adminRoute = new Hono<{ Bindings: Bindings }>();

// Protected routes
adminRoute.use("*", adminAuthMiddleware);

adminRoute.route("/games", gamesAdminRoute);
adminRoute.route("/tables", tablesAdminRoutes);
adminRoute.route("/export", exportAdminRoutes);
adminRoute.route("/auth", authenticationAdminRoutes);

app.route('/admin', adminRoute);

// Public routes
app.route('/auth', authenticationRoutes);
app.route('/games', gamesPublicRoute);

export default app;
