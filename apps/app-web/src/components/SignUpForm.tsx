'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import {
  User as FiUser,
  UserPlus as FiUserPlus,
  Mail as FiMail,
  Lock as FiLock,
  Eye as FiEye,
  EyeOff as FiEyeOff,
  Briefcase as FiBriefcase,
  MapPin,
  AlignLeft,
  CheckCircle2,
  XCircle,
  CircleAlert as FiAlertCircle,
} from 'lucide-react'

function getPasswordStrength(pwd: string) {
  if (!pwd) return null
  let score = 0
  if (pwd.length >= 8) score++
  if (/[A-Z]/.test(pwd)) score++
  if (/[0-9]/.test(pwd)) score++
  if (/[^A-Za-z0-9]/.test(pwd)) score++
  if (score <= 1) return { segments: 1, label: 'Muy débil', barColor: 'bg-red-500', textColor: 'text-red-400' }
  if (score === 2) return { segments: 2, label: 'Débil', barColor: 'bg-orange-500', textColor: 'text-orange-400' }
  if (score === 3) return { segments: 3, label: 'Regular', barColor: 'bg-yellow-400', textColor: 'text-yellow-400' }
  return { segments: 4, label: 'Fuerte', barColor: 'bg-emerald-500', textColor: 'text-emerald-400' }
}

const INPUT_CLASS =
  'w-full rounded-xl border border-white/10 bg-[hsl(222,30%,13%)] py-3 pl-10 pr-4 text-sm text-white placeholder-slate-600 outline-none transition-colors hover:border-white/20 focus:border-[hsl(262,80%,60%)] focus:ring-1 focus:ring-[hsl(262,80%,60%)]/30'

