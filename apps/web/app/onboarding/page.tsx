import { redirect } from "next/navigation"

import { requireUser } from "@/lib/auth"
import { OnboardingForm } from "@/components/onboarding/onboarding-form"

export default async function OnboardingPage() {
  const { supabase, user } = await requireUser()

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, onboarded_at")
    .eq("id", user.id)
    .maybeSingle()

  if (profile?.onboarded_at) {
    redirect("/")
  }

  const defaultName =
    profile?.full_name ??
    (user.user_metadata.full_name as string | undefined) ??
    ""

  return (
    <main className="mx-auto w-full max-w-lg px-5 pt-[max(2.5rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))]">
      <div className="mb-8 space-y-2">
        <p className="text-sm font-medium text-primary">Bem-vindo ao Overload</p>
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          Vamos montar seu perfil
        </h1>
        <p className="text-sm text-muted-foreground">
          Leva menos de um minuto.
        </p>
      </div>

      <OnboardingForm defaultName={defaultName} />
    </main>
  )
}
