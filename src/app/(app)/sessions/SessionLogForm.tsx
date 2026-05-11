"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { dict, type Lang } from "@/lib/i18n";
import { SessionModeAndStudents } from "@/components/SessionModeAndStudents";
import { SessionDatePicker } from "@/components/SessionDatePicker";
import {
  clearSessionLogDraft,
  createEmptySessionLogDraft,
  readSessionLogDraft,
  writeSessionLogDraft,
  type SessionLogDraft,
} from "@/lib/session-log-draft";
import { createSession } from "./actions";

type Venue = { id: string; name: string };
type Mode = { id: string; code: string; label: string; default_price_cents: number };
type Student = { id: string; name: string };

export function SessionLogForm({
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
  const d = dict[lang];
  const searchParams = useSearchParams();
  const [draft, setDraft] = useState<SessionLogDraft>(() => createEmptySessionLogDraft());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const toast = searchParams.get("toast");
    const msg = searchParams.get("msg") ?? "";
    if (toast === "success" && msg.includes("保存成功")) {
      clearSessionLogDraft();
      setDraft(createEmptySessionLogDraft());
    } else {
      const saved = readSessionLogDraft();
      if (saved) setDraft(saved);
    }
    setHydrated(true);
  }, [searchParams]);

  useEffect(() => {
    if (!hydrated) return;
    writeSessionLogDraft(draft);
  }, [draft, hydrated]);

  function patchDraft(partial: Partial<SessionLogDraft>) {
    setDraft((current) => ({ ...current, ...partial }));
  }

  function clearAll() {
    clearSessionLogDraft();
    setDraft(createEmptySessionLogDraft());
  }

  if (!hydrated) {
    return (
      <div className="scroll-mt-24 space-y-5 rounded-2xl border border-slate-200 bg-white p-6">
        <div className="border-b border-slate-100 pb-4">
          <h2 className="text-sm font-semibold text-slate-900">{d.log_new_session}</h2>
        </div>
        <p className="text-sm text-slate-500">{lang === "zh" ? "加载中…" : "Loading…"}</p>
      </div>
    );
  }

  return (
    <form
      id="session-log"
      action={createSession}
      className="scroll-mt-24 space-y-4 rounded-2xl border border-slate-200 bg-white p-6"
    >
      <div className="border-b border-slate-100 pb-4">
        <h2 className="text-sm font-semibold text-slate-900">{d.log_new_session}</h2>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-slate-900">
            {lang === "zh" ? "上课日期" : "Date"}
          </label>
          <SessionDatePicker
            lang={lang}
            value={draft.sessionDate}
            onValueChange={(sessionDate) => patchDraft({ sessionDate })}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-900">
            {lang === "zh" ? "场地" : "Venue"}
          </label>
          <select
            name="venueId"
            value={draft.venueId}
            onChange={(e) => patchDraft({ venueId: e.target.value })}
            className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-500/25"
          >
            <option value="">{lang === "zh" ? "（不选）" : "(None)"}</option>
            {venues.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <SessionModeAndStudents
        lang={lang}
        modes={modes}
        students={students}
        showStudentNotes={false}
        lessonModeId={draft.lessonModeId}
        onLessonModeIdChange={(lessonModeId) => patchDraft({ lessonModeId })}
        selectedStudentIds={draft.studentIds}
        onSelectedStudentIdsChange={(studentIds) => patchDraft({ studentIds })}
        returnTo="/sessions"
      >
        <div>
          <label className="block text-sm font-medium text-slate-900">
            {lang === "zh" ? "课程记录（这次 + 下次）" : "Class notes (this + next)"}
          </label>
          <textarea
            name="content"
            rows={7}
            value={draft.content}
            onChange={(e) => patchDraft({ content: e.target.value })}
            className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-500/25"
            placeholder={
              lang === "zh"
                ? "这次：……\n下次：……"
                : "This: ...\nNext: ..."
            }
          />
        </div>
      </SessionModeAndStudents>

      <div className="flex flex-wrap items-center gap-3 pt-2">
        <button
          type="submit"
          className="rounded-xl bg-gradient-to-r from-sky-600 to-sky-700 px-4 py-2 text-sm font-medium text-white shadow-sm shadow-sky-900/15 hover:from-sky-700 hover:to-sky-800"
        >
          {lang === "zh" ? "保存" : "Save"}
        </button>
        <button
          type="button"
          onClick={clearAll}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          {lang === "zh" ? "清空" : "Clear"}
        </button>
      </div>
    </form>
  );
}
