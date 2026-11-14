/* eslint-disable @next/next/no-img-element -- Uploaded photos have varying dimensions and signed URLs are served unoptimized. */
import Link from "next/link"
import { Heart, MessageCircle, Trash2 } from "lucide-react"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent } from "@workspace/ui/components/card"
import { cn } from "@workspace/ui/lib/utils"
import { relativeTime, shortDate } from "@/lib/dates"
import { deletePost, toggleLike } from "@/app/(app)/feed/actions"

export type FeedPost = {
  id: string
  content: string | null
  image_path: string | null
  created_at: string
  user_id: string
  profiles: { full_name: string | null; avatar_url: string | null } | null
  workouts: { name: string | null; performed_on: string } | null
  post_likes: { user_id: string }[]
  post_comments: { count: number }[]
}

function initials(name: string | null) {
  if (!name) return "?"
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
}

export function PostCard({
  post,
  viewerId,
  imageUrl,
  detail = false,
}: {
  post: FeedPost
  viewerId: string
  imageUrl?: string
  detail?: boolean
}) {
  const likes = post.post_likes ?? []
  const liked = likes.some((like) => like.user_id === viewerId)
  const commentCount = post.post_comments?.[0]?.count ?? 0
  const name = post.profiles?.full_name ?? "Atleta"

  return (
    <Card size="sm">
      <CardContent className="space-y-3">
        <div className="flex items-center gap-3">
          <Avatar className="size-9">
            {post.profiles?.avatar_url ? (
              <AvatarImage src={post.profiles.avatar_url} alt="" />
            ) : null}
            <AvatarFallback>
              {initials(post.profiles?.full_name ?? null)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{name}</p>
            <p className="text-xs text-muted-foreground">
              {relativeTime(post.created_at)}
            </p>
          </div>
          {post.user_id === viewerId ? (
            <form action={deletePost}>
              <input type="hidden" name="post_id" value={post.id} />
              <Button
                type="submit"
                variant="ghost"
                size="icon-sm"
                aria-label="Excluir publicação"
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="size-4" />
              </Button>
            </form>
          ) : null}
        </div>

        {post.content ? (
          <p className="text-sm leading-relaxed whitespace-pre-wrap">
            {post.content}
          </p>
        ) : null}

        {post.image_path ? (
          imageUrl ? (
            detail ? (
              <div className="flex justify-center">
                <img
                  src={imageUrl}
                  alt={`Foto publicada por ${name}`}
                  className="block h-auto max-h-[70vh] max-w-full rounded-xl object-contain"
                />
              </div>
            ) : (
              <Link
                href={`/feed/${post.id}`}
                aria-label="Abrir publicação e comentários"
                className="flex justify-center"
              >
                <img
                  src={imageUrl}
                  alt={`Foto publicada por ${name}`}
                  loading="lazy"
                  className="block h-auto max-h-96 max-w-full rounded-xl object-contain"
                />
              </Link>
            )
          ) : (
            <p className="rounded-xl bg-muted px-3 py-5 text-center text-xs text-muted-foreground">
              Foto indisponível
            </p>
          )
        ) : null}

        {post.workouts ? (
          <p className="inline-flex items-center rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
            {post.workouts.name ?? "Treino"} ·{" "}
            {shortDate(post.workouts.performed_on)}
          </p>
        ) : null}

        <div className="flex items-center gap-2">
          <form action={toggleLike}>
            <input type="hidden" name="post_id" value={post.id} />
            <input type="hidden" name="liked" value={String(liked)} />
            <Button
              type="submit"
              variant="ghost"
              size="sm"
              aria-pressed={liked}
              className={cn(
                "gap-1.5 px-2",
                liked ? "text-destructive" : "text-muted-foreground"
              )}
            >
              <Heart className={cn("size-4", liked && "fill-current")} />
              <span className="tabular-nums">{likes.length}</span>
              <span className="sr-only">{liked ? "Descurtir" : "Curtir"}</span>
            </Button>
          </form>
          {detail ? (
            <span className="inline-flex items-center gap-1.5 px-2 text-sm text-muted-foreground">
              <MessageCircle className="size-4" /> {commentCount}
              <span className="sr-only">comentários</span>
            </span>
          ) : (
            <Link
              href={`/feed/${post.id}`}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2 text-sm text-muted-foreground hover:bg-muted"
              aria-label={`Ver ${commentCount} comentários`}
            >
              <MessageCircle className="size-4" />{" "}
              <span className="tabular-nums">{commentCount}</span>
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
