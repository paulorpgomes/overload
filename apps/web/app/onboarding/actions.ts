"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import * as z from "zod"

import { requireUser } from "@/lib/auth"
import { estimateTargets } from "@/lib/nutrition"

const GOALS = ["lose_fat", "gain_muscle", "maintain", "performance"] as const

const OnboardingSchema = z.object({
  full_name: z
    .string()
    .trim()
    .min(2, { error: "Informe seu nome." })
    .max(60, { error: "Nome muito longo." }),
  goal: z.enum(GOALS, { error: "Escolha um objetivo." }),
  weight_kg: z.coerce
    .number({ error: "Informe seu peso." })
    .min(30, { error: "Peso deve ser ao menos 30 kg." })
    .max(300, { error: "Peso deve ser no máximo 300 kg." }),
  height_cm: z.coerce
    .number({ error: "Informe sua altura." })
    .min(100, { error: "Altura deve ser ao menos 100 cm." })
    .max(250, { error: "Altura deve ser no máximo 250 cm." }),
})

export type OnboardingState = {
  errors?: Partial<Record<keyof z.infer<typeof OnboardingSchema>, string[]>>
  message?: string
}

export async function completeOnboarding(
  _prev: OnboardingState,
  formData: FormData
): Promise<OnboardingState> {
  // proxy.ts is optimistic; Server Actions re-verify the session themselves.
  const { supabase, user } = await requireUser()

  const parsed = OnboardingSchema.safeParse({
    full_name: formData.get("full_name"),
    goal: formData.get("goal"),
    weight_kg: formData.get("weight_kg"),
    height_cm: formData.get("height_cm"),
  })

  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors }
  }

  const { full_name, goal, weight_kg, height_cm } = parsed.data

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name,
      goal,
      weight_kg,
      height_cm,
      ...estimateTargets(weight_kg, goal),
      onboarded_at: new Date().toISOString(),
    })
    .eq("id", user.id)

  if (error) {
    return { message: "Não foi possível salvar seu perfil. Tente novamente." }
  }

  revalidatePath("/", "layout")
  redirect("/")
}
