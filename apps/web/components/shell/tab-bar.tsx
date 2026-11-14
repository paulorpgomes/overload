"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Dumbbell, House, TrendingUp, Users } from "lucide-react"

import { cn } from "@workspace/ui/lib/utils"

const TABS = [
  { href: "/", label: "Início", icon: House },
  { href: "/treino", label: "Treino", icon: Dumbbell },
  { href: "/progresso", label: "Progresso", icon: TrendingUp },
  { href: "/feed", label: "Feed", icon: Users },
] as const

export function TabBar() {
  const pathname = usePathname()

  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-lg"
    >
      <ul className="mx-auto flex max-w-lg items-stretch">
        {TABS.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/" ? pathname === "/" : pathname.startsWith(href)

          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-16 flex-col items-center justify-center gap-1 text-[0.7rem] font-medium transition-colors",
                  active
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon
                  className={cn("size-5.5 transition-transform", active && "scale-110")}
                  strokeWidth={active ? 2.4 : 2}
                />
                {label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
