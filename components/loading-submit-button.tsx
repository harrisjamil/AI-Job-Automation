"use client"

import { useState, type FormEvent } from "react"

const MIN_LOADING_MS = 600

export function useFormLoading() {
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
    onSubmit?: () => void | Promise<void>,
  ) {
    event.preventDefault()
    setIsLoading(true)

    const start = Date.now()

    try {
      await onSubmit?.()
    } finally {
      const elapsed = Date.now() - start
      const remaining = Math.max(0, MIN_LOADING_MS - elapsed)

      if (remaining > 0) {
        await new Promise((resolve) => setTimeout(resolve, remaining))
      }

      setIsLoading(false)
    }
  }

  return { isLoading, handleSubmit, setIsLoading }
}
