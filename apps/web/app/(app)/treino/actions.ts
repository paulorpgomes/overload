"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import * as z from "zod"

import { requireUser } from "@/lib/auth"
import { toISODate } from "@/lib/dates"
import { extractWorkoutEntries } from "@/lib/ai/extract-workout"

/** Finds today's workout or creates one, then opens it. */
export async function startTodayWorkout() {
  const { supabase, user } = await requireUser()
  const today = toISODate()

  const { data: existing } = await supabase
    .from("workouts")
    .select("id")
    .eq("performed_on", today)
    .maybeSingle()

  if (existing) {
    redirect(`/treino/${existing.id}`)
  }

  const { data: created, error } = await supabase
    .from("workouts")
    .insert({ user_id: user.id, performed_on: today, name: "Treino de hoje" })
    .select("id")
    .single()

  if (error || !created) {
    throw new Error("Não foi possível criar o treino.")
  }

  revalidatePath("/treino")
  revalidatePath("/")
  redirect(`/treino/${created.id}`)
}

const AddSetSchema = z.object({
  workout_id: z.uuid(),
  exercise_id: z.uuid(),
  reps: z.coerce
    .number({ error: "Informe as repetições." })
    .int({ error: "Use um número inteiro." })
    .min(0, { error: "Repetições não podem ser negativas." })
    .max(999, { error: "Valor muito alto." }),
  weight_kg: z.coerce
    .number({ error: "Informe a carga." })
    .min(0, { error: "Carga não pode ser negativa." })
    .max(1000, { error: "Valor muito alto." }),
})

export type SetFormState = { error?: string }

export async function addSet(
  _prev: SetFormState,
  formData: FormData
): Promise<SetFormState> {
  const { supabase } = await requireUser()

  const parsed = AddSetSchema.safeParse({
    workout_id: formData.get("workout_id"),
    exercise_id: formData.get("exercise_id"),
    reps: formData.get("reps"),
    weight_kg: formData.get("weight_kg"),
  })

  if (!parsed.success) {
    const fieldErrors = z.flattenError(parsed.error).fieldErrors
    const first =
      fieldErrors.reps?.[0] ??
      fieldErrors.weight_kg?.[0] ??
      "Dados inválidos."
    return { error: first }
  }

  const { workout_id, exercise_id, reps, weight_kg } = parsed.data

  // RLS already scopes this to the owner; the count is only for set_number.
  const { count } = await supabase
    .from("workout_sets")
    .select("id", { count: "exact", head: true })
    .eq("workout_id", workout_id)
    .eq("exercise_id", exercise_id)

  const { error } = await supabase.from("workout_sets").insert({
    workout_id,
    exercise_id,
    set_number: (count ?? 0) + 1,
    reps,
    weight_kg,
  })

  if (error) {
    return { error: "Não foi possível salvar a série." }
  }

  revalidatePath(`/treino/${workout_id}`)
  revalidatePath("/")
  revalidatePath("/progresso")
  return {}
}

const QuickLogSchema = z.object({
  workout_id: z.uuid(),
  text: z
    .string()
    .trim()
    .min(3, { error: "Escreva o que você treinou." })
    .max(500, { error: "Texto muito longo." }),
})

export type QuickLogState = { error?: string; summary?: string; loggedAt?: number }

/**
 * Logs sets from free-form text ("supino 4x8 60kg, rosca 3x12 20kg").
 *
 * The model only picks an exercise from the catalog — it never invents an id,
 * so the write path is the same as the manual one.
 */
export async function quickLogSets(
  _prev: QuickLogState,
  formData: FormData
): Promise<QuickLogState> {
  const { supabase } = await requireUser()

  const parsed = QuickLogSchema.safeParse({
    workout_id: formData.get("workout_id"),
    text: formData.get("text"),
  })

  if (!parsed.success) {
    const fieldErrors = z.flattenError(parsed.error).fieldErrors
    return { error: fieldErrors.text?.[0] ?? "Dados inválidos." }
  }

  const { workout_id, text } = parsed.data

  const { data: exercises } = await supabase
    .from("exercises")
    .select("id, name")
    .order("name", { ascending: true })

  if (!exercises?.length) {
    return { error: "Catálogo de exercícios indisponível." }
  }

  const extraction = await extractWorkoutEntries(
    text,
    exercises.map((exercise) => exercise.name)
  )

  if (!extraction.ok) {
    return { error: extraction.error }
  }

  if (extraction.entries.length === 0) {
    return { error: "Não identifiquei nenhum exercício nesse texto." }
  }

  const byName = new Map(exercises.map((e) => [e.name, e.id]))
  const rows: {
    workout_id: string
    exercise_id: string
    set_number: number
    reps: number
    weight_kg: number
  }[] = []

  for (const entry of extraction.entries) {
    const exerciseId = byName.get(entry.exercise)
    if (!exerciseId) continue

    // Continue the numbering from whatever is already logged for this exercise.
    const { count } = await supabase
      .from("workout_sets")
      .select("id", { count: "exact", head: true })
      .eq("workout_id", workout_id)
      .eq("exercise_id", exerciseId)

    const offset = count ?? 0
    for (let i = 0; i < entry.sets; i++) {
      rows.push({
        workout_id,
        exercise_id: exerciseId,
        set_number: offset + i + 1,
        reps: entry.reps,
        weight_kg: entry.weight_kg,
      })
    }
  }

  if (rows.length === 0) {
    return { error: "Não identifiquei nenhum exercício nesse texto." }
  }

  const { error } = await supabase.from("workout_sets").insert(rows)

  if (error) {
    return { error: "Não foi possível salvar as séries." }
  }

  revalidatePath(`/treino/${workout_id}`)
  revalidatePath("/")
  revalidatePath("/progresso")

  const summary = extraction.entries
    .map((e) => `${e.exercise} ${e.sets}×${e.reps} ${e.weight_kg}kg`)
    .join(" · ")

  return { summary, loggedAt: Date.now() }
}

export async function deleteSet(formData: FormData) {
  const { supabase } = await requireUser()

  const setId = z.uuid().safeParse(formData.get("set_id"))
  const workoutId = z.uuid().safeParse(formData.get("workout_id"))
  if (!setId.success || !workoutId.success) return

  await supabase.from("workout_sets").delete().eq("id", setId.data)

  revalidatePath(`/treino/${workoutId.data}`)
  revalidatePath("/")
  revalidatePath("/progresso")
}

export async function renameWorkout(formData: FormData) {
  const { supabase } = await requireUser()

  const parsed = z
    .object({
      workout_id: z.uuid(),
      name: z.string().trim().min(1).max(60),
    })
    .safeParse({
      workout_id: formData.get("workout_id"),
      name: formData.get("name"),
    })

  if (!parsed.success) return

  await supabase
    .from("workouts")
    .update({ name: parsed.data.name })
    .eq("id", parsed.data.workout_id)

  revalidatePath(`/treino/${parsed.data.workout_id}`)
  revalidatePath("/")
}

export async function deleteWorkout(formData: FormData) {
  const { supabase } = await requireUser()

  const workoutId = z.uuid().safeParse(formData.get("workout_id"))
  if (!workoutId.success) return

  await supabase.from("workouts").delete().eq("id", workoutId.data)

  revalidatePath("/treino")
  revalidatePath("/")
  redirect("/treino")
}
