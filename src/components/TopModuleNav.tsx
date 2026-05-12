"use client";

import Link from "next/link";
import { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";

type Item = {
  href: string;
  label: string;
  activePrefix: string;
};

function TopNavLinkLabel({ label }: { label: string }) {
  const { pending } = useLinkStatus();
  return <>{pending ? "请稍等…" : label}</>;
}

export function TopModuleNav({ items }: { items: Item[] }) {
  const pathname = usePathname() ?? "";

  return (
    <nav className="-mx-4 flex items-center gap-2 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 [&::-webkit-scrollbar]:hidden">
      {items.map((it) => {
        const active = pathname.startsWith(it.activePrefix);
        return (
          <Link
            key={it.href}
            href={it.href}
            prefetch
            className={`shrink-0 touch-manipulation rounded-full px-3 py-2.5 text-xs font-semibold transition-colors sm:py-2 ${
              active
                ? "bg-sky-700 text-white shadow-sm shadow-sky-900/10"
                : "border border-sky-200 bg-white text-slate-700 hover:bg-sky-50/80"
            }`}
          >
            <TopNavLinkLabel label={it.label} />
          </Link>
        );
      })}
    </nav>
  );
}
