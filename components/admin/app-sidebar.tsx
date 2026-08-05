"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import {
  BriefcaseBusinessIcon,
  LayoutDashboardIcon,
  Settings2Icon,
  LogOutIcon,
  ChevronsUpDownIcon,
  UserRoundIcon,
  BotIcon,
  ClipboardListIcon,
  RadarIcon,
  MessageSquareIcon,
  ChartColumnIcon,
  ListChecksIcon,
} from "lucide-react"
import { BrandLogo } from "@/components/brand-logo"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar"
import { clearAuthUser, getAuthUser } from "@/lib/auth-storage"
import { toast } from "sonner"

type SidebarUser = {
  name: string
  email: string
  username: string
}

const mainNav = [
  {
    title: "Dashboard",
    url: "/admin/dashboard",
    icon: LayoutDashboardIcon,
  },
  {
    title: "My Profile",
    url: "/admin/profile",
    icon: UserRoundIcon,
  },
  {
    title: "Discover Jobs",
    url: "/admin/jobs",
    icon: BriefcaseBusinessIcon,
  },
  {
    title: "Job Sources",
    url: "/admin/sources",
    icon: RadarIcon,
  },
  {
    title: "Applications",
    url: "/admin/applications",
    icon: ClipboardListIcon,
  },
  {
    title: "Apply queue",
    url: "/admin/apply-queue",
    icon: ListChecksIcon,
  },
  {
    title: "Analytics",
    url: "/admin/analytics",
    icon: ChartColumnIcon,
  },
  {
    title: "Assistant",
    url: "/admin/assistant",
    icon: MessageSquareIcon,
  },
  {
    title: "AI Platforms",
    url: "/admin/ai-platforms",
    icon: BotIcon,
  },
  {
    title: "Settings",
    url: "/admin/settings",
    icon: Settings2Icon,
  },
] as const

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
}

function isActivePath(pathname: string, url: string) {
  const normalizedPath =
    pathname.endsWith("/") && pathname.length > 1
      ? pathname.slice(0, -1)
      : pathname
  const normalizedUrl =
    url.endsWith("/") && url.length > 1 ? url.slice(0, -1) : url

  if (normalizedUrl === "/admin/dashboard") {
    return normalizedPath === normalizedUrl
  }

  return (
    normalizedPath === normalizedUrl ||
    normalizedPath.startsWith(`${normalizedUrl}/`)
  )
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()
  const router = useRouter()
  const { isMobile } = useSidebar()
  const [user, setUser] = useState<SidebarUser | null>(null)

  useEffect(() => {
    const stored = getAuthUser()
    if (stored) {
      setUser({
        name: stored.fullName,
        email: stored.email,
        username: stored.username,
      })
    }

    async function loadUser() {
      try {
        const response = await fetch("/api/auth/me")
        if (!response.ok) return
        const data = await response.json()
        setUser(data.user)
      } catch {
        // Keep footer empty when session is unavailable.
      }
    }

    void loadUser()
  }, [])

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" })
    clearAuthUser()
    toast.success("Signed out.")
    router.push("/login")
    router.refresh()
  }

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              className="cursor-default hover:bg-transparent active:bg-transparent"
              tooltip="AI Job Automation"
            >
              <BrandLogo size="sm" />
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold tracking-tight">
                  AI Job Automation
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  Admin Dashboard
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Main Menu</SidebarGroupLabel>
          <SidebarMenu>
            {mainNav.map((item) => (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  render={<Link href={item.url} />}
                  tooltip={item.title}
                  isActive={isActivePath(pathname, item.url)}
                >
                  <item.icon />
                  <span>{item.title}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <SidebarMenuButton
                    size="lg"
                    className="aria-expanded:bg-muted"
                  />
                }
              >
                <Avatar className="size-8 rounded-lg">
                  <AvatarFallback className="rounded-lg">
                    {user ? getInitials(user.name) : "AJ"}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">
                    {user?.name ?? "Admin"}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {user?.email ?? "Loading..."}
                  </span>
                </div>
                <ChevronsUpDownIcon className="ml-auto size-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-56"
                side={isMobile ? "bottom" : "right"}
                align="end"
                sideOffset={4}
              >
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="p-0 font-normal">
                    <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                      <Avatar className="size-8 rounded-lg">
                        <AvatarFallback className="rounded-lg">
                          {user ? getInitials(user.name) : "AJ"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="grid flex-1 text-left text-sm leading-tight">
                        <span className="truncate font-medium">
                          {user?.name ?? "Admin"}
                        </span>
                        <span className="truncate text-xs text-muted-foreground">
                          {user?.email ?? ""}
                        </span>
                      </div>
                    </div>
                  </DropdownMenuLabel>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem
                    onClick={() => router.push("/admin/profile")}
                  >
                    <UserRoundIcon />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => router.push("/admin/settings")}
                  >
                    <Settings2Icon />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => void handleLogout()}>
                    <LogOutIcon />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
