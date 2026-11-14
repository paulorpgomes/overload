/**
 * Postgres `current_date` is UTC, which rolls over mid-evening in Brazil and
 * would move a late workout to "tomorrow". All day-bucketing goes through
 * these helpers instead, pinned to the app's timezone.
 */
export const APP_TIMEZONE = "America/Sao_Paulo"

const ISO_FORMATTER = new Intl.DateTimeFormat("en-CA", {
  timeZone: APP_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
})

/** `YYYY-MM-DD` for the given instant in the app timezone. */
export function toISODate(date: Date = new Date()): string {
  return ISO_FORMATTER.format(date)
}

/** Sunday through Saturday of the current week in the app timezone. */
export function currentWeekISODates(referenceDate: Date = new Date()): string[] {
  const today = toISODate(referenceDate)
  const sunday = new Date(`${today}T12:00:00Z`)
  sunday.setUTCDate(sunday.getUTCDate() - sunday.getUTCDay())

  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(sunday)
    day.setUTCDate(sunday.getUTCDate() + index)
    return day.toISOString().slice(0, 10)
  })
}

const WEEKDAY_FORMATTER = new Intl.DateTimeFormat("pt-BR", {
  timeZone: APP_TIMEZONE,
  weekday: "narrow",
})

export function weekdayLabel(isoDate: string): string {
  // Parse as UTC noon so the timezone shift can't cross a day boundary.
  return WEEKDAY_FORMATTER.format(new Date(`${isoDate}T12:00:00Z`))
}

const SHORT_DATE_FORMATTER = new Intl.DateTimeFormat("pt-BR", {
  timeZone: APP_TIMEZONE,
  day: "2-digit",
  month: "short",
})

export function shortDate(isoDate: string): string {
  return SHORT_DATE_FORMATTER.format(new Date(`${isoDate}T12:00:00Z`))
}

const HOUR_FORMATTER = new Intl.DateTimeFormat("en-GB", {
  timeZone: APP_TIMEZONE,
  hour: "2-digit",
  hour12: false,
})

/**
 * Best-guess meal slot for the current hour. Computed server-side in the app
 * timezone so it can be passed as a prop — reading the device clock in an
 * effect instead would cause a hydration mismatch.
 */
export function currentMealType(): "breakfast" | "lunch" | "dinner" | "snack" {
  const hour = Number(HOUR_FORMATTER.format(new Date()))
  if (hour < 10) return "breakfast"
  if (hour < 15) return "lunch"
  if (hour < 21) return "dinner"
  return "snack"
}

/** "há 2 h", "há 3 d" — compact relative time for the feed. */
export function relativeTime(timestamp: string): string {
  const then = new Date(timestamp).getTime()
  const diffMs = Date.now() - then
  const minutes = Math.round(diffMs / 60000)

  if (minutes < 1) return "agora"
  if (minutes < 60) return `há ${minutes} min`

  const hours = Math.round(minutes / 60)
  if (hours < 24) return `há ${hours} h`

  const days = Math.round(hours / 24)
  if (days < 7) return `há ${days} d`

  return shortDate(toISODate(new Date(then)))
}
