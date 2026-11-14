"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Camera, Images, LoaderCircle, Plus, X } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { Card, CardContent } from "@workspace/ui/components/card"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { cn } from "@workspace/ui/lib/utils"
import {
  savePhotoMeal,
  type PhotoMealInput,
} from "@/app/(app)/dieta/foto/actions"
import {
  foodNutrition,
  matchingFoods,
  type CatalogFood,
  type Nutrition,
} from "@/lib/food-catalog"
import type { MealType } from "@/lib/supabase/types"

const MEAL_LABELS: Record<MealType, string> = {
  breakfast: "Café",
  lunch: "Almoço",
  dinner: "Jantar",
  snack: "Lanche",
}
const MEAL_TYPES = Object.keys(MEAL_LABELS) as MealType[]

type DraftItem = {
  localId: string
  name: string
  preparation: string
  quantityG: string
  foodCatalogId: string | null
  suggestions: string[]
  search: string
  uncertain: boolean
  calories: string
  proteinG: string
  carbG: string
  fatG: string
}

type AnalysisResponse = {
  catalog: CatalogFood[]
  items: {
    name: string
    preparation: string
    quantity_g: number
    uncertain: boolean
    food_catalog_id: string | null
    suggestions: string[]
  }[]
}

function emptyItem(): DraftItem {
  return {
    localId: crypto.randomUUID(),
    name: "",
    preparation: "",
    quantityG: "100",
    foodCatalogId: null,
    suggestions: [],
    search: "",
    uncertain: true,
    calories: "",
    proteinG: "",
    carbG: "",
    fatG: "",
  }
}

function nutritionFor(
  item: DraftItem,
  selected: CatalogFood | undefined
): Nutrition {
  if (selected) return foodNutrition(selected, Number(item.quantityG) || 0)
  return {
    calories: Number(item.calories) || 0,
    protein_g: Number(item.proteinG) || 0,
    carb_g: Number(item.carbG) || 0,
    fat_g: Number(item.fatG) || 0,
  }
}

async function reducePhoto(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  try {
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement("canvas")
    canvas.width = Math.max(1, Math.round(bitmap.width * scale))
    canvas.height = Math.max(1, Math.round(bitmap.height * scale))
    const context = canvas.getContext("2d")
    if (!context) throw new Error("Canvas unavailable")
    context.fillStyle = "#fff"
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.82)
    )
    if (!blob) throw new Error("Image conversion failed")
    return blob
  } finally {
    bitmap.close()
  }
}

