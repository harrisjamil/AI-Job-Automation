import { matchesKeywords } from "@/lib/jobs/sources/keyword-match"
import { fetchJson, isRemoteLocation } from "@/lib/jobs/sources/http"
import type { NormalizedJob } from "@/lib/jobs/types"

/** Run async tasks with a concurrency cap. */
export async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length)
  let next = 0

  async function worker() {
    while (next < items.length) {
      const index = next
      next += 1
      results[index] = await fn(items[index])
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, Math.max(items.length, 1)) },
    () => worker()
  )
  await Promise.all(workers)
  return results
}

export function filterEngineeringJobs(
  jobs: NormalizedJob[],
  keywords: string[]
): NormalizedJob[] {
  const engHint =
    /engineer|developer|software|fullstack|full[\s-]?stack|frontend|front[\s-]?end|backend|back[\s-]?end|devops|sre|platform|infra|machine learning|\bml\b|\bai\b|data scientist|security engineer|mobile|ios|android|staff|principal|architect|typescript|react|next\.?js|node|laravel|django|fastapi/i

  return jobs.filter((job) => {
    const title = job.title
    const haystack = `${job.title} ${job.company ?? ""} ${job.description ?? ""} ${job.tags.join(" ")}`

    // Title must look like an engineering / product-tech role
    if (!engHint.test(title) && !matchesKeywords(title, keywords)) {
      return false
    }

    if (keywords.length === 0) return engHint.test(title)
    // Prefer title/keyword overlap over vague description hits
    return (
      matchesKeywords(title, keywords) ||
      (engHint.test(title) && matchesKeywords(haystack, keywords))
    )
  })
}

export { fetchJson, isRemoteLocation }
