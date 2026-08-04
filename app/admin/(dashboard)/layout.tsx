import { redirect } from "next/navigation"
import { AdminShell } from "@/components/admin/admin-shell"
import { getCurrentUser } from "@/lib/session"

export default async function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()

  if (!user) {
    redirect("/login")
  }

  return <AdminShell>{children}</AdminShell>
}
