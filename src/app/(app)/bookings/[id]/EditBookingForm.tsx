"use client";

import { useMemo, useRef, useState } from "react";
import type { Lang } from "@/lib/i18n";
import { NextBookingPicker } from "@/components/NextBookingPicker";

type Venue = { id: string; name: string };
type Mode = { id: string; code: string; label: string; default_price_cents: number };
type Student = { id: string; name: string };

function requiredCountFromCode(code: string | null | undefined): number | null {
  if (!code) return null;
  const m = /^1:(\d)$/.exec(code.trim());
  if (!m) return null;
  const n = Number(m[1]);
  return n >= 1 && n <= 4 ? n : null;
}

export function EditBookingForm({
  lang,
  sessionId,
  venues,
  modes,
  students,
  initialVenueId,
  initialModeId,
  initialNextBookingAt,
  initialNextBookingDurationHours,
  initialRemarks,
  initialStudentIds,
  action,
}: {
  lang: Lang;
  sessionId: string;
  venues: Venue[];
  modes: Mode[];
  students: Student[];
  initialVenueId: string | null;
  initialModeId: string | null;
  initialNextBookingAt: string;
  initialNextBookingDurationHours: number;
  initialRemarks: string | null;
  initialStudentIds: string[];
  action: (formData: FormData) => void;
}) {
  const formRef = useRef<HTMLFormElement | null>(null);
  const bypassSubmitRef = useRef(false);

  const [modeId, setModeId] = useState(initialModeId ?? "");
  const [venueId, setVenueId] = useState(initialVenueId ?? "");
  const [query, setQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>(initialStudentIds);
  const [submitErr, setSubmitErr] = useState<string | null>(null);

  const mode = useMemo(() => modes.find((m) => m.id === modeId) ?? null, [modes, modeId]);
  const requiredCount = requiredCountFromCode(mode?.code);
  const mismatch = requiredCount != null && selectedIds.length !== requiredCount;

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return students.filter((s) => s.name.toLowerCase().includes(q));
  }, [students, query]);

  function toggleStudent(id: string) {
    setSubmitErr(null);
    setSelectedIds((prev) => {
      const exists = prev.includes(id);
      if (!exists && requiredCount && prev.length >= requiredCount) return prev;
      return exists ? prev.filter((x) => x !== id) : [...prev, id];
    });
  }

  const selectedStudents = useMemo(() => {
    const byId = new Map(students.map((s) => [s.id, s]));
    return selectedIds.map((id) => byId.get(id)).filter(Boolean) as Student[];
  }, [students, selectedIds]);

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
        const fd = new FormData(e.currentTarget);
        const at = String(fd.get("nextBookingAt") ?? "").trim();
        const dur = Number(fd.get("nextBookingDurationHours") ?? 2);
        if (!at) return;
        let atIso = "";
        try {
          atIso = new Date(at).toISOString();
        } catch {
          atIso = "";
        }
        if (!atIso) return;

        e.preventDefault();
        try {
          const res = await fetch("/api/bookings/conflicts", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              nextBookingAtIso: atIso,
              nextBookingDurationHours: dur,
              excludeSessionId: sessionId,
            }),
          });
          const json = (await res.json()) as any;
          const ids = Array.isArray(json?.conflicts) ? json.conflicts.map((c: any) => String(c.id)) : [];
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
        } catch {
          bypassSubmitRef.current = true;
          formRef.current?.requestSubmit();
        }
      }}
      className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6"
    >
      <input type="hidden" name="sessionId" value={sessionId} />

      <div className="border-b border-slate-100 pb-4">
        <h2 className="text-sm font-semibold text-slate-900">
          {lang === "zh" ? "编辑约课" : "Edit booking"}
        </h2>
      </div>

      {submitErr ? <div className="text-sm text-red-600">{submitErr}</div> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-slate-900">{lang === "zh" ? "场地" : "Venue"}</label>
          <select
            name="venueId"
            value={venueId}
            onChange={(e) => setVenueId(e.target.value)}
            className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-500/25"
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
            initialNextBookingAt={initialNextBookingAt}
            initialNextBookingDurationHours={initialNextBookingDurationHours}
            defaultOpen
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-slate-900">
            {lang === "zh" ? "上课模式（必选）" : "Mode (required)"}
          </label>
          <select
            name="lessonModeId"
            required
            value={modeId}
            onChange={(e) => setModeId(e.target.value)}
            className={`mt-2 w-full rounded-xl border bg-white px-3 py-2 text-sm outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-500/25 ${
              !modeId ? "border-red-300" : "border-slate-300"
            }`}
          >
            <option value="">{lang === "zh" ? "请选择" : "Select"}</option>
            {modes.map((m) => (
              <option key={m.id} value={m.id}>
                {m.code}（S${Math.round(m.default_price_cents / 100)}/{lang === "zh" ? "人" : "ea"}）
              </option>
            ))}
          </select>
          {!modeId ? (
            <div className="mt-1 text-sm text-red-600">{lang === "zh" ? "上课模式必选。" : "Mode is required."}</div>
          ) : null}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-900">
            {lang === "zh" ? "约课备注（可选）" : "Booking notes (optional)"}
          </label>
          <textarea
            name="remarks"
            rows={3}
            defaultValue={initialRemarks ?? ""}
            className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-500/25"
            placeholder={lang === "zh" ? "例如：已确认场地/自带球…" : "e.g. confirmed court..."}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-900">{lang === "zh" ? "学员" : "Students"}</label>
          <div className="mt-2 space-y-3">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={lang === "zh" ? "搜索学员姓名" : "Search by name"}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-500/25"
              autoComplete="off"
            />

            {query.trim() ? (
              filtered.length === 0 ? (
                <p className="text-sm text-slate-600/90">{lang === "zh" ? "没有匹配的学员。" : "No matches."}</p>
              ) : (
                <div className="grid max-h-56 gap-2 overflow-y-auto sm:grid-cols-2 sm:max-h-64">
                  {filtered.map((s) => (
                    <label
                      key={s.id}
                      className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2.5 text-sm transition-colors ${
                        selectedSet.has(s.id)
                          ? "border-cyan-600/45 bg-cyan-50/70 text-slate-900 shadow-sm shadow-slate-200/30"
                          : "border-slate-200 bg-white/90 text-slate-800 hover:border-slate-300"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedSet.has(s.id)}
                        onChange={() => toggleStudent(s.id)}
                        className="h-4 w-4 shrink-0 rounded border-slate-400 text-cyan-600 focus:ring-cyan-500/30"
                      />
                      <span className="truncate font-medium">{s.name}</span>
                    </label>
                  ))}
                </div>
              )
            ) : null}

            {selectedStudents.length > 0 ? (
              <div className="space-y-2">
                <div className="text-xs font-semibold text-slate-700">{lang === "zh" ? "已选学员" : "Selected"}</div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {selectedStudents.map((s) => (
                    <div
                      key={s.id}
                      className="relative flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 pr-8"
                    >
                      <div className="truncate text-sm font-semibold text-slate-900">{s.name}</div>
                      <button
                        type="button"
                        onClick={() => toggleStudent(s.id)}
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
              <div className="text-sm text-slate-600/90">{lang === "zh" ? "请至少选择 1 位学员。" : "Select at least 1 student."}</div>
            )}

            {selectedIds.map((id) => (
              <input key={id} type="hidden" name="studentIds" value={id} />
            ))}
          </div>
          {modeId && requiredCount != null && mismatch ? (
            <div className="mt-1 text-sm text-red-600">
              {lang === "zh" ? `该模式必须选择 ${requiredCount} 个学员。` : `This mode requires exactly ${requiredCount} students.`}
            </div>
          ) : null}
        </div>
      </div>

      <div className="pt-2">
        <button
          type="submit"
          disabled={Boolean(mismatch)}
          className={`inline-flex h-10 w-10 items-center justify-center rounded-full border text-base font-bold leading-none shadow-sm ${
            mismatch
              ? "cursor-not-allowed border-slate-200 bg-slate-50 text-slate-300"
              : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
          }`}
          aria-label={lang === "zh" ? "保存修改" : "Save changes"}
          title={lang === "zh" ? "保存修改" : "Save changes"}
        >
          ✓
        </button>
      </div>
    </form>
  );
}

