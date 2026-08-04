"use client"

import { useState } from "react"
import { ArrowRight, Eye, EyeOff } from "lucide-react"
import { BrandLogo } from "@/components/brand-logo"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { authFontClassName } from "@/lib/auth-font"
import { cn } from "@/lib/utils"

export function maskUsername(value: string) {
  if (value.length <= 1) {
    return "*"
  }

  if (value.length === 2) {
    return `${value[0]}*`
  }

  return `${value[0]}${"*".repeat(value.length - 2)}${value.at(-1)}`
}

function maskAll(value: string) {
  return "*".repeat(value.length)
}

function maskExceptLast(value: string) {
  if (!value) {
    return ""
  }

  if (value.length === 1) {
    return value
  }

  return "*".repeat(value.length - 1) + value.at(-1)
}

const authInputClassName =
  "h-12 w-full rounded-full border-0 bg-background px-5 font-[family-name:var(--font-auth)] text-[0.9375rem] font-normal tracking-[-0.01em] shadow-[0_4px_14px_rgba(0,0,0,0.1)] outline-none ring-0 transition-none placeholder:text-muted-foreground/60 focus:border-0 focus:outline-none focus:ring-0 focus:shadow-[0_4px_14px_rgba(0,0,0,0.1)] focus-visible:border-0 focus-visible:outline-none focus-visible:ring-0 focus-visible:shadow-[0_4px_14px_rgba(0,0,0,0.1)] dark:shadow-[0_4px_14px_rgba(0,0,0,0.35)] dark:focus:shadow-[0_4px_14px_rgba(0,0,0,0.35)] dark:focus-visible:shadow-[0_4px_14px_rgba(0,0,0,0.35)]"

export function AuthLogo() {
  return (
    <div className="flex justify-center">
      <BrandLogo size="lg" priority />
    </div>
  )
}

export function AuthFormLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={cn(
        authFontClassName,
        "flex min-h-svh w-full items-center justify-center px-6 pb-10 md:px-10",
      )}
    >
      <div className="w-full max-w-sm">{children}</div>
    </div>
  )
}

export const authSubmitButtonClassName =
  "h-12 w-full rounded-full text-[0.9375rem] font-semibold tracking-[-0.01em] shadow-[0_4px_14px_rgba(0,0,0,0.15)]"

export function AuthInput({
  loading,
  showArrow = false,
  showPasswordToggle = false,
  halfMask = false,
  ...props
}: React.ComponentProps<typeof Input> & {
  loading?: boolean
  showArrow?: boolean
  showPasswordToggle?: boolean
  halfMask?: boolean
}) {
  const [showPassword, setShowPassword] = useState(false)
  const [maskedValue, setMaskedValue] = useState(() =>
    String(props.defaultValue ?? props.value ?? ""),
  )
  const [fullyMasked, setFullyMasked] = useState(false)
  const hasTrailingAction = showArrow || showPasswordToggle
  const inputType =
    showPasswordToggle && showPassword ? "text" : props.type
  const {
    defaultValue: _defaultValue,
    value: _value,
    onChange,
    placeholder,
    className,
    ...inputProps
  } = props

  if (halfMask) {
    const displayValue = maskedValue
      ? fullyMasked
        ? maskAll(maskedValue)
        : maskExceptLast(maskedValue)
      : ""

    return (
      <div className="relative">
        <Input
          {...inputProps}
          placeholder=""
          value={maskedValue}
          onChange={(event) => {
            setMaskedValue(event.target.value)
            setFullyMasked(false)
            onChange?.(event)
          }}
          onFocus={() => setFullyMasked(false)}
          onBlur={() => setFullyMasked(true)}
          className={cn(
            authInputClassName,
            "text-transparent caret-foreground selection:bg-primary/20",
            hasTrailingAction && "pr-12",
            className,
          )}
        />
        <div
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute inset-0 flex items-center px-5 font-[family-name:var(--font-auth)] text-[0.9375rem] font-normal tracking-[-0.01em]",
            hasTrailingAction && "pr-12",
          )}
        >
          <span className="truncate">
            {displayValue ? (
              displayValue
            ) : (
              <span className="text-muted-foreground/60">{placeholder}</span>
            )}
          </span>
        </div>
        {showArrow ? (
          <button
            type="submit"
            disabled={props.disabled || loading}
            aria-label="Continue"
            className="absolute top-1/2 right-4 z-10 flex size-8 -translate-y-1/2 items-center justify-center rounded-full bg-muted text-gray-600 shadow-sm transition-colors hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
          >
            {loading ? (
              <Spinner className="size-4" />
            ) : (
              <ArrowRight className="size-4" />
            )}
          </button>
        ) : null}
      </div>
    )
  }

  return (
    <div className="relative">
      <Input
        {...props}
        type={inputType}
        className={cn(
          authInputClassName,
          hasTrailingAction && "pr-12",
          props.className,
        )}
      />
      {showArrow ? (
        <button
          type="submit"
          disabled={props.disabled || loading}
          aria-label="Continue"
          className="absolute top-1/2 right-4 flex size-8 -translate-y-1/2 items-center justify-center rounded-full bg-muted text-gray-600 shadow-sm transition-colors hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
        >
          {loading ? (
            <Spinner className="size-4" />
          ) : (
            <ArrowRight className="size-4" />
          )}
        </button>
      ) : null}
      {showPasswordToggle ? (
        <button
          type="button"
          disabled={props.disabled || loading}
          aria-label={showPassword ? "Hide password" : "Show password"}
          onClick={() => setShowPassword((current) => !current)}
          className="absolute top-1/2 right-4 flex size-8 -translate-y-1/2 items-center justify-center rounded-full text-gray-500 transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
        >
          {showPassword ? (
            <EyeOff className="size-4" />
          ) : (
            <Eye className="size-4" />
          )}
        </button>
      ) : null}
    </div>
  )
}
