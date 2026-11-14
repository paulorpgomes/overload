import Link from "next/link"
import { TriangleAlert } from "lucide-react"

import { Button } from "@workspace/ui/components/button"

export default async function AuthCodeErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>
}) {
  const { reason } = await searchParams

  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
        <TriangleAlert className="size-7" />
      </div>
      <div className="space-y-2">
        <h1 className="font-heading text-xl font-semibold">
          Não foi possível entrar
        </h1>
        <p className="text-sm text-muted-foreground">
          {reason ?? "O link de autenticação expirou ou já foi utilizado."}
        </p>
      </div>
      <Button size="lg" nativeButton={false} render={<Link href="/login" />}>
        Tentar novamente
      </Button>
    </main>
  )
}
