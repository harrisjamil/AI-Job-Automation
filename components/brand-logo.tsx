import { cn } from "@/lib/utils"

const logoSizes = {
  sm: "size-8 text-sm",
  lg: "size-20 text-2xl",
} as const

type BrandLogoProps = {
  size?: keyof typeof logoSizes
  className?: string
  priority?: boolean
}

export function BrandLogo({ size = "sm", className }: BrandLogoProps) {
  return (
    <div
      className={cn(
        "flex aspect-square items-center justify-center overflow-hidden rounded-lg bg-primary font-semibold text-primary-foreground",
        logoSizes[size],
        className,
      )}
      aria-label="AI Job Automation"
    >
      AJ
    </div>
  )
}
