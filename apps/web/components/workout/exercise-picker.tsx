"use client"

import * as React from "react"
import Link from "next/link"
import { ChevronRight, Search } from "lucide-react"

import { Input } from "@workspace/ui/components/input"
import { cn } from "@workspace/ui/lib/utils"
import type { ExerciseCategory } from "@/lib/supabase/types"

type PickerExercise = {
  id: string
  name: string
  category: ExerciseCategory
  equipment: string | null
}

const CATEGORY_LABELS: Record<ExerciseCategory, string> = {
  chest: "Peito",
  back: "Costas",
  legs: "Pernas",
  shoulders: "Ombros",
  arms: "Braços",
  core: "Core",
  cardio: "Cardio",
  full_body: "Corpo todo",
}

const CATEGORIES = Object.keys(CATEGORY_LABELS) as ExerciseCategory[]

/**
 * Covers every equipment value in the catalog — no catch-all bucket. Custom
 * exercises use free text, so an unmapped value shows raw rather than
 * disappearing behind a vague label.
 */
const EQUIPMENT_LABELS: Record<string, string> = {
  barbell: "Barra",
  dumbbell: "Halteres",
  cable: "Cabo",
  machine: "Máquina",
  bodyweight: "Peso corporal",
  kettlebell: "Kettlebell",
  rope: "Corda",
}

function equipmentLabel(value: string | null): string | null {
  if (!value) return null
  return EQUIPMENT_LABELS[value] ?? value
}

/** Strips accents so "triceps" matches "Tríceps". */
function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
}

export function ExercisePicker({
  workoutId,
  exercises,
}: {
  workoutId: string
  exercises: PickerExercise[]
}) {
  const [query, setQuery] = React.useState("")
  const [category, setCategory] = React.useState<ExerciseCategory | null>(null)

  const filtered = React.useMemo(() => {
    const needle = normalize(query.trim())

    return exercises.filter((exercise) => {
      if (category && exercise.category !== category) return false
      if (!needle) return true
      return normalize(exercise.name).includes(needle)
    })
  }, [exercises, query, category])

  return (
    <div className="space-y-4 px-5 py-3">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar exercício"
          aria-label="Buscar exercício"
          className="h-12 rounded-2xl pl-9 text-base"
        />
      </div>

      {/* Wraps instead of scrolling: nine short chips fit in three rows, so
          every category is visible without dragging. */}
      <div
        role="group"
        aria-label="Filtrar por categoria"
        className="flex flex-wrap gap-2"
      >
        <button
          type="button"
          onClick={() => setCategory(null)}
          aria-pressed={category === null}
          className={cn(
            "rounded-full px-3.5 py-2 text-sm font-medium transition-colors",
            category === null
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground"
          )}
        >
          Todos
        </button>
        {CATEGORIES.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setCategory(option === category ? null : option)}
            aria-pressed={option === category}
            className={cn(
              "rounded-full px-3.5 py-2 text-sm font-medium transition-colors",
              option === category
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground"
            )}
          >
            {CATEGORY_LABELS[option]}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          Nenhum exercício encontrado.
        </p>
      ) : (
        <ul className="divide-y divide-border/60 overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/10">
          {filtered.map((exercise) => (
            <li key={exercise.id}>
              <Link
                href={`/treino/${workoutId}?exercicio=${exercise.id}`}
                className="flex items-center gap-3 px-4 py-3.5 transition-colors active:bg-muted"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {exercise.name}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {CATEGORY_LABELS[exercise.category]}
                    {equipmentLabel(exercise.equipment)
                      ? ` · ${equipmentLabel(exercise.equipment)}`
                      : ""}
                  </p>
                </div>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