export function PhotoMealReview({
  defaultMealType,
}: {
  defaultMealType: MealType
}) {
  const router = useRouter()
  const cameraInputRef = React.useRef<HTMLInputElement>(null)
  const galleryInputRef = React.useRef<HTMLInputElement>(null)
  const [mealType, setMealType] = React.useState(defaultMealType)
  const [file, setFile] = React.useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null)
  const [catalog, setCatalog] = React.useState<CatalogFood[]>([])
  const [items, setItems] = React.useState<DraftItem[]>([])
  const [requestId, setRequestId] = React.useState<string | null>(null)
  const [analyzing, setAnalyzing] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  const byId = React.useMemo(
    () => new Map(catalog.map((food) => [food.id, food])),
    [catalog]
  )
  const totals = items.reduce(
    (total, item) => {
      const value = nutritionFor(
        item,
        item.foodCatalogId ? byId.get(item.foodCatalogId) : undefined
      )
      return {
        calories: total.calories + value.calories,
        protein_g: total.protein_g + value.protein_g,
        carb_g: total.carb_g + value.carb_g,
        fat_g: total.fat_g + value.fat_g,
      }
    },
    { calories: 0, protein_g: 0, carb_g: 0, fat_g: 0 }
  )

  function updateItem(localId: string, change: Partial<DraftItem>) {
    setItems((current) =>
      current.map((item) =>
        item.localId === localId ? { ...item, ...change } : item
      )
    )
  }

  function choosePhoto(event: React.ChangeEvent<HTMLInputElement>) {
    const chosen = event.target.files?.[0] ?? null
    event.target.value = ""
    setFile(chosen)
    setPreviewUrl(chosen ? URL.createObjectURL(chosen) : null)
    setCatalog([])
    setItems([])
    setRequestId(null)
    setError(null)
  }

  async function analyze() {
    if (!file || analyzing) return
    setAnalyzing(true)
    setError(null)
    setItems([])
    setRequestId(null)
    try {
      const reduced = await reducePhoto(file)
      if (reduced.size > 4 * 1024 * 1024) {
        setError("A foto ficou grande demais. Escolha outra imagem.")
        return
      }
      const form = new FormData()
      form.append("photo", reduced, "refeicao.jpg")
      const response = await fetch("/api/meal-photo/analyze", {
        method: "POST",
        body: form,
      })
      const payload = await response.json()
      if (!response.ok) {
        setError(payload.error ?? "Não foi possível analisar a foto.")
        return
      }
      const result = payload as AnalysisResponse
      setCatalog(result.catalog)
      setItems(
        result.items.map((item) => ({
          localId: crypto.randomUUID(),
          name: item.name,
          preparation: item.preparation,
          quantityG: String(Math.round(item.quantity_g)),
          foodCatalogId: item.food_catalog_id,
          suggestions: item.suggestions,
          search: "",
          uncertain: item.uncertain,
          calories: "",
          proteinG: "",
          carbG: "",
          fatG: "",
        }))
      )
      setRequestId(crypto.randomUUID())
    } catch {
      setError("Não consegui processar esta imagem. Tente outra foto.")
    } finally {
      setAnalyzing(false)
    }
  }

  async function save() {
    if (!requestId || saving || items.length === 0) return
    setError(null)
    const incomplete = items.some(
      (item) =>
        !Number.isFinite(Number(item.quantityG)) ||
        Number(item.quantityG) < 1 ||
        (!item.foodCatalogId &&
          (!item.name.trim() ||
            [item.calories, item.proteinG, item.carbG, item.fatG].some(
              (value) => value.trim() === ""
            )))
    )
    if (incomplete) {
      setError(
        "Preencha porção, alimento e nutrientes dos itens sem correspondência no catálogo."
      )
      return
    }

    const payload: PhotoMealInput = {
      request_id: requestId,
      meal_type: mealType,
      items: items.map((item) => ({
        food_catalog_id: item.foodCatalogId,
        name: item.name,
        quantity_g: Number(item.quantityG),
        calories: Number(item.calories) || 0,
        protein_g: Number(item.proteinG) || 0,
        carb_g: Number(item.carbG) || 0,
        fat_g: Number(item.fatG) || 0,
      })),
    }
    setSaving(true)
    try {
      const result = await savePhotoMeal(payload)
      if (!result.ok) {
        setError(result.error)
        return
      }
      router.push("/dieta")
      router.refresh()
    } catch {
      setError("Não foi possível salvar. Tente novamente.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <Camera className="size-4 text-primary" />
            <p className="text-sm font-medium">Adicionar foto</p>
          </div>
          <p className="text-sm text-muted-foreground">
            A foto será enviada temporariamente para análise por IA. O Overload
            não guarda a imagem. As porções são estimativas.
          </p>
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={choosePhoto}
            className="sr-only"
            tabIndex={-1}
          />
          <input
            ref={galleryInputRef}
            type="file"
            accept="image/*"
            onChange={choosePhoto}
            className="sr-only"
            tabIndex={-1}
          />
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              disabled={analyzing || saving}
              className="h-12 rounded-xl"
            >
              <Camera className="size-4" />
              Tirar foto
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => galleryInputRef.current?.click()}
              disabled={analyzing || saving}
              className="h-12 rounded-xl"
            >
              <Images className="size-4" />
              Galeria
            </Button>
          </div>
          {previewUrl ? (
            // Browser-generated blob URL; no photo is stored by the app.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt="Foto escolhida da refeição"
              className="max-h-64 w-full rounded-xl object-contain"
            />
          ) : null}
          <Button
            type="button"
            onClick={analyze}
            disabled={!file || analyzing || saving}
            className="h-12 w-full rounded-xl"
          >
            {analyzing ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <Camera className="size-4" />
            )}
            {analyzing ? "Analisando foto..." : "Analisar foto"}
          </Button>
        </CardContent>
      </Card>

      {items.length > 0 ? (
        <>
          <Card>
            <CardContent className="space-y-3">
              <p className="font-heading text-sm font-semibold">
                Refeição de hoje
              </p>
              <div className="flex gap-2">
                {MEAL_TYPES.map((type) => (
                  <button
                    key={type}
                    type="button"
                    aria-pressed={mealType === type}
                    onClick={() => setMealType(type)}
                    className={cn(
                      "flex-1 rounded-xl py-2 text-xs font-medium",
                      mealType === type
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {MEAL_LABELS[type]}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {items.map((item, index) => {
            const selected = item.foodCatalogId
              ? byId.get(item.foodCatalogId)
              : undefined
            const nutrition = nutritionFor(item, selected)
            const suggestions = item.search
              ? matchingFoods(catalog, item.search)
              : item.suggestions
                  .map((id) => byId.get(id))
                  .filter((food): food is CatalogFood => Boolean(food))
            return (
              <Card key={item.localId}>
                <CardContent className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-heading text-sm font-semibold">
                        Alimento {index + 1}
                      </p>
                      {item.uncertain ? (
                        <p className="text-xs text-muted-foreground">
                          Identificação ou porção incerta; confira.
                        </p>
                      ) : null}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Remover alimento ${index + 1}`}
                      onClick={() =>
                        setItems((current) =>
                          current.filter(
                            (entry) => entry.localId !== item.localId
                          )
                        )
                      }
                    >
                      <X className="size-4" />
                    </Button>
                  </div>

                  {selected ? (
                    <div className="rounded-xl bg-muted px-3 py-2 text-sm">
                      <p className="font-medium">{selected.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Fonte: TACO, NEPA/Unicamp
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <Label htmlFor={`food-name-${item.localId}`}>
                        Alimento identificado
                      </Label>
                      <Input
                        id={`food-name-${item.localId}`}
                        value={item.name}
                        maxLength={80}
                        onChange={(event) =>
                          updateItem(item.localId, { name: event.target.value })
                        }
                      />
                      {item.preparation ? (
                        <p className="text-xs text-muted-foreground">
                          Preparo sugerido: {item.preparation}
                        </p>
                      ) : null}
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <Label htmlFor={`food-search-${item.localId}`}>
                      Buscar na tabela nutricional
                    </Label>
                    <Input
                      id={`food-search-${item.localId}`}
                      value={item.search}
                      placeholder="Ex.: arroz cozido, frango grelhado"
                      onChange={(event) =>
                        updateItem(item.localId, { search: event.target.value })
                      }
                    />
                    {suggestions.length > 0 ? (
                      <div className="max-h-40 overflow-y-auto rounded-xl border border-border">
                        {suggestions.map((food) => (
                          <button
                            key={food.id}
                            type="button"
                            className="block w-full border-b border-border px-3 py-2 text-left text-sm last:border-0 hover:bg-muted"
                            onClick={() =>
                              updateItem(item.localId, {
                                foodCatalogId: food.id,
                                name: food.name,
                                search: "",
                                suggestions: [],
                              })
                            }
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
                          const current = foodNutrition(
                            selected,
                            Number(item.quantityG) || 0
                          )
                          updateItem(item.localId, {
                            foodCatalogId: null,
                            name: selected.name,
                            calories: String(current.calories),
                            proteinG: String(current.protein_g),
                            carbG: String(current.carb_g),
                            fatG: String(current.fat_g),
                          })
                        }}
                      >
                        Preencher nutrientes manualmente
                      </button>
                    ) : null}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor={`quantity-${item.localId}`}>
                      Porção estimada (g)
                    </Label>
                    <Input
                      id={`quantity-${item.localId}`}
                      type="number"
                      min="1"
                      max="3000"
                      step="1"
                      inputMode="decimal"
                      value={item.quantityG}
                      onChange={(event) =>
                        updateItem(item.localId, {
                          quantityG: event.target.value,
                        })
                      }
                    />
                  </div>

                  {!selected ? (
                    <div>
                      <p className="mb-2 text-xs text-muted-foreground">
                        Sem correspondência no catálogo: informe os nutrientes
                        desta porção.
                      </p>
                      <div className="grid grid-cols-4 gap-2">
                        {(
                          [
                            ["calories", "kcal"],
                            ["proteinG", "Prot."],
                            ["carbG", "Carb."],
                            ["fatG", "Gord."],
                          ] as const
                        ).map(([key, label]) => (
                          <div key={key} className="space-y-1">
                            <Label
                              htmlFor={`${key}-${item.localId}`}
                              className="text-xs"
                            >
                              {label}
                            </Label>
                            <Input
                              id={`${key}-${item.localId}`}
                              type="number"
                              min="0"
                              step="0.1"
                              inputMode="decimal"
                              value={item[key]}
                              onChange={(event) =>
                                updateItem(item.localId, {
                                  [key]: event.target.value,
                                })
                              }
                              className="px-1 text-center"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  <p className="text-sm tabular-nums">
                    {Math.round(nutrition.calories)} kcal · P{" "}
                    {nutrition.protein_g.toFixed(1)} g · C{" "}
                    {nutrition.carb_g.toFixed(1)} g · G{" "}
                    {nutrition.fat_g.toFixed(1)} g
                  </p>
                </CardContent>
              </Card>
            )
          })}

          {items.length < 12 ? (
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => setItems((current) => [...current, emptyItem()])}
            >
              <Plus className="size-4" /> Adicionar alimento ausente
            </Button>
          ) : null}

          <Card>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm font-semibold">
                <span>Total estimado</span>
                <span>{Math.round(totals.calories)} kcal</span>
              </div>
              <p className="text-xs text-muted-foreground tabular-nums">
                Proteína {totals.protein_g.toFixed(1)} g · Carboidrato{" "}
                {totals.carb_g.toFixed(1)} g · Gordura {totals.fat_g.toFixed(1)}{" "}
                g
              </p>
              <Button
                type="button"
                disabled={saving || analyzing}
                onClick={save}
                className="h-12 w-full rounded-xl"
              >
                {saving ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : null}
                {saving ? "Salvando..." : "Confirmar refeição"}
              </Button>
            </CardContent>
          </Card>
        </>
      ) : null}

      {error ? (
        <div
          role="alert"
          className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive"
        >
          <p>{error}</p>
          <Link href="/dieta" className="mt-1 inline-block underline">
            Cadastrar manualmente
          </Link>
        </div>
      ) : null}
    </div>
  )
}
