import Link from "next/link"
import { ChevronRight, Dumbbell, Plus } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { Card, CardContent } from "@workspace/ui/components/card"
import { requireProfile } from "@/lib/auth"
import { shortDate, toISODate } from "@/lib/dates"
import { ScreenHeader } from "@/components/shell/screen-header"
import { startTodayWorkout } from "./actions"

/** Embedded select — see the note in the dashboard page. */
type WorkoutListRow = {
  id: string
  name: string | null
  performed_on: string
  workout_sets: { reps: number; weight_kg: number; is_warmup: boolean }[]
}

export default async function WorkoutsPage() {
  const { supabase } = await requireProfile()

  const { data: workouts } = await supabase
    .from("workouts")
    .select("id, name, performed_on, workout_sets(reps, weight_kg, is_warmup)")
    .order("performed_on", { ascending: false })
    .limit(30)
    .returns<WorkoutListRow[]>()

  const today = toISODate()
  const list = workouts ?? []

  return (
    <>
      <ScreenHeader title="Treinos" subtitle="Seu histórico de sessões" />

      <div className="space-y-4 px-5 py-3">
        <form action={startTodayWorkout}>
          <Button
            type="submit"
            size="lg"
            className="h-14 w-full rounded-2xl text-base"
          >
            <Plus className="size-5" />
            Treinar agora
          </Button>
        </form>

        {list.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border px-6 py-12 text-center">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
              <Dumbbell className="size-6" />
            </div>
            <p className="text-sm font-medium">Nenhum treino ainda</p>
            <p className="text-sm text-muted-foreground">
              Toque em “Treinar agora” para registrar sua primeira série.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {list.map((workout) => {
              const sets = (workout.workout_sets ?? []).filter(
                (set) => !set.is_warmup
              )
              const volume = sets.reduce(
                (total, set) => total + set.reps * set.weight_kg,
                0
              )

              return (
                <li key={workout.id}>
                  <Card size="sm">
                    <CardContent>
                      <Link
                        href={`/treino/${workout.id}`}
                        className="flex items-center gap-3"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="flex items-center gap-2 truncate text-sm font-medium">
                            {workout.name ?? "Treino"}
                            {workout.performed_on === today ? (
                              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[0.65rem] font-semibold text-primary">
                                HOJE
                              </span>
                            ) : null}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {shortDate(workout.performed_on)} ·{" "}
                            {sets.length} séries ·{" "}
                            {Math.round(volume).toLocaleString("pt-BR")} kg
                          </p>
                        </div>
                        <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
                      </Link>
                    </CardContent>
                  </Card>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </>
  )
}
