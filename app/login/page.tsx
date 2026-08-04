import { Suspense } from "react"
import { redirect } from "next/navigation"
import { LoginForm, LoginFormLayout } from "@/components/login-form"
import { Spinner } from "@/components/ui/spinner"
import { getCurrentUser } from "@/lib/session"

function LoginFallback() {
  return (
    <LoginFormLayout>
      <div className="flex min-h-40 items-center justify-center">
        <Spinner className="size-6" />
      </div>
    </LoginFormLayout>
  )
}

export default async function Page() {
  const user = await getCurrentUser()

  if (user) {
    redirect("/admin/dashboard")
  }

  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginForm />
    </Suspense>
  )
}
