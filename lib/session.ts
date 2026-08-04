import { cookies } from "next/headers"
import { prisma } from "@/lib/prisma"

export type SessionUser = {
  id: string
  fullName: string
  email: string
  username: string
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies()
  const userId = cookieStore.get("session_user_id")?.value

  if (!userId) {
    return null
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      fullName: true,
      email: true,
      username: true,
    },
  })

  return user
}
