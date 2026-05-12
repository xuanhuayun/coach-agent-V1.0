"use client";

import { addMonths, format, parseISO } from "date-fns";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SessionHistoryListRow } from "@/components/SessionHistoryListRow";
import type { Lang } from "@/lib/i18n";
import type { SessionHistoryMonthPayload } from "@/lib/session-history-month";

function shiftMonthKey(key: string, delta: number) {
  return format(addMonths(parseISO(`${key}-01`), delta), "yyyy-MM");
}

function clampIndex(index: number, length: number) {
  if (length <= 0) return 0;
  return Math.max(0, Math.min(index, length - 1));
}

export function SessionHistoryByMonth({
  lang,
  initialMonth,
  currentMonthKey,
  rangeLabel,
  emptyMonthText,
  detailLabel,
}: {
  lang: Lang;
  initialMonth: SessionHistoryMonthPayload;
  currentMonthKey: string;
  rangeLabel: string;
  emptyMonthText: string;
  detailLabel: string;
}) {
  const [monthsByKey, setMonthsByKey] = useState<Record<string, SessionHistoryMonthPayload>>(() => ({
    [initialMonth.key]: initialMonth,
  }));
  const [monthKeys, setMonthKeys] = useState<string[]>(() => [initialMonth.key]);
  const [index, setIndex] = useState(0);
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    setMonthsByKey({ [initialMonth.key]: initialMonth });
    setMonthKeys([initialMonth.key]);
    setIndex(0);
    setLoadError(null);
  }, [initialMonth]);

  const activeKey = monthKeys[index] ?? initialMonth.key;
  const active = monthsByKey[activeKey] ?? initialMonth;

  const canPrev = index > 0 || !loadingKey;
  const canNext = index < monthKeys.length - 1 || activeKey < currentMonthKey;

  const loadMonth = useCallback(async (key: string) => {
    if (monthsByKey[key]) return monthsByKey[key];
    setLoadingKey(key);
    setLoadError(null);
    try {
      const res = await fetch(`/api/sessions/history-month?month=${encodeURIComponent(key)}`);
      const json = (await res.json()) as SessionHistoryMonthPayload & { error?: string };
      if (!res.ok) {
        throw new Error(json.error ?? "load_failed");
      }
      setMonthsByKey((current) => ({ ...current, [key]: json }));
      return json;
    } catch {
      setLoadError(lang === "zh" ? "加载失败，请稍后再试。" : "Failed to load. Try again.");
      return null;
    } finally {
      setLoadingKey((current) => (current === key ? null : current));
    }
  }, [lang, monthsByKey]);

  const goPrev = useCallback(async () => {
    if (index > 0) {
      setIndex((current) => current - 1);
      return;
    }
    const olderKey = shiftMonthKey(monthKeys[0] ?? initialMonth.key, -1);
    if (monthsByKey[olderKey]) {
      setMonthKeys((keys) => [olderKey, ...keys]);
      setIndex(0);
      return;
    }
    const loaded = await loadMonth(olderKey);
    if (!loaded) return;
    setMonthKeys((keys) => [olderKey, ...keys]);
    setIndex(0);
  }, [index, initialMonth.key, loadMonth, monthKeys, monthsByKey]);

  const goNext = useCallback(async () => {
    if (index < monthKeys.length - 1) {
      setIndex((current) => current + 1);
      return;
    }
    const newestKey = monthKeys[monthKeys.length - 1] ?? initialMonth.key;
    if (newestKey >= currentMonthKey) return;
    const newerKey = shiftMonthKey(newestKey, 1);
    if (monthsByKey[newerKey]) {
      setMonthKeys((keys) => [...keys, newerKey]);
      setIndex((current) => clampIndex(current + 1, monthKeys.length + 1));
      return;
    }
    const loaded = await loadMonth(newerKey);
    if (!loaded) return;
    setMonthKeys((keys) => [...keys, newerKey]);
    setIndex((current) => current + 1);
  }, [currentMonthKey, index, initialMonth.key, loadMonth, monthKeys, monthsByKey]);

  const isLoadingActive = loadingKey === activeKey;

  const emptyText = useMemo(() => {
    if (isLoadingActive) {
      return lang === "zh" ? "加载中…" : "Loading…";
    }
    return emptyMonthText;
  }, [emptyMonthText, isLoadingActive, lang]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-slate-500">
          {rangeLabel}:{" "}
          <span className="font-medium text-slate-800">{active.label}</span>
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void goPrev()}
            disabled={!canPrev || Boolean(loadingKey)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-base font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-35"
            aria-label={lang === "zh" ? "上一月" : "Previous month"}
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => void goNext()}
            disabled={!canNext || Boolean(loadingKey)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-base font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-35"
            aria-label={lang === "zh" ? "下一月" : "Next month"}
          >
            ›
          </button>
        </div>
      </div>

      {loadError ? <p className="text-sm text-red-700">{loadError}</p> : null}

      <div
        className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
        onTouchStart={(e) => {
          touchStartX.current = e.changedTouches[0]?.clientX ?? null;
        }}
        onTouchEnd={(e) => {
          const start = touchStartX.current;
          touchStartX.current = null;
          if (start == null) return;
          const end = e.changedTouches[0]?.clientX ?? start;
          const delta = end - start;
          if (Math.abs(delta) < 48) return;
          if (delta < 0) void goNext();
          else void goPrev();
        }}
      >
        {(active.sessions.length ?? 0) === 0 ? (
          <div className="p-8 text-center text-sm text-slate-600/90">{emptyText}</div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {active.sessions.map((s) => (
              <li key={s.id}>
                <SessionHistoryListRow
                  lang={lang}
                  href={`/sessions/${s.id}`}
                  sessionDate={s.sessionDate}
                  modeCode={s.modeCode}
                  durationHours={s.durationHours}
                  studentNames={s.studentNames}
                  detailLabel={detailLabel}
                  classRevenueCents={s.classRevenueCents}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
