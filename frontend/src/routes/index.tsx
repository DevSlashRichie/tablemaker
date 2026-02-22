import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Card, Button, Input, cn } from '../components/ui'
import { useState, useRef } from 'react'
import { useForm } from '@tanstack/react-form'
import { z } from 'zod'
import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile'
import { api } from '../lib/api'

export const Route = createFileRoute('/')({
  component: LandingPage,
})

function LandingPage() {
  const [selectedTable, setSelectedTable] = useState<any>(null)

  const { data: game, isLoading, error } = useQuery({
    queryKey: ['active-game'],
    queryFn: () => api.getActiveGame()
  })

  if (isLoading) return <div className="text-center py-20 text-2xl font-black uppercase italic tracking-tighter">Cargando evento...</div>
  if (error || !game) return <div className="text-center py-20 text-2xl font-black text-red-600 uppercase italic">No hay eventos activos en este momento.</div>

  const now = new Date()
  const isClosed = now < new Date(game.startRegistrationDate) || now > new Date(game.endRegistrationDate)

  return (
    <div className="space-y-12">
      <header className="relative h-96 overflow-hidden border-4 border-black group shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]">
        {game.headerImageUrl ? (
          <img src={game.headerImageUrl} alt={game.title} className="w-full h-full object-cover grayscale transition-all group-hover:grayscale-0" />
        ) : (
          <div className="w-full h-full bg-main flex items-center justify-center">
            <span className="text-6xl font-black opacity-20 italic">NO IMAGE</span>
          </div>
        )}
        <div className="absolute inset-0 bg-black/50 flex flex-col justify-end p-8 text-white">
          <h1 className="text-7xl font-black uppercase tracking-tighter shadow-black italic">{game.title}</h1>
          <p className="text-xl max-w-2xl font-bold bg-white text-black p-4 border-4 border-black mt-4 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            {game.description}
          </p>
          {isClosed && (
            <div className="mt-6 bg-red-500 text-white font-black px-6 py-2 border-4 border-black inline-block uppercase text-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              El registro está cerrado
            </div>
          )}
        </div>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
        {game.tables.map((table: any) => (
          <TableCard
            key={table.id}
            table={table}
            isClosed={isClosed}
            onSelect={() => setSelectedTable(table)}
          />
        ))}
      </section>

      {selectedTable && (
        <RegistrationModal
          table={selectedTable}
          onClose={() => setSelectedTable(null)}
        />
      )}
    </div>
  )
}

function TableCard({ table, isClosed, onSelect }: { table: any, isClosed: boolean, onSelect: () => void }) {
  const isFull = table.registrations?.length >= table.maxPlayers
  const isDisabled = isClosed || isFull

  return (
    <Card className={cn("flex flex-col h-full hover:translate-x-[-4px] hover:translate-y-[-4px] transition-transform", isDisabled && "opacity-60 grayscale")}>
      {table.imageUrl && (
        <img src={table.imageUrl} alt={table.title} className="h-48 w-full object-cover mb-4 border-4 border-black grayscale hover:grayscale-0 transition-all" />
      )}
      <div className="flex justify-between items-start mb-3 gap-2">
        <h3 className="text-3xl font-black uppercase italic tracking-tighter leading-none">{table.title}</h3>
        <span className={cn(
          "px-2 py-1 text-[10px] border-2 border-black font-black whitespace-nowrap",
          isFull ? "bg-red-400" : "bg-blue-400 text-white"
        )}>
          {isFull ? 'LLENO' : `${table.registrations?.length || 0} / ${table.maxPlayers}`}
        </span>
      </div>
      <p className="flex-grow font-bold mb-8 text-gray-800 leading-tight">{table.description}</p>

      <Button
        onClick={onSelect}
        className={cn(
          "w-full py-4 text-xl uppercase italic",
          isDisabled && "bg-gray-400 cursor-not-allowed shadow-none"
        )}
        disabled={isDisabled}
      >
        {isClosed ? 'Cerrado' : (isFull ? 'Mesa Llena' : 'Unirme a esta mesa')}
      </Button>
    </Card>
  )
}

