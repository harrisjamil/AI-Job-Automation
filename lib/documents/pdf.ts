import PDFDocument from "pdfkit"
import { prisma } from "@/lib/prisma"

function collectPdf(doc: PDFKit.PDFDocument): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    doc.on("data", (chunk) => chunks.push(Buffer.from(chunk)))
    doc.on("end", () => resolve(Buffer.concat(chunks)))
    doc.on("error", reject)
    doc.end()
  })
}

export async function buildDocumentPdf(options: {
  userId: string
  jobId: string
  type: "cover_letter" | "tailored_resume"
}) {
  const [docRow, user, job] = await Promise.all([
    prisma.jobDocument.findUnique({
      where: {
        userId_jobId_type: {
          userId: options.userId,
          jobId: options.jobId,
          type: options.type,
        },
      },
    }),
    prisma.user.findUnique({
      where: { id: options.userId },
      select: { fullName: true, email: true },
    }),
    prisma.job.findFirst({
      where: { id: options.jobId, userId: options.userId },
      select: { title: true, company: true },
    }),
  ])

  if (!docRow || !user || !job) {
    throw new Error("Document not found — generate it first")
  }

  const pdf = new PDFDocument({
    margin: 54,
    size: "LETTER",
    info: {
      Title: docRow.title ?? options.type,
      Author: user.fullName,
    },
  })

  pdf.fontSize(16).font("Helvetica-Bold").text(user.fullName)
  pdf
    .fontSize(10)
    .font("Helvetica")
    .fillColor("#444444")
    .text(user.email)
  pdf.moveDown(0.4)
  pdf
    .fontSize(11)
    .fillColor("#111111")
    .text(
      docRow.title ||
        `${options.type === "cover_letter" ? "Cover letter" : "Resume"} — ${job.title}${job.company ? ` @ ${job.company}` : ""}`
    )
  pdf.moveDown()
  pdf.fontSize(10.5).fillColor("#222222")

  const lines = docRow.content.replace(/\r\n/g, "\n").split("\n")
  for (const line of lines) {
    if (line.startsWith("# ")) {
      pdf.moveDown(0.4)
      pdf.font("Helvetica-Bold").fontSize(13).text(line.replace(/^#\s+/, ""))
      pdf.font("Helvetica").fontSize(10.5)
    } else if (line.startsWith("## ")) {
      pdf.moveDown(0.3)
      pdf.font("Helvetica-Bold").fontSize(11).text(line.replace(/^##\s+/, ""))
      pdf.font("Helvetica").fontSize(10.5)
    } else if (line.startsWith("### ")) {
      pdf.moveDown(0.2)
      pdf.font("Helvetica-Bold").fontSize(10.5).text(line.replace(/^###\s+/, ""))
      pdf.font("Helvetica").fontSize(10.5)
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      pdf.text(`• ${line.replace(/^[-*]\s+/, "")}`, { indent: 12 })
    } else if (line.trim() === "") {
      pdf.moveDown(0.35)
    } else {
      pdf.text(line, { align: "left" })
    }
  }

  const buffer = await collectPdf(pdf)
  const filenameSafe = `${options.type}-${job.title}`
    .replace(/[^a-z0-9-_]+/gi, "-")
    .slice(0, 60)
  return {
    buffer,
    filename: `${filenameSafe}.pdf`,
    contentType: "application/pdf" as const,
  }
}
