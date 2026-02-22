import { createRootRouteWithContext, Outlet, Link } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/router-devtools'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import type { QueryClient } from '@tanstack/react-query'

interface MyRouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  component: () => (
    <>
      <div className="min-h-screen font-lato">
        <nav className="p-4 border-b-4 border-black bg-white flex justify-between items-center sticky top-0 z-50">
          <Link to="/" className="text-3xl font-black uppercase tracking-tighter">
            TableMaker
          </Link>
        </nav>
        <main className="max-w-7xl mx-auto p-4 md:p-8">
          <Outlet />
        </main>
      </div>
      <TanStackRouterDevtools />
      <ReactQueryDevtools />
    </>
  ),
})
