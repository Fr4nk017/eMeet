import { useState } from 'react'
import { getSupabaseBrowserClient, hasSupabaseEnv } from '../lib/supabase'

const MAX_SIZE_BYTES = 50 * 1024 * 1024 // 50 MB
const MAX_DURATION_S = 30
const ALLOWED_TYPES = ['video/mp4', 'video/webm']

type UploadOptions = {
  bucket: string
  folder: string
}

function getVideoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url)
      resolve(video.duration)
    }
    video.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('No se pudo leer el video.'))
    }
    video.src = url
  })
}

export function useVideoUpload({ bucket, folder }: UploadOptions) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function upload(file: File): Promise<string | null> {
    setError(null)

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('Formato no soportado. Usa MP4 o WebM.')
      return null
    }
    if (file.size > MAX_SIZE_BYTES) {
      setError('El video debe pesar menos de 30 MB.')
      return null
    }

    let duration: number
    try {
      duration = await getVideoDuration(file)
    } catch {
      setError('No se pudo leer la duración del video.')
      return null
    }

    if (duration > MAX_DURATION_S) {
      setError(`El video es muy largo (${duration.toFixed(1)}s). Máximo ${MAX_DURATION_S}s.`)
      return null
    }

    // Sin Supabase env: devuelve object URL local para preview
    if (!hasSupabaseEnv) {
      return URL.createObjectURL(file)
    }

    setUploading(true)
    try {
      const supabase = getSupabaseBrowserClient()
      const ext = file.type === 'video/webm' ? 'webm' : 'mp4'
      const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(path, file, { upsert: true, contentType: file.type })

      if (uploadError) throw uploadError

      const { data } = supabase.storage.from(bucket).getPublicUrl(path)
      return data.publicUrl
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al subir el video.'
      setError(msg)
      return null
    } finally {
      setUploading(false)
    }
  }

  return { upload, uploading, error, clearError: () => setError(null) }
}
