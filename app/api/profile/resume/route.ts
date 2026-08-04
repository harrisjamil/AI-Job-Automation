import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/session"

const MAX_RESUME_BYTES = 5 * 1024 * 1024
const ALLOWED_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
])

export async function POST(request: Request) {
  const currentUser = await getCurrentUser()

  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get("resume")

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Resume file is required." },
        { status: 400 },
      )
    }

    if (file.size > MAX_RESUME_BYTES) {
      return NextResponse.json(
        { error: "Resume must be 5MB or smaller." },
        { status: 400 },
      )
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: "Upload a PDF or Word document." },
        { status: 400 },
      )
    }

    const extension = path.extname(file.name) || ".pdf"
    const safeName = `${Date.now()}${extension.toLowerCase()}`
    const relativeDir = path.join("uploads", "resumes", currentUser.id)
    const absoluteDir = path.join(process.cwd(), relativeDir)
    await mkdir(absoluteDir, { recursive: true })

    const absolutePath = path.join(absoluteDir, safeName)
    const relativePath = path.join(relativeDir, safeName).replace(/\\/g, "/")
    const buffer = Buffer.from(await file.arrayBuffer())
    await writeFile(absolutePath, buffer)

    await prisma.resume.deleteMany({ where: { userId: currentUser.id } })

    const resume = await prisma.resume.create({
      data: {
        userId: currentUser.id,
        fileName: file.name,
        fileUrl: relativePath,
        mimeType: file.type,
      },
      select: {
        id: true,
        fileName: true,
        fileUrl: true,
        mimeType: true,
        atsScore: true,
        createdAt: true,
      },
    })

    return NextResponse.json({ resume })
  } catch (error) {
    console.error("Resume upload failed:", error)
    return NextResponse.json(
      { error: "Unable to upload resume. Please try again." },
      { status: 500 },
    )
  }
}
