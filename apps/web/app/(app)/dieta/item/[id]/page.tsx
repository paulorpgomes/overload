import { notFound } from "next/navigation"

import { requireProfile } from "@/lib/auth"
import { ScreenHeader } from "@/components/shell/screen-header"
import { MealItemEditor } from "@/components/diet/meal-item-editor"
import type { CatalogFood } from "@/lib/food-catalog"
import type { MealItem } from "@/lib/supabase/types"

export default async function EditMealItemPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { supabase } = await requireProfile()
  const { data: item } = await supabase
    .from("meal_items")
    .select("*")
    .eq("id", id)
    .maybeSingle()

  if (!item) notFound()

  const { data: catalog } = await supabase
    .from("food_catalog")
    .select(
      "id, source_code, name, synonyms, calories_per_100g, protein_per_100g, carb_per_100g, fat_per_100g"
    )
    .order("name")
    .returns<CatalogFood[]>()

  return (
    <>
      <ScreenHeader
        title="Corrigir alimento"
        subtitle="Ajuste a porção ou os nutrientes"
        backHref="/dieta"
      />
      <div className="px-5 py-3">
        <MealItemEditor item={item as MealItem} catalog={catalog ?? []} />
      </div>
    </>
  )
}
