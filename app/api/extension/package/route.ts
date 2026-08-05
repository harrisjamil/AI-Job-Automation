import { NextResponse } from "next/server"
import {
  authenticateExtensionToken,
  getBearerToken,
} from "@/lib/extension/auth"
import { findApplyPackageByUrl } from "@/lib/extension/package"
import { getCurrentUser } from "@/lib/session"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const pageUrl = searchParams.get("url")?.trim() ?? ""
  const jobId = searchParams.get("jobId")?.trim() ?? ""

  let userId: string | null = null

  const bearer = getBearerToken(request)
  if (bearer) {
    const extUser = await authenticateExtensionToken(bearer)
    userId = extUser?.id ?? null
  } else {
    const session = await getCurrentUser()
    userId = session?.id ?? null
  }

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (!pageUrl && !jobId) {
    return NextResponse.json(
      { error: "url or jobId is required" },
      { status: 400 }
    )
  }

  const { getApplyPackageForJob } = await import("@/lib/extension/package")
  const result = jobId
    ? await getApplyPackageForJob(userId, jobId)
    : await findApplyPackageByUrl(userId, pageUrl)

  if (!result) {
    return NextResponse.json(
      {
        error:
          "No apply package found. Run Auto-apply on this job in the dashboard first.",
      },
      { status: 404 }
    )
  }

  return NextResponse.json(result)
}
