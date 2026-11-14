import "server-only"

import Anthropic from "@anthropic-ai/sdk"
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod"
import * as z from "zod"

import {
  EXTRACTION_MAX_TOKENS,
  EXTRACTION_MODEL,
  getAnthropic,
} from "./client"

export type ExtractedEntry = {
  exercise: string
  sets: number
  reps: number
  weight_kg: number
}

export type ExtractionResult =
  | { ok: true; entries: ExtractedEntry[] }
  | { ok: false; error: string }

const SYSTEM_PROMPT = `Você extrai registros de treino do jeito abreviado que praticantes de academia brasileiros escrevem.

Convenções que aparecem no texto:
- "4x8" significa 4 séries de 8 repetições.
- "3 séries de 12" significa 3 séries de 12 repetições.
- Carga vem em quilos: "60kg", "60 quilos", "com 60" e "60" são todos 60.
- Exercícios de peso corporal (barra fixa, flexão, prancha, abdominal) têm carga 0 quando nenhuma carga é citada.
- Um texto pode conter vários exercícios, separados por "e", vírgula ou nova linha.

Escolha, para cada exercício citado, o item mais próximo da lista fornecida — o texto costuma usar apelido ou forma abreviada ("supino" para "Supino Reto", "terra" para "Levantamento Terra", "rosca" para "Rosca Direta").

Retorne uma entrada por exercício citado. Se o texto não descrever nenhum treino, retorne a lista vazia.`

/**
 * Extracts structured sets from free-form Portuguese text.
 *
 * The exercise field is an enum built from the catalog, so the model cannot
 * return an exercise that doesn't exist — the match is guaranteed by the
 * schema rather than checked afterwards.
 */
export async function extractWorkoutEntries(
  text: string,
  catalog: string[]
): Promise<ExtractionResult> {
  const anthropic = getAnthropic()
  if (!anthropic) {
    return { ok: false, error: "Extração por texto não está configurada." }
  }

  if (catalog.length === 0) {
    return { ok: false, error: "Catálogo de exercícios vazio." }
  }

  const Schema = z.object({
    entries: z.array(
      z.object({
        exercise: z.enum(catalog as [string, ...string[]]),
        sets: z.number().int().min(1).max(20),
        reps: z.number().int().min(0).max(999),
        weight_kg: z.number().min(0).max(1000),
      })
    ),
  })

  try {
    const message = await anthropic.messages.parse({
      model: EXTRACTION_MODEL,
      max_tokens: EXTRACTION_MAX_TOKENS,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: text }],
      output_config: { format: zodOutputFormat(Schema) },
    })

    if (message.stop_reason === "refusal") {
      return { ok: false, error: "Não foi possível interpretar esse texto." }
    }

    if (message.stop_reason === "max_tokens") {
      return { ok: false, error: "Texto longo demais. Envie menos exercícios por vez." }
    }

    const parsed = message.parsed_output
    if (!parsed) {
      return { ok: false, error: "Não entendi o texto. Tente algo como “supino 4x8 60kg”." }
    }

    return { ok: true, entries: parsed.entries }
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) {
      return { ok: false, error: "Muitas requisições. Tente de novo em instantes." }
    }
    if (error instanceof Anthropic.AuthenticationError) {
      return { ok: false, error: "Chave da API inválida." }
    }
    if (error instanceof Anthropic.APIError) {
      return { ok: false, error: "Serviço de extração indisponível no momento." }
    }
    return { ok: false, error: "Falha inesperada ao interpretar o texto." }
  }
}
