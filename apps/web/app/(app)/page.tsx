import Link from "next/link"
import { ChevronRight, Dumbbell, Plus, UtensilsCrossed } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { Card, CardContent } from "@workspace/ui/components/card"
import { cn } from "@workspace/ui/lib/utils"
import { requireProfile } from "@/lib/auth"
import { currentWeekISODates, toISODate, weekdayLabel } from "@/lib/dates"
import { GOAL_LABELS } from "@/lib/nutrition"
import { CalorieRing } from "@/components/dashboard/calorie-ring"
import { MacroMeter } from "@/components/dashboard/macro-meter"
import { ProfileMenu } from "@/components/shell/profile-menu"

/**
 * Embedded selects can't be inferred from the hand-written Database type
 * (it carries no Relationships metadata), so nested shapes are declared here.
 */
type TodayWorkout = {
  id: string
  name: string | null
  workout_sets: { reps: number; weight_kg: number; is_warmup: boolean }[]
}

export default async function DashboardPage() {
  const { supabase, profile } = await requireProfile()

  const now = new Date()
  const today = toISODate(now)
  const weekDates = currentWeekISODates(now)
  const firstDay = weekDates[0] ?? today

  const [nutritionResult, workoutResult, weekResult] = await Promise.all([
    supabase.rpc("daily_nutrition", { p_day: today }),
    supabase
      .from("workouts")
      .select("id, name, workout_sets(reps, weight_kg, is_warmup)")
      .eq("performed_on", today)
      .returns<TodayWorkout[]>()
      .maybeSingle(),
    supabase
      .from("workouts")
      .select("performed_on")
      .gte("performed_on", firstDay)
      .lte("performed_on", today),
  ])

  const nutrition = nutritionResult.data?.[0] ?? {
    calories: 0,
    protein_g: 0,
    carb_g: 0,
    fat_g: 0,
  }

  const workout = workoutResult.data
  const sets = workout?.workout_sets ?? []
  const workingSets = sets.filter((set) => !set.is_warmup)
  const volume = workingSets.reduce(
    (total, set) => total + set.reps * set.weight_kg,
    0
  )

  const trainedDays = new Set(
    (weekResult.data ?? []).map((row) => row.performed_on)
  )

  const firstName = profile.full_name?.split(" ")[0] ?? "atleta"

  return (
    <>
      <header className="flex items-start justify-between gap-3 px-5 pt-[max(1rem,env(safe-area-inset-top))] pb-2">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">Olá, {firstName}</p>
          <h1 className="font-heading truncate text-2xl font-semibold tracking-tight">
            Resumo de hoje
          </h1>
          {profile.goal ? (
            <p className="mt-1 inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
              {GOAL_LABELS[profile.goal]}
            </p>
          ) : null}
        </div>
        <ProfileMenu
          name={profile.full_name}
          avatarUrl={profile.avatar_url}
        />
      </header>

      <div className="space-y-4 px-5 py-3">
        {/* Week strip — a simple presence dot per day, not a streak system. */}
        <div className="flex items-center justify-between gap-1">
          {weekDates.map((date) => {
            const trained = trainedDays.has(date)
            const isToday = date === today

            return (
              <div key={date} className="flex flex-1 flex-col items-center gap-1.5">
                <span className="text-[0.65rem] text-muted-foreground uppercase">
                  {weekdayLabel(date)}
                </span>
                <span
                  aria-label={trained ? "Treinou" : "Sem treino"}
                  className={cn(
                    "flex size-8 items-center justify-center rounded-full text-xs font-semibold transition-colors",
                    trained
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground",
                    isToday && !trained && "ring-2 ring-primary/40"
                  )}
                >
                  {trained ? <Dumbbell className="size-3.5" /> : null}
                </span>
              </div>
            )
          })}
        </div>

        <Card>
          <CardContent className="space-y-5">
            <CalorieRing
              consumed={Number(nutrition.calories)}
              target={profile.calorie_target}
            />

            <div className="space-y-3">
              <MacroMeter
                macro="protein"
                label="Proteína"
                consumed={Number(nutrition.protein_g)}
                target={profile.protein_target_g}
              />
              <MacroMeter
                macro="carb"
                label="Carboidrato"
                consumed={Number(nutrition.carb_g)}
                target={profile.carb_target_g}
              />
              <MacroMeter
                macro="fat"
                label="Gordura"
                consumed={Number(nutrition.fat_g)}
                target={profile.fat_target_g}
              />
            </div>

            <Button
              variant="outline"
              size="lg"
              className="h-12 w-full rounded-xl"
              nativeButton={false}
              render={<Link href="/dieta" />}
            >
              <UtensilsCrossed className="size-4" />
              Registrar refeição
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium">Treino de hoje</p>
                <p className="truncate text-sm text-muted-foreground">
                  {workout
                    ? (workout.name ?? "Treino sem nome")
                    : "Nenhum treino registrado"}
                </p>
              </div>
              {workout ? (
                <Link
                  href={`/treino/${workout.id}`}
                  className="flex items-center gap-0.5 text-sm font-medium text-primary"
                >
                  Abrir
                  <ChevronRight className="size-4" />
                </Link>
              ) : null}
            </div>

            {workout ? (
              <dl className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl bg-muted/60 py-2.5">
                  <dt className="text-[0.7rem] text-muted-foreground">Séries</dt>
                  <dd className="font-heading text-lg font-semibold tabular-nums">
                    {workingSets.length}
                  </dd>
                </div>
                <div className="rounded-xl bg-muted/60 py-2.5">
                  <dt className="text-[0.7rem] text-muted-foreground">Reps</dt>
                  <dd className="font-heading text-lg font-semibold tabular-nums">
                    {workingSets.reduce((total, set) => total + set.reps, 0)}
                  </dd>
                </div>
                <div className="rounded-xl bg-muted/60 py-2.5">
                  <dt className="text-[0.7rem] text-muted-foreground">Volume</dt>
                  <dd className="font-heading text-lg font-semibold tabular-nums">
                    {Math.round(volume).toLocaleString("pt-BR")}
                    <span className="text-xs font-normal text-muted-foreground">
                      {" "}
                      kg
                    </span>
                  </dd>
                </div>
              </dl>
            ) : (
              <Button
                size="lg"
                className="h-12 w-full rounded-xl"
                nativeButton={false}
                render={<Link href="/treino" />}
              >
                <Plus className="size-4" />
                Iniciar treino
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  )
}
