import { Dumbbell, LineChart, UtensilsCrossed } from "lucide-react"

import { GoogleSignInButton } from "@/components/auth/google-sign-in-button"

const HIGHLIGHTS = [
  { icon: Dumbbell, label: "Registre séries, reps e carga em segundos" },
  { icon: LineChart, label: "Acompanhe a evolução de carga por exercício" },
  { icon: UtensilsCrossed, label: "Controle calorias e macros do dia" },
]

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const { next } = await searchParams

  return (
    <main className="flex min-h-svh flex-col justify-between px-6 pt-[max(3rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))]">
      <div className="flex flex-1 flex-col justify-center gap-10">
        <div className="space-y-3">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <Dumbbell className="size-7" />
          </div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight">
            Overload
          </h1>
          <p className="text-base text-muted-foreground">
            Seu portfólio de treinos, dieta e progresso — em um só lugar.
          </p>
        </div>

        <ul className="space-y-4">
          {HIGHLIGHTS.map(({ icon: Icon, label }) => (
            <li key={label} className="flex items-center gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                <Icon className="size-4.5" />
              </span>
              <span className="text-sm text-muted-foreground">{label}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="space-y-4">
        <GoogleSignInButton next={next} />
        <p className="text-center text-xs text-muted-foreground">
          Ao continuar você concorda com os Termos de Uso e a Política de
          Privacidade.
        </p>
      </div>
    </main>
  )
}
