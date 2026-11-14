import { requireProfile } from "@/lib/auth"
import { currentMealType } from "@/lib/dates"
import { ScreenHeader } from "@/components/shell/screen-header"
import { PhotoMealReview } from "@/components/diet/photo-meal-review"

export default async function PhotoMealPage() {
  await requireProfile()

  return (
    <>
      <ScreenHeader
        title="Refeição por foto"
        subtitle="Revise a estimativa antes de salvar"
        backHref="/dieta"
      />
      <div className="px-5 py-3">
        <PhotoMealReview defaultMealType={currentMealType()} />
      </div>
    </>
  )
}
