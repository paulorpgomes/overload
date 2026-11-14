import Link from "next/link"
import { ChevronLeft } from "lucide-react"

import { cn } from "@workspace/ui/lib/utils"

/** Sticky screen title bar with optional back affordance and trailing action. */
export function ScreenHeader({
  title,
  subtitle,
  backHref,
  action,
  className,
}: {
  title: string
  subtitle?: string
  backHref?: string
  action?: React.ReactNode
  className?: string
}) {
  return (
    <header
      className={cn(
        "sticky top-0 z-30 bg-background/85 px-5 pt-[max(1rem,env(safe-area-inset-top))] pb-3 backdrop-blur-lg",
        className
      )}
    >
      <div className="flex items-center gap-3">
        {backHref ? (
          <Link
            href={backHref}
            aria-label="Voltar"
            className="-ml-2 flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ChevronLeft className="size-5" />
          </Link>
        ) : null}

        <div className="min-w-0 flex-1">
          <h1 className="font-heading truncate text-2xl font-semibold tracking-tight">
            {title}
          </h1>
          {subtitle ? (
            <p className="truncate text-sm text-muted-foreground">{subtitle}</p>
          ) : null}
        </div>

        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    </header>
  )
}
