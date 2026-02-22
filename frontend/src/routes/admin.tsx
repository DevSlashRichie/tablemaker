import { createFileRoute, Outlet, Link, useNavigate, useRouterState } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '../components/ui'
import { useEffect } from 'react'
import { api } from '../lib/api'

export const Route = createFileRoute('/admin')({
  component: AdminLayout,
})

function AdminLayout() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const state = useRouterState()
  
  const { data: user, isLoading } = useQuery({
    queryKey: ['admin-auth'],
    queryFn: () => api.getAdminGames().then(() => ({ role: 'admin' })),
    retry: false,
    staleTime: 5 * 60 * 1000
  })

  const logoutMutation = useMutation({
    mutationFn: () => api.logout(),
    onSuccess: () => {
      queryClient.clear()
      navigate({ to: '/admin' })
    }
  })

  useEffect(() => {
    if (user && state.location.pathname === '/admin') {
      navigate({ to: '/admin/games' })
    }
  }, [user, state.location.pathname, navigate])

  if (isLoading) return <div className="text-center py-20 text-2xl font-black uppercase tracking-tighter">Cargando administración...</div>

  const isLoginPage = state.location.pathname === '/admin' || state.location.pathname === '/admin/'

  if (!user && !isLoginPage) {
    navigate({ to: '/admin' })
    return null
  }

  return (
    <div className="space-y-8">
      {user && (
        <nav className="flex justify-between items-center bg-black text-white p-4 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] sticky top-20 z-40">
          <div className="flex gap-6 items-center">
            <h2 className="text-2xl font-black uppercase tracking-tighter italic">Admin</h2>
            <Link to="/admin/games" className="font-bold hover:text-main-accent border-b-2 border-transparent hover:border-main-accent">
              Mis Eventos
            </Link>
          </div>
          <Button 
            onClick={() => logoutMutation.mutate()} 
            className="bg-red-400 text-black text-xs px-3 py-1 shadow-none hover:translate-y-0 active:translate-y-0"
            disabled={logoutMutation.isPending}
          >
            {logoutMutation.isPending ? 'Saliendo...' : 'Cerrar Sesión'}
          </Button>
        </nav>
      )}

      <div>
        <Outlet />
      </div>
    </div>
  )
}
