import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Card, Button, Input } from '../../components/ui'
import { useState, useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile'

export const Route = createFileRoute('/admin/')({
  component: LoginPage,
})

function LoginPage() {
  const [password, setPassword] = useState('')
  const [turnstileToken, setTurnstileToken] = useState('')
  const [error, setError] = useState('')
  const turnstileRef = useRef<TurnstileInstance>(null)
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const loginMutation = useMutation({
    mutationFn: () => api.login(password, turnstileToken),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-auth'] })
      navigate({ to: '/admin/games' })
    },
    onError: (err: any) => {
      setError(err.message)
      turnstileRef.current?.reset()
    }
  })

  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <Card className="max-w-md w-full p-8 bg-blue-50">
        <h2 className="text-4xl font-black mb-6 uppercase italic">Admin Access</h2>
        <form onSubmit={(e) => { e.preventDefault(); loginMutation.mutate() }} className="space-y-4">
          <div>
            <label className="block font-black text-sm uppercase mb-1 tracking-tighter">Contraseña</label>
            <Input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          <div className="flex justify-center">
            <Turnstile
              ref={turnstileRef}
              siteKey="0x4AAAAAACgY-F3BTuxgIYTEIaMtu71xVJA"
              onSuccess={(token) => setTurnstileToken(token)}
            />
          </div>
          {error && <div className="p-3 bg-red-100 border-4 border-red-600 font-bold text-red-600">{error}</div>}
          <Button type="submit" className="w-full bg-main" disabled={loginMutation.isPending || !turnstileToken}>
            {loginMutation.isPending ? 'Validando...' : 'Entrar'}
          </Button>
        </form>
      </Card>
    </div>
  )
}
