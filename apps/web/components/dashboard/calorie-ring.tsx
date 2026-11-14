/**
 * Hero figure for the day: calories consumed against target, drawn as a single
 * ratio ring. The number is the point — the ring is the limit it sits against.
 */
export function CalorieRing({
  consumed,
  target,
}: {
  consumed: number
  target: number | null
}) {
  const size = 132
  const stroke = 10
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius

  const ratio = target && target > 0 ? consumed / target : 0
  const clamped = Math.min(1, Math.max(0, ratio))
  const over = target !== null && consumed > target
  const remaining = target !== null ? Math.round(target - consumed) : null

  return (
    <div className="flex items-center gap-5">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          aria-hidden
          className="-rotate-90"
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={stroke}
            // Lighter step of the same ramp, per the meter rule.
            stroke="color-mix(in oklch, var(--chart-1) 18%, var(--card))"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={stroke}
            strokeLinecap="round"
            stroke={over ? "var(--destructive)" : "var(--chart-1)"}
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - clamped)}
            className="transition-[stroke-dashoffset] duration-700"
          />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-heading text-3xl font-semibold tabular-nums">
            {Math.round(consumed)}
          </span>
          <span className="text-xs text-muted-foreground">
            {target ? `de ${target}` : "kcal"}
          </span>
        </div>
      </div>

      <div className="min-w-0 space-y-1">
        <p className="text-sm font-medium">Calorias de hoje</p>
        {remaining === null ? (
          <p className="text-sm text-muted-foreground">
            Defina sua meta no perfil.
          </p>
        ) : remaining >= 0 ? (
          <p className="text-sm text-muted-foreground">
            Faltam{" "}
            <span className="font-semibold text-foreground tabular-nums">
              {remaining}
            </span>{" "}
            kcal para a meta.
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-destructive tabular-nums">
              {Math.abs(remaining)}
            </span>{" "}
            kcal acima da meta.
          </p>
        )}
      </div>
    </div>
  )
}
