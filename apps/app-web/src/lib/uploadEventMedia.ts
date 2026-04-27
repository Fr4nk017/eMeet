import { getSupabaseBrowserClient } from './supabase'

export async function uploadEventMedia(file: File, userId: string): Promise<string> {
  const supabase = getSupabaseBrowserClient()
  const isVideo = file.type.startsWith('video/')
  const bucket = isVideo ? 'event-videos' : 'event-images'
  const ext = file.name.split('.').pop() ?? 'bin'
  const path = `${userId}/${Date.now()}.${ext}`

  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, file, { upsert: false })

  if (error) throw new Error(`No se pudo subir el archivo: ${error.message}`)

  const { data } = supabase.storage.from(bucket).getPublicUrl(path)
  return data.publicUrl
}
