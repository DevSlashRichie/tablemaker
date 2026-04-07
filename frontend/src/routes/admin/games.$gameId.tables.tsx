import { createFileRoute, useParams } from '@tanstack/react-router'
import { Card, Button, Input, FileInput, Modal, useToast, Textarea, MarkdownContent } from '../../components/ui'
import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from '@tanstack/react-form'
import { z } from 'zod'
import { api } from '../../lib/api'
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'

export const Route = createFileRoute('/admin/games/$gameId/tables')({
  component: ManageGameTables,
})

type Registration = {
  id: string
  name: string
  email: string
  phone: string | null
  createdAt: string
}

const columnHelper = createColumnHelper<Registration>()

const columns = (onDelete: (id: string) => void, onResend: (id: string) => void) => [
  columnHelper.accessor('name', {
    header: 'Nombre',
    cell: info => <span className="font-black">{info.getValue()}</span>,
  }),
  columnHelper.accessor('email', {
    header: 'Email',
    cell: info => info.getValue(),
  }),
  columnHelper.accessor('phone', {
    header: 'Teléfono',
    cell: info => info.getValue() || '-',
  }),
  columnHelper.accessor('createdAt', {
    header: 'Fecha',
    cell: info => new Date(info.getValue()).toLocaleString(),
  }),
  columnHelper.display({
    id: 'actions',
    header: 'Acciones',
    cell: info => (
      <div className="flex gap-2">
        <Button
          onClick={() => {
            if (confirm('¿Seguro que quieres eliminar este registro?')) {
              onDelete(info.row.original.id)
            }
          }}
          className="bg-red-500 text-white text-[8px] py-1 px-2 uppercase font-black h-auto"
        >
          Eliminar
        </Button>
        <Button
          onClick={() => onResend(info.row.original.id)}
          className="bg-blue-500 text-white text-[8px] py-1 px-2 uppercase font-black h-auto"
        >
          Notificar Cambio
        </Button>
      </div>
    ),
  }),
]

