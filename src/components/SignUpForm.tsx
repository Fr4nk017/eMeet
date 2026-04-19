'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '../context/AuthContext'
import {
  FiUser, FiUserPlus, FiMail, FiLock, FiEye, FiEyeOff,
  FiBriefcase, FiMapPin, FiCheck, FiX,
} from 'react-icons/fi'

function getPasswordStrength(password: string): { score: number; label: string; color: string } {
  if (!password) return { score: 0, label: '', color: '' }
  let score = 0
  if (password.length >= 8) score++
  if (/[A-Z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++
  const levels = [
    { score: 0, label: '', color: '' },
    { score: 1, label: 'Muy débil', color: 'bg-red-500' },
    { score: 2, label: 'Débil', color: 'bg-orange-400' },
    { score: 3, label: 'Buena', color: 'bg-yellow-400' },
    { score: 4, label: 'Fuerte', color: 'bg-green-500' },
  ]
  return levels[score]
}

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
      const result = await register(name, formData.email, formData.password, {
        role,
        businessName: role === 'locatario' ? formData.businessName : undefined,
        businessLocation: role === 'locatario' ? formData.location : undefined,
      })

      if (result.needsEmailVerification) {
        router.push(`/auth/verify-email?email=${encodeURIComponent(formData.email)}`)
        return
      }

      const next = searchParams.get('next')
      if (next && next.startsWith('/')) {
        router.push(next)
        return
      }

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

  const inputBase = 'w-full bg-[hsl(222,30%,16%)] border border-white/10 hover:border-[hsl(262,80%,60%)]/30 focus:border-[hsl(262,80%,60%)] outline-none py-3 rounded-xl text-white placeholder-slate-500 transition-colors'

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-1">
        <h2 className="text-2xl font-semibold text-white">Crea tu cuenta</h2>
        <p className="text-sm text-slate-400">Regístrate como usuario o locatario y comienza a explorar.</p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Selector de rol */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-3">Tipo de cuenta</label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setRole('user')}
            className={`flex items-center justify-center gap-2 rounded-xl py-3 px-4 text-sm font-medium transition-all ${
              role === 'user'
                ? 'bg-[hsl(262,80%,60%)] text-white shadow-lg'
                : 'bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10'
            }`}
          >
            <FiUser size={18} />
            Usuario Regular
          </button>
          <button
            type="button"
            onClick={() => setRole('locatario')}
            className={`flex items-center justify-center gap-2 rounded-xl py-3 px-4 text-sm font-medium transition-all ${
              role === 'locatario'
                ? 'bg-[hsl(38,95%,55%)] text-black shadow-lg'
                : 'bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10'
            }`}
          >
            <FiBriefcase size={18} />
            Soy Locatario
          </button>
        </div>
      </div>

      {/* Nombre (usuario regular) */}
      {role === 'user' && (
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-white mb-2">Tu nombre</label>
          <div className="relative">
            <FiUser className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              id="name" name="name" type="text"
              value={formData.name} onChange={handleChange}
              required placeholder="Juan Pérez"
              className={`${inputBase} pl-10 pr-4`}
            />
          </div>
        </div>
      )}

      {/* Email */}
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-white mb-2">Correo electrónico</label>
        <div className="relative">
          <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            id="email" name="email" type="email"
            value={formData.email} onChange={handleChange}
            required placeholder="tu@email.com"
            className={`${inputBase} pl-10 pr-4`}
          />
        </div>
      </div>

      {/* Contraseña + barra de fortaleza */}
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-white mb-2">Contraseña</label>
        <div className="relative">
          <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            id="password" name="password"
            type={showPassword ? 'text' : 'password'}
            value={formData.password} onChange={handleChange}
            required placeholder="••••••••"
            className={`${inputBase} pl-10 pr-12`}
          />
          <button
            type="button" onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[hsl(262,80%,60%)] transition-colors"
          >
            {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
          </button>
        </div>
        {formData.password && (
          <div className="mt-2 space-y-1">
            <div className="flex gap-1">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                    i <= strength.score ? strength.color : 'bg-white/10'
                  }`}
                />
              ))}
            </div>
            <p className={`text-xs ${
              strength.score <= 1 ? 'text-red-400' :
              strength.score === 2 ? 'text-orange-400' :
              strength.score === 3 ? 'text-yellow-400' : 'text-green-400'
            }`}>{strength.label}</p>
          </div>
        )}
      </div>

      {/* Confirmar contraseña + indicador inline */}
      <div>
        <label htmlFor="confirmPassword" className="block text-sm font-medium text-white mb-2">Confirmar contraseña</label>
        <div className="relative">
          <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            id="confirmPassword" name="confirmPassword"
            type={showConfirmPassword ? 'text' : 'password'}
            value={formData.confirmPassword} onChange={handleChange}
            required placeholder="••••••••"
            className={`${inputBase} pl-10 pr-20 ${
              passwordsMismatch ? 'border-red-500/60' :
              passwordsMatch ? 'border-green-500/60' : ''
            }`}
          />
          <div className="absolute right-10 top-1/2 -translate-y-1/2">
            {passwordsMatch && <FiCheck size={16} className="text-green-400" />}
            {passwordsMismatch && <FiX size={16} className="text-red-400" />}
          </div>
          <button
            type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[hsl(262,80%,60%)] transition-colors"
          >
            {showConfirmPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
          </button>
        </div>
        {passwordsMismatch && (
          <p className="mt-1 text-xs text-red-400">Las contraseñas no coinciden</p>
        )}
      </div>

      {/* Campos de locatario */}
      {role === 'locatario' && (
        <>
          <div>
            <label htmlFor="businessName" className="block text-sm font-medium text-white mb-2">Nombre del negocio</label>
            <div className="relative">
              <FiBriefcase className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                id="businessName" name="businessName" type="text"
                value={formData.businessName} required onChange={handleChange}
                placeholder="Mi Restaurante"
                className={`${inputBase} pl-10 pr-4`}
              />
            </div>
          </div>

          <div>
            <label htmlFor="location" className="block text-sm font-medium text-white mb-2">Ubicación</label>
            <div className="relative">
              <FiMapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                id="location" name="location" type="text"
                value={formData.location} onChange={handleChange}
                placeholder="Santiago, Chile"
                className={`${inputBase} pl-10 pr-4`}
              />
            </div>
          </div>

          <div>
            <label htmlFor="bio" className="block text-sm font-medium text-white mb-2">Sobre ti (opcional)</label>
            <textarea
              id="bio" name="bio"
              value={formData.bio} onChange={handleChange}
              rows={3} placeholder="Cuéntanos sobre tu negocio..."
              className={`${inputBase} px-4 resize-none`}
            />
          </div>
        </>
      )}

      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-[hsl(262,80%,60%)] hover:bg-[hsl(262,80%,60%)]/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2 hover:translate-y-[-1px] hover:shadow-lg"
      >
        <FiUserPlus size={20} />
        {isLoading ? 'Creando cuenta...' : 'Crear Cuenta'}
      </button>
    </form>
  )
}
