import { createFileRoute, useNavigate, Link } from '@tanstack/react-router'
import { Card, Button, Input, FileInput, Modal, useToast } from '../../components/ui'
import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from '@tanstack/react-form'
import { z } from 'zod'
import { api } from '../../lib/api'

export const Route = createFileRoute('/admin/games/')({
  component: GamesAdmin,
})

function GamesAdmin() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [isCreating, setIsCreating] = useState(false)
  const [editingGame, setEditingGame] = useState<any>(null)
  const { showToast } = useToast()

  const { data: games, isLoading } = useQuery({
    queryKey: ['admin-games'],
    queryFn: () => api.getAdminGames()
  })

  const createMutation = useMutation({
    mutationFn: (values: any) => api.createGame(values),
    onSuccess: (newGame: any) => {
      queryClient.invalidateQueries({ queryKey: ['admin-games'] })
      setIsCreating(false)
      showToast('Juego creado correctamente', 'success')
      navigate({ to: '/admin/games/$gameId/tables', params: { gameId: newGame.id } })
    },
    onError: (error) => {
      showToast(error instanceof Error ? error.message : 'Error al crear el juego', 'error')
    }
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.updateGame(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-games'] })
      setEditingGame(null)
      showToast('Juego actualizado correctamente', 'success')
    },
    onError: (error) => {
      showToast(error instanceof Error ? error.message : 'Error al actualizar el juego', 'error')
    }
  })

  const archiveMutation = useMutation({
    mutationFn: (gameId: string) => api.archiveGame(gameId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-games'] })
      showToast('Juego archivado correctamente', 'success')
    },
    onError: (error) => {
      showToast(error instanceof Error ? error.message : 'Error al archivar el juego', 'error')
    }
  })

  const form = useForm({
    defaultValues: {
      title: '',
      description: '',
      headerImageUrl: '',
      eventTimestamp: '',
      location: '',
      startRegistrationDate: '',
      endRegistrationDate: '',
    },
    validators: {
      onChange: z.object({
        title: z.string().min(1, 'El título es obligatorio'),
        description: z.string().min(1, 'La descripción es obligatoria'),
        headerImageUrl: z.string(),
        eventTimestamp: z.string().min(1, 'Fecha del evento requerida'),
        location: z.string().min(1, 'El lugar es obligatorio'),
        startRegistrationDate: z.string().min(1, 'Fecha requerida'),
        endRegistrationDate: z.string().min(1, 'Fecha requerida'),
      })
    },
    onSubmit: async ({ value }) => {
      createMutation.mutate(value)
    }
  })

  if (isLoading) return <div className="text-center py-20 text-2xl font-black uppercase italic tracking-tighter">Cargando eventos...</div>

  return (
    <div className="space-y-12">
      <div className="flex justify-between items-center bg-black text-white p-6 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <h1 className="text-4xl font-black uppercase tracking-tighter">Mis Juegos / Eventos</h1>
        <Button onClick={() => setIsCreating(true)} className="bg-green-400 text-black">Crear Nuevo Juego</Button>
      </div>

      {isCreating && (
        <Card className="max-w-2xl mx-auto border-dashed border-main-accent">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              e.stopPropagation()
              form.handleSubmit()
            }}
            className="space-y-6"
          >
            <h2 className="text-3xl font-black uppercase italic text-main-accent">Nuevo Juego</h2>

            <form.Field name="title">
              {(field) => (
                <div>
                  <label className="block font-black text-sm uppercase mb-1">Título</label>
                  <Input
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="Ej. Torneo de Ajedrez"
                  />
                  {field.state.meta.errors.length > 0 && (
                    <p className="text-red-600 text-xs font-bold mt-1 uppercase italic">
                      {field.state.meta.errors.map(err => typeof err === 'string' ? err : (err as any).message).join(', ')}
                    </p>
                  )}
                </div>
              )}
            </form.Field>

            <form.Field name="description">
              {(field) => (
                <div>
                  <label className="block font-black text-sm uppercase mb-1">Descripción</label>
                  <Input
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="Describe el evento..."
                  />
                  {field.state.meta.errors.length > 0 && (
                    <p className="text-red-600 text-xs font-bold mt-1 uppercase italic">
                      {field.state.meta.errors.map(err => typeof err === 'string' ? err : (err as any).message).join(', ')}
                    </p>
                  )}
                </div>
              )}
            </form.Field>

            <form.Field name="headerImageUrl">
              {(field) => (
                <div>
                  <label className="block font-black text-sm uppercase mb-1">Imagen de Cabecera</label>
                  <div className="space-y-2">
                    <Input
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="https://... (o sube una imagen)"
                    />
                    <FileInput
                      value={field.state.value}
                      onChange={field.handleChange}
                      label="Subir imagen"
                    />
                  </div>
                </div>
              )}
            </form.Field>

            <form.Field name="eventTimestamp">
              {(field) => (
                <div>
                  <label className="block font-black text-sm uppercase mb-1">Fecha y Hora del Evento</label>
                  <Input
                    type="datetime-local"
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(new Date(e.target.value).toISOString())}
                  />
                  {field.state.meta.errors.length > 0 && (
                    <p className="text-red-600 text-xs font-bold mt-1 uppercase italic">
                      {field.state.meta.errors.map(err => typeof err === 'string' ? err : (err as any).message).join(', ')}
                    </p>
                  )}
                </div>
              )}
            </form.Field>

            <form.Field name="location">
              {(field) => (
                <div>
                  <label className="block font-black text-sm uppercase mb-1">Lugar</label>
                  <Input
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="Ej. Casa de la Cultura"
                  />
                  {field.state.meta.errors.length > 0 && (
                    <p className="text-red-600 text-xs font-bold mt-1 uppercase italic">
                      {field.state.meta.errors.map(err => typeof err === 'string' ? err : (err as any).message).join(', ')}
                    </p>
                  )}
                </div>
              )}
            </form.Field>

            <div className="grid grid-cols-2 gap-4">
              <form.Field name="startRegistrationDate">
                {(field) => (
                  <div>
                    <label className="block font-black text-sm uppercase mb-1 text-xs">Inicio Registro</label>
                    <Input
                      type="datetime-local"
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(new Date(e.target.value).toISOString())}
                    />
                    {field.state.meta.errors.length > 0 && (
                      <p className="text-red-600 text-xs font-bold mt-1 uppercase italic">
                        {field.state.meta.errors.map(err => typeof err === 'string' ? err : (err as any).message).join(', ')}
                      </p>
                    )}
                  </div>
                )}
              </form.Field>

              <form.Field name="endRegistrationDate">
                {(field) => (
                  <div>
                    <label className="block font-black text-sm uppercase mb-1 text-xs">Fin Registro</label>
                    <Input
                      type="datetime-local"
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(new Date(e.target.value).toISOString())}
                    />
                    {field.state.meta.errors.length > 0 && (
                      <p className="text-red-600 text-xs font-bold mt-1 uppercase italic">
                        {field.state.meta.errors.map(err => typeof err === 'string' ? err : (err as any).message).join(', ')}
                      </p>
                    )}
                  </div>
                )}
              </form.Field>
            </div>

            <div className="flex gap-4">
              <Button type="submit" className="w-full bg-green-400" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Creando...' : 'Crear y Gestionar Mesas'}
              </Button>
              <Button type="button" onClick={() => setIsCreating(false)} className="w-full bg-red-400">Cancelar</Button>
            </div>
          </form>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {games?.map((g: any) => (
          <Card key={g.id} className={g.isArchived ? 'opacity-50 grayscale border-dotted' : 'bg-white'}>
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-2xl font-black uppercase italic tracking-tighter">{g.title}</h3>
              {g.isArchived ?
                <span className="bg-black text-white px-2 py-1 text-xs border-2 border-black">ARCHIVADO</span> :
                <span className="bg-green-400 px-2 py-1 text-xs border-2 border-black font-black">ACTIVO</span>
              }
            </div>
            <p className="font-bold mb-4 opacity-75">{g.description}</p>
            <div className="text-xs font-black italic opacity-60 space-y-1 mb-6">
              <p>Registro: {new Date(g.startRegistrationDate).toLocaleString()} - {new Date(g.endRegistrationDate).toLocaleString()}</p>
            </div>

            <div className="flex gap-4">
              <Button
                onClick={() => setEditingGame(g)}
                className="bg-yellow-400 px-4 py-2"
              >
                Editar
              </Button>
              <Link
                to="/admin/games/$gameId/tables"
                params={{ gameId: g.id }}
                className="flex-grow"
              >
                <Button className="w-full bg-blue-400">Gestionar Mesas</Button>
              </Link>

              {!g.isArchived && (
                <Button
                  onClick={() => {
                    if (confirm('¿Seguro que quieres archivar este juego?')) {
                      archiveMutation.mutate(g.id)
                    }
                  }}
                  className="bg-red-400 px-4 py-2"
                  disabled={archiveMutation.isPending}
                >
                  {archiveMutation.isPending ? '...' : 'Archivar'}
                </Button>
              )}
            </div>
          </Card>
        ))}
      </div>

      <GameEditModal
        game={editingGame}
        isOpen={!!editingGame}
        onClose={() => setEditingGame(null)}
        onSave={(id, data) => updateMutation.mutate({ id, data })}
        isSaving={updateMutation.isPending}
        showToast={showToast}
      />
    </div>
  )
}

