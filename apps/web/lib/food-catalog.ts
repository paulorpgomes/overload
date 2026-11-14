export type CatalogFood = {
  id: string
  source_code: string
  name: string
  synonyms: string[]
  calories_per_100g: number
  protein_per_100g: number
  carb_per_100g: number
  fat_per_100g: number
}

export type Nutrition = {
  calories: number
  protein_g: number
  carb_g: number
  fat_g: number
}

export function normalizeFoodName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
}

export function foodNutrition(food: CatalogFood, quantityG: number): Nutrition {
  const scale = quantityG / 100
  const round = (value: number) => Math.round(value * scale * 10) / 10
  return {
    calories: round(food.calories_per_100g),
    protein_g: round(food.protein_per_100g),
    carb_g: round(food.carb_per_100g),
    fat_g: round(food.fat_per_100g),
  }
}

export function matchingFoods(
  catalog: CatalogFood[],
  query: string,
  limit = 8
): CatalogFood[] {
  const normalized = normalizeFoodName(query)
  if (!normalized) return []
  const words = normalized.split(" ").filter((word) => word.length > 1)

  return catalog
    .map((food) => {
      const names = [food.name, ...food.synonyms].map(normalizeFoodName)
      const score = Math.max(
        ...names.map((name) => {
          if (name === normalized) return 100
          if (name.startsWith(normalized)) return 70
          if (name.includes(normalized)) return 50
          const hits = words.filter((word) => name.includes(word)).length
          return hits === words.length && hits > 0 ? 20 + hits : hits
        })
      )
      return { food, score }
    })
    .filter(({ score }) => score > 0)
    .sort(
      (a, b) =>
        b.score - a.score || a.food.name.localeCompare(b.food.name, "pt-BR")
    )
    .slice(0, limit)
    .map(({ food }) => food)
}
