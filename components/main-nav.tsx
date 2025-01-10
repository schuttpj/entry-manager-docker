import Link from "next/link"
import { usePathname } from "next/navigation"

import { cn } from "@/lib/utils"

export function MainNav() {
  const pathname = usePathname()

  return (
    <div className="mr-4 hidden md:flex">
      <Link href="/" className="mr-6 flex items-center space-x-2">
        <span className="hidden font-bold sm:inline-block">
          Notebook LM
        </span>
      </Link>
      <nav className="flex items-center space-x-6 text-sm font-medium">
        <Link
          href="/"
          className={cn(
            "transition-colors hover:text-foreground/80",
            pathname === "/" ? "text-foreground" : "text-foreground/60"
          )}
        >
          Upload
        </Link>
        <Link
          href="/content"
          className={cn(
            "transition-colors hover:text-foreground/80",
            pathname?.startsWith("/content")
              ? "text-foreground"
              : "text-foreground/60"
          )}
        >
          Content
        </Link>
        <Link
          href="/settings"
          className={cn(
            "transition-colors hover:text-foreground/80",
            pathname?.startsWith("/settings")
              ? "text-foreground"
              : "text-foreground/60"
          )}
        >
          Settings
        </Link>
      </nav>
    </div>
  )
}

