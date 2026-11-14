import type { Goal } from "@/lib/supabase/types"

export const GOAL_LABELS: Record<Goal, string> = {
  lose_fat: "Perder gordura",
  gain_muscle: "Ganhar massa",
  maintain: "Manter peso",
  performance: "Performance",
}

export const GOAL_DESCRIPTIONS: Record<Goal, string> = {
  lose_fat: "Déficit calórico com proteína alta",
  gain_muscle: "Superávit leve para hipertrofia",
  maintain: "Calorias de manutenção",
  performance: "Foco em energia e recuperação",
}

const CALORIE_MULTIPLIER: Record<Goal, number> = {
  lose_fat: 0.8,
  gain_muscle: 1.12,
  maintain: 1,
  performance: 1.08,
}

const PROTEIN_PER_KG: Record<Goal, number> = {
  lose_fat: 2.2,
  gain_muscle: 2,
  maintain: 1.8,
  performance: 2,
}

export type MacroTargets = {
  calorie_target: number
  protein_target_g: number
  carb_target_g: number
  fat_target_g: number
}

/**
 * Rough starting targets from bodyweight and goal — enough to make the
 * dashboard useful on day one. Users can edit them in the profile screen.
 */
export function estimateTargets(weightKg: number, goal: Goal): MacroTargets {
  const maintenance = weightKg * 33
  const calories = Math.round((maintenance * CALORIE_MULTIPLIER[goal]) / 10) * 10

  const protein = Math.round(weightKg * PROTEIN_PER_KG[goal])
  const fat = Math.round((calories * 0.25) / 9)
  const carbCalories = calories - protein * 4 - fat * 9
  const carbs = Math.max(0, Math.round(carbCalories / 4))

  return {
    calorie_target: calories,
    protein_target_g: protein,
    carb_target_g: carbs,
    fat_target_g: fat,
  }
}
