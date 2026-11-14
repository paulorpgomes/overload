import "server-only"

import Anthropic from "@anthropic-ai/sdk"
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod"
import * as z from "zod"

import type { CatalogFood } from "@/lib/food-catalog"
import { getAnthropic } from "./client"

const MODEL = process.env.ANTHROPIC_MEAL_IMAGE_MODEL || "claude-sonnet-5-5"

const PhotoResultSchema = z.object({
  items: z
    .array(
      z.object({
        name: z.string().min(1).max(100),
        preparation: z.string().max(100),
        catalog_code: z.string().nullable(),
        quantity_g: z.number().min(1).max(3000),
        uncertain: z.boolean(),
      })
    )
    .max(12),
})

export type PhotoFood = z.infer<typeof PhotoResultSchema>["items"][number]
export type PhotoExtractionResult =
  | { ok: true; items: PhotoFood[] }
  | { ok: false; error: string }

export async function extractMealPhoto(
  image: Buffer,
  mediaType: "image/jpeg" | "image/png" | "image/webp",
  catalog: CatalogFood[]
): Promise<PhotoExtractionResult> {
  const anthropic = getAnthropic()
  if (!anthropic) {
    return { ok: false, error: "Análise de fotos não configurada." }
  }

  const catalogList = catalog
    .map((food) => `${food.source_code}: ${food.name}`)
    .join("\n")

  try {
    const message = await anthropic.messages.parse({
      model: MODEL,
      max_tokens: 1800,
      system: `Você analisa fotos de refeições para um diário alimentar brasileiro.
Identifique apenas alimentos visíveis. Separe componentes da refeição (por exemplo, arroz, feijão e frango).
Estime a quantidade comestível de cada componente em gramas. A foto não fornece peso exato: marque uncertain=true quando a porção, preparo ou identidade não estiverem claros.
Escolha catalog_code somente quando um item da lista corresponder à identidade e ao preparo aparente. Não confunda cru com cozido, grelhado com frito, ou alimento simples com receita mista. Se não houver correspondência segura, use null.
Não estime calorias ou macronutrientes. Se não houver comida reconhecível, retorne items vazio.

Catálogo TACO (código: descrição):
${catalogList}`,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mediaType,
                data: image.toString("base64"),
              },
            },
            {
              type: "text",
              text: "Liste os componentes visíveis desta refeição e sugira suas porções. Use códigos do catálogo somente quando houver correspondência segura.",
            },
          ],
        },
      ],
      output_config: { format: zodOutputFormat(PhotoResultSchema) },
    })

    if (message.stop_reason === "refusal") {
      return { ok: false, error: "Não foi possível analisar esta foto." }
    }
    if (message.stop_reason === "max_tokens" || !message.parsed_output) {
      return {
        ok: false,
        error: "A análise ficou incompleta. Tente outra foto.",
      }
    }
    return { ok: true, items: message.parsed_output.items }
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) {
      return {
        ok: false,
        error: "Muitas análises agora. Tente novamente em instantes.",
      }
    }
    if (error instanceof Anthropic.AuthenticationError) {
      return { ok: false, error: "A chave de análise de imagem está inválida." }
    }
    if (error instanceof Anthropic.APIError) {
      return { ok: false, error: "Serviço de análise indisponível no momento." }
    }
    return { ok: false, error: "Não foi possível analisar a foto." }
  }
}
