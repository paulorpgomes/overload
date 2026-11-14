"use client"

import * as React from "react"
import { useActionState } from "react"
import { Check, LoaderCircle, RefreshCw } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { Card, CardContent } from "@workspace/ui/components/card"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { cn } from "@workspace/ui/lib/utils"
import {
  recalculateTargets,
  updateProfile,
  type ProfileFormState,
} from "@/app/(app)/perfil/actions"
import { GOAL_LABELS } from "@/lib/nutrition"
import type { Goal, Profile } from "@/lib/supabase/types"

const GOALS = Object.keys(GOAL_LABELS) as Goal[]

const TARGET_FIELDS = [
  { name: "calorie_target", label: "Calorias (kcal)" },
  { name: "protein_target_g", label: "Proteína (g)" },
  { name: "carb_target_g", label: "Carboidrato (g)" },
  { name: "fat_target_g", label: "Gordura (g)" },
] as const

export function ProfileForm({ profile }: { profile: Profile }) {
  const [goal, setGoal] = React.useState<Goal>(profile.goal ?? "maintain")
  const [weight, setWeight] = React.useState(String(profile.weight_kg ?? 75))

  const [state, formAction, pending] = useActionState<
    ProfileFormState,
    FormData
  >(updateProfile, {})

  return (
    <Card>
      <CardContent className="space-y-5">
        <form action={formAction} className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="full_name">Nome</Label>
            <Input
              id="full_name"
              name="full_name"
              defaultValue={profile.full_name ?? ""}
              required
              maxLength={60}
              className="h-12 rounded-xl text-base"
            />
          </div>

          <fieldset>
            <legend className="mb-2 text-sm leading-none font-medium">
              Objetivo
            </legend>
            <div className="grid grid-cols-2 gap-2">
              {GOALS.map((option) => (
                <label
                  key={option}
                  className={cn(
                    "cursor-pointer rounded-xl px-3 py-2.5 text-center text-xs font-medium transition-colors",
                    goal === option
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  <input
                    type="radio"
                    name="goal"
                    value={option}
                    checked={goal === option}
                    onChange={() => setGoal(option)}
                    className="sr-only"
                  />
                  {GOAL_LABELS[option]}
                </label>
              ))}
            </div>
          </fieldset>

          <div className="space-y-1.5">
            <Label htmlFor="weight_kg">Peso atual (kg)</Label>
            <Input
              id="weight_kg"
              name="weight_kg"
              type="number"
              inputMode="decimal"
              step="0.1"
              min="30"
              max="300"
              value={weight}
              onChange={(event) => setWeight(event.target.value)}
              required
              className="no-spinner h-12 rounded-xl text-base"
            />
          </div>

          <div className="space-y-2">
            <p className="text-sm leading-none font-medium">Metas diárias</p>
            <div className="grid grid-cols-2 gap-3">
              {TARGET_FIELDS.map((field) => (
                <div key={field.name} className="space-y-1.5">
                  <Label
                    htmlFor={field.name}
                    className="text-xs text-muted-foreground"
                  >
                    {field.label}
                  </Label>
                  <Input
                    id={field.name}
                    name={field.name}
                    type="number"
                    inputMode="numeric"
                    step="1"
                    min="0"
                    defaultValue={String(profile[field.name] ?? 0)}
                    required
                    className="no-spinner h-12 rounded-xl text-center text-base font-semibold"
                  />
                </div>
              ))}
            </div>
          </div>

          {state.error ? (
            <p role="alert" className="text-xs text-destructive">
              {state.error}
            </p>
          ) : null}
          {state.ok ? (
            <p role="status" className="text-xs text-primary">
              Perfil atualizado.
            </p>
          ) : null}

          <Button
            type="submit"
            disabled={pending}
            className="h-12 w-full rounded-xl"
          >
            {pending ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <Check className="size-4" />
            )}
            Salvar alterações
          </Button>
        </form>

        {/* Separate form: recalculating overwrites the target inputs above. */}
        <form action={recalculateTargets}>
          <input type="hidden" name="goal" value={goal} />
          <input type="hidden" name="weight_kg" value={weight} />
          <Button
            type="submit"
            variant="ghost"
            size="sm"
            className="w-full text-muted-foreground"
          >
            <RefreshCw className="size-3.5" />
            Recalcular metas pelo peso e objetivo
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
