"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { Lang } from "@/lib/i18n";
import {
  formatLessonModeOption,
  requiredCountFromModeCode,
  resolveModeDurationHours,
} from "@/lib/lesson-mode";
import {
  clearBookingDraft,
  createEmptyBookingDraft,
  readBookingDraft,
  writeBookingDraft,
  type BookingDraft,
} from "@/lib/booking-draft";
import { NextBookingPicker } from "@/components/NextBookingPicker";
import { futureBookingStartError, isFutureBookingStart } from "@/lib/booking-time";
import {
  BOOKING_REPEAT_DEFAULT_COUNT,
  BOOKING_REPEAT_MAX_COUNT,
  type BookingRepeatType,
} from "@/lib/booking-recurrence";

type Venue = { id: string; name: string };
type Mode = {
  id: string;
  code: string;
  label: string;
  default_price_cents: number;
  default_duration_hours?: number | null;
};
type Student = { id: string; name: string };
type RecentStudent = { id: string; name: string; lastDate: string };

export function BookingForm({
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
  const searchParams = useSearchParams();
  const formRef = useRef<HTMLFormElement | null>(null);
  const bypassSubmitRef = useRef(false);
  const [draft, setDraft] = useState<BookingDraft>(() => createEmptyBookingDraft());
  const [hydrated, setHydrated] = useState(false);
  const [submitErr, setSubmitErr] = useState<string | null>(null);
  const [fieldErr, setFieldErr] = useState<{ mode?: string; time?: string }>({});

  useEffect(() => {
    const toast = searchParams.get("toast");
    const msg = searchParams.get("msg") ?? "";
    if (toast === "success" && msg.includes("保存成功")) {
      clearBookingDraft();
      setDraft(createEmptyBookingDraft());
    } else {
      const saved = readBookingDraft();
      if (saved) setDraft(saved);
    }
    setHydrated(true);
  }, [searchParams]);

  useEffect(() => {
    if (!hydrated) return;
    writeBookingDraft(draft);
  }, [draft, hydrated]);

  function patchDraft(partial: Partial<BookingDraft>) {
    setDraft((current) => ({ ...current, ...partial }));
  }

  const mode = useMemo(() => modes.find((m) => m.id === draft.modeId) ?? null, [modes, draft.modeId]);
  const requiredCount = requiredCountFromModeCode(mode?.code);
  const mismatch = requiredCount != null && draft.studentIds.length !== requiredCount;

  const selectedSet = useMemo(() => new Set(draft.studentIds), [draft.studentIds]);
  const filtered = useMemo(() => {
    const q = draft.query.trim().toLowerCase();
    if (!q) return [];
    return students.filter((s) => s.name.toLowerCase().includes(q));
  }, [students, draft.query]);

  function toggleStudent(id: string) {
    setSubmitErr(null);
    setFieldErr({});
    setDraft((current) => {
      const prev = current.studentIds;
      const exists = prev.includes(id);
      if (!exists && requiredCount && prev.length >= requiredCount) return current;
      const studentIds = exists ? prev.filter((x) => x !== id) : [...prev, id];
      return { ...current, studentIds };
    });
  }

  const selectedStudents = useMemo(() => {
    const byId = new Map(students.map((s) => [s.id, s]));
    return draft.studentIds.map((id) => byId.get(id)).filter(Boolean) as Student[];
  }, [students, draft.studentIds]);

  function clearAll() {
    clearBookingDraft();
    setDraft(createEmptyBookingDraft());
    setSubmitErr(null);
    setFieldErr({});
  }

  function onModeChange(nextModeId: string) {
    const nextMode = modes.find((m) => m.id === nextModeId) ?? null;
    const durationHours = nextMode ? resolveModeDurationHours(nextMode) : 2;
    const nextRequired = requiredCountFromModeCode(nextMode?.code);
    setDraft((current) => ({
      ...current,
      modeId: nextModeId,
      pickerDuration: durationHours === 1 ? "1" : "2",
      studentIds:
        nextRequired && current.studentIds.length > nextRequired
          ? current.studentIds.slice(0, nextRequired)
          : current.studentIds,
    }));
    setFieldErr((current) => ({ ...current, mode: undefined }));
    setSubmitErr(null);
  }

  if (!hydrated) {
    return (
      <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6">
        <p className="text-sm text-slate-500">{lang === "zh" ? "加载中…" : "Loading…"}</p>
      </div>
    );
  }

  return (
    <form
      ref={formRef}
      action={action}
      onSubmit={async (e) => {
        if (bypassSubmitRef.current) {
          bypassSubmitRef.current = false;
          return;
        }

        setSubmitErr(null);
        const nextFieldErr: { mode?: string; time?: string } = {};
        if (!draft.modeId) {
          nextFieldErr.mode = lang === "zh" ? "上课模式必选。" : "Mode is required.";
        }

        const fd = new FormData(e.currentTarget);
        const at = String(fd.get("nextBookingAt") ?? "").trim();
        if (!at) {
          nextFieldErr.time = lang === "zh" ? "约课时间必填。" : "Booking time is required.";
        }

        if (nextFieldErr.mode || nextFieldErr.time) {
          e.preventDefault();
          setFieldErr(nextFieldErr);
          return;
        }

        const dur = Number(fd.get("nextBookingDurationHours") ?? 2);
        let atIso = "";
        try {
          atIso = new Date(at).toISOString();
        } catch {
          atIso = "";
        }
        if (!atIso) {
          e.preventDefault();
          setFieldErr({
            time: lang === "zh" ? "约课时间格式不正确。" : "Invalid booking time.",
          });
          return;
        }
        if (!isFutureBookingStart(at)) {
          e.preventDefault();
          setFieldErr({ time: futureBookingStartError(lang) });
          return;
        }

        e.preventDefault();
        try {
          const res = await fetch("/api/bookings/conflicts", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ nextBookingAtIso: atIso, nextBookingDurationHours: dur }),
          });
          const json = (await res.json()) as { conflicts?: Array<{ id: string }> };
          const ids = Array.isArray(json?.conflicts)
            ? json.conflicts.map((c) => String(c.id))
            : [];
          const uniqueIds = Array.from(new Set(ids)).filter(Boolean);
          if (uniqueIds.length === 0) {
            bypassSubmitRef.current = true;
            formRef.current?.requestSubmit();
            return;
          }
          setSubmitErr(
            lang === "zh"
              ? `约课时间冲突：该时间段已有 ${uniqueIds.length} 条约课。请换个时间再保存。`
              : `Time conflict: ${uniqueIds.length} existing bookings. Please pick another time.`,
          );
          return;
        } catch {
          bypassSubmitRef.current = true;
          formRef.current?.requestSubmit();
        }
      }}
      className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6"
    >
      <div className="border-b border-slate-100 pb-4">
        <h2 className="text-sm font-semibold text-slate-900">
          {lang === "zh" ? "约课" : "Book"}
        </h2>
      </div>
      {submitErr ? <div className="select-text text-sm text-red-700">{submitErr}</div> : null}

      <div className="grid gap-4 sm:grid-cols-2">
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

        <div>
          <label className="block text-sm font-medium text-slate-900">
            {lang === "zh" ? "约课时间段（必填）" : "Time (required)"}
          </label>
          <NextBookingPicker
            lang={lang}
            open={draft.pickerOpen}
            onOpenChange={(open) => patchDraft({ pickerOpen: open })}
            chosen={draft.pickerChosen}
            onChosenChange={(chosen) => patchDraft({ pickerChosen: chosen })}
            date={draft.pickerDate}
            onDateChange={(date) => patchDraft({ pickerDate: date })}
            hour={draft.pickerHour}
            onHourChange={(hour) => patchDraft({ pickerHour: hour })}
            minute={draft.pickerMinute}
            onMinuteChange={(minute) => patchDraft({ pickerMinute: minute })}
            duration={draft.pickerDuration}
            onDurationChange={(duration) => patchDraft({ pickerDuration: duration })}
            durationEditable={!draft.modeId}
          />
          {fieldErr.time ? (
            <div className="mt-1 select-text text-sm text-red-700">{fieldErr.time}</div>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-slate-900">
            {lang === "zh" ? "重复约课" : "Repeat booking"}
          </label>
          <select
            name="bookingRepeatType"
            value={draft.repeatType}
            onChange={(e) =>
              patchDraft({
                repeatType: e.target.value as BookingRepeatType,
                repeatCount:
                  e.target.value === "none" ? BOOKING_REPEAT_DEFAULT_COUNT : draft.repeatCount,
              })
            }
            className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-500/25"
          >
            <option value="none">{lang === "zh" ? "不重复" : "No repeat"}</option>
            <option value="weekly">{lang === "zh" ? "每周重复" : "Weekly"}</option>
            <option value="biweekly">{lang === "zh" ? "每两周重复" : "Every 2 weeks"}</option>
            <option value="monthly">{lang === "zh" ? "每月重复" : "Monthly"}</option>
          </select>
        </div>

        {draft.repeatType !== "none" ? (
          <div>
            <label className="block text-sm font-medium text-slate-900">
              {lang === "zh" ? "重复次数（最多 20 次）" : "Repeat count (max 20)"}
            </label>
            <input
              type="number"
              name="bookingRepeatCount"
              min={1}
              max={BOOKING_REPEAT_MAX_COUNT}
              value={draft.repeatCount}
              onChange={(e) => {
                const parsed = Number.parseInt(e.target.value, 10);
                patchDraft({
                  repeatCount: Number.isFinite(parsed)
                    ? Math.min(BOOKING_REPEAT_MAX_COUNT, Math.max(1, parsed))
                    : BOOKING_REPEAT_DEFAULT_COUNT,
                });
              }}
              className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-500/25"
            />
          </div>
        ) : (
          <input type="hidden" name="bookingRepeatCount" value="1" />
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-slate-900">
            {lang === "zh" ? "上课模式（必选）" : "Mode (required)"}
          </label>
          <select
            name="lessonModeId"
            value={draft.modeId}
            onChange={(e) => onModeChange(e.target.value)}
            className={`mt-2 w-full rounded-xl border bg-white px-3 py-2 text-sm outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-500/25 ${
              fieldErr.mode || !draft.modeId ? "border-red-300" : "border-slate-300"
            }`}
          >
            <option value="">{lang === "zh" ? "请选择" : "Select"}</option>
            {modes.map((m) => (
              <option key={m.id} value={m.id}>
                {formatLessonModeOption(m, lang)}
              </option>
            ))}
          </select>
          {fieldErr.mode ? (
            <div className="mt-1 select-text text-sm text-red-700">{fieldErr.mode}</div>
          ) : !draft.modeId ? (
            <div className="mt-1 select-text text-sm text-red-700">
              {lang === "zh" ? "上课模式必选。" : "Mode is required."}
            </div>
          ) : null}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-900">
            {lang === "zh" ? "约课备注（可选）" : "Booking notes (optional)"}
          </label>
          <textarea
            name="remarks"
            rows={3}
            value={draft.remarks}
            onChange={(e) => patchDraft({ remarks: e.target.value })}
            className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-500/25"
            placeholder={lang === "zh" ? "例如：已确认场地/自带球…" : "e.g. confirmed court..."}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-900">
            {lang === "zh" ? "学员" : "Students"}
          </label>
          <div className="mt-2 space-y-3">
            {recentStudents.length > 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-3">
                <div className="text-xs font-semibold text-slate-700">
                  {lang === "zh" ? "最近三天上过课" : "Attended (last 3 days)"}
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {recentStudents.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => toggleStudent(s.id)}
                      className={`rounded-full border px-3 py-1 text-sm font-medium ${
                        selectedSet.has(s.id)
                          ? "border-sky-600/45 bg-sky-50/70 text-slate-900"
                          : "border-slate-200 bg-white text-slate-800 hover:border-slate-300"
                      }`}
                      title={lang === "zh" ? `最近上课：${s.lastDate}` : `Last class: ${s.lastDate}`}
                    >
                      {s.name}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <input
              type="search"
              value={draft.query}
              onChange={(e) => patchDraft({ query: e.target.value })}
              placeholder={lang === "zh" ? "搜索学员姓名" : "Search by name"}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-500/25"
              autoComplete="off"
            />

            {draft.query.trim() ? (
              filtered.length === 0 ? (
                <p className="text-sm text-slate-600/90">
                  {lang === "zh" ? "没有匹配的学员。" : "No matches."}
                </p>
              ) : (
                <div className="grid max-h-56 gap-2 overflow-y-auto sm:grid-cols-2 sm:max-h-64">
                  {filtered.map((s) => (
                    <label
                      key={s.id}
                      className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2.5 text-sm transition-colors ${
                        selectedSet.has(s.id)
                          ? "border-sky-600/45 bg-sky-50/70 text-slate-900 shadow-sm shadow-slate-200/30"
                          : "border-slate-200 bg-white/90 text-slate-800 hover:border-slate-300"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedSet.has(s.id)}
                        onChange={() => toggleStudent(s.id)}
                        className="h-4 w-4 shrink-0 rounded border-slate-400 text-sky-600 focus:ring-sky-500/30"
                      />
                      <span className="truncate font-medium">{s.name}</span>
                    </label>
                  ))}
                </div>
              )
            ) : null}

            {selectedStudents.length > 0 ? (
              <div className="space-y-2">
                <div className="text-xs font-semibold text-slate-700">
                  {lang === "zh" ? "已选学员" : "Selected"}
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {selectedStudents.map((s) => (
                    <div
                      key={s.id}
                      className="relative flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 pr-8"
                    >
                      <div className="truncate text-sm font-semibold text-slate-900">{s.name}</div>
                      <button
                        type="button"
                        onClick={() => {
                          const ok = window.confirm(
                            lang === "zh"
                              ? `确认移除学员「${s.name}」？`
                              : `Remove student “${s.name}”?`,
                          );
                          if (!ok) return;
                          toggleStudent(s.id);
                        }}
                        className="absolute right-2 top-2 inline-flex h-6 w-6 items-center justify-center rounded-full border border-red-200 bg-red-50 text-sm font-bold leading-none text-red-700 hover:bg-red-100"
                        aria-label={lang === "zh" ? `移除 ${s.name}` : `Remove ${s.name}`}
                        title={lang === "zh" ? "移除" : "Remove"}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-sm text-slate-600/90">
                {lang === "zh" ? "请至少选择 1 位学员。" : "Select at least 1 student."}
              </div>
            )}

            {draft.studentIds.map((id) => (
              <input key={id} type="hidden" name="studentIds" value={id} />
            ))}
          </div>
          {draft.modeId && requiredCount != null && mismatch ? (
            <div className="mt-1 select-text text-sm text-red-700">
              {lang === "zh"
                ? `该模式必须选择 ${requiredCount} 个学员。`
                : `This mode requires exactly ${requiredCount} students.`}
            </div>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={Boolean(mismatch)}
          className={`rounded-xl px-4 py-2 text-sm font-medium shadow-sm ${
            mismatch
              ? "cursor-not-allowed bg-slate-100 text-slate-300"
              : "bg-gradient-to-r from-sky-600 to-sky-700 text-white shadow-sky-900/15 hover:from-sky-700 hover:to-sky-800"
          }`}
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
