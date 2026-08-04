import { Plus_Jakarta_Sans } from "next/font/google"
import { cn } from "@/lib/utils"

export const authFont = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-auth",
  weight: ["400", "500", "600", "700"],
})

export const authFontClassName = cn(
  authFont.variable,
  "font-[family-name:var(--font-auth)] antialiased [font-feature-settings:'cv02','cv03','cv04','cv11']",
)
