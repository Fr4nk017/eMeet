'use client'

import { useEffect, useRef, useState } from 'react'
import {
  Check as FiCheck,
  DollarSign as FiDollarSign,
  ImageIcon as FiImage,
  Loader2 as FiLoader,
  MapPin as FiMapPin,
  Navigation as FiNavigation,
  X as FiX,
} from 'lucide-react'
import type { CreateLocatarioEventInput } from '../context/LocatarioEventsContext'
import type { EventCategory } from '../types'

const CATEGORIES: { value: EventCategory; label: string; emoji: string }[] = [
  { value: 'fiesta',      label: 'Fiesta',      emoji: '🎉' },
  { value: 'musica',      label: 'Música',       emoji: '🎵' },
  { value: 'gastronomia', label: 'Gastronomía',  emoji: '🍽️' },
  { value: 'networking',  label: 'Networking',   emoji: '🤝' },
  { value: 'arte',        label: 'Arte',         emoji: '🎨' },
  { value: 'cultura',     label: 'Cultura',      emoji: '🏛️' },
  { value: 'teatro',      label: 'Teatro',       emoji: '🎭' },
  { value: 'deporte',     label: 'Deporte',      emoji: '⚽' },
]

const EMPTY_FORM = {
  title: '',
  description: '',
  date: '',
  price: '',
  address: '',
  imageUrl: '',
  category: 'fiesta' as EventCategory,
}

type InitialValues = {
  title?: string
  description?: string
  date?: string
  price?: number | null
  address?: string
  imageUrl?: string
  category?: EventCategory
}

type Props = {
  isOpen: boolean
  onClose: () => void
  onSubmit: (input: CreateLocatarioEventInput) => Promise<void>
  defaultAddress: string
  organizerName: string
  organizerAvatar: string
  avatarUrl?: string
  initials: string
  mode?: 'create' | 'edit'
  initialValues?: InitialValues
}

