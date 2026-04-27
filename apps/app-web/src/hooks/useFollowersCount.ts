'use client'

import { useEffect, useState } from 'react'
import { getSupabaseBrowserClient, hasSupabaseEnv } from '../lib/supabase'
import type { User } from '../types'

const PROFILE_URL = (process.env.NEXT_PUBLIC_PROFILE_URL ?? '').trim().replace(/\/$/, '')

export function useFollowersCount(user: User | null) {
  const [followersCount, setFollowersCount] = useState<number | null>(null)
  const [loadingFollowers, setLoadingFollowers] = useState(false)

  useEffect(() => {
    if (!user || !hasSupabaseEnv || !PROFILE_URL) {
      setFollowersCount(null)
      return
    }

    let mounted = true
    setLoadingFollowers(true)

    const load = async () => {
      try {
        const { data } = await getSupabaseBrowserClient().auth.getSession()
        let token = data.session?.access_token

        if (!token) {
          const { data: refreshed } = await getSupabaseBrowserClient().auth.refreshSession()
          token = refreshed.session?.access_token
        }

        if (!token) {
          if (mounted) setFollowersCount(null)
          return
        }

        const response = await fetch(`${PROFILE_URL}/profile/stats`, {
          headers: { Authorization: `Bearer ${token}` },
        })

        if (!response.ok) {
          if (mounted) setFollowersCount(null)
          return
        }

        const payload = (await response.json()) as { followersCount?: number | null }
        if (mounted) {
          setFollowersCount(typeof payload.followersCount === 'number' ? payload.followersCount : null)
        }
      } catch {
        if (mounted) setFollowersCount(null)
      } finally {
        if (mounted) setLoadingFollowers(false)
      }
    }

    load()
    return () => { mounted = false }
  }, [user])

  return { followersCount, loadingFollowers }
}
