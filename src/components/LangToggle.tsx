"use client";

import { useRouter } from "next/navigation";
import { LANG_COOKIE, type Lang } from "@/lib/i18n";

function setCookie(name: string, value: string) {
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=31536000; SameSite=Lax`;
}

export function LangToggle({ value }: { value: Lang }) {
  const router = useRouter();
  const next: Lang = value === "zh" ? "en" : "zh";

  return (
    <button
      type="button"
      onClick={() => {
        setCookie(LANG_COOKIE, next);
        router.refresh();
      }}
      className="rounded-2xl border border-slate-300 bg-white/90 px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm shadow-slate-200/40 hover:bg-slate-50"
      title="Toggle language"
    >
      {value === "zh" ? "中文 / EN" : "EN / 中文"}
    </button>
  );
}