export function CreateEventModal({
  isOpen,
  onClose,
  onSubmit,
  defaultAddress,
  organizerName,
  organizerAvatar,
  avatarUrl,
  initials,
  mode = 'create',
  initialValues,
}: Props) {
  const [eventForm, setEventForm] = useState({ ...EMPTY_FORM, address: defaultAddress })
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isFree, setIsFree] = useState(true)
  const [gpsStatus, setGpsStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen && mode === 'edit' && initialValues) {
      const dateVal = initialValues.date
        ? new Date(initialValues.date).toISOString().slice(0, 16)
        : ''
      setEventForm({
        title: initialValues.title ?? '',
        description: initialValues.description ?? '',
        date: dateVal,
        price: initialValues.price != null ? String(initialValues.price) : '',
        address: initialValues.address ?? defaultAddress,
        imageUrl: initialValues.imageUrl ?? '',
        category: initialValues.category ?? 'fiesta',
      })
      setIsFree(initialValues.price == null)
      setImagePreview(initialValues.imageUrl || null)
      setGpsCoords(null)
      setGpsStatus('idle')
      setValidationError(null)
    } else if (!isOpen) {
      setEventForm({ ...EMPTY_FORM, address: defaultAddress })
      setImagePreview(null)
      setGpsCoords(null)
      setGpsStatus('idle')
      setIsFree(true)
      setValidationError(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }, [isOpen, defaultAddress, mode, initialValues])

  if (!isOpen) return null

  const handleImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) return
    const url = URL.createObjectURL(file)
    setImagePreview(url)
    setEventForm((prev) => ({ ...prev, imageUrl: url }))
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleImageFile(file)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleImageFile(file)
  }

  const handleGetGPS = () => {
    if (!navigator.geolocation) return
    setGpsStatus('loading')
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords
        setGpsCoords({ lat: latitude, lng: longitude })
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=es`,
          )
          const data = (await res.json()) as { display_name?: string }
          setEventForm((prev) => ({
            ...prev,
            address: data.display_name ?? `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`,
          }))
        } catch {
          setEventForm((prev) => ({ ...prev, address: `${latitude.toFixed(5)}, ${longitude.toFixed(5)}` }))
        }
        setGpsStatus('success')
      },
      () => setGpsStatus('error'),
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  const clearImage = () => {
    setImagePreview(null)
    setEventForm((prev) => ({ ...prev, imageUrl: '' }))
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleSubmit = async () => {
    if (!eventForm.title.trim() || !eventForm.description.trim() || !eventForm.date) {
      setValidationError('Completa al menos título, descripción y fecha.')
      return
    }
    setValidationError(null)
    setIsSubmitting(true)
    try {
      await onSubmit({
        title: eventForm.title,
        description: eventForm.description,
        category: eventForm.category,
        date: eventForm.date,
        address: eventForm.address || defaultAddress,
        price: isFree ? null : (eventForm.price.trim() === '' ? null : Number(eventForm.price)),
        imageUrl: eventForm.imageUrl,
        organizerName,
        organizerAvatar,
        lat: gpsCoords?.lat,
        lng: gpsCoords?.lng,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#1a1a2e] rounded-2xl w-full max-w-4xl max-h-[92vh] overflow-hidden flex flex-col shadow-2xl ring-1 ring-white/10">

        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10 flex-shrink-0">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="w-8 h-8 flex items-center justify-center text-white/50 hover:text-white transition-colors rounded-lg hover:bg-white/5"
          >
            <FiX size={20} />
          </button>
          <h2 className="text-sm font-semibold text-white">{mode === 'edit' ? 'Editar evento' : 'Nuevo evento'}</h2>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !eventForm.title.trim() || !eventForm.date}
            className="text-sm font-semibold text-violet-400 hover:text-violet-300 disabled:text-white/25 transition-colors flex items-center gap-1.5 px-1"
          >
            {isSubmitting && <FiLoader className="animate-spin" size={13} />}
            {isSubmitting ? (mode === 'edit' ? 'Guardando...' : 'Publicando...') : (mode === 'edit' ? 'Guardar' : 'Publicar')}
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden min-h-0">
          <div
            className={`relative flex-1 bg-black flex items-center justify-center transition-colors min-w-0 ${isDragging ? 'bg-violet-900/20' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
          >
            {imagePreview ? (
              <>
                <img
                  src={imagePreview}
                  alt="preview"
                  className="w-full h-full object-contain"
                  style={{ maxHeight: 'calc(92vh - 56px)' }}
                  onError={clearImage}
                />
                <button
                  onClick={clearImage}
                  className="absolute top-3 right-3 w-8 h-8 bg-black/60 hover:bg-black/80 rounded-full flex items-center justify-center text-white transition-colors"
                >
                  <FiX size={15} />
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-3 right-3 bg-black/60 hover:bg-black/80 text-white/80 hover:text-white text-xs px-3 py-1.5 rounded-lg transition-colors"
                >
                  Cambiar foto
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center gap-4 p-10 text-center w-full h-full justify-center group"
              >
                <div className={`w-20 h-20 rounded-2xl flex items-center justify-center transition-all ${isDragging ? 'bg-violet-500/30 scale-110' : 'bg-white/5 group-hover:bg-white/10'}`}>
                  <FiImage className={`transition-colors ${isDragging ? 'text-violet-300' : 'text-white/30 group-hover:text-white/50'}`} size={34} />
                </div>
                <div>
                  <p className="text-white font-medium mb-1">Arrastra una foto aquí</p>
                  <p className="text-white/40 text-sm">o haz clic para seleccionar</p>
                </div>
                <span className="text-xs text-white/20">PNG, JPG, WEBP</span>
              </button>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
          </div>

          <div className="w-[320px] flex-shrink-0 flex flex-col border-l border-white/10 overflow-y-auto">
            <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10 flex-shrink-0">
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-violet-600/30 flex items-center justify-center text-violet-300 text-xs font-bold flex-shrink-0">
                  {initials}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white truncate">{organizerName}</p>
                <p className="text-xs text-white/35">Locatario</p>
              </div>
            </div>

            <div className="flex-1 p-4 space-y-4">
              <input
                type="text"
                placeholder="Nombre del evento *"
                value={eventForm.title}
                onChange={(e) => setEventForm((prev) => ({ ...prev, title: e.target.value }))}
                className="w-full bg-white/5 border border-white/10 focus:border-violet-500/50 outline-none py-2.5 px-3 rounded-xl text-white text-sm placeholder-white/30 transition-colors"
              />

              <textarea
                placeholder="Describe tu evento... *"
                rows={3}
                value={eventForm.description}
                onChange={(e) => setEventForm((prev) => ({ ...prev, description: e.target.value }))}
                className="w-full bg-white/5 border border-white/10 focus:border-violet-500/50 outline-none py-2.5 px-3 rounded-xl text-white text-sm placeholder-white/30 resize-none transition-colors"
              />

              <div>
                <p className="text-xs text-white/35 mb-2 font-medium">Categoría</p>
                <div className="flex flex-wrap gap-1.5">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat.value}
                      type="button"
                      onClick={() => setEventForm((prev) => ({ ...prev, category: cat.value }))}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                        eventForm.category === cat.value
                          ? 'bg-violet-600 text-white ring-1 ring-violet-400/50'
                          : 'bg-white/5 text-white/45 hover:bg-white/10 hover:text-white/70'
                      }`}
                    >
                      {cat.emoji} {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs text-white/35 mb-1.5 font-medium">Fecha y hora *</p>
                <input
                  type="datetime-local"
                  value={eventForm.date}
                  onChange={(e) => setEventForm((prev) => ({ ...prev, date: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 focus:border-violet-500/50 outline-none py-2.5 px-3 rounded-xl text-white text-sm transition-colors [color-scheme:dark]"
                />
              </div>

              <div>
                <p className="text-xs text-white/35 mb-1.5 font-medium">Dirección</p>
                <div className="relative">
                  <FiMapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none" size={13} />
                  <input
                    type="text"
                    placeholder="Dirección del evento"
                    value={eventForm.address}
                    onChange={(e) => {
                      setEventForm((prev) => ({ ...prev, address: e.target.value }))
                      setGpsCoords(null)
                      setGpsStatus('idle')
                    }}
                    className="w-full bg-white/5 border border-white/10 focus:border-violet-500/50 outline-none py-2.5 pl-9 pr-[4.5rem] rounded-xl text-white text-sm placeholder-white/30 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={handleGetGPS}
                    disabled={gpsStatus === 'loading'}
                    className={`absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 ${
                      gpsStatus === 'success'
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-white/10 hover:bg-white/15 text-white/50'
                    }`}
                  >
                    {gpsStatus === 'loading'
                      ? <FiLoader className="animate-spin" size={11} />
                      : gpsStatus === 'success'
                        ? <FiCheck size={11} />
                        : <FiNavigation size={11} />}
                    GPS
                  </button>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-xs text-white/35 font-medium">Precio</p>
                  <button
                    type="button"
                    onClick={() => setIsFree((v) => !v)}
                    className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium transition-all ${
                      isFree
                        ? 'bg-green-500/15 text-green-400 ring-1 ring-green-500/20'
                        : 'bg-white/8 text-white/45 hover:bg-white/12'
                    }`}
                  >
                    {isFree && <FiCheck size={10} />}
                    {isFree ? 'Gratis' : 'Con precio'}
                  </button>
                </div>
                {!isFree && (
                  <div className="relative">
                    <FiDollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none" size={13} />
                    <input
                      type="number"
                      placeholder="0"
                      min="0"
                      value={eventForm.price}
                      onChange={(e) => setEventForm((prev) => ({ ...prev, price: e.target.value }))}
                      className="w-full bg-white/5 border border-white/10 focus:border-violet-500/50 outline-none py-2.5 pl-9 pr-3 rounded-xl text-white text-sm placeholder-white/30 transition-colors"
                    />
                  </div>
                )}
              </div>

              {!imagePreview && (
                <div>
                  <p className="text-xs text-white/35 mb-1.5 font-medium">O pega una URL de imagen</p>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={eventForm.imageUrl}
                    onChange={(e) => {
                      setEventForm((prev) => ({ ...prev, imageUrl: e.target.value }))
                      if (e.target.value) setImagePreview(e.target.value)
                    }}
                    className="w-full bg-white/5 border border-white/10 focus:border-violet-500/50 outline-none py-2.5 px-3 rounded-xl text-white text-sm placeholder-white/30 transition-colors"
                  />
                </div>
              )}

              {validationError && (
                <p className="text-xs text-red-300">{validationError}</p>
              )}
            </div>

            <div className="p-4 border-t border-white/10 flex-shrink-0">
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || !eventForm.title.trim() || !eventForm.date}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold py-2.5 rounded-xl transition-all disabled:opacity-35 disabled:cursor-not-allowed text-sm shadow-lg shadow-violet-900/30"
              >
                {isSubmitting && <FiLoader className="animate-spin" size={14} />}
                {isSubmitting ? (mode === 'edit' ? 'Guardando...' : 'Publicando...') : (mode === 'edit' ? 'Guardar cambios' : 'Publicar evento')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
