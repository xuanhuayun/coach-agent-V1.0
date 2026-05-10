"use client";

import { useState } from "react";
import type { Lang } from "@/lib/i18n";
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
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex w-full items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-800 shadow-sm shadow-slate-200/40 hover:bg-slate-50"
      >
        {open
          ? lang === "zh"
            ? "收起约课"
            : "Hide booking"
          : lang === "zh"
            ? "＋ 约课"
            : "+ Book"}
      </button>

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

