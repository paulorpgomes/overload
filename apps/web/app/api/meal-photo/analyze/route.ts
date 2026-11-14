import { createClient } from "@/lib/supabase/server"
import { getAnthropic } from "@/lib/ai/client"
import { extractMealPhoto } from "@/lib/ai/extract-meal-photo"
import { matchingFoods, type CatalogFood } from "@/lib/food-catalog"

export const runtime = "nodejs"

const MAX_IMAGE_BYTES = 4 * 1024 * 1024
const MAX_REQUEST_BYTES = 5 * 1024 * 1024

function imageMediaType(
  bytes: Uint8Array
): "image/jpeg" | "image/png" | "image/webp" | null {
  if (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  ) {
    return "image/jpeg"
  }
  if (
    bytes.length >= 8 &&
    [137, 80, 78, 71, 13, 10, 26, 10].every((value, i) => bytes[i] === value)
  ) {
    return "image/png"
  }
  if (
    bytes.length >= 12 &&
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
  ) {
    return "image/webp"
  }
  return null
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin")
  if (origin && origin !== new URL(request.url).origin) {
    return Response.json({ error: "Origem inválida." }, { status: 403 })
  }

  const contentLength = Number(request.headers.get("content-length"))
  if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_BYTES) {
    return Response.json(
      { error: "Foto grande demais. Escolha outra imagem." },
      { status: 413 }
    )
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return Response.json(
      { error: "Entre na conta para analisar a foto." },
      { status: 401 }
    )
  }
  if (!getAnthropic()) {
    return Response.json(
      { error: "Análise de fotos não configurada." },
      { status: 503 }
    )
  }

  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return Response.json(
      { error: "Não foi possível ler a foto." },
      { status: 400 }
    )
  }

  const photo = form.get("photo")
  if (
    !(photo instanceof File) ||
    photo.size === 0 ||
    photo.size > MAX_IMAGE_BYTES
  ) {
    return Response.json(
      { error: "Envie uma foto de até 4 MB." },
      { status: 400 }
    )
  }

  const bytes = new Uint8Array(await photo.arrayBuffer())
  const mediaType = imageMediaType(bytes)
  if (!mediaType) {
    return Response.json(
      { error: "Formato de imagem não aceito." },
      { status: 400 }
    )
  }

  const { data: catalog, error: catalogError } = await supabase
    .from("food_catalog")
    .select(
      "id, source_code, name, synonyms, calories_per_100g, protein_per_100g, carb_per_100g, fat_per_100g"
    )
    .order("name")
    .returns<CatalogFood[]>()
  if (catalogError || !catalog?.length) {
    return Response.json(
      { error: "Catálogo nutricional indisponível." },
      { status: 503 }
    )
  }

  const { data: allowed, error: limitError } = await supabase.rpc(
    "reserve_photo_analysis"
  )
  if (limitError) {
    return Response.json(
      { error: "Não foi possível iniciar a análise." },
      { status: 503 }
    )
  }
  if (!allowed) {
    return Response.json(
      { error: "Limite de 10 análises em 24 horas atingido." },
      { status: 429 }
    )
  }

  const result = await extractMealPhoto(Buffer.from(bytes), mediaType, catalog)
  if (!result.ok) {
    return Response.json({ error: result.error }, { status: 502 })
  }
  if (result.items.length === 0) {
    return Response.json(
      {
        error:
          "Não identifiquei comida na foto. Tente outra imagem ou cadastre manualmente.",
      },
      { status: 422 }
    )
  }

  const byCode = new Map(catalog.map((food) => [food.source_code, food]))
  return Response.json(
    {
      catalog,
      items: result.items.map((item) => {
        const selected = item.catalog_code
          ? byCode.get(item.catalog_code)
          : null
        return {
          name: item.name,
          preparation: item.preparation,
          quantity_g: item.quantity_g,
          uncertain: item.uncertain,
          food_catalog_id: selected?.id ?? null,
          suggestions: matchingFoods(
            catalog,
            `${item.name} ${item.preparation}`,
            3
          ).map((food) => food.id),
        }
      }),
    },
    { headers: { "Cache-Control": "no-store" } }
  )
}
