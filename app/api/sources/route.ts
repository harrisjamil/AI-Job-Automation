import { NextResponse } from "next/server"
import { SOURCE_REGISTRY, getSourcesByCategory } from "@/lib/jobs/sources"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/session"

export async function GET() {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const dbSources = await prisma.jobSource.findMany({
    orderBy: [{ priority: "desc" }, { name: "asc" }],
  })

  const companies = await prisma.company.groupBy({
    by: ["atsType"],
    where: { isActive: true },
    _count: { _all: true },
  })

  const byCategory = Array.from(getSourcesByCategory().entries()).map(
    ([category, sources]) => ({
      category,
      count: sources.length,
      sources: sources.map((s) => ({
        key: s.key,
        name: s.name,
        priority: s.priority,
        enabled: s.enabled,
        crawlMethod: s.crawlMethod,
        description: s.description,
      })),
    })
  )

  return NextResponse.json({
    registry: SOURCE_REGISTRY.map((s) => ({
      key: s.key,
      name: s.name,
      category: s.category,
      priority: s.priority,
      enabled: s.enabled,
      crawlMethod: s.crawlMethod,
      description: s.description,
    })),
    dbSources,
    byCategory,
    companyCounts: companies.map((row) => ({
      atsType: row.atsType,
      count: row._count._all,
    })),
    totals: {
      sources: SOURCE_REGISTRY.length,
      companies: companies.reduce((sum, row) => sum + row._count._all, 0),
    },
  })
}
