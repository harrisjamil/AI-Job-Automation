import { NextResponse } from "next/server"
import {
  listNotifications,
  markNotificationsRead,
  unreadNotificationCount,
} from "@/lib/notifications"
import { getCurrentUser } from "@/lib/session"

export async function GET() {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const [notifications, unread] = await Promise.all([
    listNotifications(user.id),
    unreadNotificationCount(user.id),
  ])

  return NextResponse.json({ notifications, unread })
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = (await request.json().catch(() => ({}))) as {
    ids?: string[]
    all?: boolean
  }

  if (body.all) {
    await markNotificationsRead(user.id)
  } else if (body.ids?.length) {
    await markNotificationsRead(user.id, body.ids)
  } else {
    return NextResponse.json(
      { error: "Provide ids or all: true" },
      { status: 400 }
    )
  }

  const unread = await unreadNotificationCount(user.id)
  return NextResponse.json({ ok: true, unread })
}
