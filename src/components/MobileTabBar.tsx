"use client";

import Link from "next/link";
import { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  {
    href: "/bookings",
    icon: "/icons/tab-bookings.png",
    match: (p: string) => p.startsWith("/bookings"),
  },
  {
    href: "/sessions",
    icon: "/icons/tab-sessions.png",
    match: (p: string) => p.startsWith("/sessions"),
  },
  {
    href: "/students",
    icon: "/icons/tab-students.png",
    match: (p: string) => p.startsWith("/students"),
  },
  {
    href: "/revenue",
    icon: "/icons/tab-revenue.png",
    match: (p: string) => p.startsWith("/revenue"),
  },
  {
    href: "/settings",
    icon: "/icons/tab-settings.png",
    match: (p: string) => p.startsWith("/settings"),
  },
] as const;

function MobileTabLinkContent({
  label,
  icon,
}: {
  label: string;
  icon: (typeof tabs)[number]["icon"];
}) {
  const { pending } = useLinkStatus();

  return (
    <span className="flex min-w-0 items-center justify-center gap-1">
      <img
        src={icon}
        alt=""
        width={20}
        height={20}
        decoding="async"
        className="h-5 w-5 shrink-0 object-contain"
        aria-hidden
      />
      <span className="line-clamp-2 text-center leading-tight">
        {pending ? "请稍等…" : label}
      </span>
    </span>
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
              className={`relative flex min-h-14 min-w-0 flex-1 touch-manipulation items-center justify-center rounded-2xl px-1.5 py-2 text-[11px] font-semibold leading-tight transition-colors ${
                active
                  ? "bg-sky-100/90 text-sky-950 shadow-inner shadow-sky-200/50"
                  : "text-slate-600 active:bg-sky-50/80"
              }`}
            >
              <MobileTabLinkContent label={label} icon={tab.icon} />
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
