"use client"

import { createBrowserClient } from "@supabase/ssr"

import { supabaseEnv } from "./env"
import type { Database } from "./types"

export function createClient() {
  const { url, anonKey } = supabaseEnv()
  return createBrowserClient<Database>(url, anonKey)
}
