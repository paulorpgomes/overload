"use client"

import * as React from "react"
import { LoaderCircle } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { createClient } from "@/lib/supabase/client"

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-5">
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.46a5.52 5.52 0 0 1-2.4 3.62v3.01h3.88c2.27-2.09 3.58-5.17 3.58-8.82Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.08 7.94-2.91l-3.88-3.01c-1.08.72-2.45 1.15-4.06 1.15-3.12 0-5.77-2.11-6.71-4.95H1.28v3.11A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.29 14.28a7.2 7.2 0 0 1 0-4.56v-3.1H1.28a12 12 0 0 0 0 10.77l4.01-3.11Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.77c1.76 0 3.34.61 4.59 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.28 6.62l4.01 3.1C6.23 6.88 8.88 4.77 12 4.77Z"
      />
    </svg>
  )
}

export function GoogleSignInButton({ next }: { next?: string }) {
  const [pending, setPending] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  async function signIn() {
    setPending(true)
    setError(null)

    const supabase = createClient()
    const callback = new URL("/auth/callback", window.location.origin)
    if (next) {
      callback.searchParams.set("next", next)
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callback.toString() },
    })

    if (error) {
      setError(error.message)
      setPending(false)
    }
    // On success the browser is redirected to Google, so keep the spinner on.
  }

  return (
    <div className="space-y-2">
      <Button
        size="lg"
        variant="outline"
        className="h-14 w-full gap-3 rounded-2xl text-base"
        onClick={signIn}
        disabled={pending}
      >
        {pending ? (
          <LoaderCircle className="size-5 animate-spin" />
        ) : (
          <GoogleMark />
        )}
        Continuar com Google
      </Button>
      {error ? (
        <p role="alert" className="text-center text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  )
}