export default function SignUpForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { register } = useAuth()

  const [role, setRole] = useState<'user' | 'locatario'>('user')
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    businessName: '',
    location: '',
    bio: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [emailTouched, setEmailTouched] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    if (formData.password !== formData.confirmPassword) {
      setError('Las contraseñas no coinciden')
      setIsLoading(false)
      return
    }
    if (formData.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      setIsLoading(false)
      return
    }
    if (role === 'locatario' && !formData.businessName) {
      setError('Ingresa el nombre del negocio')
      setIsLoading(false)
      return
    }

    try {
      const name = role === 'locatario' ? formData.businessName : formData.name
      await register(name, formData.email, formData.password, {
        role,
        businessName: role === 'locatario' ? formData.businessName : undefined,
        businessLocation: role === 'locatario' ? formData.location : undefined,
      })

      const next = searchParams.get('next')
      if (next && next.startsWith('/')) { router.push(next); return }
      router.push(role === 'locatario' ? '/locatario' : '/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al registrarte')
    } finally {
      setIsLoading(false)
    }
  }

  const strength = getPasswordStrength(formData.password)
  const passwordsMatch = formData.confirmPassword.length > 0 && formData.password === formData.confirmPassword
  const passwordsMismatch = formData.confirmPassword.length > 0 && formData.password !== formData.confirmPassword
  const emailInvalid = emailTouched && formData.email.length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold text-white">Crea tu cuenta</h2>
        <p className="text-sm text-slate-400">Regístrate y comienza a explorar eventos en Santiago.</p>
      </div>

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div className="flex items-start gap-2.5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              <FiAlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Role selector */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-slate-300">Tipo de cuenta</label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setRole('user')}
            className={`relative flex flex-col items-start gap-1.5 rounded-xl border p-3.5 text-left transition-all ${
              role === 'user'
                ? 'border-[hsl(262,80%,60%)]/50 bg-[hsl(262,80%,60%)]/10 shadow-sm shadow-purple-900/20'
                : 'border-white/10 bg-white/4 hover:border-white/20 hover:bg-white/7'
            }`}
          >
            {role === 'user' && (
              <span className="absolute right-2.5 top-2.5 flex h-4 w-4 items-center justify-center rounded-full bg-[hsl(262,80%,60%)]">
                <span className="h-1.5 w-1.5 rounded-full bg-white" />
              </span>
            )}
            <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${role === 'user' ? 'bg-[hsl(262,80%,60%)]/20' : 'bg-white/8'}`}>
              <FiUser size={16} className={role === 'user' ? 'text-[hsl(262,80%,72%)]' : 'text-slate-400'} />
            </div>
            <div>
              <p className={`text-sm font-semibold ${role === 'user' ? 'text-white' : 'text-slate-300'}`}>Usuario</p>
              <p className="text-[11px] leading-tight text-slate-500">Explora y descubre eventos</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setRole('locatario')}
            className={`relative flex flex-col items-start gap-1.5 rounded-xl border p-3.5 text-left transition-all ${
              role === 'locatario'
                ? 'border-[hsl(38,95%,55%)]/50 bg-[hsl(38,95%,55%)]/10 shadow-sm shadow-amber-900/20'
                : 'border-white/10 bg-white/4 hover:border-white/20 hover:bg-white/7'
            }`}
          >
            {role === 'locatario' && (
              <span className="absolute right-2.5 top-2.5 flex h-4 w-4 items-center justify-center rounded-full bg-[hsl(38,95%,55%)]">
                <span className="h-1.5 w-1.5 rounded-full bg-black" />
              </span>
            )}
            <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${role === 'locatario' ? 'bg-[hsl(38,95%,55%)]/20' : 'bg-white/8'}`}>
              <FiBriefcase size={16} className={role === 'locatario' ? 'text-[hsl(38,95%,65%)]' : 'text-slate-400'} />
            </div>
            <div>
              <p className={`text-sm font-semibold ${role === 'locatario' ? 'text-white' : 'text-slate-300'}`}>Locatario</p>
              <p className="text-[11px] leading-tight text-slate-500">Publica y gestiona eventos</p>
            </div>
          </button>
        </div>
      </div>

      {/* Name (user only) */}
      <AnimatePresence>
        {role === 'user' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div className="space-y-1.5 pt-0.5">
              <label htmlFor="name" className="block text-sm font-medium text-slate-300">Tu nombre</label>
              <div className="relative">
                <FiUser className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                <input
                  id="name" name="name" type="text"
                  value={formData.name} onChange={handleChange}
                  required placeholder="Juan Pérez"
                  className={INPUT_CLASS}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Email */}
      <div className="space-y-1.5">
        <label htmlFor="email" className="block text-sm font-medium text-slate-300">Correo electrónico</label>
        <div className="relative">
          <FiMail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
          <input
            id="email" name="email" type="email"
            value={formData.email} onChange={handleChange}
            onBlur={() => setEmailTouched(true)}
            required placeholder="tu@email.com"
            className={`${INPUT_CLASS} ${emailInvalid ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/20' : ''}`}
          />
        </div>
        {emailInvalid && (
          <p className="text-xs text-red-400">Ingresa un correo electrónico válido</p>
        )}
      </div>

      {/* Password */}
      <div className="space-y-1.5">
        <label htmlFor="password" className="block text-sm font-medium text-slate-300">Contraseña</label>
        <div className="relative">
          <FiLock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
          <input
            id="password" name="password"
            type={showPassword ? 'text' : 'password'}
            value={formData.password} onChange={handleChange}
            required placeholder="••••••••"
            className="w-full rounded-xl border border-white/10 bg-[hsl(222,30%,13%)] py-3 pl-10 pr-12 text-sm text-white placeholder-slate-600 outline-none transition-colors hover:border-white/20 focus:border-[hsl(262,80%,60%)] focus:ring-1 focus:ring-[hsl(262,80%,60%)]/30"
          />
          <button
            type="button" onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 transition-colors hover:text-[hsl(262,80%,60%)]"
          >
            {showPassword ? <FiEyeOff size={16} /> : <FiEye size={16} />}
          </button>
        </div>
        {/* Strength bar */}
        {strength && (
          <div className="space-y-1">
            <div className="flex gap-1">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className={`h-1 flex-1 rounded-full transition-all duration-300 ${strength.segments >= i ? strength.barColor : 'bg-white/10'}`}
                />
              ))}
            </div>
            <p className={`text-xs font-medium ${strength.textColor}`}>{strength.label}</p>
          </div>
        )}
      </div>

      {/* Confirm password */}
      <div className="space-y-1.5">
        <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-300">Confirmar contraseña</label>
        <div className="relative">
          <FiLock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
          <input
            id="confirmPassword" name="confirmPassword"
            type={showConfirmPassword ? 'text' : 'password'}
            value={formData.confirmPassword} onChange={handleChange}
            required placeholder="••••••••"
            className={`w-full rounded-xl border py-3 pl-10 pr-20 text-sm text-white placeholder-slate-600 outline-none transition-colors bg-[hsl(222,30%,13%)] hover:border-white/20 focus:ring-1 ${
              passwordsMismatch
                ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/20'
                : passwordsMatch
                ? 'border-emerald-500/40 focus:border-emerald-500 focus:ring-emerald-500/20'
                : 'border-white/10 focus:border-[hsl(262,80%,60%)] focus:ring-[hsl(262,80%,60%)]/30'
            }`}
          />
          <div className="absolute right-11 top-1/2 -translate-y-1/2">
            {passwordsMatch && <CheckCircle2 size={16} className="text-emerald-400" />}
            {passwordsMismatch && <XCircle size={16} className="text-red-400" />}
          </div>
          <button
            type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 transition-colors hover:text-[hsl(262,80%,60%)]"
          >
            {showConfirmPassword ? <FiEyeOff size={16} /> : <FiEye size={16} />}
          </button>
        </div>
        {passwordsMismatch && (
          <p className="text-xs text-red-400">Las contraseñas no coinciden</p>
        )}
      </div>

      {/* Locatario extra fields */}
      <AnimatePresence>
        {role === 'locatario' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="space-y-4 rounded-xl border border-[hsl(38,95%,55%)]/25 bg-[hsl(38,95%,55%)]/6 p-4 pt-3.5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[hsl(38,95%,60%)]">
                Datos del negocio
              </p>

              <div className="space-y-1.5">
                <label htmlFor="businessName" className="block text-sm font-medium text-slate-300">
                  Nombre del negocio
                </label>
                <div className="relative">
                  <FiBriefcase className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                  <input
                    id="businessName" name="businessName" type="text"
                    value={formData.businessName} onChange={handleChange}
                    required placeholder="Mi Restaurante"
                    className={INPUT_CLASS}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="location" className="block text-sm font-medium text-slate-300">
                  Ubicación <span className="text-slate-500">(opcional)</span>
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                  <input
                    id="location" name="location" type="text"
                    value={formData.location} onChange={handleChange}
                    placeholder="Santiago, Chile"
                    className={INPUT_CLASS}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="bio" className="block text-sm font-medium text-slate-300">
                  Sobre tu negocio <span className="text-slate-500">(opcional)</span>
                </label>
                <div className="relative">
                  <AlignLeft className="absolute left-3.5 top-3.5 text-slate-500" size={16} />
                  <textarea
                    id="bio" name="bio"
                    value={formData.bio} onChange={handleChange}
                    rows={3} placeholder="Cuéntanos sobre tu negocio..."
                    className="w-full resize-none rounded-xl border border-white/10 bg-[hsl(222,30%,13%)] py-3 pl-10 pr-4 text-sm text-white placeholder-slate-600 outline-none transition-colors hover:border-white/20 focus:border-[hsl(262,80%,60%)] focus:ring-1 focus:ring-[hsl(262,80%,60%)]/30"
                  />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        type="submit"
        disabled={isLoading}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-[hsl(262,80%,60%)] py-3 text-sm font-semibold text-white shadow-lg shadow-purple-900/20 transition-all hover:-translate-y-0.5 hover:bg-[hsl(262,80%,65%)] hover:shadow-purple-900/30 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isLoading ? (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
        ) : (
          <FiUserPlus size={18} />
        )}
        {isLoading ? 'Creando cuenta...' : 'Crear Cuenta'}
      </button>
    </form>
  )
}
