'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FiArrowRight } from 'react-icons/fi'
import LoginForm from '../../src/components/LoginForm'
import SignUpForm from '../../src/components/SignUpForm'

export default function AuthPage() {
  const [mode, setMode] = useState<'login' | 'signup'>('login')

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(124,58,237,0.18),_transparent_30%),_radial-gradient(circle_at_bottom_right,_rgba(245,158,11,0.14),_transparent_25%),_hsl(222,47%,6%)] p-4">
      <div className="pointer-events-none absolute inset-0 opacity-50">
        <div className="absolute left-1/2 top-0 h-96 w-96 -translate-x-1/2 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute right-0 top-1/3 h-64 w-64 rounded-full bg-[hsl(262,80%,60%)]/10 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-72 w-72 rounded-full bg-[hsl(38,95%,55%)]/10 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-6xl">
        <div className="grid items-stretch gap-8 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="hidden flex-col justify-between rounded-[2rem] border border-white/10 bg-[rgba(15,23,42,0.88)] p-10 text-white shadow-2xl backdrop-blur-xl lg:flex">
            <div className="space-y-6">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-3xl bg-white/10 text-[hsl(262,80%,60%)] shadow-lg">
                <span className="text-2xl">🎉</span>
              </div>
              <div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.35em] text-[hsl(262,80%,60%)]">eMeet</p>
                <h1 className="text-4xl font-semibold leading-tight">Tu acceso a eventos, bares y experiencias únicas.</h1>
              </div>
            </div>

            <div className="my-4 flex flex-grow items-center justify-center">
              <img
                src="/auth-map-illustration.svg"
                alt="Ilustración de mapa de eventos"
                className="h-auto w-full max-w-sm object-contain opacity-70"
              />
            </div>

            <div className="space-y-4">
              <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                <p className="text-sm text-slate-300">• Descubre lugares en Santiago con recomendaciones personalizadas.</p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                <p className="text-sm text-slate-300">• Regístrate como usuario o locatario y gestiona eventos desde el panel.</p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                <p className="text-sm text-slate-300">• Accede rápido con cuentas demo para probar la app.</p>
              </div>
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-[rgba(15,23,42,0.92)] p-6 shadow-2xl backdrop-blur-xl">
            <div className="flex flex-col gap-6">
              <div className="text-center lg:text-left">
                <p className="mb-3 text-sm font-semibold uppercase tracking-[0.35em] text-[hsl(262,80%,60%)]">Accede a eMeet</p>
                <h2 className="text-3xl font-semibold text-white">Inicia sesión o crea tu cuenta</h2>
                <p className="mt-3 text-slate-400">Usa tu cuenta demo para explorar eventos, salas y paneles según tu rol.</p>
              </div>

              <div className="flex flex-col gap-2 rounded-3xl bg-white/5 p-2">
                <button
                  onClick={() => setMode('login')}
                  className={`rounded-2xl py-3 text-sm font-semibold transition-all ${
                    mode === 'login' ? 'bg-[hsl(262,80%,60%)] text-white shadow-lg' : 'text-slate-300 hover:text-white'
                  }`}
                >
                  Inicia Sesión
                </button>
                <button
                  onClick={() => setMode('signup')}
                  className={`rounded-2xl py-3 text-sm font-semibold transition-all ${
                    mode === 'signup' ? 'bg-[hsl(262,80%,60%)] text-white shadow-lg' : 'text-slate-300 hover:text-white'
                  }`}
                >
                  Registrarse
                </button>
              </div>
            </div>

            <div className="mt-8 rounded-[1.5rem] bg-[rgba(255,255,255,0.04)] p-8 shadow-inner shadow-white/5">
              <AnimatePresence mode="wait">
                <motion.div
                  key={mode}
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -24 }}
                  transition={{ duration: 0.28, ease: 'easeOut' }}
                >
                  {mode === 'login' ? <LoginForm /> : <SignUpForm />}
                </motion.div>
              </AnimatePresence>

              <div className="my-6 flex items-center gap-4">
                <div className="h-px flex-1 bg-white/10" />
                <span className="text-xs text-slate-400">o</span>
                <div className="h-px flex-1 bg-white/10" />
              </div>

              <div className="space-y-3">
                <button className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 py-3 font-medium text-white transition-all hover:bg-white/10">
                  <span className="text-lg">🌐</span> Continuar con Google
                </button>
                <button className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 py-3 font-medium text-white transition-all hover:bg-white/10">
                  <span className="text-lg">🍎</span> Continuar con Apple
                </button>
              </div>

              <p className="mt-6 text-center text-sm text-slate-400">
                {mode === 'login' ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'}{' '}
                <button
                  onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
                  className="inline-flex items-center gap-1 font-medium text-[hsl(262,80%,60%)] hover:text-[hsl(262,80%,60%)]/80"
                >
                  {mode === 'login' ? 'Regístrate' : 'Inicia sesión'} <FiArrowRight size={14} />
                </button>
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center text-xs text-slate-400">
          <p>Disponible en Santiago, Chile</p>
          <p>Version demo • No se guardan datos reales</p>
        </div>
      </div>
    </div>
  )
}
