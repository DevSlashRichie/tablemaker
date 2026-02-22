# TableMaker - Multi-table Event Registration Platform

Low-friction event registration platform built with the Cloudflare Free Stack.

## Tech Stack

- **Frontend**: Vite, React (TypeScript), TailwindCSS v4, TanStack (Query, Router, Form, Table).
- **Backend**: Cloudflare Workers, Hono, Drizzle ORM, Zod.
- **Database**: Cloudflare D1 (SQLite).
- **Storage**: Cloudflare R2.
- **Captcha**: Cloudflare Turnstile.

## Project Structure

- `backend/`: Cloudflare Worker and Database schema.
- `frontend/`: React application.

## Prerequisites

- [Bun](https://bun.sh/) installed.
- Cloudflare account with D1 and R2 enabled.

## Setup & Deployment

### 1. Backend

1. Navigate to `backend/`.
2. Install dependencies:
   ```bash
   bun install
   ```
3. Create D1 database:
   ```bash
   npx wrangler d1 create tablemaker-db
   ```
   *Copy the `database_id` and update it in `backend/wrangler.toml`.*
4. Run migrations:
   ```bash
   npx wrangler d1 migrations apply tablemaker-db --local
   # For production:
   # npx wrangler d1 migrations apply tablemaker-db --remote
   ```
5. Set environment variables:
   ```bash
   npx wrangler secret put JWT_SECRET
   npx wrangler secret put TURNSTILE_SECRET_KEY
   npx wrangler secret put ADMIN_PASSWORD
   ```
6. Run locally:
   ```bash
   bun run dev
   ```

### 2. Frontend

1. Navigate to `frontend/`.
2. Install dependencies:
   ```bash
   bun install
   ```
3. Run locally:
   ```bash
   bun run dev
   ```

## Design Decisions

- **Neo-Brutalism**: High-contrast, bold borders, and vibrant colors for a modern, high-frictionless feel.
- **TanStack Ecosystem**: Used for state management (Query), routing (Router), and forms (Form) to ensure type safety and performance.
- **Cloudflare D1**: Chosen for zero-cost, edge-ready SQLite database.
- **Hono**: Minimalist and fast framework for Cloudflare Workers.
- **Drizzle ORM**: Provides type-safe database interactions and easy migrations.
- **Archiving**: Entities are never deleted, only marked as `is_archived` to preserve historical data.

## License

MIT
