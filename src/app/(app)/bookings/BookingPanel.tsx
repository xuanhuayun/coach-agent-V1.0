"use client";

import { useState } from "react";
import type { Lang } from "@/lib/i18n";
import { PanelExpandPlusIcon } from "@/components/PanelExpandPlusIcon";
import { BookingForm } from "./BookingForm";

type Venue = { id: string; name: string };
type Mode = { id: string; code: string; label: string; default_price_cents: number };
type Student = { id: string; name: string };
type RecentStudent = { id: string; name: string; lastDate: string };

export function BookingPanel({
  lang,
  venues,
  modes,
  students,
  recentStudents,
  action,
}: {
  lang: Lang;
  venues: Venue[];
  modes: Mode[];
  students: Student[];
  recentStudents: RecentStudent[];
  action: (formData: FormData) => void;
}) {
  const [open, setOpen] = useState(false);

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
            <span>{lang === "zh" ? "约课" : "Book"}</span>
          </button>
        </div>
      )}

      {open ? (
        <BookingForm
          lang={lang}
          venues={venues}
          modes={modes}
          students={students}
          recentStudents={recentStudents}
          action={action}
        />
      ) : null}
    </div>
  );
}

