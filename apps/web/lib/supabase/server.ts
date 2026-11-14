import "server-only"

import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"

import { supabaseEnv } from "./env"
import type { Database } from "./types"

/**
 * Server client bound to the request cookie jar. `setAll` throws inside Server
 * Components (cookies are read-only there) — that is expected and safe to
 * swallow, because proxy.ts already refreshed the session for this request.
 */
export async function createClient() {
  const cookieStore = await cookies()
  const { url, anonKey } = supabaseEnv()

  return createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options)
          }
        } catch {
          // Called from a Server Component — proxy.ts handles the refresh.
        }
      },
    },
  })
}

/** Returns the signed-in user, or null. Always verifies against Supabase. */
export async function getUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
}
