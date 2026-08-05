import { NextResponse } from "next/server"
import { buildDocumentPdf } from "@/lib/documents/pdf"
import {
  authenticateExtensionToken,
  getBearerToken,
} from "@/lib/extension/auth"
import { getCurrentUser } from "@/lib/session"

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
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

  const { id: jobId } = await context.params
  const type = new URL(request.url).searchParams.get("type")?.trim()
  if (type !== "cover_letter" && type !== "tailored_resume") {
    return NextResponse.json(
      { error: "type must be cover_letter or tailored_resume" },
      { status: 400 }
    )
  }

  try {
    const pdf = await buildDocumentPdf({
      userId,
      jobId,
      type,
    })
    return new NextResponse(new Uint8Array(pdf.buffer), {
      status: 200,
      headers: {
        "Content-Type": pdf.contentType,
        "Content-Disposition": `attachment; filename="${pdf.filename}"`,
        "Access-Control-Allow-Origin": "*",
      },
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to build PDF"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
