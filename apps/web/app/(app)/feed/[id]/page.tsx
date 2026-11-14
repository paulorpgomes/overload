import { notFound } from "next/navigation"
import { Trash2 } from "lucide-react"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent } from "@workspace/ui/components/card"
import { requireProfile } from "@/lib/auth"
import { relativeTime } from "@/lib/dates"
import { CommentComposer } from "@/components/feed/comment-composer"
import { PostCard, type FeedPost } from "@/components/feed/post-card"
import { ScreenHeader } from "@/components/shell/screen-header"
import { deleteComment } from "../actions"

type FeedComment = {
  id: string
  content: string
  created_at: string
  user_id: string
  profiles: { full_name: string | null; avatar_url: string | null } | null
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

export default async function PostDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { supabase, user } = await requireProfile()
  const { data: post } = await supabase
    .from("posts")
    .select(
      "id, content, image_path, created_at, user_id, profiles!posts_user_id_fkey(full_name, avatar_url), workouts(name, performed_on), post_likes(user_id), post_comments(count)"
    )
    .eq("id", id)
    .returns<FeedPost[]>()
    .maybeSingle()
  if (!post) notFound()

  const { data: comments, error: commentsError } = await supabase
    .from("post_comments")
    .select(
      "id, content, created_at, user_id, profiles!post_comments_user_id_fkey(full_name, avatar_url)"
    )
    .eq("post_id", id)
    .order("created_at", { ascending: false })
    .limit(100)
    .returns<FeedComment[]>()

  const { data: signedImage } = post.image_path
    ? await supabase.storage
        .from("post-images")
        .createSignedUrl(post.image_path, 3600)
    : { data: null }

  return (
    <>
      <ScreenHeader title="Publicação" backHref="/feed" />
      <div className="space-y-4 px-5 py-3">
        <PostCard
          post={post}
          viewerId={user.id}
          imageUrl={signedImage?.signedUrl}
          detail
        />

        <Card size="sm">
          <CardContent className="space-y-4">
            <h2 className="text-sm font-semibold">Comentários</h2>
            <CommentComposer postId={post.id} />

            {commentsError ? (
              <p className="text-sm text-destructive">
                Não foi possível carregar os comentários.
              </p>
            ) : comments?.length ? (
              <>
                {comments.length === 100 ? (
                  <p className="text-xs text-muted-foreground">
                    Mostrando os 100 comentários mais recentes.
                  </p>
                ) : null}
                <ul className="space-y-4">
                  {[...comments].reverse().map((comment) => (
                    <li key={comment.id} className="flex gap-2.5">
                      <Avatar className="size-8 shrink-0">
                        {comment.profiles?.avatar_url ? (
                          <AvatarImage
                            src={comment.profiles.avatar_url}
                            alt=""
                          />
                        ) : null}
                        <AvatarFallback>
                          {initials(comment.profiles?.full_name ?? null)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-xs font-semibold">
                            {comment.profiles?.full_name ?? "Atleta"}
                          </span>
                          <span className="shrink-0 text-xs text-muted-foreground">
                            {relativeTime(comment.created_at)}
                          </span>
                        </div>
                        <p className="mt-0.5 text-sm break-words whitespace-pre-wrap">
                          {comment.content}
                        </p>
                      </div>
                      {comment.user_id === user.id ? (
                        <form action={deleteComment}>
                          <input
                            type="hidden"
                            name="comment_id"
                            value={comment.id}
                          />
                          <input type="hidden" name="post_id" value={post.id} />
                          <Button
                            type="submit"
                            variant="ghost"
                            size="icon-sm"
                            aria-label="Excluir comentário"
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </form>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Nenhum comentário ainda.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  )
}
