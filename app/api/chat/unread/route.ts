import { NextResponse, type NextRequest } from 'next/server'
import { getRequestUser } from '../../_lib/auth'
import { apiError, createRouteSupabaseClient } from '../../_lib/supabase'
import { prisma } from '../../../../src/lib/prisma'

export const runtime = 'nodejs'

type UnreadRow = { roomId: string; unread: bigint }

export async function GET(request: NextRequest) {
  const supabase = createRouteSupabaseClient(request)
  const { user, error } = await getRequestUser(supabase, request)

  if (error || !user) return apiError('No autorizado.', 401)

  const rows = await prisma.$queryRaw<UnreadRow[]>`
    SELECT
      rm.room_id AS "roomId",
      COUNT(cm.id) AS "unread"
    FROM room_members rm
    LEFT JOIN chat_messages cm
      ON cm.room_id = rm.room_id
      AND cm.created_at > rm.last_read_at
      AND cm.user_id <> rm.user_id
    WHERE rm.user_id = ${user.id}::uuid
    GROUP BY rm.room_id
  `

  return NextResponse.json(
    rows.map((row: UnreadRow) => ({
      roomId: row.roomId,
      unread: Number(row.unread),
    })),
  )
}
