

import { Hono } from "hono";
import { getDB } from "../db";
import { Bindings } from "../state";

export const exportAdminRoutes = new Hono<{ Bindings: Bindings }>();

// Export CSV
exportAdminRoutes.get('/csv', async (c) => {
  const db = getDB(c.env.DB);
  const { gameId, tableId } = c.req.query();

  const regs = await db.query.registrations.findMany({
    where: (registrations, { eq }) => {
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
