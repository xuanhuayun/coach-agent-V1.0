import type { Lang } from "@/lib/i18n";

export function LoadingHint({ lang }: { lang: Lang }) {
  return (
    <div
      className="flex items-center gap-2 rounded-xl border border-sky-100 bg-sky-50/90 px-3 py-2 text-sm text-sky-950"
      role="status"
      aria-live="polite"
    >
      <span
        aria-hidden
        className="inline-block h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-sky-200 border-t-sky-600"
      />
      <span>{lang === "zh" ? "请稍等…" : "Please wait…"}</span>
    
    </div>
  );
}

export function LoadingHintStatic() {
  return (
    <div
      className="flex items-center gap-2 rounded-xl border border-sky-100 bg-sky-50/90 px-3 py-2 text-sm text-sky-950"
      role="status"
      aria-live="polite"
    >
      <span
        aria-hidden
        className="inline-block h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-sky-200 border-t-sky-600"
      />
      <span>请稍等…</span>
    </div>
  );
}
