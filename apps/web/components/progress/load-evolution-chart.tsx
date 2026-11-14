"use client"

import * as React from "react"

import { cn } from "@workspace/ui/lib/utils"
import { shortDate } from "@/lib/dates"

export type ProgressionPoint = {
  performed_on: string
  top_weight_kg: number
  est_one_rm: number
  total_volume_kg: number
  total_sets: number
  total_reps: number
}

const VIEW_W = 320
const VIEW_H = 180
const PAD = { top: 16, right: 14, bottom: 26, left: 36 }

const PLOT_W = VIEW_W - PAD.left - PAD.right
const PLOT_H = VIEW_H - PAD.top - PAD.bottom

/** Round a range up to clean tick values (0 / 20 / 40 …). */
function niceScale(min: number, max: number) {
  if (max === min) {
    // Flat series still needs a band to draw in.
    const pad = Math.max(1, max * 0.1)
    return { lo: Math.max(0, min - pad), hi: max + pad }
  }
  const span = max - min
  const step = Math.pow(10, Math.floor(Math.log10(span))) / 2
  const lo = Math.max(0, Math.floor((min - span * 0.15) / step) * step)
  const hi = Math.ceil((max + span * 0.15) / step) * step
  return { lo, hi }
}

export function LoadEvolutionChart({
  points,
  exerciseName,
}: {
  points: ProgressionPoint[]
  exerciseName: string
}) {
  const [active, setActive] = React.useState<number | null>(null)
  const [showTable, setShowTable] = React.useState(false)

  const weights = points.map((point) => point.top_weight_kg)
  const { lo, hi } = niceScale(Math.min(...weights), Math.max(...weights))

  const x = (index: number) =>
    points.length === 1
      ? PAD.left + PLOT_W / 2
      : PAD.left + (index / (points.length - 1)) * PLOT_W

  const y = (value: number) =>
    PAD.top + PLOT_H - ((value - lo) / (hi - lo)) * PLOT_H

  const linePath = points
    .map((point, index) => `${index === 0 ? "M" : "L"}${x(index)},${y(point.top_weight_kg)}`)
    .join(" ")

  const areaPath =
    points.length > 1
      ? `${linePath} L${x(points.length - 1)},${PAD.top + PLOT_H} L${x(0)},${PAD.top + PLOT_H} Z`
      : ""

  const ticks = [lo, lo + (hi - lo) / 2, hi]
  const lastIndex = points.length - 1
  const lastPoint = points[lastIndex]
  const activePoint = active !== null ? points[active] : undefined

  function handlePointer(event: React.PointerEvent<SVGSVGElement>) {
    const rect = event.currentTarget.getBoundingClientRect()
    // Map client px into viewBox units before snapping to the nearest point.
    const localX = ((event.clientX - rect.left) / rect.width) * VIEW_W
    const ratio = (localX - PAD.left) / PLOT_W
    const index = Math.round(ratio * Math.max(1, points.length - 1))
    setActive(Math.min(points.length - 1, Math.max(0, index)))
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <svg
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          className="h-auto w-full touch-none"
          role="img"
          aria-label={`Evolução de carga em ${exerciseName}: de ${weights[0]} a ${weights[lastIndex]} quilos.`}
          onPointerMove={handlePointer}
          onPointerDown={handlePointer}
          onPointerLeave={() => setActive(null)}
        >
          {/* Gridlines — hairline, solid, recessive. */}
          {ticks.map((tick) => (
            <g key={tick}>
              <line
                x1={PAD.left}
                x2={VIEW_W - PAD.right}
                y1={y(tick)}
                y2={y(tick)}
                stroke="var(--border)"
                strokeWidth={1}
              />
              <text
                x={PAD.left - 6}
                y={y(tick) + 3}
                textAnchor="end"
                className="fill-muted-foreground"
                style={{ fontSize: 9 }}
              >
                {Math.round(tick)}
              </text>
            </g>
          ))}

          {areaPath ? (
            <path d={areaPath} fill="var(--chart-1)" fillOpacity={0.1} />
          ) : null}

          <path
            d={linePath}
            fill="none"
            stroke="var(--chart-1)"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Crosshair snaps to the nearest session. */}
          {activePoint ? (
            <line
              x1={x(active!)}
              x2={x(active!)}
              y1={PAD.top}
              y2={PAD.top + PLOT_H}
              stroke="var(--muted-foreground)"
              strokeWidth={1}
            />
          ) : null}

          {points.map((point, index) => {
            const isActive = index === active
            const isLast = index === lastIndex
            // Interior points stay quiet; the endpoint and the hovered point
            // carry a marker with a surface ring.
            if (!isActive && !isLast) return null

            return (
              <circle
                key={point.performed_on}
                cx={x(index)}
                cy={y(point.top_weight_kg)}
                r={4.5}
                fill="var(--chart-1)"
                stroke="var(--card)"
                strokeWidth={2}
              />
            )
          })}

          {/* Selective direct label: the endpoint only. */}
          {lastPoint && active === null ? (
            <text
              x={Math.min(x(lastIndex), VIEW_W - PAD.right)}
              y={y(lastPoint.top_weight_kg) - 9}
              textAnchor="end"
              className="fill-foreground"
              style={{ fontSize: 10, fontWeight: 600 }}
            >
              {lastPoint.top_weight_kg} kg
            </text>
          ) : null}

          {/* X labels: first and last only, so they never collide. */}
          <text
            x={PAD.left}
            y={VIEW_H - 8}
            textAnchor="start"
            className="fill-muted-foreground"
            style={{ fontSize: 9 }}
          >
            {shortDate(points[0]!.performed_on)}
          </text>
          {points.length > 1 ? (
            <text
              x={VIEW_W - PAD.right}
              y={VIEW_H - 8}
              textAnchor="end"
              className="fill-muted-foreground"
              style={{ fontSize: 9 }}
            >
              {shortDate(lastPoint!.performed_on)}
            </text>
          ) : null}
        </svg>

        {/* Tooltip: value leads, label follows. */}
        {activePoint ? (
          <div
            className={cn(
              "pointer-events-none absolute top-2 rounded-xl bg-popover px-3 py-2 text-popover-foreground shadow-lg ring-1 ring-foreground/10",
              active! > points.length / 2 ? "left-2" : "right-2"
            )}
          >
            <p className="font-heading text-sm font-semibold tabular-nums">
              {activePoint.top_weight_kg} kg
              <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                carga máxima
              </span>
            </p>
            <p className="text-xs text-muted-foreground tabular-nums">
              1RM est. {activePoint.est_one_rm} kg · {activePoint.total_sets}{" "}
              séries
            </p>
            <p className="text-xs text-muted-foreground">
              {shortDate(activePoint.performed_on)}
            </p>
          </div>
        ) : null}
      </div>

      <button
        type="button"
        onClick={() => setShowTable((open) => !open)}
        className="text-xs font-medium text-muted-foreground underline underline-offset-4"
        aria-expanded={showTable}
      >
        {showTable ? "Ocultar tabela" : "Ver tabela de dados"}
      </button>

      {showTable ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <caption className="sr-only">
              Histórico de carga em {exerciseName}
            </caption>
            <thead className="text-muted-foreground">
              <tr>
                <th scope="col" className="py-1.5 pr-3 font-medium">Data</th>
                <th scope="col" className="py-1.5 pr-3 font-medium">Máx.</th>
                <th scope="col" className="py-1.5 pr-3 font-medium">1RM</th>
                <th scope="col" className="py-1.5 font-medium">Volume</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {[...points].reverse().map((point) => (
                <tr key={point.performed_on} className="border-t border-border/60">
                  <td className="py-1.5 pr-3">{shortDate(point.performed_on)}</td>
                  <td className="py-1.5 pr-3">{point.top_weight_kg} kg</td>
                  <td className="py-1.5 pr-3">{point.est_one_rm} kg</td>
                  <td className="py-1.5">
                    {Math.round(point.total_volume_kg).toLocaleString("pt-BR")} kg
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  )
}
