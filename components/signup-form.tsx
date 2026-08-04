"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  AuthFormLayout,
  AuthInput,
  AuthLogo,
  authSubmitButtonClassName,
} from "@/components/auth-ui"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { useFormLoading } from "@/components/loading-submit-button"
import { cn } from "@/lib/utils"

function SignupFormContent({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const router = useRouter()
  const { isLoading, handleSubmit } = useFormLoading()

  return (
    <div className={cn("flex w-full flex-col gap-10", className)} {...props}>
      <div className="flex flex-col gap-8 text-center">
        <AuthLogo />
        <div className="flex flex-col gap-3">
          <h1 className="text-[1.75rem] font-semibold tracking-[-0.03em] text-foreground">
            Create your account
          </h1>
          <p className="text-[0.9375rem] font-normal tracking-[-0.01em] text-muted-foreground">
            Your username is created automatically from your full name.
          </p>
        </div>
      </div>

      <form
        autoComplete="off"
        className="flex flex-col gap-5"
        onSubmit={(event) => {
          void handleSubmit(event, async () => {
            const formData = new FormData(event.currentTarget)
            const fullName = String(formData.get("fullName") ?? "").trim()
            const email = String(formData.get("email") ?? "").trim()
            const password = String(formData.get("password") ?? "")
            const confirmPassword = String(
              formData.get("confirmPassword") ?? "",
            )

            if (!fullName || !email || !password) {
              toast.error("Full name, email, and password are required.")
              return
            }

            if (password.length < 8) {
              toast.error("Password must be at least 8 characters long.")
              return
            }

            if (password !== confirmPassword) {
              toast.error("Passwords do not match.")
              return
            }

            const response = await fetch("/api/auth/signup", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ fullName, email, password }),
            })
            const data = await response.json()

            if (!response.ok) {
              toast.error(data.error ?? "Failed to create account.")
              return
            }

            toast.success(
              `Account created. Your username is ${data.user.username}.`,
            )
            router.push("/login")
          })
        }}
      >
        <AuthInput
          id="fullName"
          name="fullName"
          type="text"
          placeholder="Full name"
          autoComplete="name"
          autoFocus
          required
          disabled={isLoading}
          loading={isLoading}
        />
        <AuthInput
          id="email"
          name="email"
          type="email"
          placeholder="Email"
          autoComplete="email"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          required
          disabled={isLoading}
          loading={isLoading}
        />
        <AuthInput
          id="password"
          name="password"
          type="password"
          placeholder="Password"
          autoComplete="new-password"
          minLength={8}
          required
          disabled={isLoading}
          loading={isLoading}
          showPasswordToggle
        />
        <AuthInput
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          placeholder="Confirm password"
          autoComplete="new-password"
          minLength={8}
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
              Creating account...
            </>
          ) : (
            "Create account"
          )}
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Sign in
          </Link>
        </p>
      </form>
    </div>
  )
}

export function SignupForm(props: React.ComponentProps<"div">) {
  return (
    <AuthFormLayout>
      <SignupFormContent {...props} />
    </AuthFormLayout>
  )
}
