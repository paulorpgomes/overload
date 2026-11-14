import { cn } from "@workspace/ui/lib/utils"

type MacroKey = "protein" | "carb" | "fat"

const MACRO_COLOR: Record<MacroKey, string> = {
  protein: "var(--macro-protein)",
  carb: "var(--macro-carb)",
  fat: "var(--macro-fat)",
}

/**
 * A single ratio against a limit — a meter, not a chart. The unfilled track is
 * a lighter step of the same hue (not gray) so the state reads across the whole
 * bar. Values are always spelled out in text, which is also the accessibility
 * relief for the light-mode contrast warning on the aqua slot.
 */
export function MacroMeter({
  macro,
  label,
  consumed,
  target,
  className,
}: {
  macro: MacroKey
  label: string
  consumed: number
  target: number | null
  className?: string
}) {
  const color = MACRO_COLOR[macro]
  const pct =
    target && target > 0
      ? Math.min(100, Math.round((consumed / target) * 100))
      : 0

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <span
            aria-hidden
            className="size-2 rounded-full"
            style={{ backgroundColor: color }}
          />
          {label}
        </span>
        <span className="font-mono text-xs tabular-nums text-muted-foreground">
          <span className="font-semibold text-foreground">
            {Math.round(consumed)}
          </span>
          {target ? ` / ${target} g` : " g"}
        </span>
      </div>

      <div
        role="meter"
        aria-valuenow={Math.round(consumed)}
        aria-valuemin={0}
        aria-valuemax={target ?? undefined}
        aria-label={`${label}: ${Math.round(consumed)} de ${target ?? "?"} gramas`}
        className="h-2 w-full overflow-hidden rounded-full"
        // Lighter step of the same ramp, mixed toward the card surface.
        style={{
          backgroundColor: `color-mix(in oklch, ${color} 18%, var(--card))`,
        }}
      >
        <div
          className="h-full rounded-full transition-[width] duration-500"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  )
}
