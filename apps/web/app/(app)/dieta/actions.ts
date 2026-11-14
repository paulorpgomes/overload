"use server"

import { revalidatePath } from "next/cache"
import * as z from "zod"

import { requireUser } from "@/lib/auth"
import { toISODate } from "@/lib/dates"
import { foodNutrition } from "@/lib/food-catalog"

const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"] as const

const macro = (label: string) =>
  z.coerce
    .number({ error: `Informe ${label}.` })
    .min(0, { error: `${label} não pode ser negativo.` })
    .max(10000, { error: `${label}: valor muito alto.` })

const MealItemSchema = z.object({
  meal_type: z.enum(MEAL_TYPES, { error: "Escolha a refeição." }),
  name: z
    .string()
    .trim()
    .min(1, { error: "Informe o alimento." })
    .max(80, { error: "Nome muito longo." }),
  calories: macro("as calorias"),
  protein_g: macro("a proteína"),
  carb_g: macro("o carboidrato"),
  fat_g: macro("a gordura"),
})

/** `savedAt` changes on every success so the form resets each time. */
export type MealItemFormState = { error?: string; savedAt?: number }

export async function addMealItem(
  _prev: MealItemFormState,
  formData: FormData
): Promise<MealItemFormState> {
  const { supabase, user } = await requireUser()

  const parsed = MealItemSchema.safeParse({
    meal_type: formData.get("meal_type"),
    name: formData.get("name"),
    calories: formData.get("calories"),
    protein_g: formData.get("protein_g"),
    carb_g: formData.get("carb_g"),
    fat_g: formData.get("fat_g"),
  })

  if (!parsed.success) {
    const fieldErrors = z.flattenError(parsed.error).fieldErrors
    const first = Object.values(fieldErrors).flat()[0]
    return { error: first ?? "Dados inválidos." }
  }

  const { meal_type, ...item } = parsed.data
  const today = toISODate()

  // One meal row per type per day; items accumulate under it.
  const { data: existing } = await supabase
    .from("meals")
    .select("id")
    .eq("eaten_on", today)
    .eq("meal_type", meal_type)
    .maybeSingle()

  let mealId = existing?.id

  if (!mealId) {
    const { data: created, error } = await supabase
      .from("meals")
      .insert({ user_id: user.id, eaten_on: today, meal_type })
      .select("id")
      .single()

    if (error || !created) {
      return { error: "Não foi possível criar a refeição." }
    }
    mealId = created.id
  }

  const { error } = await supabase
    .from("meal_items")
    .insert({ meal_id: mealId, ...item })

  if (error) {
    return { error: "Não foi possível salvar o alimento." }
  }

  revalidatePath("/dieta")
  revalidatePath("/")
  return { savedAt: Date.now() }
}

export async function deleteMealItem(formData: FormData) {
  const { supabase } = await requireUser()

  const itemId = z.uuid().safeParse(formData.get("item_id"))
  if (!itemId.success) return

  await supabase.from("meal_items").delete().eq("id", itemId.data)

  revalidatePath("/dieta")
  revalidatePath("/")
}

const EditMealItemSchema = z.object({
  item_id: z.uuid(),
  food_catalog_id: z.uuid().nullable(),
  name: z.string().trim().min(1).max(80),
  quantity_g: z.number().min(1).max(3000).nullable(),
  calories: z.number().min(0).max(10000),
  protein_g: z.number().min(0).max(1000),
  carb_g: z.number().min(0).max(1000),
  fat_g: z.number().min(0).max(1000),
})

export type EditMealItemInput = z.infer<typeof EditMealItemSchema>
export type EditMealItemResult = { ok: true } | { ok: false; error: string }

export async function updateMealItem(
  input: EditMealItemInput
): Promise<EditMealItemResult> {
  const parsed = EditMealItemSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: "Confira o alimento, a porção e os nutrientes." }
  }
  if (parsed.data.food_catalog_id && !parsed.data.quantity_g) {
    return { ok: false, error: "Confira o alimento, a porção e os nutrientes." }
  }

  const { supabase } = await requireUser()
  const { data: existing } = await supabase
    .from("meal_items")
    .select("id, entry_source")
    .eq("id", parsed.data.item_id)
    .maybeSingle()
  if (!existing) {
    return { ok: false, error: "Alimento não encontrado." }
  }

  let { name, calories, protein_g, carb_g, fat_g } = parsed.data
  if (parsed.data.food_catalog_id) {
    const { data: food } = await supabase
      .from("food_catalog")
      .select(
        "id, source_code, name, synonyms, calories_per_100g, protein_per_100g, carb_per_100g, fat_per_100g"
      )
      .eq("id", parsed.data.food_catalog_id)
      .maybeSingle()
    if (!food)
      return { ok: false, error: "Alimento do catálogo não encontrado." }
    name = food.name.slice(0, 80)
    const nutrition = foodNutrition(food, parsed.data.quantity_g!)
    calories = nutrition.calories
    protein_g = nutrition.protein_g
    carb_g = nutrition.carb_g
    fat_g = nutrition.fat_g
  }

  const fromPhoto = existing.entry_source.startsWith("photo_")
  const { error } = await supabase
    .from("meal_items")
    .update({
      name,
      quantity_g: parsed.data.quantity_g,
      calories,
      protein_g,
      carb_g,
      fat_g,
      food_catalog_id: parsed.data.food_catalog_id,
      entry_source: fromPhoto
        ? parsed.data.food_catalog_id
          ? "photo_catalog"
          : "photo_manual"
        : "manual",
    })
    .eq("id", parsed.data.item_id)

  if (error)
    return { ok: false, error: "Não foi possível atualizar o alimento." }
  revalidatePath("/dieta")
  revalidatePath("/")
  return { ok: true }
}
