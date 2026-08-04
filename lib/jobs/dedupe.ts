import {
  jobFingerprint,
  softFingerprint,
} from "@/lib/jobs/normalize"
import type { NormalizedJob } from "@/lib/jobs/types"

/**
 * Cross-source duplicate detection.
 * 1) Exact source+externalId
 * 2) Canonical URL fingerprint
 * 3) Soft title+company match (same role posted on multiple boards)
 */
export function dedupeJobs(jobs: NormalizedJob[]): NormalizedJob[] {
  const bySourceId = new Set<string>()
  const byFingerprint = new Set<string>()
  const bySoft = new Set<string>()
  const result: NormalizedJob[] = []

  // Prefer richer descriptions / earlier sources already ordered by priority
  for (const job of jobs) {
    const sourceKey = `${job.source}:${job.externalId}`
    if (bySourceId.has(sourceKey)) continue

    const fp = job.fingerprint ?? jobFingerprint(job)
    if (byFingerprint.has(fp)) continue

    const soft = softFingerprint(job)
    // Soft match only when company is known — avoids collapsing unrelated "Engineer" roles
    if (job.company && bySoft.has(soft)) continue

    bySourceId.add(sourceKey)
    byFingerprint.add(fp)
    if (job.company) bySoft.add(soft)

    result.push({ ...job, fingerprint: fp })
  }

  return result
}