function ParticipantsTable({ data, onDelete, onResend }: { data: Registration[], onDelete: (id: string) => void, onResend: (id: string) => void }) {
  const table = useReactTable({
    data,
    columns: columns(onDelete, onResend),
    getCoreRowModel: getCoreRowModel(),
  })


  if (data.length === 0) return <p className="text-xs italic opacity-50 mt-4">Sin participantes registrados aún.</p>

  return (
    <div className="mt-6 border-2 border-black overflow-x-auto">
      <table className="w-full text-[10px] text-left border-collapse">
        <thead className="bg-black text-white uppercase font-black">
          {table.getHeaderGroups().map(headerGroup => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map(header => (
                <th key={header.id} className="p-2 border-r border-black last:border-0">
                  {flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map(row => (
            <tr key={row.id} className="border-t-2 border-black hover:bg-gray-100 font-medium">
              {row.getVisibleCells().map(cell => (
                <td key={cell.id} className="p-2 border-r border-black last:border-0">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ManageGameTables() {
  const { gameId } = useParams({ from: '/admin/games/$gameId/tables' })
  const queryClient = useQueryClient()
  const [isCreating, setIsCreating] = useState(false)
  const [editingTable, setEditingTable] = useState<any>(null)
  const { showToast } = useToast()

  const { data: game, isLoading: gameLoading } = useQuery({
    queryKey: ['admin-game', gameId],
    queryFn: async () => {
      const games = await api.getAdminGames()
      return games.find((g: any) => g.id === gameId)
    }
  })

  const { data: tables, isLoading: tablesLoading } = useQuery({
    queryKey: ['admin-tables', gameId],
    queryFn: async () => {
      const allTables = await api.getAdminTables()
      return allTables.filter((t: any) => t.gameId === gameId)
    }
  })

  const createMutation = useMutation({
    mutationFn: (values: any) => api.createTable({ ...values, gameId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-tables', gameId] })
      setIsCreating(false)
      showToast('Mesa creada correctamente', 'success')
    },
    onError: (error) => {
      showToast(error instanceof Error ? error.message : 'Error al crear la mesa', 'error')
    }
  })

  const archiveMutation = useMutation({
    mutationFn: (tableId: string) => api.archiveTable(tableId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-tables', gameId] })
      showToast('Mesa archivada correctamente', 'success')
    },
    onError: (error) => {
      showToast(error instanceof Error ? error.message : 'Error al archivar la mesa', 'error')
    }
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.updateTable(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-tables', gameId] })
      setEditingTable(null)
      showToast('Mesa actualizada correctamente', 'success')
    },
    onError: (error) => {
      showToast(error instanceof Error ? error.message : 'Error al actualizar la mesa', 'error')
    }
  })

  const deleteRegistrationMutation = useMutation({
    mutationFn: (id: string) => api.deleteRegistration(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-tables', gameId] })
      showToast('Registro eliminado correctamente', 'success')
    },
    onError: (error) => {
      showToast(error instanceof Error ? error.message : 'Error al eliminar el registro', 'error')
    }
  })

  const resendEmailMutation = useMutation({
    mutationFn: (id: string) => api.resendRegistrationEmail(id),
    onSuccess: () => {
      showToast('Correo de actualización enviado', 'success')
    },
    onError: (error) => {
      showToast(error instanceof Error ? error.message : 'Error al enviar la actualización', 'error')
    }
  })

  const form = useForm({
    defaultValues: {
      title: '',
      description: '',
      imageUrl: '',
      maxPlayers: 10,
    },
    validators: {
      onChange: z.object({
        title: z.string().min(1, 'El título es obligatorio'),
        description: z.string().min(1, 'La descripción es obligatoria'),
        imageUrl: z.string(),
        maxPlayers: z.number().int().min(1, 'Mínimo 1 jugador'),
      })
    },
    onSubmit: async ({ value }) => {
      createMutation.mutate(value)
    }
  })

  if (gameLoading || tablesLoading) return <div className="text-center py-20 text-2xl font-black uppercase italic tracking-tighter">Cargando mesas del evento...</div>

  return (
    <div className="space-y-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-black text-white p-6 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] gap-4">
        <h1 className="text-3xl font-black uppercase tracking-tighter italic">
          Mesas: {game?.title}
        </h1>
        <div className="flex gap-4 w-full md:w-auto">
          <Button
            onClick={() => api.exportRegistrations({ gameId })}
            className="bg-green-400 text-black text-xs px-4"
          >
            Exportar Registros (Juego)
          </Button>
          <Button onClick={() => setIsCreating(true)} className="bg-yellow-400 text-black flex-grow md:flex-grow-0">Nueva Mesa</Button>
        </div>
      </div>

      {isCreating && (
        <Card className="max-w-2xl mx-auto bg-yellow-50 border-dashed">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              e.stopPropagation()
              form.handleSubmit()
            }}
            className="space-y-6"
          >
            <h2 className="text-3xl font-black uppercase italic">Nueva Mesa</h2>

            <form.Field name="title">
              {(field) => (
                <div>
                  <label className="block font-black text-sm uppercase mb-1">Título de la Mesa</label>
                  <Input
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="Ej. Mesa 1: Introducción a D&D"
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
                  <Textarea
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="Describe lo que pasará en esta mesa..."
                    rows={4}
                  />
                  {field.state.meta.errors.length > 0 && (
                    <p className="text-red-600 text-xs font-bold mt-1 uppercase italic">
                      {field.state.meta.errors.map(err => typeof err === 'string' ? err : (err as any).message).join(', ')}
                    </p>
                  )}
                </div>
              )}
            </form.Field>

            <form.Field name="imageUrl">
              {(field) => (
                <div>
                  <label className="block font-black text-sm uppercase mb-1">Imagen</label>
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

            <form.Field name="maxPlayers">
              {(field) => (
                <div>
                  <label className="block font-black text-sm uppercase mb-1">Máximo de Jugadores</label>
                  <Input
                    type="number"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(Number(e.target.value))}
                  />
                  {field.state.meta.errors.length > 0 && (
                    <p className="text-red-600 text-xs font-bold mt-1 uppercase italic">
                      {field.state.meta.errors.map(err => typeof err === 'string' ? err : (err as any).message).join(', ')}
                    </p>
                  )}
                </div>
              )}
            </form.Field>

            <div className="flex gap-4">
              <Button type="submit" className="w-full bg-green-400" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Guardando...' : 'Crear Mesa'}
              </Button>
              <Button type="button" onClick={() => setIsCreating(false)} className="w-full bg-red-400">Cancelar</Button>
            </div>
          </form>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {tables?.length === 0 && !isCreating && (
          <p className="text-center col-span-2 font-black italic opacity-50 py-12 text-2xl uppercase tracking-tighter">
            Este juego no tiene mesas asignadas todavía.
          </p>
        )}
        {tables?.map((t: any) => (
          <Card key={t.id} className={t.isArchived ? 'opacity-50 grayscale border-dotted' : 'bg-white'}>
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-2xl font-black uppercase italic">{t.title}</h3>
              <div className="flex flex-col items-end gap-2">
                {t.isArchived ?
                  <span className="bg-black text-white px-2 py-1 text-xs border-2 border-black">ARCHIVADA</span> :
                  <span className="bg-yellow-400 px-2 py-1 text-xs border--black uppercase tracking-t2 border-black fontighter">Mesa Activa</span>
                }
                <span className="bg-blue-400 px-2 py-1 text-[10px] border-2 border-black font-black">
                  CUPO: {t.registrations?.length || 0} / {t.maxPlayers}
                </span>
              </div>
            </div>

            <MarkdownContent content={t.description} className="font-bold mb-4 opacity-75" />

            <h4 className="text-xs font-black uppercase italic mt-6 border-b-2 border-black inline-block mb-2">Participantes ({t.registrations?.length || 0})</h4>
            <ParticipantsTable
              data={t.registrations || []}
              onDelete={(id) => deleteRegistrationMutation.mutate(id)}
              onResend={(id) => resendEmailMutation.mutate(id)}
            />

            <div className="flex flex-wrap gap-4 mt-6">
              <Button
                onClick={() => setEditingTable(t)}
                className="bg-yellow-400 flex-grow"
              >
                Editar
              </Button>

              {!t.isArchived && (
                <Button
                  onClick={() => {
                    if (confirm('¿Seguro que quieres archivar esta mesa?')) {
                      archiveMutation.mutate(t.id)
                    }
                  }}
                  className="bg-red-400 flex-grow"
                  disabled={archiveMutation.isPending}
                >
                  {archiveMutation.isPending ? '...' : 'Archivar'}
                </Button>
              )}
            </div>
          </Card>
        ))}
      </div>

      <TableEditModal
        table={editingTable}
        isOpen={!!editingTable}
        onClose={() => setEditingTable(null)}
        onSave={(id, data) => updateMutation.mutate({ id, data })}
        isSaving={updateMutation.isPending}
        showToast={showToast}
      />
    </div>
  )
}

function TableEditModal({
  table,
  isOpen,
  onClose,
  onSave,
  isSaving,
  showToast
}: {
  table: any
  isOpen: boolean
  onClose: () => void
  onSave: (id: string, data: any) => void
  isSaving: boolean
  showToast: (message: string, type: 'success' | 'error') => void
}) {
  const [imageUrl, setImageUrl] = useState('')

  useEffect(() => {
    if (table) {
      setImageUrl(table.imageUrl || '')
    }
  }, [table])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    e.stopPropagation()

    const values = {
      gameId: table?.gameId,
      title: (document.getElementById('title') as HTMLInputElement)?.value,
      description: (document.getElementById('description') as HTMLInputElement)?.value,
      imageUrl: imageUrl,
      maxPlayers: Number((document.getElementById('maxPlayers') as HTMLInputElement)?.value) || 10,
    }

    if (!values.title || !values.description) {
      showToast('Por favor completa los campos obligatorios', 'error')
      return
    }

    if (!table) return
    onSave(table.id, values)
  }

  if (!isOpen) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Editar Mesa">
      <form
        key={table?.id}
        onSubmit={handleSubmit}
        className="space-y-6"
      >
        <div>
          <label className="block font-black text-sm uppercase mb-1">Título de la Mesa</label>
          <Input
            id="title"
            defaultValue={table?.title ?? ''}
          />
        </div>

        <div>
          <label className="block font-black text-sm uppercase mb-1">Descripción</label>
          <Textarea
            id="description"
            defaultValue={table?.description ?? ''}
            rows={4}
          />
        </div>

        <div>
          <label className="block font-black text-sm uppercase mb-1">Imagen</label>
          <div className="space-y-2">
            <Input
              id="imageUrl"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://... (o sube una imagen)"
            />
            <FileInput
              value={imageUrl}
              onChange={setImageUrl}
              label="Subir imagen"
            />
          </div>
        </div>

        <div>
          <label className="block font-black text-sm uppercase mb-1">Máximo de Jugadores</label>
          <Input
            id="maxPlayers"
            type="number"
            defaultValue={table?.maxPlayers ?? 10}
          />
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
