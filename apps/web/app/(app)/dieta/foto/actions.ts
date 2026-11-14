"use server"

import { revalidatePath } from "next/cache"
import * as z from "zod"

import { requireUser } from "@/lib/auth"
import { toISODate } from "@/lib/dates"

const itemSchema = z.object({
  food_catalog_id: z.uuid().nullable(),
  name: z.string().trim().min(1).max(80),
  quantity_g: z.number().min(1).max(3000),
  calories: z.number().min(0).max(10000),
  protein_g: z.number().min(0).max(1000),
  carb_g: z.number().min(0).max(1000),
  fat_g: z.number().min(0).max(1000),
})

const submissionSchema = z.object({
  request_id: z.uuid(),
  meal_type: z.enum(["breakfast", "lunch", "dinner", "snack"]),
  items: z.array(itemSchema).min(1).max(12),
})

export type PhotoMealInput = z.infer<typeof submissionSchema>
export type SavePhotoMealResult =
  | { ok: true; mealId: string }
  | { ok: false; error: string }

export async function savePhotoMeal(
  input: PhotoMealInput
): Promise<SavePhotoMealResult> {
  const parsed = submissionSchema.safeParse(input)
  if (!parsed.success) {
    return {
      ok: false,
      error: "Revise os alimentos e as porções antes de salvar.",
    }
  }

  const { supabase } = await requireUser()
  const { data: mealId, error } = await supabase.rpc("save_photo_meal", {
    p_request_id: parsed.data.request_id,
    p_eaten_on: toISODate(),
    p_meal_type: parsed.data.meal_type,
    p_items: parsed.data.items,
  })

  if (error || !mealId) {
    return {
      ok: false,
      error: "Não foi possível salvar. Confira os itens e tente novamente.",
    }
  }

  revalidatePath("/dieta")
  revalidatePath("/")
  return { ok: true, mealId }
}
