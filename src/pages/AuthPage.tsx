import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext'

type Mode = 'login' | 'register'

/**
 * AuthPage — Pantalla de Login / Registro.
 *
 * Estado local:
 *  - mode: alterna entre formulario de login y de registro.
 *  - loading: bloquea el botón durante la petición async simulada.
 *  - error: mensaje de validación o error de red.
 *
 * Al completar el auth exitosamente redirige a '/' (Feed).
 */
export default function AuthPage() {
  const { login, register } = useAuth()
  const navigate = useNavigate()

  const [mode, setMode] = useState<Mode>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function validate(): boolean {
    setError('')
    if (!email.includes('@')) {
      setError('Ingresa un email válido.')
      return false
    }
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.')
      return false
    }
    if (mode === 'register' && name.trim().length < 2) {
      setError('Ingresa tu nombre completo.')
      return false
    }
    return true
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return

    setLoading(true)
    try {
      if (mode === 'login') {
        await login(email, password)
      } else {
        await register(name, email, password)
      }
      navigate('/')
    } catch {
      setError('Ocurrió un error. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center px-6">
      {/* Logo */}
      <motion.div
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-10 text-center"
      >
        <h1 className="text-5xl font-extrabold tracking-tight">
          <span className="text-white">e</span>
          <span className="text-primary">Meet</span>
        </h1>
        <p className="text-muted text-sm mt-2">Descubre eventos cerca de ti</p>
      </motion.div>

      {/* Tarjeta del formulario */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        className="w-full max-w-sm bg-card rounded-3xl p-6 shadow-2xl"
      >
        {/* Toggle login / registro */}
        <div className="flex rounded-xl bg-surface p-1 mb-6">
          {(['login', 'register'] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); setError('') }}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                mode === m
                  ? 'bg-primary text-white shadow'
                  : 'text-muted hover:text-white'
              }`}
            >
              {m === 'login' ? 'Iniciar sesión' : 'Registrarse'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {mode === 'register' && (
            <div>
              <label className="text-xs text-muted mb-1 block">Nombre completo</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Tu nombre"
                autoComplete="name"
                className="w-full bg-surface rounded-xl px-4 py-3 text-white text-sm placeholder-muted border border-white/10 focus:border-primary focus:outline-none transition-colors"
              />
            </div>
          )}

          <div>
            <label className="text-xs text-muted mb-1 block">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              autoComplete="email"
              className="w-full bg-surface rounded-xl px-4 py-3 text-white text-sm placeholder-muted border border-white/10 focus:border-primary focus:outline-none transition-colors"
            />
          </div>

          <div>
            <label className="text-xs text-muted mb-1 block">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              className="w-full bg-surface rounded-xl px-4 py-3 text-white text-sm placeholder-muted border border-white/10 focus:border-primary focus:outline-none transition-colors"
            />
          </div>

          {error && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-red-400 text-xs text-center"
            >
              {error}
            </motion.p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-white font-semibold py-3 rounded-xl hover:bg-primary-dark transition-all duration-200 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed mt-2"
          >
            {loading
              ? 'Cargando...'
              : mode === 'login'
              ? 'Entrar'
              : 'Crear cuenta'}
          </button>
        </form>
      </motion.div>

      {/* Términos */}
      <p className="text-muted/60 text-xs mt-8 text-center max-w-xs">
        Al continuar aceptas nuestros{' '}
        <span className="text-primary cursor-pointer">Términos de uso</span> y{' '}
        <span className="text-primary cursor-pointer">Política de privacidad</span>.
      </p>
    </div>
  )
}
