import { notFound } from "next/navigation"

import { requireProfile } from "@/lib/auth"
import { ScreenHeader } from "@/components/shell/screen-header"
import { ExercisePicker } from "@/components/workout/exercise-picker"

export default async function ExercisePickerPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { supabase } = await requireProfile()

  const [{ data: workout }, { data: exercises }] = await Promise.all([
    supabase.from("workouts").select("id").eq("id", id).maybeSingle(),
    supabase
      .from("exercises")
      .select("id, name, category, equipment")
      .order("name", { ascending: true }),
  ])

  if (!workout) {
    notFound()
  }

  return (
    <>
      <ScreenHeader
        title="Exercícios"
        subtitle="Escolha o que você vai treinar"
        backHref={`/treino/${id}`}
      />
      <ExercisePicker workoutId={id} exercises={exercises ?? []} />
    </>
  )
}
