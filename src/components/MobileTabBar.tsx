"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/bookings", match: (p: string) => p.startsWith("/bookings") },
  { href: "/sessions", match: (p: string) => p.startsWith("/sessions") },
  { href: "/students", match: (p: string) => p.startsWith("/students") },
  { href: "/revenue", match: (p: string) => p.startsWith("/revenue") },
  { href: "/settings", match: (p: string) => p.startsWith("/settings") },
] as const;

export function MobileTabBar({
  labels,
}: {
  labels: Record<(typeof tabs)[number]["href"], string>;
}) {
  const pathname = usePathname() ?? "";

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200/90 bg-white/85 backdrop-blur-lg sm:hidden"
      style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
    >
      <div className="mx-auto flex max-w-lg justify-between gap-1 px-2 pt-1">
        {tabs.map((tab) => {
          const active = tab.match(pathname);
          const label = labels[tab.href];
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center rounded-2xl px-1 py-1.5 text-xs font-semibold leading-tight transition-colors ${
                active
                  ? "bg-slate-200/80 text-slate-800 shadow-inner shadow-slate-300/40"
                  : "text-slate-500 active:bg-slate-50"
              }`}
            >
              <span className="text-sm leading-none" aria-hidden>
                {tab.href === "/bookings"
                  ? "🗓️"
                  : tab.href === "/sessions"
                    ? "📚"
                    : tab.href === "/students"
                      ? "👥"
                      : tab.href === "/revenue"
                        ? "📊"
                        : "⚙️"}
              </span>
              <span className="mt-0.5 line-clamp-2 text-center">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
