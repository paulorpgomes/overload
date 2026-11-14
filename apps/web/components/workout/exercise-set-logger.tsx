"use client"

import * as React from "react"
import { useActionState } from "react"
import { Check, LoaderCircle, Minus, Plus, X } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { cn } from "@workspace/ui/lib/utils"
import { addSet, deleteSet, type SetFormState } from "@/app/(app)/treino/actions"

type LoggedSet = {
  id: string
  set_number: number
  reps: number
  weight_kg: number
}

/** Big stepper input — thumb-sized targets, no keyboard needed for ±1. */
function StepperField({
  label,
  name,
  value,
  onChange,
  step,
  min = 0,
  suffix,
}: {
  label: string
  name: string
  value: string
  onChange: (next: string) => void
  step: number
  min?: number
  suffix?: string
}) {
  function nudge(direction: 1 | -1) {
    const current = Number(value) || 0
    const next = Math.max(min, Math.round((current + direction * step) * 100) / 100)
    onChange(String(next))
  }

  return (
    <div className="flex-1 space-y-1.5">
      <label
        htmlFor={`${name}-input`}
        className="block text-center text-xs font-medium text-muted-foreground"
      >
        {label}
      </label>
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label={`Diminuir ${label}`}
          className="size-11 shrink-0 rounded-xl"
          onClick={() => nudge(-1)}
        >
          <Minus className="size-4" />
        </Button>
        <div className="relative flex-1">
          <Input
            id={`${name}-input`}
            name={name}
            type="number"
            inputMode="decimal"
            step={step}
            min={min}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            required
            className="no-spinner h-11 rounded-xl px-1 text-center text-lg font-semibold"
          />
          {suffix ? (
            <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-[0.7rem] text-muted-foreground">
              {suffix}
            </span>
          ) : null}
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label={`Aumentar ${label}`}
          className="size-11 shrink-0 rounded-xl"
          onClick={() => nudge(1)}
        >
          <Plus className="size-4" />
        </Button>
      </div>
    </div>
  )
}

export function ExerciseSetLogger({
  workoutId,
  exerciseId,
  sets,
}: {
  workoutId: string
  exerciseId: string
  sets: LoggedSet[]
}) {
  const [state, formAction, pending] = useActionState<SetFormState, FormData>(
    addSet,
    {}
  )

  // Prefill from the last logged set — most people repeat weight and reps.
  const lastSet = sets.at(-1)
  const [reps, setReps] = React.useState(String(lastSet?.reps ?? 10))
  const [weight, setWeight] = React.useState(String(lastSet?.weight_kg ?? 20))

  // After a save the server sends back a new set; follow the latest one.
  // Adjusting state during render is the supported pattern here — an effect
  // would re-render a second time after painting the stale values.
  const [syncedSetId, setSyncedSetId] = React.useState(lastSet?.id)
  if (lastSet && lastSet.id !== syncedSetId) {
    setSyncedSetId(lastSet.id)
    setReps(String(lastSet.reps))
    setWeight(String(lastSet.weight_kg))
  }

  return (
    <div className="space-y-3">
      {sets.length > 0 ? (
        <ul className="space-y-1.5">
          {sets.map((set) => (
            <li
              key={set.id}
              className="flex items-center gap-3 rounded-xl bg-muted/60 py-2 pr-1 pl-3"
            >
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-background text-xs font-semibold tabular-nums">
                {set.set_number}
              </span>
              <span className="flex-1 text-sm tabular-nums">
                <span className="font-semibold">{set.reps}</span>
                <span className="text-muted-foreground"> reps × </span>
                <span className="font-semibold">{set.weight_kg}</span>
                <span className="text-muted-foreground"> kg</span>
              </span>
              <form action={deleteSet}>
                <input type="hidden" name="set_id" value={set.id} />
                <input type="hidden" name="workout_id" value={workoutId} />
                <Button
                  type="submit"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Remover série ${set.set_number}`}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <X className="size-4" />
                </Button>
              </form>
            </li>
          ))}
        </ul>
      ) : null}

      <form action={formAction} className="space-y-3">
        <input type="hidden" name="workout_id" value={workoutId} />
        <input type="hidden" name="exercise_id" value={exerciseId} />

        <div className="flex items-end gap-2">
          <StepperField
            label="Repetições"
            name="reps"
            value={reps}
            onChange={setReps}
            step={1}
          />
          <StepperField
            label="Carga"
            name="weight_kg"
            value={weight}
            onChange={setWeight}
            step={2.5}
            suffix="kg"
          />
        </div>

        {state.error ? (
          <p role="alert" className="text-xs text-destructive">
            {state.error}
          </p>
        ) : null}

        <Button
          type="submit"
          disabled={pending}
          className={cn("h-12 w-full rounded-xl text-sm font-semibold")}
        >
          {pending ? (
            <LoaderCircle className="size-4 animate-spin" />
          ) : (
            <Check className="size-4" />
          )}
          Salvar série {sets.length + 1}
        </Button>
      </form>
    </div>
  )
}
