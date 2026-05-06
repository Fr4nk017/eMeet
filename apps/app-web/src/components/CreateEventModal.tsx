'use client'

import { useEffect, useRef, useState } from 'react'
import {
  Check as FiCheck,
  DollarSign as FiDollarSign,
  ImageIcon as FiImage,
  Loader2 as FiLoader,
  MapPin as FiMapPin,
  Music as FiMusic,
  Navigation as FiNavigation,
  Video as FiVideo,
  X as FiX,
} from 'lucide-react'
import type { CreateLocatarioEventInput } from '../context/LocatarioEventsContext'
import type { EventCategory } from '../types'
import { uploadEventMedia } from '../lib/uploadEventMedia'
import { hasSupabaseEnv } from '../lib/supabase'

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

type DeezerTrack = {
  id: number
  title: string
  artist: string
  coverUrl: string
  previewUrl: string
}

type InitialValues = {
  title?: string
  description?: string
  date?: string
  price?: number | null
  address?: string
  imageUrl?: string
  videoUrl?: string
  audioUrl?: string
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
  userId?: string
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
  userId,
  mode = 'create',
  initialValues,
}: Props) {
  const [eventForm, setEventForm] = useState({ ...EMPTY_FORM, address: defaultAddress })
  const [mediaPreview, setMediaPreview] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isFree, setIsFree] = useState(true)
  const [gpsStatus, setGpsStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [geocodeStatus, setGeocodeStatus] = useState<'idle' | 'loading' | 'done'>('idle')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<string | null>(null)
  const [validationError, setValidationError] = useState<string | null>(null)

  const [deezerQuery, setDeezerQuery] = useState('')
  const [deezerResults, setDeezerResults] = useState<DeezerTrack[]>([])
  const [deezerTrack, setDeezerTrack] = useState<DeezerTrack | null>(null)
  const [existingAudioUrl, setExistingAudioUrl] = useState<string | null>(null)
  const [isSearchingDeezer, setIsSearchingDeezer] = useState(false)

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
      setMediaPreview(initialValues.videoUrl || initialValues.imageUrl || null)
      setMediaType(initialValues.videoUrl ? 'video' : initialValues.imageUrl ? 'image' : null)
      setSelectedFile(null)
      setGpsCoords(null)
      setGpsStatus('idle')
      setValidationError(null)
      setDeezerQuery('')
      setDeezerResults([])
      setDeezerTrack(null)
      setExistingAudioUrl(initialValues.audioUrl ?? null)
    } else if (!isOpen) {
      setEventForm({ ...EMPTY_FORM, address: defaultAddress })
      setMediaPreview(null)
      setSelectedFile(null)
      setMediaType(null)
      setGpsCoords(null)
      setGpsStatus('idle')
      setIsFree(true)
      setValidationError(null)
      setUploadProgress(null)
      setDeezerQuery('')
      setDeezerResults([])
      setDeezerTrack(null)
      setExistingAudioUrl(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }, [isOpen, defaultAddress, mode, initialValues])

  useEffect(() => {
    if (gpsStatus === 'success') return
    const address = eventForm.address.trim()
    if (address.length < 8) {
      setGpsCoords(null)
      setGeocodeStatus('idle')
      return
    }

    setGeocodeStatus('loading')
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/geocode?address=${encodeURIComponent(address)}`)
        const data = await res.json() as { lat: number | null; lng: number | null }
        if (data.lat !== null && data.lng !== null) {
          setGpsCoords({ lat: data.lat, lng: data.lng })
          setGeocodeStatus('done')
        } else {
          setGpsCoords(null)
          setGeocodeStatus('idle')
        }
      } catch {
        setGpsCoords(null)
        setGeocodeStatus('idle')
      }
    }, 800)

    return () => clearTimeout(timer)
  }, [eventForm.address, gpsStatus])

  useEffect(() => {
    const q = deezerQuery.trim()
    if (q.length < 2) {
      setDeezerResults([])
      setIsSearchingDeezer(false)
      return
    }
    setIsSearchingDeezer(true)
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/deezer/search?q=${encodeURIComponent(q)}`)
        const json = await res.json() as {
          data?: Array<{
            id: number
            title: string
            artist: { name: string }
            album: { cover_medium: string }
            preview: string
          }>
        }
        setDeezerResults((json.data ?? []).map((t) => ({
          id: t.id,
          title: t.title,
          artist: t.artist.name,
          coverUrl: t.album.cover_medium,
          previewUrl: t.preview,
        })))
      } catch {
        setDeezerResults([])
      } finally {
        setIsSearchingDeezer(false)
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [deezerQuery])

  if (!isOpen) return null

  const handleMediaFile = (file: File) => {
    const isVideo = file.type.startsWith('video/')
    const isImage = file.type.startsWith('image/')
    if (!isVideo && !isImage) return

    const MAX_IMAGE_MB = 10
    const MAX_VIDEO_MB = 50
    const maxMB = isVideo ? MAX_VIDEO_MB : MAX_IMAGE_MB
    const fileMB = (file.size / (1024 * 1024)).toFixed(1)
    if (file.size > maxMB * 1024 * 1024) {
      setValidationError(
        `El archivo pesa ${fileMB} MB y supera el límite de ${maxMB} MB permitido.`
      )
      return
    }

    setValidationError(null)
    setSelectedFile(file)
    setMediaType(isVideo ? 'video' : 'image')
    const url = URL.createObjectURL(file)
    setMediaPreview(url)
    setEventForm((prev) => ({ ...prev, imageUrl: '' }))
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleMediaFile(file)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleMediaFile(file)
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

  const clearMedia = () => {
    setMediaPreview(null)
    setSelectedFile(null)
    setMediaType(null)
    setValidationError(null)
    setEventForm((prev) => ({ ...prev, imageUrl: '' }))
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const selectDeezerTrack = (track: DeezerTrack) => {
    setDeezerTrack(track)
    setExistingAudioUrl(null)
    setDeezerResults([])
    setDeezerQuery('')
  }

  const clearAudio = () => {
    setDeezerTrack(null)
    setExistingAudioUrl(null)
    setDeezerQuery('')
    setDeezerResults([])
  }

  const handleSubmit = async () => {
    if (!eventForm.title.trim() || !eventForm.description.trim() || !eventForm.date) {
      setValidationError('Completa al menos título, descripción y fecha.')
      return
    }
    setValidationError(null)
    setIsSubmitting(true)

    try {
      let finalImageUrl = eventForm.imageUrl
      let finalVideoUrl: string | undefined

      if (selectedFile && userId && hasSupabaseEnv) {
        setUploadProgress(mediaType === 'video' ? 'Subiendo video...' : 'Subiendo imagen...')
        try {
          const publicUrl = await uploadEventMedia(selectedFile, userId)
          if (mediaType === 'video') {
            finalVideoUrl = publicUrl
          } else {
            finalImageUrl = publicUrl
          }
        } catch {
          setUploadProgress(null)
          setValidationError(
            mediaType === 'video'
              ? 'No se pudo subir el video. Intenta de nuevo o usa una URL.'
              : 'No se pudo subir la imagen. Intenta de nuevo o usa una URL.'
          )
          setIsSubmitting(false)
          return
        }
        setUploadProgress(null)
      }

      const finalAudioUrl = deezerTrack?.previewUrl ?? existingAudioUrl ?? undefined

      await onSubmit({
        title: eventForm.title,
        description: eventForm.description,
        category: eventForm.category,
        date: eventForm.date,
        address: eventForm.address || defaultAddress,
        price: isFree ? null : (eventForm.price.trim() === '' ? null : Number(eventForm.price)),
        imageUrl: finalImageUrl,
        videoUrl: finalVideoUrl,
        audioUrl: finalAudioUrl,
        organizerName,
        organizerAvatar,
        lat: gpsCoords?.lat,
        lng: gpsCoords?.lng,
      })
    } catch (err) {
      setUploadProgress(null)
      throw err
    } finally {
      setIsSubmitting(false)
    }
  }

  const submitLabel = uploadProgress
    ?? (isSubmitting
      ? (mode === 'edit' ? 'Guardando...' : 'Publicando...')
      : (mode === 'edit' ? 'Guardar' : 'Publicar'))

  const hasAudio = deezerTrack || existingAudioUrl

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
            {submitLabel}
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden min-h-0">
          <div
            className={`relative flex-1 bg-black flex items-center justify-center transition-colors min-w-0 ${isDragging ? 'bg-violet-900/20' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
          >
            {mediaPreview ? (
              <>
                {mediaType === 'video' ? (
                  <video
                    src={mediaPreview}
                    controls
                    className="w-full h-full object-contain"
                    style={{ maxHeight: 'calc(92vh - 56px)' }}
                  />
                ) : (
                  <img
                    src={mediaPreview}
                    alt="preview"
                    className="w-full h-full object-contain"
                    style={{ maxHeight: 'calc(92vh - 56px)' }}
                    onError={clearMedia}
                  />
                )}
                <button
                  onClick={clearMedia}
                  className="absolute top-3 right-3 w-8 h-8 bg-black/60 hover:bg-black/80 rounded-full flex items-center justify-center text-white transition-colors"
                >
                  <FiX size={15} />
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-3 right-3 bg-black/60 hover:bg-black/80 text-white/80 hover:text-white text-xs px-3 py-1.5 rounded-lg transition-colors"
                >
                  Cambiar archivo
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center gap-4 p-10 text-center w-full h-full justify-center group"
              >
                <div className={`w-20 h-20 rounded-2xl flex items-center justify-center transition-all ${isDragging ? 'bg-violet-500/30 scale-110' : 'bg-white/5 group-hover:bg-white/10'}`}>
                  <div className={`flex gap-2 transition-colors ${isDragging ? 'text-violet-300' : 'text-white/30 group-hover:text-white/50'}`}>
                    <FiImage size={28} />
                    <FiVideo size={28} />
                  </div>
                </div>
                <div>
                  <p className="text-white font-medium mb-1">Arrastra una foto o video aquí</p>
                  <p className="text-white/40 text-sm">o haz clic para seleccionar</p>
                </div>
                <span className="text-xs text-white/20">PNG, JPG, GIF, WEBP, AVIF, BMP, TIFF, HEIC · MP4, MOV, WEBM</span>
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/gif,image/webp,image/avif,image/bmp,image/tiff,image/svg+xml,image/heic,image/heif,video/mp4,video/quicktime,video/webm,video/x-msvideo"
              className="hidden"
              onChange={handleFileSelect}
            />
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
                      setGeocodeStatus('idle')
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
                {gpsStatus !== 'success' && (
                  <p className={`mt-1 text-[11px] transition-opacity ${
                    geocodeStatus === 'loading' ? 'text-white/30 opacity-100' :
                    geocodeStatus === 'done' ? 'text-green-400/80 opacity-100' :
                    'opacity-0'
                  }`}>
                    {geocodeStatus === 'loading' && '⏳ Buscando coordenadas...'}
                    {geocodeStatus === 'done' && '📍 Ubicación detectada — el evento aparecerá en el mapa'}
                  </p>
                )}
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

              {/* Música del evento — Deezer */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-xs text-white/35 font-medium">Música del evento</p>
                  {hasAudio && (
                    <button
                      type="button"
                      onClick={clearAudio}
                      className="text-xs text-white/30 hover:text-white/60 transition-colors"
                    >
                      Quitar
                    </button>
                  )}
                </div>

                {deezerTrack ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2.5 bg-white/5 border border-white/10 rounded-xl p-2.5">
                      <img
                        src={deezerTrack.coverUrl}
                        alt=""
                        className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-white truncate">{deezerTrack.title}</p>
                        <p className="text-xs text-white/40 truncate">{deezerTrack.artist}</p>
                      </div>
                    </div>
                    <audio
                      src={deezerTrack.previewUrl}
                      controls
                      className="w-full h-8 rounded-lg [color-scheme:dark]"
                    />
                    <p className="text-[10px] text-white/20 text-center">Preview de 30 seg · Deezer</p>
                  </div>
                ) : existingAudioUrl ? (
                  <div className="space-y-1.5">
                    <p className="text-[11px] text-white/30">Audio guardado:</p>
                    <audio
                      src={existingAudioUrl}
                      controls
                      className="w-full h-8 rounded-lg [color-scheme:dark]"
                    />
                  </div>
                ) : (
                  <div className="relative">
                    <FiMusic className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none" size={13} />
                    <input
                      type="text"
                      placeholder="Buscar canción o artista..."
                      value={deezerQuery}
                      onChange={(e) => setDeezerQuery(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 focus:border-violet-500/50 outline-none py-2.5 pl-9 pr-8 rounded-xl text-white text-sm placeholder-white/30 transition-colors"
                    />
                    {isSearchingDeezer && (
                      <FiLoader className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-white/30" size={13} />
                    )}
                  </div>
                )}

                {deezerResults.length > 0 && !deezerTrack && (
                  <div className="mt-1.5 bg-[#12122a] border border-white/10 rounded-xl overflow-hidden">
                    {deezerResults.map((track) => (
                      <button
                        key={track.id}
                        type="button"
                        onClick={() => selectDeezerTrack(track)}
                        className="flex items-center gap-2.5 w-full px-3 py-2 hover:bg-white/5 transition-colors text-left border-b border-white/5 last:border-0"
                      >
                        <img
                          src={track.coverUrl}
                          alt=""
                          className="w-8 h-8 rounded-md object-cover flex-shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-white truncate">{track.title}</p>
                          <p className="text-xs text-white/40 truncate">{track.artist}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {!mediaPreview && (
                <div>
                  <p className="text-xs text-white/35 mb-1.5 font-medium">O pega una URL de imagen</p>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={eventForm.imageUrl}
                    onChange={(e) => {
                      setEventForm((prev) => ({ ...prev, imageUrl: e.target.value }))
                      if (e.target.value) {
                        setMediaPreview(e.target.value)
                        setMediaType('image')
                      }
                    }}
                    className="w-full bg-white/5 border border-white/10 focus:border-violet-500/50 outline-none py-2.5 px-3 rounded-xl text-white text-sm placeholder-white/30 transition-colors"
                  />
                </div>
              )}

              {validationError && (
                <p className="text-xs text-red-300 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">{validationError}</p>
              )}
            </div>

            <div className="p-4 border-t border-white/10 flex-shrink-0">
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || !eventForm.title.trim() || !eventForm.date}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold py-2.5 rounded-xl transition-all disabled:opacity-35 disabled:cursor-not-allowed text-sm shadow-lg shadow-violet-900/30"
              >
                {isSubmitting && <FiLoader className="animate-spin" size={14} />}
                {uploadProgress ?? (isSubmitting
                  ? (mode === 'edit' ? 'Guardando...' : 'Publicando...')
                  : (mode === 'edit' ? 'Guardar cambios' : 'Publicar evento'))}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
