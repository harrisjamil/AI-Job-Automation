import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/session"

export async function GET(request: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const atsType = searchParams.get("atsType")?.trim()
  const q = searchParams.get("q")?.trim()

  const companies = await prisma.company.findMany({
    where: {
      isActive: true,
      ...(atsType ? { atsType } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { domain: { contains: q, mode: "insensitive" } },
              { atsSlug: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: [{ atsType: "asc" }, { name: "asc" }],
    take: 300,
  })

  return NextResponse.json({ companies })
}
