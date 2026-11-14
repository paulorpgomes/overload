"use client"

import * as React from "react"
import { Pencil } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { renameWorkout } from "@/app/(app)/treino/actions"

export function WorkoutNameForm({
  workoutId,
  defaultName,
}: {
  workoutId: string
  defaultName: string
}) {
  const [editing, setEditing] = React.useState(false)

  if (!editing) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className="text-muted-foreground"
        onClick={() => setEditing(true)}
      >
        <Pencil className="size-3.5" />
        Renomear treino
      </Button>
    )
  }

  return (
    <form
      action={renameWorkout}
      onSubmit={() => setEditing(false)}
      className="flex items-center gap-2"
    >
      <input type="hidden" name="workout_id" value={workoutId} />
      <Input
        name="name"
        defaultValue={defaultName}
        autoFocus
        maxLength={60}
        placeholder="Nome do treino"
        className="h-11 flex-1 rounded-xl"
      />
      <Button type="submit" className="h-11 rounded-xl">
        Salvar
      </Button>
    </form>
  )
}
