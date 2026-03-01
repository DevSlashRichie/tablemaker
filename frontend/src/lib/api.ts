const BASE_URL = import.meta.env.VITE_API_BASE_URL;

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${BASE_URL}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    credentials: 'include', // Siempre incluimos cookies para el admin
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Error desconocido' }));
    throw new Error(errorData.error || `Error ${response.status}: ${response.statusText}`);
  }

  return response.json();
}

export const api = {
  // Public
  getActiveGame: () => request<any>('/api/games/active'),
  register: (data: { tableId: string; name: string; email: string; phone?: string; turnstileToken: string }) => 
    request<any>('/api/games/register', { method: 'POST', body: JSON.stringify(data) }),

  // Admin Auth
  login: (password: string, turnstileToken: string) => request<any>('/api/auth/login', { method: 'POST', body: JSON.stringify({ password, turnstileToken }) }),
  logout: () => request<any>('/api/admin/auth/logout', { method: 'POST' }),

  // Admin Games
  getAdminGames: () => request<any[]>('/api/admin/games'),
  createGame: (data: any) => request<any>('/api/admin/games', { method: 'POST', body: JSON.stringify(data) }),
  updateGame: (id: string, data: any) => request<any>(`/api/admin/games/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  archiveGame: (id: string) => request<any>(`/api/admin/games/${id}/archive`, { method: 'POST' }),

  // Admin Tables
  getAdminTables: () => request<any[]>('/api/admin/tables'),
  createTable: (data: any) => request<any>('/api/admin/tables', { method: 'POST', body: JSON.stringify(data) }),
  updateTable: (id: string, data: any) => request<any>(`/api/admin/tables/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  archiveTable: (id: string) => request<any>(`/api/admin/tables/${id}/archive`, { method: 'POST' }),

  // Helpers para URLs (CSV)
  getExportUrl: (params: { gameId?: string; tableId?: string } = {}) => {
    const search = new URLSearchParams(params as any).toString();
    return `${BASE_URL}/api/admin/export/csv${search ? `?${search}` : ''}`;
  }
};
