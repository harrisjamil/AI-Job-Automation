import Link from "next/link"
import { CrawlRunner } from "@/components/admin/crawl-runner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/session"

export default async function DashboardPage() {
  const user = await getCurrentUser()
  if (!user) return null

  const [jobsCount, withContact, drafts, sent, latestCrawl, topJobs] =
    await Promise.all([
      prisma.job.count({ where: { userId: user.id } }),
      prisma.job.count({
        where: { userId: user.id, contacts: { some: {} } },
      }),
      prisma.outreachEmail.count({
        where: { userId: user.id, status: "draft" },
      }),
      prisma.outreachEmail.count({
        where: { userId: user.id, status: "sent" },
      }),
      prisma.crawlRun.findFirst({
        where: { userId: user.id },
        orderBy: { startedAt: "desc" },
      }),
      prisma.job.findMany({
        where: { userId: user.id },
        orderBy: { matchScore: "desc" },
        take: 5,
        select: {
          id: true,
          title: true,
          company: true,
          matchScore: true,
          isRemote: true,
          source: true,
          _count: { select: { contacts: true } },
        },
      }),
    ])

  const stats = [
    { label: "Jobs found", value: jobsCount },
    { label: "With email", value: withContact },
    { label: "Drafts", value: drafts },
    { label: "Sent", value: sent },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">
            Welcome back, {user.fullName.split(" ")[0]}
          </h2>
          <p className="text-muted-foreground">
            Global job search from your multi-skill profile and CV — then
            contacts and outreach in one place.
          </p>
        </div>
        <Button nativeButton={false} render={<Link href="/admin/jobs" />}>
          Open Discover Jobs
        </Button>
      </div>

      <div className="rounded-xl border bg-card p-5">
        <h3 className="mb-3 font-medium">Start a worldwide search</h3>
        <CrawlRunner />
        {latestCrawl ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Last run: {latestCrawl.status} · {latestCrawl.jobsFound} jobs ·{" "}
            {new Date(latestCrawl.startedAt).toLocaleString()}
            {latestCrawl.sources.length
              ? ` · ${latestCrawl.sources.join(", ")}`
              : ""}
          </p>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">
            No searches yet. Add skills/keywords in Profile, connect an AI
            platform, then run a search.
          </p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-xl border bg-card p-5">
            <p className="text-sm text-muted-foreground">{stat.label}</p>
            <p className="mt-2 text-3xl font-semibold tracking-tight">
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border">
        <div className="flex items-center justify-between border-b px-5 py-3">
          <h3 className="font-medium">Top matches</h3>
          <Button
            variant="ghost"
            size="sm"
            nativeButton={false}
            render={<Link href="/admin/jobs" />}
          >
            View all
          </Button>
        </div>
        {topJobs.length === 0 ? (
          <p className="p-5 text-sm text-muted-foreground">
            Matched jobs will appear here after your first global search.
          </p>
        ) : (
          <ul className="divide-y">
            {topJobs.map((job) => (
              <li
                key={job.id}
                className="flex flex-wrap items-center justify-between gap-3 px-5 py-3"
              >
                <div>
                  <p className="font-medium">{job.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {job.company || "Company"} · {job.source}
                    {job._count.contacts > 0
                      ? ` · ${job._count.contacts} contact(s)`
                      : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {job.isRemote ? (
                    <Badge variant="secondary">Remote</Badge>
                  ) : null}
                  <Badge>Score {job.matchScore}</Badge>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
