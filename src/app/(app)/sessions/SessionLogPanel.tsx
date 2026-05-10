"use client";

import { useState } from "react";
import type { Lang } from "@/lib/i18n";
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

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex w-full items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-800 shadow-sm shadow-slate-200/40 hover:bg-slate-50"
      >
        {open ? (lang === "zh" ? "收起" : "Hide") : lang === "zh" ? "＋ 记录一节课" : "+ Log a class"}
      </button>

      {open ? (
        <SessionLogForm lang={lang} venues={venues} modes={modes} students={students} />
      ) : null}
    </div>
  );
}

