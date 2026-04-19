import { useState } from 'react'
import { getSupabaseBrowserClient, hasSupabaseEnv } from '../lib/supabase'

const MAX_SIZE_BYTES = 5 * 1024 * 1024 // 5 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

type UploadOptions = {
  bucket: string
  folder: string
}

export function useImageUpload({ bucket, folder }: UploadOptions) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function upload(file: File): Promise<string | null> {
    setError(null)

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('Formato no soportado. Usa JPG, PNG, WEBP o GIF.')
      return null
    }
    if (file.size > MAX_SIZE_BYTES) {
      setError('La imagen debe pesar menos de 5 MB.')
      return null
    }

    // Sin Supabase env: devuelve object URL local para preview
    if (!hasSupabaseEnv) {
      return URL.createObjectURL(file)
    }

    setUploading(true)
    try {
      const supabase = getSupabaseBrowserClient()
      const ext = file.name.split('.').pop() ?? 'jpg'
      const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(path, file, { upsert: true })

      if (uploadError) throw uploadError

      const { data } = supabase.storage.from(bucket).getPublicUrl(path)
      return data.publicUrl
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al subir imagen.'
      setError(msg)
      return null
    } finally {
      setUploading(false)
    }
  }

  return { upload, uploading, error, clearError: () => setError(null) }
}
