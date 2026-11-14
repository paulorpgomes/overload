"use client"

import * as React from "react"
import { useActionState } from "react"
import { LoaderCircle, Plus } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { Card, CardContent } from "@workspace/ui/components/card"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { cn } from "@workspace/ui/lib/utils"
import { addMealItem, type MealItemFormState } from "@/app/(app)/dieta/actions"
import type { MealType } from "@/lib/supabase/types"

const MEAL_LABELS: Record<MealType, string> = {
  breakfast: "Café",
  lunch: "Almoço",
  dinner: "Jantar",
  snack: "Lanche",
}

const MEAL_TYPES = Object.keys(MEAL_LABELS) as MealType[]

export function MealItemForm({
  defaultMealType,
}: {
  defaultMealType: MealType
}) {
  const [mealType, setMealType] = React.useState<MealType>(defaultMealType)

  const [state, formAction, pending] = useActionState<
    MealItemFormState,
    FormData
  >(addMealItem, {})

  // Remounting the form on each successful save clears the uncontrolled
  // inputs back to their defaults — no effect, no manual reset() call.
  const formKey = state.savedAt ?? 0

  return (
    <Card>
      <CardContent>
        <form key={formKey} action={formAction} className="space-y-4">
          <input type="hidden" name="meal_type" value={mealType} />

          <div className="flex gap-2">
            {MEAL_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                aria-pressed={type === mealType}
                onClick={() => setMealType(type)}
                className={cn(
                  "flex-1 rounded-xl py-2 text-xs font-medium transition-colors",
                  type === mealType
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {MEAL_LABELS[type]}
              </button>
            ))}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="meal-name">Alimento</Label>
            <Input
              id="meal-name"
              name="name"
              placeholder="Ex.: Frango grelhado 150 g"
              required
              maxLength={80}
              className="h-12 rounded-xl text-base"
            />
          </div>

          <div className="grid grid-cols-4 gap-2">
            {[
              { name: "calories", label: "kcal", step: "1" },
              { name: "protein_g", label: "Prot.", step: "0.1" },
              { name: "carb_g", label: "Carb.", step: "0.1" },
              { name: "fat_g", label: "Gord.", step: "0.1" },
            ].map((field) => (
              <div key={field.name} className="space-y-1.5">
                <Label
                  htmlFor={`meal-${field.name}`}
                  className="justify-center text-xs text-muted-foreground"
                >
                  {field.label}
                </Label>
                <Input
                  id={`meal-${field.name}`}
                  name={field.name}
                  type="number"
                  inputMode="decimal"
                  step={field.step}
                  min="0"
                  defaultValue="0"
                  required
                  className="no-spinner h-12 rounded-xl px-1 text-center text-base font-semibold"
                />
              </div>
            ))}
          </div>

          {state.error ? (
            <p role="alert" className="text-xs text-destructive">
              {state.error}
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
              <Plus className="size-4" />
            )}
            Adicionar alimento
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
