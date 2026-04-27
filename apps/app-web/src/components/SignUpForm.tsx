'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '../context/AuthContext'
import {
  User as FiUser,
  UserPlus as FiUserPlus,
  Mail as FiMail,
  Lock as FiLock,
  Eye as FiEye,
  EyeOff as FiEyeOff,
  Briefcase as FiBriefcase,
} from 'lucide-react'

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
      await register(name, formData.email, formData.password, {
        role,
        businessName: role === 'locatario' ? formData.businessName : undefined,
        businessLocation: role === 'locatario' ? formData.location : undefined,
      })

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

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold text-white">Crea tu cuenta</h2>
        <p className="text-sm text-slate-400">Regístrate como usuario o locatario y comienza a explorar.</p>
        <p className="text-xs text-slate-500">La cuenta admin no se crea desde este formulario.</p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-300 text-sm">
          {error}
        </div>
      )}

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

      {role === 'user' && (
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-white mb-2">
            Tu nombre
          </label>
          <div className="relative">
            <FiUser className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              id="name"
              name="name"
              type="text"
              value={formData.name}
              onChange={handleChange}
              required
              placeholder="Juan Pérez"
              className="w-full bg-[hsl(222,30%,16%)] border border-white/10 hover:border-[hsl(262,80%,60%)]/30 focus:border-[hsl(262,80%,60%)] outline-none py-3 pl-10 pr-4 rounded-xl text-white placeholder-slate-500 transition-colors"
            />
          </div>
        </div>
      )}

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-white mb-2">
          Correo electrónico
        </label>
        <div className="relative">
          <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            id="email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            required
            placeholder="tu@email.com"
            className="w-full bg-[hsl(222,30%,16%)] border border-white/10 hover:border-[hsl(262,80%,60%)]/30 focus:border-[hsl(262,80%,60%)] outline-none py-3 pl-10 pr-4 rounded-xl text-white placeholder-slate-500 transition-colors"
          />
        </div>
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-white mb-2">
          Contraseña
        </label>
        <div className="relative">
          <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            id="password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            value={formData.password}
            onChange={handleChange}
            required
            placeholder="••••••••"
            className="w-full bg-[hsl(222,30%,16%)] border border-white/10 hover:border-[hsl(262,80%,60%)]/30 focus:border-[hsl(262,80%,60%)] outline-none py-3 pl-10 pr-12 rounded-xl text-white placeholder-slate-500 transition-colors"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[hsl(262,80%,60%)] transition-colors"
          >
            {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
          </button>
        </div>
      </div>

      <div>
        <label htmlFor="confirmPassword" className="block text-sm font-medium text-white mb-2">
          Confirmar contraseña
        </label>
        <div className="relative">
          <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            id="confirmPassword"
            name="confirmPassword"
            type={showConfirmPassword ? 'text' : 'password'}
            value={formData.confirmPassword}
            onChange={handleChange}
            required
            placeholder="••••••••"
            className="w-full bg-[hsl(222,30%,16%)] border border-white/10 hover:border-[hsl(262,80%,60%)]/30 focus:border-[hsl(262,80%,60%)] outline-none py-3 pl-10 pr-12 rounded-xl text-white placeholder-slate-500 transition-colors"
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[hsl(262,80%,60%)] transition-colors"
          >
            {showConfirmPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
          </button>
        </div>
      </div>

      {role === 'locatario' && (
        <>
          <div>
            <label htmlFor="businessName" className="block text-sm font-medium text-white mb-2">
              Nombre del negocio
            </label>
            <input
              id="businessName"
              name="businessName"
              type="text"
              value={formData.businessName}
              required
              onChange={handleChange}
              placeholder="Mi Restaurante"
              className="w-full bg-[hsl(222,30%,16%)] border border-white/10 hover:border-[hsl(262,80%,60%)]/30 focus:border-[hsl(262,80%,60%)] outline-none py-3 px-4 rounded-xl text-white placeholder-slate-500 transition-colors"
            />
          </div>

          <div>
            <label htmlFor="location" className="block text-sm font-medium text-white mb-2">
              Ubicación
            </label>
            <input
              id="location"
              name="location"
              type="text"
              value={formData.location}
              onChange={handleChange}
              placeholder="Santiago, Chile"
              className="w-full bg-[hsl(222,30%,16%)] border border-white/10 hover:border-[hsl(262,80%,60%)]/30 focus:border-[hsl(262,80%,60%)] outline-none py-3 px-4 rounded-xl text-white placeholder-slate-500 transition-colors"
            />
          </div>

          <div>
            <label htmlFor="bio" className="block text-sm font-medium text-white mb-2">
              Sobre ti (opcional)
            </label>
            <textarea
              id="bio"
              name="bio"
              value={formData.bio}
              onChange={handleChange}
              rows={3}
              placeholder="Cuéntanos sobre tu negocio..."
              className="w-full bg-[hsl(222,30%,16%)] border border-white/10 hover:border-[hsl(262,80%,60%)]/30 focus:border-[hsl(262,80%,60%)] outline-none py-3 px-4 rounded-xl text-white placeholder-slate-500 transition-colors resize-none"
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
