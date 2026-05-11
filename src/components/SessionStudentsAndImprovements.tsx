"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { LAST_SESSION_STUDENT_IDS_KEY } from "@/lib/session-student-prefs";
import type { Lang } from "@/lib/i18n";

type Student = { id: string; name: string };

export function SessionStudentsAndImprovements({
  students,
  lang,
  requiredCount,
  onSelectedCountChange,
  betweenSelectedAndImprovements,
  showImprovements = true,
  returnTo = "/sessions",
  selectedIds: controlledSelectedIds,
  onSelectedIdsChange,
}: {
  students: Student[];
  lang: Lang;
  requiredCount?: number;
  onSelectedCountChange?: (n: number) => void;
  betweenSelectedAndImprovements?: React.ReactNode;
  showImprovements?: boolean;
  returnTo?: string;
  selectedIds?: string[];
  onSelectedIdsChange?: (ids: string[]) => void;
}) {
  const isControlled = onSelectedIdsChange != null;
  const idsFingerprint = useMemo(
    () => students.map((s) => s.id).sort().join("\n"),
    [students],
  );

  const [query, setQuery] = useState("");
  const [internalSelectedIds, setInternalSelectedIds] = useState<string[]>([]);
  const selectedIds = isControlled ? (controlledSelectedIds ?? []) : internalSelectedIds;
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const [improvements, setImprovements] = useState<Record<string, string>>({});
  const [sameAsAbove, setSameAsAbove] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const validIds = new Set(students.map((s) => s.id));
    const next = selectedIds.filter((id) => validIds.has(id));
    if (next.length === selectedIds.length) return;
    if (isControlled) onSelectedIdsChange?.(next);
    else setInternalSelectedIds(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsFingerprint, students]);

  useEffect(() => {
    if (isControlled) return;
    const validIds = new Set(students.map((s) => s.id));
    try {
      const raw = localStorage.getItem(LAST_SESSION_STUDENT_IDS_KEY);
      if (raw == null) return;
      const arr = JSON.parse(raw) as unknown;
      if (!Array.isArray(arr)) return;
      const next = arr.filter((id): id is string => typeof id === "string" && validIds.has(id));
      setInternalSelectedIds(next);
    } catch {
      /* ignore */
    }
  }, [idsFingerprint, students, isControlled]);

  useEffect(() => {
    onSelectedCountChange?.(selectedIds.length);
  }, [selectedIds.length, onSelectedCountChange]);

  useEffect(() => {
    if (!requiredCount) return;
    if (selectedIds.length <= requiredCount) return;
    const next = selectedIds.slice(0, requiredCount);
    if (next.length !== selectedIds.length) replaceSelectedIds(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requiredCount, selectedIds.length]);

  function persist(next: string[]) {
    localStorage.setItem(LAST_SESSION_STUDENT_IDS_KEY, JSON.stringify(next));
  }

  function replaceSelectedIds(next: string[]) {
    if (isControlled) onSelectedIdsChange?.(next);
    else {
      setInternalSelectedIds(next);
      persist(next);
    }
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return students.filter((s) => s.name.toLowerCase().includes(q));
  }, [students, query]);

  function clearStudentState(id: string) {
    setSameAsAbove((m) => {
      const n = { ...m };
      delete n[id];
      return n;
    });
    setImprovements((m) => {
      const n = { ...m };
      delete n[id];
      return n;
    });
  }

  function toggle(id: string) {
    const exists = selectedIds.includes(id);
    if (!exists && requiredCount && selectedIds.length >= requiredCount) return;
    const next = exists ? selectedIds.filter((x) => x !== id) : [...selectedIds, id];
    replaceSelectedIds(next);
    if (exists) clearStudentState(id);
  }

  function removeStudent(id: string) {
    if (!selectedIds.includes(id)) return;
    replaceSelectedIds(selectedIds.filter((x) => x !== id));
    clearStudentState(id);
  }

  const selectedStudents = useMemo(() => {
    const byId = new Map(students.map((s) => [s.id, s]));
    return selectedIds.map((id) => byId.get(id)).filter(Boolean) as Student[];
  }, [students, selectedIds]);

  const t =
    lang === "zh"
      ? {
          search: "搜索学员姓名",
          add: "+ 学员",
          empty: "没有匹配的学员。",
          none: "还没有学员。",
          selected: "已选学员",
          improvements: "改进点（按学员）",
          same: "同上",
        }
      : {
          search: "Search by name",
          add: "+ Student",
          empty: "No matches.",
          none: "No students yet.",
          selected: "Selected",
          improvements: "Improvements (per student)",
          same: "Same",
        };

  if (students.length === 0) {
    return (
      <div className="mt-2 text-sm text-slate-600/90">
        {t.none}{" "}
        <Link
          href={`/students/new?returnTo=${encodeURIComponent(returnTo)}`}
          className="font-semibold text-slate-600 underline decoration-slate-400 underline-offset-2"
        >
          {t.add}
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-2 space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t.search}
          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-500/25 sm:max-w-xs"
          autoComplete="off"
        />
        <Link
          href={`/students/new?returnTo=${encodeURIComponent(returnTo)}`}
          className="inline-flex shrink-0 items-center justify-center rounded-xl border border-slate-300 bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm shadow-slate-200/40 hover:bg-slate-100"
        >
          {t.add}
        </Link>
      </div>

      {query.trim() ? (
        filtered.length === 0 ? (
          <p className="text-sm text-slate-600/90">{t.empty}</p>
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
                  onChange={() => toggle(s.id)}
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
          <div className="text-xs font-semibold text-slate-700">{t.selected}</div>
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
                    removeStudent(s.id);
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
      ) : null}

      {/* Then course-level fields (content/notes) */}
      {betweenSelectedAndImprovements ? <div className="pt-2">{betweenSelectedAndImprovements}</div> : null}

      {/* Per-student improvements */}
      {showImprovements && selectedStudents.length > 0 ? (
        <div className="space-y-2">
          <div className="text-sm font-semibold text-slate-900">{t.improvements}</div>
          <div className="grid gap-2 sm:grid-cols-2">
            {selectedStudents.map((s, idx) => {
              const prevId = idx > 0 ? selectedStudents[idx - 1].id : null;
              const isSame = idx > 0 && Boolean(sameAsAbove[s.id]);
              const value = isSame && prevId ? improvements[prevId] ?? "" : improvements[s.id] ?? "";
              return (
                <div key={s.id} className="rounded-xl border border-slate-200 bg-white p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-semibold text-slate-900 truncate">{s.name}</div>
                    {idx > 0 && (
                      <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                        <input
                          type="checkbox"
                          checked={Boolean(sameAsAbove[s.id])}
                          onChange={(e) => {
                            const on = e.target.checked;
                            setSameAsAbove((m) => ({ ...m, [s.id]: on }));
                            if (on && prevId) {
                              setImprovements((m) => ({ ...m, [s.id]: m[prevId] ?? "" }));
                            }
                          }}
                          className="h-4 w-4 rounded border-slate-400 text-sky-600 focus:ring-sky-500/30"
                        />
                        {t.same}
                      </label>
                    )}
                  </div>
                  <textarea
                    name={`studentImprovement_${s.id}`}
                    value={value}
                    readOnly={isSame}
                    onChange={(e) => {
                      const v = e.target.value;
                      setImprovements((m) => ({ ...m, [s.id]: v }));
                    }}
                    rows={2}
                    className={`mt-2 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-500/25 ${
                      isSame ? "border-slate-200 bg-slate-50 text-slate-700" : "border-slate-300 bg-white"
                    }`}
                  />
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* Hidden student ids for server action */}
      {selectedIds.map((id) => (
        <input key={id} type="hidden" name="studentIds" value={id} />
      ))}
    </div>
  );
}

