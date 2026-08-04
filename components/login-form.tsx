"use client"

import { useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import {
  AuthFormLayout,
  AuthInput,
  AuthLogo,
  authSubmitButtonClassName,
  maskUsername,
} from "@/components/auth-ui"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { useFormLoading } from "@/components/loading-submit-button"
import { saveAuthUser } from "@/lib/auth-storage"
import { cn } from "@/lib/utils"

type LoginStep = "username" | "password"

function LoginFormContent({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { isLoading, handleSubmit } = useFormLoading()
  const [identifier, setIdentifier] = useState(
    () => searchParams.get("user")?.toLowerCase() ?? "",
  )
  const stepParam = searchParams.get("step")
  const step: LoginStep = stepParam === "password" ? "password" : "username"

  function clearRememberedUser() {
    setIdentifier("")
    router.replace(pathname)
  }

  return (
    <div className={cn("flex w-full flex-col gap-10", className)} {...props}>
      <div className="flex flex-col gap-8 text-center">
        <AuthLogo />
        <div className="flex flex-col gap-3">
          <h1 className="text-[1.75rem] font-semibold tracking-[-0.03em] text-foreground">
            {step === "username"
              ? "Welcome to AI Job Automation"
              : "Enter your password"}
          </h1>
          {step === "password" ? (
            <p className="text-[0.9375rem] font-normal tracking-[-0.01em] text-muted-foreground">
              Signing in as{" "}
              <span className="rounded-md bg-muted px-2 py-1 font-medium text-foreground">
                {maskUsername(identifier)}
              </span>
            </p>
          ) : null}
        </div>
      </div>

      <form
        key={step}
        autoComplete="off"
        className="flex flex-col gap-5"
        onSubmit={(event) => {
          event.preventDefault()

          if (step === "username") {
            void handleSubmit(event, async () => {
              const formData = new FormData(event.currentTarget)
              const value = String(formData.get("login-username") ?? "")
                .trim()
                .toLowerCase()

              if (!value) {
                toast.error("Email or username is required.")
                return
              }

              setIdentifier(value)
              router.push(
                `${pathname}?step=password&user=${encodeURIComponent(value)}`,
                { scroll: false },
              )
            })
            return
          }

          void handleSubmit(event, async () => {
            const formData = new FormData(event.currentTarget)
            const response = await fetch("/api/auth/login", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({
                identifier,
                password: formData.get("login-password"),
              }),
            })
            const data = await response.json()

            if (!response.ok) {
              toast.error(data.error ?? "Invalid email/username or password.")
              return
            }

            if (data.user) {
              saveAuthUser(data.user)
            }

            toast.success("Login successful.")
            router.push("/admin/dashboard")
            router.refresh()
          })
        }}
      >
        {step === "username" ? (
          <AuthInput
            key="username"
            id="login-username"
            name="login-username"
            type="text"
            placeholder="email or username"
            autoComplete="off"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            autoFocus
            required
            disabled={isLoading}
            loading={isLoading}
            halfMask
            showArrow
          />
        ) : (
          <>
            <AuthInput
              key="password"
              id="login-password"
              name="login-password"
              type="password"
              placeholder="Password"
              autoComplete="current-password"
              autoFocus
              required
              disabled={isLoading}
              loading={isLoading}
              showPasswordToggle
            />

            <Button
              type="submit"
              disabled={isLoading}
              size="lg"
              className={authSubmitButtonClassName}
            >
              {isLoading ? (
                <>
                  <Spinner data-icon="inline-start" />
                  Signing in...
                </>
              ) : (
                "Sign in"
              )}
            </Button>

            <Button
              type="button"
              variant="ghost"
              className="h-10 w-full rounded-full text-sm"
              disabled={isLoading}
              onClick={clearRememberedUser}
            >
              Use a different account
            </Button>
          </>
        )}
      </form>
    </div>
  )
}

export function LoginFormLayout({ children }: { children: React.ReactNode }) {
  return <AuthFormLayout>{children}</AuthFormLayout>
}

export function LoginForm(props: React.ComponentProps<"div">) {
  return (
    <AuthFormLayout>
      <LoginFormContent {...props} />
    </AuthFormLayout>
  )
}
