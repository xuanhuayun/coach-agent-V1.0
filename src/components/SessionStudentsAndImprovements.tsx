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
}: {
  students: Student[];
  lang: Lang;
  requiredCount?: number;
  onSelectedCountChange?: (n: number) => void;
  betweenSelectedAndImprovements?: React.ReactNode;
  showImprovements?: boolean;
  returnTo?: string;
}) {
  const idsFingerprint = useMemo(
    () => students.map((s) => s.id).sort().join("\n"),
    [students],
  );

  const [query, setQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const [limitMsg, setLimitMsg] = useState<string | null>(null);

  const [improvements, setImprovements] = useState<Record<string, string>>({});
  const [sameAsAbove, setSameAsAbove] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const validIds = new Set(students.map((s) => s.id));
    try {
      const raw = localStorage.getItem(LAST_SESSION_STUDENT_IDS_KEY);
      if (raw == null) return;
      const arr = JSON.parse(raw) as unknown;
      if (!Array.isArray(arr)) return;
      const next = arr.filter((id): id is string => typeof id === "string" && validIds.has(id));
      setSelectedIds(next);
    } catch {
      /* ignore */
    }
  }, [idsFingerprint, students]);

  useEffect(() => {
    onSelectedCountChange?.(selectedIds.length);
  }, [selectedIds.length, onSelectedCountChange]);

  useEffect(() => {
    if (!requiredCount) return;
    if (selectedIds.length <= requiredCount) return;
    const next = selectedIds.slice(0, requiredCount);
    setSelectedIds(next);
    persist(next);
    setLimitMsg(
      lang === "zh" ? `该模式只能选 ${requiredCount} 人。` : `Limit: ${requiredCount} students.`,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requiredCount]);

  function persist(next: string[]) {
    localStorage.setItem(LAST_SESSION_STUDENT_IDS_KEY, JSON.stringify(next));
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return students.filter((s) => s.name.toLowerCase().includes(q));
  }, [students, query]);

  function toggle(id: string) {
    setLimitMsg(null);
    setSelectedIds((prev) => {
      const exists = prev.includes(id);
      if (!exists && requiredCount && prev.length >= requiredCount) {
        setLimitMsg(
          lang === "zh" ? `该模式只能选 ${requiredCount} 人。` : `Limit: ${requiredCount} students.`,
        );
        return prev;
      }
      const next = exists ? prev.filter((x) => x !== id) : [...prev, id];
      persist(next);
      return next;
    });
    if (selectedSet.has(id)) {
      setSameAsAbove((m) => {
        const n = { ...m };
        delete n[id];
        return n;
      });
    }
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
          selectedCount: (n: number) => `已选 ${n} 人`,
          clear: "清空",
          improvements: "改进点（按学员）",
          same: "同上",
        }
      : {
          search: "Search by name",
          add: "+ Student",
          empty: "No matches.",
          none: "No students yet.",
          selectedCount: (n: number) => `${n} selected`,
          clear: "Clear",
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
          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-500/25 sm:max-w-xs"
          autoComplete="off"
        />
        <Link
          href={`/students/new?returnTo=${encodeURIComponent(returnTo)}`}
          className="inline-flex shrink-0 items-center justify-center rounded-xl border border-slate-300 bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm shadow-slate-200/40 hover:bg-slate-100"
        >
          {t.add}
        </Link>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm font-medium text-slate-700">
          {t.selectedCount(selectedIds.length)}
        </div>
        <button
          type="button"
          onClick={() => {
            setSelectedIds([]);
            persist([]);
            setSameAsAbove({});
          }}
          className="text-sm font-medium text-slate-600 hover:text-slate-800"
        >
          {t.clear}
        </button>
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
                    ? "border-cyan-600/45 bg-cyan-50/70 text-slate-900 shadow-sm shadow-slate-200/30"
                    : "border-slate-200 bg-white/90 text-slate-800 hover:border-slate-300"
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedSet.has(s.id)}
                  onChange={() => toggle(s.id)}
                  className="h-4 w-4 shrink-0 rounded border-slate-400 text-cyan-600 focus:ring-cyan-500/30"
                />
                <span className="truncate font-medium">{s.name}</span>
              </label>
            ))}
          </div>
        )
      ) : null}

      {limitMsg ? <div className="text-sm text-red-600">{limitMsg}</div> : null}

      {/* Selected names first */}
      {selectedStudents.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {selectedStudents.map((s) => (
            <span
              key={s.id}
              className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm font-medium text-slate-800"
            >
              {s.name}
            </span>
          ))}
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
                          className="h-4 w-4 rounded border-slate-400 text-cyan-600 focus:ring-cyan-500/30"
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
                    className={`mt-2 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-500/25 ${
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