function GameEditModal({ 
  game, 
  isOpen, 
  onClose, 
  onSave,
  isSaving,
  showToast
}: { 
  game: any
  isOpen: boolean
  onClose: () => void
  onSave: (id: string, data: any) => void
  isSaving: boolean
  showToast: (message: string, type: 'success' | 'error') => void
}) {
  const [headerImageUrl, setHeaderImageUrl] = useState('')

  useEffect(() => {
    if (game) {
      setHeaderImageUrl(game.headerImageUrl || '')
    }
  }, [game])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    const values = {
      title: (document.getElementById('title') as HTMLInputElement)?.value,
      description: (document.getElementById('description') as HTMLInputElement)?.value,
      headerImageUrl: headerImageUrl,
      eventTimestamp: (document.getElementById('eventTimestamp') as HTMLInputElement)?.value,
      location: (document.getElementById('location') as HTMLInputElement)?.value,
      startRegistrationDate: (document.getElementById('startRegistrationDate') as HTMLInputElement)?.value,
      endRegistrationDate: (document.getElementById('endRegistrationDate') as HTMLInputElement)?.value,
    }
    
    if (!values.title || !values.description || !values.eventTimestamp || !values.location) {
      showToast('Por favor completa los campos obligatorios', 'error')
      return
    }
    
    if (!game) return
    
    const data = {
      ...values,
      eventTimestamp: values.eventTimestamp ? new Date(values.eventTimestamp).toISOString() : '',
      startRegistrationDate: values.startRegistrationDate ? new Date(values.startRegistrationDate).toISOString() : '',
      endRegistrationDate: values.endRegistrationDate ? new Date(values.endRegistrationDate).toISOString() : '',
    }
    onSave(game.id, data)
  }

  if (!isOpen) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Editar Juego">
      <form
        key={game?.id}
        onSubmit={handleSubmit}
        className="space-y-6"
      >
        <div>
          <label className="block font-black text-sm uppercase mb-1">Título</label>
          <Input
            id="title"
            defaultValue={game?.title ?? ''}
          />
        </div>

        <div>
          <label className="block font-black text-sm uppercase mb-1">Descripción</label>
          <Input
            id="description"
            defaultValue={game?.description ?? ''}
          />
        </div>

        <div>
          <label className="block font-black text-sm uppercase mb-1">Imagen de Cabecera</label>
          <div className="space-y-2">
            <Input
              id="headerImageUrl"
              value={headerImageUrl}
              onChange={(e) => setHeaderImageUrl(e.target.value)}
              placeholder="https://... (o sube una imagen)"
            />
            <FileInput
              value={headerImageUrl}
              onChange={setHeaderImageUrl}
              label="Subir imagen"
            />
          </div>
        </div>

        <div>
          <label className="block font-black text-sm uppercase mb-1">Fecha y Hora del Evento</label>
          <Input
            id="eventTimestamp"
            type="datetime-local"
            defaultValue={game?.eventTimestamp ? new Date(game.eventTimestamp).toISOString().slice(0, 16) : ''}
          />
        </div>

        <div>
          <label className="block font-black text-sm uppercase mb-1">Lugar</label>
          <Input
            id="location"
            defaultValue={game?.location ?? ''}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block font-black text-sm uppercase mb-1 text-xs">Inicio Registro</label>
            <Input
              id="startRegistrationDate"
              type="datetime-local"
              defaultValue={game?.startRegistrationDate ? new Date(game.startRegistrationDate).toISOString().slice(0, 16) : ''}
            />
          </div>

          <div>
            <label className="block font-black text-sm uppercase mb-1 text-xs">Fin Registro</label>
            <Input
              id="endRegistrationDate"
              type="datetime-local"
              defaultValue={game?.endRegistrationDate ? new Date(game.endRegistrationDate).toISOString().slice(0, 16) : ''}
            />
          </div>
        </div>

        <div className="flex gap-4">
          <Button type="submit" className="w-full bg-green-400" disabled={isSaving}>
            {isSaving ? 'Guardando...' : 'Guardar Cambios'}
          </Button>
          <Button type="button" onClick={onClose} className="w-full bg-red-400">Cancelar</Button>
        </div>
      </form>
    </Modal>
  )
}
