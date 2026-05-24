'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function ChatRoomError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const router = useRouter()

  useEffect(() => {
    console.error('[ChatRoom Error]', error.message, error.stack)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center gap-4 bg-surface text-center" style={{ height: '100dvh' }}>
      <p className="text-sm font-semibold text-white">Ocurrió un error al cargar el chat</p>
      <p className="max-w-xs px-4 text-xs text-muted">{error.message}</p>
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white"
        >
          Reintentar
        </button>
        <button
          onClick={() => router.push('/chat')}
          className="rounded-xl bg-white/10 px-4 py-2 text-sm text-white"
        >
          Volver
        </button>
      </div>
    </div>
  )
}
