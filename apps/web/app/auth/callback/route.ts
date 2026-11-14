import { NextResponse, type NextRequest } from "next/server"

import { createClient } from "@/lib/supabase/server"

/**
 * OAuth PKCE landing route. Supabase redirects here with a `code`, which we
 * exchange for a session cookie before sending the user into the app.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const code = searchParams.get("code")
  const next = searchParams.get("next")

  // Only allow same-origin relative paths, so `next` can't be used as an
  // open redirect.
  const redirectTo = next?.startsWith("/") && !next.startsWith("//") ? next : "/"

  if (!code) {
    return NextResponse.redirect(`${origin}/auth/auth-code-error`)
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    return NextResponse.redirect(
      `${origin}/auth/auth-code-error?reason=${encodeURIComponent(error.message)}`
    )
  }

  return NextResponse.redirect(`${origin}${redirectTo}`)
}
