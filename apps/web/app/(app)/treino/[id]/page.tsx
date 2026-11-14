import Link from "next/link"
import { notFound } from "next/navigation"
import { Plus, Trash2, TrendingUp } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { Card, CardContent } from "@workspace/ui/components/card"
import { requireProfile } from "@/lib/auth"
import { shortDate } from "@/lib/dates"
import { ScreenHeader } from "@/components/shell/screen-header"
import { ExerciseSetLogger } from "@/components/workout/exercise-set-logger"
import { WorkoutNameForm } from "@/components/workout/workout-name-form"
import { QuickLogInput } from "@/components/workout/quick-log-input"
import { isExtractionEnabled } from "@/lib/ai/client"
import type { ExerciseCategory } from "@/lib/supabase/types"
import { deleteWorkout } from "../actions"

type SetRow = {
  id: string
  set_number: number
  reps: number
  weight_kg: number
  is_warmup: boolean
  exercise_id: string
  exercises: {
    id: string
    name: string
    category: ExerciseCategory
  } | null
}

export default async function WorkoutDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ exercicio?: string }>
}) {
  const { id } = await params
  const { exercicio } = await searchParams
  const { supabase } = await requireProfile()

  const { data: workout } = await supabase
    .from("workouts")
    .select("id, name, performed_on, notes")
    .eq("id", id)
    .maybeSingle()

  if (!workout) {
    notFound()
  }

  const { data: setRows } = await supabase
    .from("workout_sets")
    .select(
      "id, set_number, reps, weight_kg, is_warmup, exercise_id, exercises(id, name, category)"
    )
    .eq("workout_id", id)
    .order("created_at", { ascending: true })
    .returns<SetRow[]>()

  // Group sets under their exercise, preserving the order they were logged in.
  const groups = new Map<
    string,
    { id: string; name: string; sets: SetRow[] }
  >()

  for (const row of setRows ?? []) {
    const exercise = row.exercises
    if (!exercise) continue

    const group = groups.get(exercise.id)
    if (group) {
      group.sets.push(row)
    } else {
      groups.set(exercise.id, {
        id: exercise.id,
        name: exercise.name,
        sets: [row],
      })
    }
  }

  // An exercise just picked from the catalog has no sets yet, so it isn't in
  // the grouped rows — append an empty group so its logger is ready to use.
  if (exercicio && !groups.has(exercicio)) {
    const { data: picked } = await supabase
      .from("exercises")
      .select("id, name")
      .eq("id", exercicio)
      .maybeSingle()

    if (picked) {
      groups.set(picked.id, { id: picked.id, name: picked.name, sets: [] })
    }
  }

  const exerciseGroups = [...groups.values()]
  const totalVolume = (setRows ?? [])
    .filter((row) => !row.is_warmup)
    .reduce((total, row) => total + row.reps * row.weight_kg, 0)

  return (
    <>
      <ScreenHeader
        title={workout.name ?? "Treino"}
        subtitle={`${shortDate(workout.performed_on)} · ${Math.round(totalVolume).toLocaleString("pt-BR")} kg de volume`}
        backHref="/treino"
      />

      <div className="space-y-4 px-5 py-3">
        <WorkoutNameForm
          workoutId={workout.id}
          defaultName={workout.name ?? ""}
        />

        {/* Hidden entirely when ANTHROPIC_API_KEY is unset. */}
        {isExtractionEnabled() ? (
          <QuickLogInput workoutId={workout.id} />
        ) : null}

        {exerciseGroups.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border px-6 py-10 text-center">
            <p className="text-sm font-medium">Nenhum exercício ainda</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Adicione o primeiro exercício para começar a registrar séries.
            </p>
          </div>
        ) : (
          exerciseGroups.map((group) => (
            <Card key={group.id}>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="font-heading truncate text-base font-semibold">
                    {group.name}
                  </h2>
                  <Link
                    href={`/progresso?exercicio=${group.id}`}
                    aria-label={`Ver evolução de ${group.name}`}
                    className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <TrendingUp className="size-4" />
                  </Link>
                </div>

                <ExerciseSetLogger
                  workoutId={workout.id}
                  exerciseId={group.id}
                  sets={group.sets.map((set) => ({
                    id: set.id,
                    set_number: set.set_number,
                    reps: set.reps,
                    weight_kg: set.weight_kg,
                  }))}
                />
              </CardContent>
            </Card>
          ))
        )}

        <Button
          variant="outline"
          size="lg"
          className="h-14 w-full rounded-2xl text-base"
          nativeButton={false}
          render={<Link href={`/treino/${workout.id}/exercicios`} />}
        >
          <Plus className="size-5" />
          Adicionar exercício
        </Button>

        <form action={deleteWorkout}>
          <input type="hidden" name="workout_id" value={workout.id} />
          <Button
            type="submit"
            variant="ghost"
            size="sm"
            className="w-full text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="size-3.5" />
            Excluir treino
          </Button>
        </form>
      </div>
    </>
  )
}
