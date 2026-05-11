"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { Lang } from "@/lib/i18n";
import { clearSessionLogDraft, readSessionLogDraft } from "@/lib/session-log-draft";
import { PanelExpandPlusIcon } from "@/components/PanelExpandPlusIcon";
import { SessionLogForm } from "./SessionLogForm";

type Venue = { id: string; name: string };
type Mode = { id: string; code: string; label: string; default_price_cents: number };
type Student = { id: string; name: string };

export function SessionLogPanel({
  lang,
  venues,
  modes,
  students,
}: {
  lang: Lang;
  venues: Venue[];
  modes: Mode[];
  students: Student[];
}) {
  const [open, setOpen] = useState(false);
  const searchParams = useSearchParams();

  useEffect(() => {
    const toast = searchParams.get("toast");
    const msg = searchParams.get("msg") ?? "";
    if (toast === "success" && msg.includes("保存成功")) {
      clearSessionLogDraft();
      setOpen(false);
      return;
    }

    const draft = readSessionLogDraft();
    if (!draft) return;
    const hasDraft =
      draft.content.trim().length > 0 ||
      draft.lessonModeId.length > 0 ||
      draft.venueId.length > 0 ||
      draft.studentIds.length > 0;
    if (hasDraft) setOpen(true);
  }, [searchParams]);

  return (
    <div className="space-y-3">
      {open ? (
        <div className="rounded-2xl border border-slate-300 bg-white px-2 py-2 shadow-sm shadow-slate-200/40">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
          >
            <span>{lang === "zh" ? "收起" : "Hide"}</span>
            <span
              aria-hidden
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-sm font-bold leading-none text-slate-700 shadow-sm"
            >
              ▴
            </span>
          </button>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-300 bg-white px-2 py-2 shadow-sm shadow-slate-200/40">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
          >
            <PanelExpandPlusIcon />
            <span>{lang === "zh" ? "记录一节课" : "Log a class"}</span>
          </button>
        </div>
      )}

      {open ? (
        <Suspense
          fallback={
            <div className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
              {lang === "zh" ? "加载中…" : "Loading…"}
            </div>
          }
        >
          <SessionLogForm lang={lang} venues={venues} modes={modes} students={students} />
        </Suspense>
      ) : null}
    </div>
  );
}

