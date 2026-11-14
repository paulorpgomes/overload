"use client"

import * as React from "react"
import { useActionState } from "react"
import { LoaderCircle, Sparkles } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { Card, CardContent } from "@workspace/ui/components/card"
import { Input } from "@workspace/ui/components/input"
import { quickLogSets, type QuickLogState } from "@/app/(app)/treino/actions"

const EXAMPLES = [
  "supino 4x8 60kg",
  "agachamento 3x10 80kg e rosca 3x12 20",
  "barra fixa 4x6",
]

export function QuickLogInput({ workoutId }: { workoutId: string }) {
  const [text, setText] = React.useState("")

  const [state, formAction, pending] = useActionState<QuickLogState, FormData>(
    quickLogSets,
    {}
  )

  // Clear on each success — a timestamp, not a boolean, so repeat logs reset.
  const [lastLoggedAt, setLastLoggedAt] = React.useState(state.loggedAt)
  if (state.loggedAt !== lastLoggedAt) {
    setLastLoggedAt(state.loggedAt)
    setText("")
  }

  return (
    <Card>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-primary" />
          <p className="text-sm font-medium">Registrar por texto</p>
        </div>

        <form action={formAction} className="space-y-3">
          <input type="hidden" name="workout_id" value={workoutId} />

          <Input
            name="text"
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="Ex.: supino 4x8 60kg"
            aria-label="Descreva o que você treinou"
            maxLength={500}
            className="h-12 rounded-xl text-base"
          />

          {state.error ? (
            <p role="alert" className="text-xs text-destructive">
              {state.error}
            </p>
          ) : null}

          {state.summary ? (
            <p role="status" className="text-xs text-primary">
              Registrado: {state.summary}
            </p>
          ) : null}

          <Button
            type="submit"
            disabled={pending || text.trim().length < 3}
            className="h-11 w-full rounded-xl"
          >
            {pending ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <Sparkles className="size-4" />
            )}
            Interpretar e salvar
          </Button>
        </form>

        <div className="flex flex-wrap gap-1.5">
          {EXAMPLES.map((example) => (
            <button
              key={example}
              type="button"
              onClick={() => setText(example)}
              className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              {example}
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
