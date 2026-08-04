import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/session"

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await context.params
  const crawlRun = await prisma.crawlRun.findFirst({
    where: { id, userId: user.id },
  })

  if (!crawlRun) {
    return NextResponse.json({ error: "Crawl run not found" }, { status: 404 })
  }

  return NextResponse.json({ crawlRun })
}
