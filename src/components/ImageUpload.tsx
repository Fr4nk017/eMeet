'use client'

import { useRef } from 'react'
import { HiPhoto, HiXMark } from 'react-icons/hi2'
import { FiLoader } from 'react-icons/fi'
import { useImageUpload } from '../hooks/useImageUpload'

type Props = {
  bucket: string
  folder: string
  value: string
  onChange: (url: string) => void
  placeholder?: string
  aspectRatio?: 'video' | 'square'
}

export function ImageUpload({
  bucket,
  folder,
  value,
  onChange,
  placeholder = 'Subir imagen',
  aspectRatio = 'video',
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const { upload, uploading, error, clearError } = useImageUpload({ bucket, folder })

  async function handleFile(file: File) {
    const url = await upload(file)
    if (url) onChange(url)
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    e.target.value = ''
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }

  const containerClass = aspectRatio === 'square' ? 'aspect-square' : 'aspect-video'

  return (
    <div className="w-full">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={handleInputChange}
      />

      {value ? (
        <div className={`relative w-full ${containerClass} overflow-hidden rounded-lg`}>
          <img src={value} alt="preview" className="h-full w-full object-cover" />
          <button
            type="button"
            onClick={() => { onChange(''); clearError() }}
            className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-sm transition-opacity hover:bg-black/80"
          >
            <HiXMark className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          disabled={uploading}
          className={`flex w-full ${containerClass} flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-white/20 bg-surface text-muted transition-colors hover:border-primary/50 hover:text-white disabled:cursor-not-allowed disabled:opacity-60`}
        >
          {uploading ? (
            <FiLoader className="h-6 w-6 animate-spin text-primary" />
          ) : (
            <HiPhoto className="h-8 w-8" />
          )}
          <span className="text-sm">{uploading ? 'Subiendo...' : placeholder}</span>
          <span className="text-xs opacity-50">JPG, PNG, WEBP · máx 5 MB</span>
        </button>
      )}

      {error && (
        <p className="mt-1.5 text-xs text-red-400">{error}</p>
      )}
    </div>
  )
}
