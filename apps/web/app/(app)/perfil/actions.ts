"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import * as z from "zod"

import { requireUser } from "@/lib/auth"
import { estimateTargets } from "@/lib/nutrition"

const GOALS = ["lose_fat", "gain_muscle", "maintain", "performance"] as const

const ProfileSchema = z.object({
  full_name: z.string().trim().min(2).max(60),
  goal: z.enum(GOALS),
  weight_kg: z.coerce.number().min(30).max(300),
  calorie_target: z.coerce.number().int().min(800).max(10000),
  protein_target_g: z.coerce.number().int().min(0).max(500),
  carb_target_g: z.coerce.number().int().min(0).max(1000),
  fat_target_g: z.coerce.number().int().min(0).max(400),
})

export type ProfileFormState = { error?: string; ok?: boolean }

export async function updateProfile(
  _prev: ProfileFormState,
  formData: FormData
): Promise<ProfileFormState> {
  const { supabase, user } = await requireUser()

  const parsed = ProfileSchema.safeParse(Object.fromEntries(formData))

  if (!parsed.success) {
    return { error: "Confira os valores informados." }
  }

  const { error } = await supabase
    .from("profiles")
    .update(parsed.data)
    .eq("id", user.id)

  if (error) {
    return { error: "Não foi possível salvar. Tente novamente." }
  }

  revalidatePath("/perfil")
  revalidatePath("/")
  revalidatePath("/dieta")
  return { ok: true }
}

/** Recomputes macro targets from the current weight + goal. */
export async function recalculateTargets(formData: FormData) {
  const { supabase, user } = await requireUser()

  const parsed = z
    .object({
      goal: z.enum(GOALS),
      weight_kg: z.coerce.number().min(30).max(300),
    })
    .safeParse({
      goal: formData.get("goal"),
      weight_kg: formData.get("weight_kg"),
    })

  if (!parsed.success) return

  await supabase
    .from("profiles")
    .update(estimateTargets(parsed.data.weight_kg, parsed.data.goal))
    .eq("id", user.id)

  revalidatePath("/perfil")
  revalidatePath("/")
}

export async function signOut() {
  const { supabase } = await requireUser()
  await supabase.auth.signOut()
  redirect("/login")
}
