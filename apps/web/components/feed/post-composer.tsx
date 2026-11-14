"use client"

import * as React from "react"
import { Camera, ImagePlus, LoaderCircle, Send, X } from "lucide-react"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent } from "@workspace/ui/components/card"
import { Textarea } from "@workspace/ui/components/textarea"
import { cn } from "@workspace/ui/lib/utils"
import { createPost } from "@/app/(app)/feed/actions"
import { shortDate } from "@/lib/dates"

const MAX_LENGTH = 1000
const MAX_IMAGE_BYTES = 2 * 1024 * 1024

async function preparePhoto(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file)
  try {
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement("canvas")
    canvas.width = Math.max(1, Math.round(bitmap.width * scale))
    canvas.height = Math.max(1, Math.round(bitmap.height * scale))
    const context = canvas.getContext("2d")
    if (!context) throw new Error("Canvas unavailable")
    context.fillStyle = "#fff"
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)

    for (const quality of [0.82, 0.7, 0.58, 0.46]) {
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", quality)
      )
      if (blob && blob.size <= MAX_IMAGE_BYTES) {
        // Re-encoding removes location and camera metadata.
        return new File([blob], "post.jpg", { type: "image/jpeg" })
      }
    }
    throw new Error("Image too large")
  } finally {
    bitmap.close()
  }
}

export function PostComposer({
  avatarUrl,
  name,
  workouts,
}: {
  avatarUrl: string | null
  name: string | null
  workouts: { id: string; name: string | null; performed_on: string }[]
}) {
  const galleryRef = React.useRef<HTMLInputElement>(null)
  const cameraRef = React.useRef<HTMLInputElement>(null)
  const selectionRef = React.useRef(0)
  const [content, setContent] = React.useState("")
  const [workoutId, setWorkoutId] = React.useState("")
  const [photo, setPhoto] = React.useState<{ file: File; url: string } | null>(
    null
  )
  const [preparing, setPreparing] = React.useState(false)
  const [pending, setPending] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    return () => {
      if (photo) URL.revokeObjectURL(photo.url)
    }
  }, [photo])

  const initials = name
    ? name
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() ?? "")
        .join("")
    : "?"

  async function choosePhoto(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0]
    event.target.value = ""
    if (!selected) return

    const selection = ++selectionRef.current
    setError(null)
    setPreparing(true)
    try {
      const file = await preparePhoto(selected)
      if (selection === selectionRef.current) {
        setPhoto({ file, url: URL.createObjectURL(file) })
      }
    } catch {
      if (selection === selectionRef.current) {
        setError(
          "Não foi possível preparar essa foto. Escolha JPG, PNG ou WebP."
        )
      }
    } finally {
      if (selection === selectionRef.current) setPreparing(false)
    }
  }

  async function submit(formData: FormData) {
    if (pending || preparing) return
    setPending(true)
    setError(null)
    if (photo) formData.set("image", photo.file)
    try {
      const result = await createPost({}, formData)
      if (result.error) {
        setError(result.error)
      } else {
        setContent("")
        setWorkoutId("")
        setPhoto(null)
      }
    } catch {
      setError("Não foi possível publicar. Tente novamente.")
    } finally {
      setPending(false)
    }
  }

  return (
    <Card size="sm">
      <CardContent>
        <form action={submit} className="space-y-3">
          <div className="flex gap-3">
            <Avatar className="mt-0.5 size-9 shrink-0">
              {avatarUrl ? <AvatarImage src={avatarUrl} alt="" /> : null}
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <Textarea
              name="content"
              value={content}
              onChange={(event) => setContent(event.target.value)}
              maxLength={MAX_LENGTH}
              rows={3}
              placeholder="Compartilhe seu momento…"
              aria-label="Legenda da publicação"
              className="min-h-20 flex-1 resize-none rounded-xl text-base"
            />
          </div>

          <input
            ref={galleryRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={choosePhoto}
            className="sr-only"
            aria-label="Escolher foto da galeria"
          />
          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="user"
            onChange={choosePhoto}
            className="sr-only"
            aria-label="Tirar foto"
          />

          {photo ? (
            <div className="relative mx-auto w-fit max-w-full">
              {/* eslint-disable-next-line @next/next/no-img-element -- Local preview has no fixed aspect ratio. */}
              <img
                src={photo.url}
                alt="Prévia da foto escolhida"
                className="block h-auto max-h-72 max-w-full rounded-xl object-contain"
              />
              <Button
                type="button"
                variant="secondary"
                size="icon-sm"
                onClick={() => {
                  selectionRef.current++
                  setPhoto(null)
                }}
                aria-label="Remover foto"
                className="absolute top-2 right-2"
              >
                <X className="size-4" />
              </Button>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => galleryRef.current?.click()}
              disabled={pending || preparing}
            >
              <ImagePlus className="size-4" /> Foto
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => cameraRef.current?.click()}
              disabled={pending || preparing}
            >
              <Camera className="size-4" /> Câmera
            </Button>
            {preparing ? (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <LoaderCircle className="size-3.5 animate-spin" />
                Preparando foto…
              </span>
            ) : null}
          </div>

          {workouts.length > 0 ? (
            <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
              {workouts.map((workout) => {
                const selected = workoutId === workout.id
                return (
                  <button
                    key={workout.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setWorkoutId(selected ? "" : workout.id)}
                    className={cn(
                      "shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors",
                      selected
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {workout.name ?? "Treino"} ·{" "}
                    {shortDate(workout.performed_on)}
                  </button>
                )
              })}
            </div>
          ) : null}

          <input type="hidden" name="workout_id" value={workoutId} />
          {error ? (
            <p role="alert" className="text-xs text-destructive">
              {error}
            </p>
          ) : null}
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-muted-foreground tabular-nums">
              {content.length}/{MAX_LENGTH}
            </span>
            <Button
              type="submit"
              disabled={pending || preparing || (!content.trim() && !photo)}
              className="h-10 rounded-xl"
            >
              {pending ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
              Publicar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
