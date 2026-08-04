import "dotenv/config"
import { PrismaClient } from "../generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import {
  ASHBY_BOARDS,
  GREENHOUSE_BOARDS,
  LEVER_BOARDS,
  SMARTRECRUITERS_BOARDS,
  WORKABLE_BOARDS,
} from "../lib/jobs/companies/ats-boards"
import { SOURCE_REGISTRY } from "../lib/jobs/sources/registry"

async function main() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set")
  }

  const adapter = new PrismaPg({ connectionString })
  const prisma = new PrismaClient({ adapter })

  console.log("Seeding job sources…")
  for (const source of SOURCE_REGISTRY) {
    await prisma.jobSource.upsert({
      where: { key: source.key },
      create: {
        key: source.key,
        name: source.name,
        category: source.category,
        priority: source.priority,
        isEnabled: source.enabled,
        crawlMethod: source.crawlMethod,
        config: { description: source.description },
      },
      update: {
        name: source.name,
        category: source.category,
        priority: source.priority,
        isEnabled: source.enabled,
        crawlMethod: source.crawlMethod,
        config: { description: source.description },
      },
    })
  }

  const boardSets: Array<{
    atsType: string
    boards: typeof GREENHOUSE_BOARDS
  }> = [
    { atsType: "greenhouse", boards: GREENHOUSE_BOARDS },
    { atsType: "lever", boards: LEVER_BOARDS },
    { atsType: "ashby", boards: ASHBY_BOARDS },
    { atsType: "smartrecruiters", boards: SMARTRECRUITERS_BOARDS },
    { atsType: "workable", boards: WORKABLE_BOARDS },
  ]

  console.log("Seeding ATS company directory…")
  let companies = 0
  for (const set of boardSets) {
    for (const board of set.boards) {
      await prisma.company.upsert({
        where: {
          atsType_atsSlug: {
            atsType: set.atsType,
            atsSlug: board.slug,
          },
        },
        create: {
          name: board.name,
          domain: board.domain ?? null,
          websiteUrl: board.domain ? `https://${board.domain}` : null,
          careersUrl: board.careersUrl ?? null,
          atsType: set.atsType,
          atsSlug: board.slug,
          category: board.category ?? "tech",
          isRemoteFriendly: true,
          isActive: true,
        },
        update: {
          name: board.name,
          domain: board.domain ?? null,
          websiteUrl: board.domain ? `https://${board.domain}` : null,
          careersUrl: board.careersUrl ?? null,
          category: board.category ?? "tech",
          isActive: true,
        },
      })
      companies += 1
    }
  }

  console.log(
    `Done. Sources: ${SOURCE_REGISTRY.length}, companies upserted: ${companies}`
  )
  await prisma.$disconnect()
}

main().catch(async (error) => {
  console.error(error)
  process.exit(1)
})
