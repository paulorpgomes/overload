import Link from "next/link"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar"

function initials(name: string | null) {
  if (!name) return "?"
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
}

export function ProfileMenu({
  name,
  avatarUrl,
}: {
  name: string | null
  avatarUrl: string | null
}) {
  return (
    <Link
      href="/perfil"
      aria-label="Abrir perfil"
      className="shrink-0 rounded-full ring-offset-2 ring-offset-background transition-shadow hover:ring-2 hover:ring-primary/40"
    >
      <Avatar className="size-10">
        {avatarUrl ? <AvatarImage src={avatarUrl} alt="" /> : null}
        <AvatarFallback>{initials(name)}</AvatarFallback>
      </Avatar>
    </Link>
  )
}
