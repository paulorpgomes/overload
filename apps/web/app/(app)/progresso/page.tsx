import Link from "next/link"
import { TrendingUp } from "lucide-react"

import { Card, CardContent } from "@workspace/ui/components/card"
import { cn } from "@workspace/ui/lib/utils"
import { requireProfile } from "@/lib/auth"
import {
  LoadEvolutionChart,
  type ProgressionPoint,
} from "@/components/progress/load-evolution-chart"
import { ScreenHeader } from "@/components/shell/screen-header"

type TrainedExercise = {
  exercise_id: string
  exercises: { id: string; name: string } | null
}

export default async function ProgressPage({
  searchParams,
}: {
  searchParams: Promise<{ exercicio?: string }>
}) {
  const { exercicio } = await searchParams
  const { supabase } = await requireProfile()

  // Exercises the user has actually logged — the only ones with a series.
  const { data: logged } = await supabase
    .from("workout_sets")
    .select("exercise_id, exercises(id, name)")
    .eq("is_warmup", false)
    .order("performed_on", { ascending: false })
    .limit(300)
    .returns<TrainedExercise[]>()

  const exercises = new Map<string, string>()
  for (const row of logged ?? []) {
    if (row.exercises && !exercises.has(row.exercises.id)) {
      exercises.set(row.exercises.id, row.exercises.name)
    }
  }

  const options = [...exercises.entries()].map(([id, name]) => ({ id, name }))
  const selectedId = exercicio ?? options[0]?.id
  const selectedName = selectedId ? exercises.get(selectedId) : undefined

  let points: ProgressionPoint[] = []
  if (selectedId) {
    const { data } = await supabase.rpc("exercise_progression", {
      p_exercise_id: selectedId,
      p_limit: 30,
    })
    // The RPC returns newest-first; the chart plots oldest → newest.
    points = [...(data ?? [])].reverse()
  }

  const first = points[0]
  const last = points.at(-1)
  const delta =
    first && last ? last.top_weight_kg - first.top_weight_kg : null

  return (
    <>
      <ScreenHeader
        title="Progresso"
        subtitle="Evolução de carga por exercício"
      />

      <div className="space-y-4 px-5 py-3">
        {options.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border px-6 py-12 text-center">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
              <TrendingUp className="size-6" />
            </div>
            <p className="text-sm font-medium">Sem dados ainda</p>
            <p className="text-sm text-muted-foreground">
              Registre algumas séries e sua evolução aparece aqui.
            </p>
          </div>
        ) : (
          <>
            {/* Filter row, above the chart it scopes. */}
            <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
              {options.map((option) => (
                <Link
                  key={option.id}
                  href={`/progresso?exercicio=${option.id}`}
                  scroll={false}
                  aria-current={option.id === selectedId ? "true" : undefined}
                  className={cn(
                    "shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
                    option.id === selectedId
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {option.name}
                </Link>
              ))}
            </div>

            <Card>
              <CardContent className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="font-heading truncate text-base font-semibold">
                      {selectedName}
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      Carga máxima por sessão · últimas {points.length} sessões
                    </p>
                  </div>
                  {delta !== null && points.length > 1 ? (
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums",
                        delta > 0
                          ? "bg-primary/10 text-primary"
                          : delta < 0
                            ? "bg-destructive/10 text-destructive"
                            : "bg-muted text-muted-foreground"
                      )}
                    >
                      {delta > 0 ? "+" : ""}
                      {delta} kg
                    </span>
                  ) : null}
                </div>

                {points.length === 0 || !selectedName ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    Nenhuma série registrada para este exercício.
                  </p>
                ) : (
                  <LoadEvolutionChart
                    points={points}
                    exerciseName={selectedName}
                  />
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </>
  )
}