function RegistrationModal({ table, onClose }: { table: any, onClose: () => void }) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const turnstileRef = useRef<TurnstileInstance>(null)

  const form = useForm({
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      turnstileToken: '',
    },
    validators: {
      onChange: z.object({
        name: z.string().min(2, 'El nombre es obligatorio'),
        email: z.string().email('Email inválido'),
        phone: z.string(),
        turnstileToken: z.string().min(1, 'El captcha es obligatorio'),
      })
    },
    onSubmit: async ({ value }) => {
      setStatus('loading')
      try {
        const data = await api.register({
          tableId: table.id,
          name: value.name,
          email: value.email,
          phone: value.phone,
          turnstileToken: value.turnstileToken
        })
        setStatus('success')
        setMessage(data.message)
      } catch (err: any) {
        setStatus('error')
        setMessage(err.message)
        turnstileRef.current?.reset()
      }
    }
  })

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <Card className="max-w-md w-full relative bg-white overflow-visible">
        <button
          onClick={onClose}
          className="absolute -top-6 -right-6 bg-red-500 text-white font-black w-12 h-12 flex items-center justify-center text-2xl border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
        >
          X
        </button>

        {status === 'success' ? (
          <div className="text-center py-8">
            <h2 className="text-4xl font-black mb-6 uppercase italic tracking-tighter">¡Registrado!</h2>
            <p className="text-xl font-bold mb-10 leading-tight">{message}</p>
            <Button onClick={onClose} className="w-full bg-green-400">Genial, gracias</Button>
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              e.stopPropagation()
              form.handleSubmit()
            }}
            className="space-y-6"
          >
            <h2 className="text-4xl font-black uppercase italic tracking-tighter leading-none">
              Registro:<br />
              <span className="text-main-accent">{table.title}</span>
            </h2>

            <div className="space-y-4">
              <form.Field name="name">
                {(field) => (
                  <div>
                    <label className="block font-black text-sm uppercase mb-1 italic">Nombre Completo (Obligatorio)</label>
                    <Input
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="Ej. Juan Pérez"
                    />
                    {field.state.meta.errors.length > 0 && (
                      <p className="text-red-600 text-xs font-bold mt-1 uppercase italic">
                        {field.state.meta.errors.map(err => typeof err === 'string' ? err : (err as any).message).join(', ')}
                      </p>
                    )}
                  </div>
                )}
              </form.Field>

              <form.Field name="email">
                {(field) => (
                  <div>
                    <label className="block font-black text-sm uppercase mb-1 italic">Email (Obligatorio)</label>
                    <Input
                      type="email"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="tu@email.com"
                    />
                    {field.state.meta.errors.length > 0 && (
                      <p className="text-red-600 text-xs font-bold mt-1 uppercase italic">
                        {field.state.meta.errors.map(err => typeof err === 'string' ? err : (err as any).message).join(', ')}
                      </p>
                    )}
                  </div>
                )}
              </form.Field>

              <form.Field name="phone">
                {(field) => (
                  <div>
                    <label className="block font-black text-sm uppercase mb-1 italic">Teléfono (Opcional)</label>
                    <Input
                      type="tel"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="+34 600 000 000"
                    />
                  </div>
                )}
              </form.Field>
            </div>

            <form.Field name="turnstileToken">
              {(field) => (
                <div className="space-y-2">
                  <div className="flex justify-center border-4 border-black p-2 bg-gray-50 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                    <Turnstile
                      ref={turnstileRef}
                      siteKey={import.meta.env.VITE_TURNSTILE_SITE_KEY}
                      onSuccess={(token) => field.handleChange(token)}
                      className="w-full"
                      options={{ size: "flexible" }}
                    />
                  </div>
                  {field.state.meta.errors.length > 0 && (
                    <p className="text-red-600 text-xs font-bold uppercase italic text-center">
                      {field.state.meta.errors.map(err => typeof err === 'string' ? err : (err as any).message).join(', ')}
                    </p>
                  )}
                </div>
              )}
            </form.Field>

            {status === 'error' && (
              <div className="p-4 bg-red-100 border-4 border-red-600 font-black text-red-600 uppercase text-sm italic">
                {message}
              </div>
            )}

            <Button type="submit" className="w-full py-4 text-2xl bg-green-400" disabled={status === 'loading'}>
              {status === 'loading' ? 'Procesando...' : 'Confirmar'}
            </Button>
          </form>
        )}
      </Card>
    </div>
  )
}
