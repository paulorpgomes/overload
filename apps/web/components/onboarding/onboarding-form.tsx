"use client"

import * as React from "react"
import { useActionState } from "react"
import {
  Dumbbell,
  Flame,
  LoaderCircle,
  Scale,
  Trophy,
  type LucideIcon,
} from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { cn } from "@workspace/ui/lib/utils"
import {
  completeOnboarding,
  type OnboardingState,
} from "@/app/onboarding/actions"
import { GOAL_DESCRIPTIONS, GOAL_LABELS } from "@/lib/nutrition"
import type { Goal } from "@/lib/supabase/types"

const GOAL_ICONS: Record<Goal, LucideIcon> = {
  lose_fat: Flame,
  gain_muscle: Dumbbell,
  maintain: Scale,
  performance: Trophy,
}

const GOALS = Object.keys(GOAL_LABELS) as Goal[]

function FieldError({ messages }: { messages?: string[] }) {
  if (!messages?.length) return null
  return (
    <p role="alert" className="text-xs text-destructive">
      {messages[0]}
    </p>
  )
}

export function OnboardingForm({ defaultName }: { defaultName: string }) {
  const [state, formAction, pending] = useActionState<
    OnboardingState,
    FormData
  >(completeOnboarding, {})

  const [goal, setGoal] = React.useState<Goal>("gain_muscle")

  return (
    <form action={formAction} className="space-y-8">
      <div className="space-y-2">
        <Label htmlFor="full_name">Como podemos te chamar?</Label>
        <Input
          id="full_name"
          name="full_name"
          defaultValue={defaultName}
          placeholder="Seu nome"
          autoComplete="name"
          required
          className="h-14 rounded-2xl px-4 text-base"
        />
        <FieldError messages={state.errors?.full_name} />
      </div>

      <fieldset className="space-y-3">
        <legend className="mb-3 text-sm leading-none font-medium">
          Qual é o seu objetivo?
        </legend>
        <div className="grid grid-cols-2 gap-3">
          {GOALS.map((option) => {
            const Icon = GOAL_ICONS[option]
            const selected = goal === option

            return (
              <label
                key={option}
                className={cn(
                  "flex cursor-pointer flex-col gap-2 rounded-2xl border-2 p-4 transition-colors",
                  selected
                    ? "border-primary bg-primary/5"
                    : "border-border bg-card hover:bg-muted/50"
                )}
              >
                <input
                  type="radio"
                  name="goal"
                  value={option}
                  checked={selected}
                  onChange={() => setGoal(option)}
                  className="sr-only"
                />
                <Icon
                  className={cn(
                    "size-6",
                    selected ? "text-primary" : "text-muted-foreground"
                  )}
                />
                <span className="text-sm leading-tight font-medium">
                  {GOAL_LABELS[option]}
                </span>
                <span className="text-xs leading-snug text-muted-foreground">
                  {GOAL_DESCRIPTIONS[option]}
                </span>
              </label>
            )
          })}
        </div>
        <FieldError messages={state.errors?.goal} />
      </fieldset>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="weight_kg">Peso (kg)</Label>
          <Input
            id="weight_kg"
            name="weight_kg"
            type="number"
            inputMode="decimal"
            step="0.1"
            min="30"
            max="300"
            placeholder="75"
            required
            className="no-spinner h-14 rounded-2xl px-4 text-center text-xl font-semibold"
          />
          <FieldError messages={state.errors?.weight_kg} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="height_cm">Altura (cm)</Label>
          <Input
            id="height_cm"
            name="height_cm"
            type="number"
            inputMode="numeric"
            step="1"
            min="100"
            max="250"
            placeholder="178"
            required
            className="no-spinner h-14 rounded-2xl px-4 text-center text-xl font-semibold"
          />
          <FieldError messages={state.errors?.height_cm} />
        </div>
      </div>

      {state.message ? (
        <p role="alert" className="text-sm text-destructive">
          {state.message}
        </p>
      ) : null}

      <Button
        type="submit"
        size="lg"
        disabled={pending}
        className="h-14 w-full rounded-2xl text-base"
      >
        {pending ? <LoaderCircle className="size-5 animate-spin" /> : null}
        Começar a treinar
      </Button>

      <p className="text-center text-xs text-muted-foreground">
        Calculamos suas metas de calorias e macros a partir disso. Você pode
        ajustar depois.
      </p>
    </form>
  )
}
