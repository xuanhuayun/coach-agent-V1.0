"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type ToastType = "success" | "error";

export function ToastBar() {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname() ?? "";

  const toast = sp.get("toast") as ToastType | null;
  const msg = sp.get("msg");

  const show = toast && msg;

  const className = useMemo(() => {
    if (toast === "success") {
      return "border-emerald-200 bg-emerald-50 text-emerald-900";
    }
    if (toast === "error") {
      return "border-red-200 bg-red-50 text-red-900";
    }
    return "border-slate-200 bg-white text-slate-700";
  }, [toast]);

  const [visible, setVisible] = useState<boolean>(false);

  useEffect(() => {
    setVisible(Boolean(show));
    if (!show) return;
    const timeoutMs = toast === "error" ? 12000 : 3200;
    const t = window.setTimeout(() => {
      dismiss();
    }, timeoutMs);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show, toast]);

  function dismiss() {
    const next = new URL(window.location.href);
    next.searchParams.delete("toast");
    next.searchParams.delete("msg");
    router.replace(pathname + (next.search ? next.search : ""));
    setVisible(false);
  }

  if (!visible || !show) return null;

  if (toast === "error") {
    return (
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className={`mt-3 rounded-2xl border px-4 py-3 text-sm ${className}`}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 cursor-text select-text whitespace-pre-wrap break-words">{msg}</div>
            <button
              type="button"
              onClick={dismiss}
              className="shrink-0 rounded-lg border border-red-200 bg-white px-2.5 py-1 text-xs font-semibold text-red-800 hover:bg-red-100"
              aria-label="关闭"
            >
              关闭
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6">
      <div className={`mt-3 rounded-2xl border px-4 py-3 text-sm ${className}`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 whitespace-pre-wrap break-words">{msg}</div>
          <button
            type="button"
            onClick={dismiss}
            className="shrink-0 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            aria-label="关闭"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}
