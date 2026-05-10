"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { LAST_SESSION_STUDENT_IDS_KEY } from "@/lib/session-student-prefs";

type Student = { id: string; name: string };

export function SessionStudentPicker({
  students,
  lang,
}: {
  students: Student[];
  lang: "zh" | "en";
}) {
  const idsFingerprint = useMemo(
    () => students.map((s) => s.id).sort().join("\n"),
    [students],
  );

  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    const validIds = new Set(students.map((s) => s.id));
    try {
      const raw = localStorage.getItem(LAST_SESSION_STUDENT_IDS_KEY);
      if (raw == null) return;
      const arr = JSON.parse(raw) as unknown;
      if (!Array.isArray(arr)) return;
      const next = new Set(
        arr.filter((id): id is string => typeof id === "string" && validIds.has(id)),
      );
      setSelected(next);
    } catch {
      /* ignore */
    }
  }, [idsFingerprint, students]);

  function persist(next: Set<string>) {
    localStorage.setItem(
      LAST_SESSION_STUDENT_IDS_KEY,
      JSON.stringify(Array.from(next)),
    );
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return students.filter((s) => s.name.toLowerCase().includes(q));
  }, [students, query]);

  function toggle(id: string) {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      persist(n);
      return n;
    });
  }

  const t =
    lang === "zh"
      ? {
          search: "搜索学员姓名",
          hint: "默认会带上你上一次勾选的学员；本次增减后会自动更新。",
          add: "+ 学员",
          empty: "没有匹配的学员，试试别的关键词或加一个学员。",
          none: "还没有学员。",
          selectedCount: (n: number) => `已选 ${n} 人`,
          clear: "清空",
        }
      : {
          search: "Search by name",
          hint: "Pre-filled with your last selection. Adjusting updates it.",
          add: "+ Student",
          empty: "No matches. Try another keyword or add a student.",
          none: "No students yet.",
          selectedCount: (n: number) => `${n} selected`,
          clear: "Clear",
        };

  if (students.length === 0) {
    return (
      <div className="mt-2 text-sm text-slate-600/90">
        {t.none}{" "}
        <Link
          href="/students/new?returnTo=/sessions"
          className="font-semibold text-slate-600 underline decoration-slate-400 underline-offset-2"
        >
          {t.add}
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-2 space-y-3">
      <p className="text-xs leading-relaxed text-slate-500">{t.hint}</p>
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
          href="/students/new?returnTo=/sessions"
          className="inline-flex shrink-0 items-center justify-center rounded-xl border border-slate-300 bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm shadow-slate-200/40 hover:bg-slate-100"
        >
          {t.add}
        </Link>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm font-medium text-slate-700">
          {t.selectedCount(selected.size)}
        </div>
        <button
          type="button"
          onClick={() => {
            const next = new Set<string>();
            setSelected(next);
            persist(next);
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
          <div className="grid max-h-64 gap-2 overflow-y-auto sm:grid-cols-2 sm:max-h-80">
            {filtered.map((s) => (
              <label
                key={s.id}
                className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2.5 text-sm transition-colors ${
                  selected.has(s.id)
                    ? "border-cyan-600/45 bg-cyan-50/70 text-slate-900 shadow-sm shadow-slate-200/30"
                    : "border-slate-200 bg-white/90 text-slate-800 hover:border-slate-300"
                }`}
              >
                <input
                  type="checkbox"
                  checked={selected.has(s.id)}
                  onChange={() => toggle(s.id)}
                  className="h-4 w-4 shrink-0 rounded border-slate-400 text-cyan-600 focus:ring-cyan-500/30"
                />
                <span className="truncate font-medium">{s.name}</span>
              </label>
            ))}
          </div>
        )
      ) : null}

      {Array.from(selected).map((id) => (
        <input key={id} type="hidden" name="studentIds" value={id} />
      ))}
    </div>
  );
}
