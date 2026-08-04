import type { NormalizedJob } from "@/lib/jobs/types"

type RemotiveJob = {
  id?: number
  url?: string
  title?: string
  company_name?: string
  candidate_required_location?: string
  description?: string
  salary?: string
  tags?: string[]
  publication_date?: string
  job_type?: string
}

export async function fetchRemotiveJobs(
  keywords: string[],
  signal?: AbortSignal
): Promise<NormalizedJob[]> {
  const search = keywords.slice(0, 3).join(" ").trim()
  const url = search
    ? `https://remotive.com/api/remote-jobs?search=${encodeURIComponent(search)}&limit=100`
    : "https://remotive.com/api/remote-jobs?limit=100"

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "AI-Job-Automation/1.0",
    },
    signal,
  })

  if (!response.ok) {
    throw new Error(`Remotive failed with status ${response.status}`)
  }

  const data = (await response.json()) as { jobs?: RemotiveJob[] }
  const list = Array.isArray(data.jobs) ? data.jobs : []

  return list
    .filter((item) => item.id && item.title && item.url)
    .map((item) => ({
      externalId: String(item.id),
      source: "remotive",
      title: item.title!,
      company: item.company_name ?? null,
      location: item.candidate_required_location || "Worldwide Remote",
      isRemote: true,
      url: item.url!,
      description: item.description ?? null,
      salary: item.salary || null,
      tags: item.tags ?? [],
      postedAt: item.publication_date
        ? new Date(item.publication_date)
        : null,
    }))
}
