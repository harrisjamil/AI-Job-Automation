"use client"

import { useEffect, useRef, useState } from "react"
import { Bell, Search } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Switch } from "@/components/ui/switch"

type AdminHeaderProps = {
  title?: string
}

export function AdminHeader({
  title = "AI Job Automation",
}: AdminHeaderProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [isDarkTheme, setIsDarkTheme] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const savedTheme = localStorage.getItem("admin-theme")
    const useDark = savedTheme
      ? savedTheme === "dark"
      : window.matchMedia("(prefers-color-scheme: dark)").matches
    document.documentElement.classList.toggle("dark", useDark)
    setIsDarkTheme(useDark)
  }, [])

  function findInCurrentPage(query: string) {
    if (!query) return
    const findInWindow = (
      window as Window & {
        find?: (
          text: string,
          caseSensitive?: boolean,
          backwards?: boolean,
          wrapAround?: boolean,
          wholeWord?: boolean,
          searchInFrames?: boolean,
          showDialog?: boolean,
        ) => boolean
      }
    ).find
    findInWindow?.(query, false, false, true, false, false, false)
  }

  useEffect(() => {
    const query = searchQuery.trim()
    if (!query) return

    const timeout = window.setTimeout(() => {
      findInCurrentPage(query)
      const input = searchInputRef.current
      if (!input) return
      if (document.activeElement !== input) {
        input.focus()
      }
      const cursorPosition = input.value.length
      input.setSelectionRange(cursorPosition, cursorPosition)
    }, 120)

    return () => window.clearTimeout(timeout)
  }, [searchQuery])

  function handleThemeChange(checked: boolean) {
    setIsDarkTheme(checked)
    document.documentElement.classList.toggle("dark", checked)
    localStorage.setItem("admin-theme", checked ? "dark" : "light")
  }

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 data-vertical:h-4" />
      <h1 className="text-sm font-medium">{title}</h1>
      <div className="ml-auto flex items-center gap-2">
        <div className="hidden items-center gap-1 md:flex">
          <div className="relative">
            <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={searchInputRef}
              type="search"
              placeholder="Search..."
              className="h-8 w-48 bg-background/90 pl-8 lg:w-64"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key !== "Enter") return
                event.preventDefault()
                findInCurrentPage(searchQuery.trim())
              }}
            />
          </div>
        </div>
        <Button variant="ghost" size="icon" className="relative size-8">
          <Bell className="size-4" />
          <Badge className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full p-0 text-[10px]">
            2
          </Badge>
        </Button>
        <div className="hidden items-center gap-2 sm:flex">
          <Switch
            id="theme-toggle"
            checked={isDarkTheme}
            onCheckedChange={handleThemeChange}
          />
          <label
            htmlFor="theme-toggle"
            className="text-xs text-muted-foreground"
          >
            Theme
          </label>
        </div>
      </div>
    </header>
  )
}
