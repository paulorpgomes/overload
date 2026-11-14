import { LogOut } from "lucide-react"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent } from "@workspace/ui/components/card"
import { requireProfile } from "@/lib/auth"
import { ProfileForm } from "@/components/profile/profile-form"
import { ScreenHeader } from "@/components/shell/screen-header"
import { signOut } from "./actions"

export default async function ProfilePage() {
  const { user, profile } = await requireProfile()

  const initials = (profile.full_name ?? "?")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")

  return (
    <>
      <ScreenHeader title="Perfil" backHref="/" />

      <div className="space-y-4 px-5 py-3">
        <Card>
          <CardContent className="flex items-center gap-4">
            <Avatar className="size-14">
              {profile.avatar_url ? (
                <AvatarImage src={profile.avatar_url} alt="" />
              ) : null}
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate font-medium">
                {profile.full_name ?? "Atleta"}
              </p>
              <p className="truncate text-sm text-muted-foreground">
                {user.email}
              </p>
            </div>
          </CardContent>
        </Card>

        <ProfileForm profile={profile} />

        <form action={signOut}>
          <Button
            type="submit"
            variant="outline"
            size="lg"
            className="h-12 w-full rounded-xl text-destructive"
          >
            <LogOut className="size-4" />
            Sair da conta
          </Button>
        </form>
      </div>
    </>
  )
}
