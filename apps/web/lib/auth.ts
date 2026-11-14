import "server-only"

import { redirect } from "next/navigation"

import { createClient } from "@/lib/supabase/server"
import type { Profile } from "@/lib/supabase/types"

/**
 * Verifies the session for pages and Server Actions. proxy.ts is only an
 * optimistic gate, so every protected entry point calls this.
 */
export async function requireUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  return { supabase, user }
}

/** Same as `requireUser`, plus the profile row (bounced to onboarding if new). */
export async function requireProfile() {
  const { supabase, user } = await requireUser()

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle()

  if (!profile) {
    redirect("/onboarding")
  }

  if (!profile.onboarded_at) {
    redirect("/onboarding")
  }

  return { supabase, user, profile: profile as Profile }
}
