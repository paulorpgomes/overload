import "server-only"

import Anthropic from "@anthropic-ai/sdk"

/**
 * Extraction runs on Haiku 4.5: the task is short input, a fixed schema and a
 * closed vocabulary (the exercise catalog), so a larger tier buys nothing.
 */
export const EXTRACTION_MODEL = "claude-haiku-4-5"

/** Bounded: the response is a small JSON array, never prose. */
export const EXTRACTION_MAX_TOKENS = 2048

let client: Anthropic | null = null

/**
 * Returns null when no API key is configured, so the app runs fine without it
 * and the quick-log input simply stays hidden.
 */
export function getAnthropic(): Anthropic | null {
  if (!process.env.ANTHROPIC_API_KEY) {
    return null
  }
  client ??= new Anthropic()
  return client
}

export function isExtractionEnabled(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY)
}
