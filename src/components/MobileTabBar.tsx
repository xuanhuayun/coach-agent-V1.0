"use client";

import Link from "next/link";
import { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/bookings", match: (p: string) => p.startsWith("/bookings") },
  { href: "/sessions", match: (p: string) => p.startsWith("/sessions") },
  { href: "/students", match: (p: string) => p.startsWith("/students") },
  { href: "/revenue", match: (p: string) => p.startsWith("/revenue") },
  { href: "/settings", match: (p: string) => p.startsWith("/settings") },
] as const;

function MobileTabLinkContent({
  label,
  href,
}: {
  label: string;
  href: (typeof tabs)[number]["href"];
}) {
  const { pending } = useLinkStatus();

  return (
    <>
      <span className="text-sm leading-none" aria-hidden>
        {href === "/bookings"
          ? "🗓️"
          : href === "/sessions"
            ? "📚"
            : href === "/students"
              ? "👥"
              : href === "/revenue"
                ? "📊"
                : "⚙️"}
      </span>
      <span className="mt-0.5 line-clamp-2 text-center">{pending ? "请稍等…" : label}</span>
    </>
  );
}

export function MobileTabBar({
  labels,
}: {
  labels: Record<(typeof tabs)[number]["href"], string>;
}) {
  const pathname = usePathname() ?? "";

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-sky-100/90 bg-sky-50/92 backdrop-blur-lg sm:hidden"
      style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
    >
      <div className="mx-auto flex max-w-lg justify-between gap-1.5 px-2 pt-1.5">
        {tabs.map((tab) => {
          const active = tab.match(pathname);
          const label = labels[tab.href];
          return (
            <Link
              key={tab.href}
              href={tab.href}
              prefetch
              className={`relative flex min-h-14 min-w-0 flex-1 touch-manipulation flex-col items-center justify-center rounded-2xl px-2 py-2 text-xs font-semibold leading-tight transition-colors ${
                active
                  ? "bg-sky-100/90 text-sky-950 shadow-inner shadow-sky-200/50"
                  : "text-slate-600 active:bg-sky-50/80"
              }`}
            >
              <MobileTabLinkContent label={label} href={tab.href} />
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
