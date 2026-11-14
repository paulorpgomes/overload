"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { LoaderCircle } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { Card, CardContent } from "@workspace/ui/components/card"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import {
  updateMealItem,
  type EditMealItemInput,
} from "@/app/(app)/dieta/actions"
import {
  foodNutrition,
  matchingFoods,
  type CatalogFood,
} from "@/lib/food-catalog"
import type { MealItem } from "@/lib/supabase/types"

export function MealItemEditor({
  item,
  catalog,
}: {
  item: MealItem
  catalog: CatalogFood[]
}) {
  const router = useRouter()
  const [foodId, setFoodId] = React.useState<string | null>(
    item.food_catalog_id
  )
  const [name, setName] = React.useState(item.name)
  const [quantityG, setQuantityG] = React.useState(
    item.quantity_g == null ? "" : String(item.quantity_g)
  )
  const [calories, setCalories] = React.useState(String(item.calories))
  const [proteinG, setProteinG] = React.useState(String(item.protein_g))
  const [carbG, setCarbG] = React.useState(String(item.carb_g))
  const [fatG, setFatG] = React.useState(String(item.fat_g))
  const [search, setSearch] = React.useState("")
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const selected = catalog.find((food) => food.id === foodId)
  const suggestions = matchingFoods(catalog, search)
  const nutrition =
    selected && quantityG
      ? foodNutrition(selected, Number(quantityG) || 0)
      : null

  async function save() {
    setError(null)
    if (foodId && (!quantityG || Number(quantityG) < 1)) {
      setError("Informe a porção em gramas para calcular os nutrientes.")
      return
    }
    if (
      !foodId &&
      (!name.trim() ||
        [calories, proteinG, carbG, fatG].some((value) => value.trim() === ""))
    ) {
      setError("Preencha o alimento e seus nutrientes.")
      return
    }

    const payload: EditMealItemInput = {
      item_id: item.id,
      food_catalog_id: foodId,
      name,
      quantity_g: quantityG ? Number(quantityG) : null,
      calories: Number(calories) || 0,
      protein_g: Number(proteinG) || 0,
      carb_g: Number(carbG) || 0,
      fat_g: Number(fatG) || 0,
    }
    setSaving(true)
    try {
      const result = await updateMealItem(payload)
      if (!result.ok) {
        setError(result.error)
        return
      }
      router.push("/dieta")
      router.refresh()
    } catch {
      setError("Não foi possível salvar a correção.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardContent className="space-y-4">
        {selected ? (
          <div className="rounded-xl bg-muted px-3 py-2 text-sm">
            <p className="font-medium">{selected.name}</p>
            <p className="text-xs text-muted-foreground">
              Fonte: TACO, NEPA/Unicamp
            </p>
          </div>
        ) : (
          <div className="space-y-1.5">
            <Label htmlFor="edit-food-name">Alimento</Label>
            <Input
              id="edit-food-name"
              value={name}
              maxLength={80}
              onChange={(event) => setName(event.target.value)}
            />
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="edit-food-search">Buscar na tabela nutricional</Label>
          <Input
            id="edit-food-search"
            value={search}
            placeholder="Ex.: arroz cozido"
            onChange={(event) => setSearch(event.target.value)}
          />
          {suggestions.length > 0 ? (
            <div className="max-h-48 overflow-y-auto rounded-xl border border-border">
              {suggestions.map((food) => (
                <button
                  key={food.id}
                  type="button"
                  className="block w-full border-b border-border px-3 py-2 text-left text-sm last:border-0 hover:bg-muted"
                  onClick={() => {
                    setFoodId(food.id)
                    setName(food.name)
                    setSearch("")
                  }}
                >
                  {food.name}
                </button>
              ))}
            </div>
          ) : null}
          {selected ? (
            <button
              type="button"
              className="text-xs text-primary underline"
              onClick={() => {
                if (nutrition) {
                  setCalories(String(nutrition.calories))
                  setProteinG(String(nutrition.protein_g))
                  setCarbG(String(nutrition.carb_g))
                  setFatG(String(nutrition.fat_g))
                }
                setFoodId(null)
              }}
            >
              Preencher nutrientes manualmente
            </button>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="edit-food-quantity">
            Porção (g){selected ? " *" : ""}
          </Label>
          <Input
            id="edit-food-quantity"
            type="number"
            min="1"
            max="3000"
            step="1"
            inputMode="decimal"
            value={quantityG}
            onChange={(event) => setQuantityG(event.target.value)}
          />
        </div>

        {selected ? (
          <p className="text-sm tabular-nums">
            {nutrition?.calories.toFixed(1) ?? "0.0"} kcal · P{" "}
            {nutrition?.protein_g.toFixed(1) ?? "0.0"} g · C{" "}
            {nutrition?.carb_g.toFixed(1) ?? "0.0"} g · G{" "}
            {nutrition?.fat_g.toFixed(1) ?? "0.0"} g
          </p>
        ) : (
          <div className="grid grid-cols-4 gap-2">
            {(
              [
                ["kcal", calories, setCalories],
                ["Prot.", proteinG, setProteinG],
                ["Carb.", carbG, setCarbG],
                ["Gord.", fatG, setFatG],
              ] as const
            ).map(([label, value, setValue]) => (
              <div key={label} className="space-y-1">
                <Label htmlFor={`edit-${label}`} className="text-xs">
                  {label}
                </Label>
                <Input
                  id={`edit-${label}`}
                  type="number"
                  min="0"
                  step="0.1"
                  inputMode="decimal"
                  value={value}
                  onChange={(event) => setValue(event.target.value)}
                  className="px-1 text-center"
                />
              </div>
            ))}
          </div>
        )}

        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <Button
          type="button"
          onClick={save}
          disabled={saving}
          className="h-12 w-full rounded-xl"
        >
          {saving ? <LoaderCircle className="size-4 animate-spin" /> : null}
          {saving ? "Salvando..." : "Salvar correção"}
        </Button>
      </CardContent>
    </Card>
  )
}
