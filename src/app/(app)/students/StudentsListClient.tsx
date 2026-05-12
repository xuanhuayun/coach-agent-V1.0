"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Lang } from "@/lib/i18n";
import type { StudentListRowPayload } from "@/lib/students-list-page";
import { InfoTip } from "@/components/InfoTip";
import { PageModuleTitle } from "@/components/PageModuleTitle";

export type StudentListRow = StudentListRowPayload;

type Copy = Record<string, string>;

function sortByLastClass(a: StudentListRow, b: StudentListRow) {
  if (!a.lastSessionDate && !b.lastSessionDate) return 0;
  if (!a.lastSessionDate) return 1;
  if (!b.lastSessionDate) return -1;
  return b.lastSessionDate.localeCompare(a.lastSessionDate);
}

function Dot({ on, title }: { on: boolean; title: string }) {
  return (
    <span
      aria-label={title}
      title={title}
      className={`inline-block h-2.5 w-2.5 rounded-full ${on ? "bg-emerald-600" : "bg-red-400"}`}
    />
  );
}

export function StudentsListClient({
  initialStudents,
  initialHasMore,
  pageSize,
  lang,
  copy,
}: {
  initialStudents: StudentListRow[];
  initialHasMore: boolean;
  pageSize: number;
  lang: Lang;
  copy: Copy;
}) {
  const [students, setStudents] = useState(initialStudents);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setStudents(initialStudents);
    setHasMore(initialHasMore);
    setLoadError(null);
  }, [initialHasMore, initialStudents]);

  useEffect(() => {
    if (!hasMore || loadingMore || q.trim()) return;
    const node = loadMoreRef.current;
    if (!node) return;

    let cancelled = false;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting) || cancelled) return;
        void (async () => {
          setLoadingMore(true);
          setLoadError(null);
          try {
            const res = await fetch(
              `/api/students/page?offset=${students.length}&limit=${pageSize}`,
            );
            const json = (await res.json()) as {
              students?: StudentListRow[];
              hasMore?: boolean;
              error?: string;
            };
            if (!res.ok) {
              throw new Error(json.error ?? "load_failed");
            }
            const next = json.students ?? [];
            setStudents((current) => {
              const seen = new Set(current.map((row) => row.id));
              const merged = [...current];
              for (const row of next) {
                if (seen.has(row.id)) continue;
                seen.add(row.id);
                merged.push(row);
              }
              return merged;
            });
            setHasMore(Boolean(json.hasMore));
          } catch {
            setLoadError(lang === "zh" ? "加载更多失败。" : "Failed to load more.");
          } finally {
            setLoadingMore(false);
          }
        })();
      },
      { rootMargin: "160px" },
    );

    observer.observe(node);
    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [hasMore, lang, loadingMore, pageSize, q, students.length]);

  const t =
    lang === "zh"
      ? {
          search: "搜索学员姓名",
          empty: "没搜到～换个关键词试试。",
          none: "还没有学员。先新增一个，后面记课就飞快～",
          newStudent: "+ 学员",
          title: "学员列表",
          hint: "按最近上课时间排序。过去10/20天：是否上过课；未来10/20天：是否已约课（新加坡日期）。",
        }
      : {
          search: "Search by name",
          empty: "No matches.",
          none: "No students yet.",
          newStudent: "+ Student",
          title: "Students",
          hint: "Sorted by last class date. Past 10/20d = attended; Future 10/20d = booked (Asia/Singapore).",
        };

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    const searched = !query
      ? students
      : students.filter((s) => s.name.toLowerCase().includes(query));
    return [...searched].sort(sortByLastClass);
  }, [q, students]);

  return (
    <div className="max-w-4xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <PageModuleTitle module="/students" className="text-sm">
            {t.title}
          </PageModuleTitle>
          <InfoTip text={`${t.hint}\n\n${copy.students_recent_legend}`} />
        </div>
        <Link
          href="/students/new"
          className="inline-flex items-center justify-center text-sm font-semibold text-sky-700 hover:text-sky-800"
          aria-label={t.newStudent}
          title={t.newStudent}
        >
          {t.newStudent}
        </Link>
      </div>

      <div className="mt-3">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t.search}
          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-500/25 sm:max-w-xs"
          autoComplete="off"
        />
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        {students.length === 0 ? (
          <div className="p-6 text-sm text-slate-600/90">{t.none}</div>
        ) : filtered.length === 0 ? (
          <div className="p-6 text-sm text-slate-600/90">{t.empty}</div>
        ) : (
          <div className="divide-y divide-slate-200">
            {/* header row - hidden on xs optional */}
            <div className="hidden gap-3 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-600 sm:grid sm:grid-cols-[minmax(0,220px)_72px_96px_56px_56px_56px_56px]">
              <span>{lang === "zh" ? "学员" : "Student"}</span>
              <span className="text-right">{copy.students_col_sessions}</span>
              <span>{copy.students_col_last}</span>
              <span className="text-center">{lang === "zh" ? "过去10天" : "Past10"}</span>
              <span className="text-center">{lang === "zh" ? "过去20天" : "Past20"}</span>
              <span className="text-center">{lang === "zh" ? "未来10天" : "Next10"}</span>
              <span className="text-center">{lang === "zh" ? "未来20天" : "Next20"}</span>
            </div>
            {filtered.map((s) => (
              <Link
                key={s.id}
                href={`/students/${s.id}`}
                className="block px-4 py-2 transition-colors hover:bg-slate-50 sm:grid sm:grid-cols-[minmax(0,220px)_72px_96px_56px_56px_56px_56px] sm:items-center sm:gap-3"
              >
                <div className="min-w-0">
                  <div className="flex min-w-0 items-center gap-2">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-slate-900">{s.name}</div>
                    </div>
                  </div>
                  <div className="mt-0.5 truncate text-xs text-slate-500 sm:hidden">
                    {copy.students_col_sessions}: {s.sessionCount} · {copy.students_col_last}:{" "}
                    {s.lastSessionDate ?? copy.students_never_class}
                  </div>
                </div>
                <div className="hidden text-right text-sm tabular-nums text-slate-800 sm:block">
                  {s.sessionCount}
                </div>
                <div className="hidden text-sm text-slate-800 sm:block">
                  {s.lastSessionDate ?? (
                    <span className="text-slate-400">{copy.students_never_class}</span>
                  )}
                </div>
                <div className="hidden justify-center sm:flex">
                  <Dot
                    on={s.past10}
                    title={
                      s.past10
                        ? lang === "zh"
                          ? "过去10天上过课"
                          : "Attended in past 10d"
                        : lang === "zh"
                          ? "过去10天没上课"
                          : "No class in past 10d"
                    }
                  />
                </div>
                <div className="hidden justify-center sm:flex">
                  <Dot
                    on={s.past20}
                    title={
                      s.past20
                        ? lang === "zh"
                          ? "过去20天上过课"
                          : "Attended in past 20d"
                        : lang === "zh"
                          ? "过去20天没上课"
                          : "No class in past 20d"
                    }
                  />
                </div>
                <div className="hidden justify-center sm:flex">
                  <Dot
                    on={s.future10}
                    title={
                      s.future10
                        ? lang === "zh"
                          ? "未来10天有约课"
                          : "Booked in next 10d"
                        : lang === "zh"
                          ? "未来10天没约课"
                          : "No booking in next 10d"
                    }
                  />
                </div>
                <div className="hidden justify-center sm:flex">
                  <Dot
                    on={s.future20}
                    title={
                      s.future20
                        ? lang === "zh"
                          ? "未来20天有约课"
                          : "Booked in next 20d"
                        : lang === "zh"
                          ? "未来20天没约课"
                          : "No booking in next 20d"
                    }
                  />
                </div>

                <div className="mt-2 flex items-center justify-between gap-3 sm:hidden">
                  <div className="flex items-center gap-3">
                    <Dot
                      on={s.past10}
                      title={s.past10 ? "past10 ✓" : "past10 ✗"}
                    />
                    <Dot
                      on={s.past20}
                      title={s.past20 ? "past20 ✓" : "past20 ✗"}
                    />
                    <Dot
                      on={s.future10}
                      title={s.future10 ? "next10 ✓" : "next10 ✗"}
                    />
                    <Dot
                      on={s.future20}
                      title={s.future20 ? "next20 ✓" : "next20 ✗"}
                    />
                  </div>
                  <span className="text-xs text-sky-700">{lang === "zh" ? "详情 →" : "→"}</span>
                </div>
              </Link>
            ))}
          
          </div>
        )}
        {!q.trim() && hasMore ? (
          <div ref={loadMoreRef} className="px-4 py-4 text-center text-sm text-slate-500">
            {loadingMore
              ? lang === "zh"
                ? "加载更多…"
                : "Loading more…"
              : lang === "zh"
                ? "继续下滑加载更多"
                : "Scroll for more"}
          </div>
        ) : null}
        {loadError ? <div className="px-4 py-3 text-sm text-red-700">{loadError}</div> : null}
      </div>
    </div>
  );
}
