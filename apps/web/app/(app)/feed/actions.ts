"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import * as z from "zod"

import { requireUser } from "@/lib/auth"

const MAX_IMAGE_BYTES = 2 * 1024 * 1024
const IMAGE_BUCKET = "post-images"

export type PostFormState = { error?: string; postedAt?: number }

export async function createPost(
  _prev: PostFormState,
  formData: FormData
): Promise<PostFormState> {
  const { supabase, user } = await requireUser()

  const rawContent = formData.get("content")
  if (rawContent !== null && typeof rawContent !== "string") {
    return { error: "Legenda inválida." }
  }
  const content = (rawContent ?? "").trim()
  const workoutId = formData.get("workout_id")
  const image = formData.get("image")
  const hasImage = image instanceof File && image.size > 0

  if (!content && !hasImage) {
    return { error: "Escreva algo ou adicione uma foto." }
  }
  if (content.length > 1000) {
    return { error: "Máximo de 1000 caracteres." }
  }
  if (workoutId && !z.uuid().safeParse(workoutId).success) {
    return { error: "Treino inválido." }
  }

  let imagePath: string | null = null
  if (hasImage) {
    if (image.type !== "image/jpeg" || image.size > MAX_IMAGE_BYTES) {
      return { error: "Escolha uma foto de até 2 MB." }
    }
    const bytes = new Uint8Array(await image.arrayBuffer())
    if (bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[2] !== 0xff) {
      return { error: "A foto não está em um formato válido." }
    }

    imagePath = `${user.id}/${crypto.randomUUID()}.jpg`
    const { error: uploadError } = await supabase.storage
      .from(IMAGE_BUCKET)
      .upload(imagePath, bytes, {
        contentType: "image/jpeg",
        cacheControl: "3600",
        upsert: false,
      })
    if (uploadError) {
      return { error: "Não foi possível enviar a foto. Tente novamente." }
    }
  }

  const { error } = await supabase.from("posts").insert({
    user_id: user.id,
    content: content || null,
    image_path: imagePath,
    workout_id: workoutId ? String(workoutId) : null,
  })

  if (error) {
    if (imagePath) {
      const { error: removeError } = await supabase.storage
        .from(IMAGE_BUCKET)
        .remove([imagePath])
      if (removeError) console.error("Could not roll back post image", removeError)
    }
    return { error: "Não foi possível publicar. Tente novamente." }
  }

  revalidatePath("/feed")
  return { postedAt: Date.now() }
}

export async function toggleLike(formData: FormData) {
  const { supabase, user } = await requireUser()

  const postId = z.uuid().safeParse(formData.get("post_id"))
  const liked = formData.get("liked") === "true"
  if (!postId.success) return

  if (liked) {
    await supabase
      .from("post_likes")
      .delete()
      .eq("post_id", postId.data)
      .eq("user_id", user.id)
  } else {
    await supabase
      .from("post_likes")
      .insert({ post_id: postId.data, user_id: user.id })
  }

  revalidatePath("/feed")
  revalidatePath(`/feed/${postId.data}`)
}

export async function deletePost(formData: FormData) {
  const { supabase, user } = await requireUser()

  const postId = z.uuid().safeParse(formData.get("post_id"))
  if (!postId.success) return

  const { data: deleted, error } = await supabase
    .from("posts")
    .delete()
    .eq("id", postId.data)
    .eq("user_id", user.id)
    .select("image_path")
    .maybeSingle()

  if (error) return
  if (deleted?.image_path) {
    // The database delete must happen first; a storage failure leaves only an
    // orphaned file, never a visible post with a broken image.
    const { error: removeError } = await supabase.storage
      .from(IMAGE_BUCKET)
      .remove([deleted.image_path])
    if (removeError) console.error("Could not remove post image", removeError)
  }

  revalidatePath("/feed")
  revalidatePath(`/feed/${postId.data}`)
  redirect("/feed")
}

export type CommentFormState = { error?: string; postedAt?: number }

export async function createComment(
  _prev: CommentFormState,
  formData: FormData
): Promise<CommentFormState> {
  const { supabase, user } = await requireUser()
  const postId = z.uuid().safeParse(formData.get("post_id"))
  const rawContent = formData.get("content")
  if (rawContent !== null && typeof rawContent !== "string") {
    return { error: "Comentário inválido." }
  }
  const content = (rawContent ?? "").trim()

  if (!postId.success) return { error: "Publicação inválida." }
  if (!content || content.length > 500) {
    return { error: "Escreva um comentário de até 500 caracteres." }
  }

  const { error } = await supabase.from("post_comments").insert({
    post_id: postId.data,
    user_id: user.id,
    content,
  })
  if (error) return { error: "Não foi possível comentar. Tente novamente." }

  revalidatePath("/feed")
  revalidatePath(`/feed/${postId.data}`)
  return { postedAt: Date.now() }
}

export async function deleteComment(formData: FormData) {
  const { supabase, user } = await requireUser()
  const commentId = z.uuid().safeParse(formData.get("comment_id"))
  const postId = z.uuid().safeParse(formData.get("post_id"))
  if (!commentId.success || !postId.success) return

  const { error } = await supabase
    .from("post_comments")
    .delete()
    .eq("id", commentId.data)
    .eq("post_id", postId.data)
    .eq("user_id", user.id)
  if (error) return

  revalidatePath("/feed")
  revalidatePath(`/feed/${postId.data}`)
}
