"use client"

import * as React from "react"
import { LoaderCircle, Send } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { Textarea } from "@workspace/ui/components/textarea"
import { createComment } from "@/app/(app)/feed/actions"

export function CommentComposer({ postId }: { postId: string }) {
  const [content, setContent] = React.useState("")
  const [pending, setPending] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  async function submit(formData: FormData) {
    if (pending) return
    setPending(true)
    setError(null)
    try {
      const result = await createComment({}, formData)
      if (result.error) setError(result.error)
      else setContent("")
    } catch {
      setError("Não foi possível comentar. Tente novamente.")
    } finally {
      setPending(false)
    }
  }

  return (
    <form action={submit} className="space-y-2">
      <input type="hidden" name="post_id" value={postId} />
      <Textarea
        name="content"
        value={content}
        onChange={(event) => setContent(event.target.value)}
        maxLength={500}
        rows={2}
        placeholder="Escreva um comentário…"
        aria-label="Novo comentário"
        className="min-h-18 resize-none rounded-xl text-base"
      />
      {error ? (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground tabular-nums">
          {content.length}/500
        </span>
        <Button type="submit" size="sm" disabled={pending || !content.trim()}>
          {pending ? (
            <LoaderCircle className="size-4 animate-spin" />
          ) : (
            <Send className="size-4" />
          )}
          Comentar
        </Button>
      </div>
    </form>
  )
}
