'use client'

import { useAuth } from '@/src/context/AuthContext'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import {
  LogOut as FiLogOut,
  Menu as FiMenu,
  X as FiX,
  House as FiHome,
  Lock as FiLock,
  Briefcase as FiBriefcase,
} from 'lucide-react'
import { useState } from 'react'

export default function NavBar() {
  const { user, logout, isAuthenticated } = useAuth()
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)

  const handleLogout = async () => {
    try {
      await logout()
    } catch {
      // Si el backend falla igualmente se limpia la sesión local
    }
    router.push('/auth')
  }

  if (!isAuthenticated || !user) return null

  const navItems = [
    { label: 'Inicio', href: '/chat', icon: FiHome, show: true },
    { 
      label: 'Panel Admin', 
      href: '/admin', 
      icon: FiLock, 
      show: user.role === 'admin' 
    },
    { 
      label: 'Panel Locatario', 
      href: '/locatario', 
      icon: FiBriefcase, 
      show: user.role === 'locatario' 
    },
  ]

  const visibleItems = navItems.filter(item => item.show)

  return (
    <nav className="bg-card border-b border-card sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo y nombre */}
          <div 
            onClick={() => router.push('/chat')}
            className="flex items-center gap-3 cursor-pointer"
          >
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary-light rounded-lg flex items-center justify-center">
              <span className="text-lg font-bold text-white">🎉</span>
            </div>
            <span className="text-xl font-bold text-white hidden sm:inline">eMeet</span>
          </div>

          {/* Menu desktop */}
          <div className="hidden md:flex items-center gap-6">
            {visibleItems.map((item) => {
              const Icon = item.icon
              return (
                <button
                  key={item.href}
                  onClick={() => router.push(item.href)}
                  className="flex items-center gap-2 text-muted hover:text-primary transition-colors"
                >
                  <Icon size={18} />
                  <span className="text-sm font-medium">{item.label}</span>
                </button>
              )
            })}
          </div>

          {/* Usuario y acciones */}
          <div className="hidden md:flex items-center gap-4">
            {/* Avatar y nombre del usuario */}
            <div className="flex items-center gap-3 px-4 py-2 rounded-lg bg-surface">
              {user.avatarUrl ? (
                <Image
                  src={user.avatarUrl}
                  alt={user.name}
                  width={32}
                  height={32}
                  className="rounded-full"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  {user.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="text-left">
                <p className="text-sm font-semibold text-white">{user.name}</p>
                <p className="text-xs text-muted capitalize">
                  {user.role === 'user' ? 'Usuario' : user.role === 'admin' ? 'Administrador' : 'Locatario'}
                </p>
              </div>
            </div>

            {/* Botón logout */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 px-3 py-2 rounded-lg transition-colors"
              title="Cerrar sesión"
            >
              <FiLogOut size={18} />
            </button>
          </div>

          {/* Botón menu mobile */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden text-white hover:text-primary transition-colors"
          >
            {menuOpen ? <FiX size={24} /> : <FiMenu size={24} />}
          </button>
        </div>

        {/* Menu mobile */}
        {menuOpen && (
          <div className="md:hidden mt-4 space-y-3">
            {visibleItems.map((item) => {
              const Icon = item.icon
              return (
                <button
                  key={item.href}
                  onClick={() => {
                    router.push(item.href)
                    setMenuOpen(false)
                  }}
                  className="w-full flex items-center gap-3 text-muted hover:text-primary px-4 py-2 rounded-lg hover:bg-surface transition-colors text-left"
                >
                  <Icon size={18} />
                  <span className="text-sm font-medium">{item.label}</span>
                </button>
              )
            })}
            <div className="border-t border-card pt-3 mt-3">
              <div className="flex items-center gap-3 px-4 py-2 mb-3">
                {user.avatarUrl ? (
                  <Image
                    src={user.avatarUrl}
                    alt={user.name}
                    width={32}
                    height={32}
                    className="rounded-full"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="text-sm font-semibold text-white">{user.name}</p>
                  <p className="text-xs text-muted capitalize">
                    {user.role === 'user' ? 'Usuario' : user.role === 'admin' ? 'Administrador' : 'Locatario'}
                  </p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 px-4 py-2 rounded-lg transition-colors justify-center"
              >
                <FiLogOut size={18} />
                <span className="text-sm font-medium">Cerrar sesión</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
