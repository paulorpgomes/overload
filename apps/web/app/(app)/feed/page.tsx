import { TriangleAlert, Users } from "lucide-react"

import { requireProfile } from "@/lib/auth"
import { toISODate } from "@/lib/dates"
import { PostComposer } from "@/components/feed/post-composer"
import { PostCard, type FeedPost } from "@/components/feed/post-card"
import { ScreenHeader } from "@/components/shell/screen-header"

export default async function FeedPage() {
  const { supabase, user, profile } = await requireProfile()
  const today = toISODate()

  const [{ data: posts, error: postsError }, { data: todayWorkouts }] =
    await Promise.all([
      supabase
        .from("posts")
        .select(
          "id, content, image_path, created_at, user_id, profiles!posts_user_id_fkey(full_name, avatar_url), workouts(name, performed_on), post_likes(user_id), post_comments(count)"
        )
        .order("created_at", { ascending: false })
        .limit(50)
        .returns<FeedPost[]>(),
      supabase
        .from("workouts")
        .select("id, name, performed_on")
        .eq("user_id", user.id)
        .eq("performed_on", today)
        .order("created_at", { ascending: false })
        .limit(5),
    ])

  const list = posts ?? []
  const imagePaths = list.flatMap((post) =>
    post.image_path ? [post.image_path] : []
  )
  const { data: signedImages } = imagePaths.length
    ? await supabase.storage
        .from("post-images")
        .createSignedUrls(imagePaths, 3600)
    : { data: [] }
  const imageUrls = new Map(
    (signedImages ?? [])
      .filter((image) => image.signedUrl)
      .map((image) => [image.path, image.signedUrl])
  )

  return (
    <>
      <ScreenHeader title="Feed" subtitle="Progresso da comunidade" />

      <div className="space-y-4 px-5 py-3">
        <PostComposer
          avatarUrl={profile.avatar_url}
          name={profile.full_name}
          workouts={todayWorkouts ?? []}
        />

        {postsError ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-destructive/40 px-6 py-12 text-center">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
              <TriangleAlert className="size-6" />
            </div>
            <p className="text-sm font-medium">
              Não foi possível carregar o feed
            </p>
            <p className="text-sm text-muted-foreground">
              {postsError.message}
            </p>
          </div>
        ) : list.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border px-6 py-12 text-center">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
              <Users className="size-6" />
            </div>
            <p className="text-sm font-medium">O feed está vazio</p>
            <p className="text-sm text-muted-foreground">
              Seja o primeiro a compartilhar um momento.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {list.map((post) => (
              <li key={post.id}>
                <PostCard
                  post={post}
                  viewerId={user.id}
                  imageUrl={
                    post.image_path
                      ? (imageUrls.get(post.image_path) ?? undefined)
                      : undefined
                  }
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  )
}
