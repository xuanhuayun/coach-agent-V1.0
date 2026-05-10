"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Item = {
  href: string;
  label: string;
  activePrefix: string;
};

export function TopModuleNav({ items }: { items: Item[] }) {
  const pathname = usePathname() ?? "";

  return (
    <nav className="flex flex-wrap items-center justify-start gap-2">
      {items.map((it) => {
        const active = pathname.startsWith(it.activePrefix);
        return (
          <Link
            key={it.href}
            href={it.href}
            className={`rounded-full px-3 py-2 text-xs font-semibold transition-colors ${
              active
                ? "bg-slate-900 text-white shadow-sm shadow-slate-900/10"
                : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            {it.label}
          </Link>
        );
      })}
    </nav>
  );
}

