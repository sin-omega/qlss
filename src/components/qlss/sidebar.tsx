"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignOutButton } from "@/components/qlss/sign-out-button";
import { User } from "lucide-react";

const NAV_ITEMS = [
  { href: "/dashboard/shortener", label: "shortener" },
  { href: "/dashboard/links", label: "links" },
  { href: "/dashboard/overview", label: "overview" },
  { href: "/dashboard/profile", label: "profile" },
  { href: "/dashboard/profile-stats", label: "profile stats" },
  { href: "/dashboard/account", label: "account" },
] as const;

/**
 * Sidebar nav for the dashboard. Client component so we can read
 * `usePathname()` to highlight the active link.
 *
 * Desktop (md+): vertical sidebar on the left.
 * Mobile: horizontal nav bar at the top.
 *
 * Below the nav: link to the user's public profile page (`/@username`).
 */
export function Sidebar({ username }: { username: string }) {
  const pathname = usePathname();
  const profileHref = `/@${username}`;

  return (
    <aside className="w-full md:w-52 md:h-full shrink-0 border-b md:border-b-0 md:border-r border-border bg-background">
      <div className="p-4 flex md:flex-col flex-row items-center md:items-stretch justify-between md:justify-start gap-4 md:gap-0 md:h-full">
        {/* Wordmark */}
        <Link
          href="/dashboard"
          className="font-bold tracking-tight text-sm hover:opacity-70 transition-opacity md:mb-6"
        >
          QLSS
        </Link>

        {/* Nav */}
        <nav className="flex md:flex-col flex-row gap-1 md:gap-0.5 md:flex-1">
          {NAV_ITEMS.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-2 py-1 text-xs transition-colors whitespace-nowrap ${
                  active
                    ? "text-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {active ? "> " : "  "}
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Bottom: profile link + username + sign out */}
        <div className="flex md:flex-col flex-row items-center md:items-stretch gap-3 md:gap-2 md:mt-auto">
          <Link
            href={profileHref}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1.5"
            title={`View your public profile at ${profileHref}`}
          >
            <User className="h-3 w-3" />
            <span className="hidden md:inline">view</span>
          </Link>
          <span className="text-xs text-muted-foreground hidden md:inline truncate">
            @{username}
          </span>
          <SignOutButton />
        </div>
      </div>
    </aside>
  );
}
