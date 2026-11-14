import Link from "next/link"
import { Camera, Pencil, X } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { Card, CardContent } from "@workspace/ui/components/card"
import { requireProfile } from "@/lib/auth"
import { currentMealType, toISODate } from "@/lib/dates"
import { MealItemForm } from "@/components/diet/meal-item-form"
import { MacroMeter } from "@/components/dashboard/macro-meter"
import { ScreenHeader } from "@/components/shell/screen-header"
import type { MealType } from "@/lib/supabase/types"
import { deleteMealItem } from "./actions"

const MEAL_LABELS: Record<MealType, string> = {
  breakfast: "Café da manhã",
  lunch: "Almoço",
  dinner: "Jantar",
  snack: "Lanche",
}

const MEAL_ORDER: MealType[] = ["breakfast", "lunch", "dinner", "snack"]

type MealRow = {
  id: string
  meal_type: MealType
  meal_items: {
    id: string
    name: string
    calories: number
    protein_g: number
    carb_g: number
    fat_g: number
    quantity_g: number | null
  }[]
}

export default async function DietPage() {
  const { supabase, profile } = await requireProfile()
  const today = toISODate()

  const { data: meals } = await supabase
    .from("meals")
    .select(
      "id, meal_type, meal_items(id, name, quantity_g, calories, protein_g, carb_g, fat_g)"
    )
    .eq("eaten_on", today)
    .returns<MealRow[]>()

  const byType = new Map<MealType, MealRow>()
  for (const meal of meals ?? []) {
    byType.set(meal.meal_type, meal)
  }

  const allItems = (meals ?? []).flatMap((meal) => meal.meal_items ?? [])
  const totals = allItems.reduce(
    (acc, item) => ({
      calories: acc.calories + Number(item.calories),
      protein_g: acc.protein_g + Number(item.protein_g),
      carb_g: acc.carb_g + Number(item.carb_g),
      fat_g: acc.fat_g + Number(item.fat_g),
    }),
    { calories: 0, protein_g: 0, carb_g: 0, fat_g: 0 }
  )

  return (
    <>
      <ScreenHeader title="Dieta" subtitle="Refeições de hoje" backHref="/" />

      <div className="space-y-4 px-5 py-3">
        <Card>
          <CardContent className="space-y-3">
            <div className="flex items-baseline justify-between">
              <p className="text-sm font-medium">Total do dia</p>
              <p className="font-heading text-xl font-semibold tabular-nums">
                {Math.round(totals.calories)}
                <span className="ml-1 text-xs font-normal text-muted-foreground">
                  {profile.calorie_target
                    ? `/ ${profile.calorie_target} kcal`
                    : "kcal"}
                </span>
              </p>
            </div>
            <MacroMeter
              macro="protein"
              label="Proteína"
              consumed={totals.protein_g}
              target={profile.protein_target_g}
            />
            <MacroMeter
              macro="carb"
              label="Carboidrato"
              consumed={totals.carb_g}
              target={profile.carb_target_g}
            />
            <MacroMeter
              macro="fat"
              label="Gordura"
              consumed={totals.fat_g}
              target={profile.fat_target_g}
            />
          </CardContent>
        </Card>

        <Button
          nativeButton={false}
          render={<Link href="/dieta/foto" />}
          className="h-12 w-full rounded-xl"
        >
          <Camera className="size-4" />
          Fotografar refeição
        </Button>

        <MealItemForm defaultMealType={currentMealType()} />

        {MEAL_ORDER.map((type) => {
          const meal = byType.get(type)
          const items = meal?.meal_items ?? []
          if (items.length === 0) return null

          const mealCalories = items.reduce(
            (total, item) => total + Number(item.calories),
            0
          )

          return (
            <Card key={type} size="sm">
              <CardContent className="space-y-2">
                <div className="flex items-baseline justify-between">
                  <h2 className="font-heading text-sm font-semibold">
                    {MEAL_LABELS[type]}
                  </h2>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {Math.round(mealCalories)} kcal
                  </span>
                </div>
                <ul className="divide-y divide-border/60">
                  {items.map((item) => (
                    <li key={item.id} className="flex items-center gap-2 py-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm">{item.name}</p>
                        <p className="text-xs text-muted-foreground tabular-nums">
                          {item.quantity_g
                            ? `${Math.round(Number(item.quantity_g))} g · `
                            : ""}
                          {Math.round(Number(item.calories))} kcal · P{" "}
                          {Math.round(Number(item.protein_g))}g · C{" "}
                          {Math.round(Number(item.carb_g))}g · G{" "}
                          {Math.round(Number(item.fat_g))}g
                        </p>
                      </div>
                      <Button
                        nativeButton={false}
                        render={<Link href={`/dieta/item/${item.id}`} />}
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Corrigir ${item.name}`}
                        className="text-muted-foreground"
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <form action={deleteMealItem}>
                        <input type="hidden" name="item_id" value={item.id} />
                        <Button
                          type="submit"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Remover ${item.name}`}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <X className="size-4" />
                        </Button>
                      </form>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </>
  )
}
