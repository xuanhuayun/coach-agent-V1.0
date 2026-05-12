"use client";

import { addMonths, format, parseISO } from "date-fns";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SessionHistoryListRow } from "@/components/SessionHistoryListRow";
import type { Lang } from "@/lib/i18n";
import {
  createSessionHistoryMonthPlaceholder,
  type SessionHistoryMonthPayload,
} from "@/lib/session-history-month";

function shiftMonthKey(key: string, delta: number) {
  return format(addMonths(parseISO(`${key}-01`), delta), "yyyy-MM");
}

export function SessionHistoryByMonth({
  lang,
  initialMonthKey,
  currentMonthKey,
  rangeLabel,
  emptyMonthText,
  detailLabel,
}: {
  lang: Lang;
  initialMonthKey: string;
  currentMonthKey: string;
  rangeLabel: string;
  emptyMonthText: string;
  detailLabel: string;
}) {
  const [monthsByKey, setMonthsByKey] = useState<Record<string, SessionHistoryMonthPayload>>(() => ({
    [initialMonthKey]: createSessionHistoryMonthPlaceholder(initialMonthKey, lang),
  }));
  const [monthKeys, setMonthKeys] = useState<string[]>(() => [initialMonthKey]);
  const [index, setIndex] = useState(0);
  const [loadedKeys, setLoadedKeys] = useState<Set<string>>(() => new Set());
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    setMonthsByKey({
      [initialMonthKey]: createSessionHistoryMonthPlaceholder(initialMonthKey, lang),
    });
    setMonthKeys([initialMonthKey]);
    setIndex(0);
    setLoadedKeys(new Set());
    setLoadError(null);
  }, [initialMonthKey, lang]);

  const activeKey = monthKeys[index] ?? initialMonthKey;
  const active = monthsByKey[activeKey] ?? createSessionHistoryMonthPlaceholder(activeKey, lang);
  const activeLoaded = loadedKeys.has(activeKey);

  const canPrev = index > 0 || activeKey > shiftMonthKey(currentMonthKey, -120);
  const canNext = index < monthKeys.length - 1 || activeKey < currentMonthKey;

  const loadMonth = useCallback(async (key: string) => {
    if (loadedKeys.has(key)) {
      return monthsByKey[key] ?? createSessionHistoryMonthPlaceholder(key, lang);
    }

    setLoadingKey(key);
    setLoadError(null);
    try {
      const res = await fetch(`/api/sessions/history-month?month=${encodeURIComponent(key)}`);
      const json = (await res.json()) as SessionHistoryMonthPayload & { error?: string };
      if (!res.ok) {
        throw new Error(json.error ?? "load_failed");
      }
      setMonthsByKey((current) => ({ ...current, [key]: json }));
      setLoadedKeys((current) => new Set(current).add(key));
      return json;
    } catch {
      setLoadError(lang === "zh" ? "加载失败，请稍后再试。" : "Failed to load. Try again.");
      return null;
    } finally {
      setLoadingKey((current) => (current === key ? null : current));
    }
  }, [lang, loadedKeys, monthsByKey]);

  useEffect(() => {
    void loadMonth(initialMonthKey);
  }, [initialMonthKey, loadMonth]);

  const goPrev = useCallback(async () => {
    if (index > 0) {
      const targetKey = monthKeys[index - 1] ?? initialMonthKey;
      if (!loadedKeys.has(targetKey)) {
        const loaded = await loadMonth(targetKey);
        if (!loaded) return;
      }
      setIndex((current) => current - 1);
      return;
    }

    const olderKey = shiftMonthKey(monthKeys[0] ?? initialMonthKey, -1);
    const loaded = await loadMonth(olderKey);
    if (!loaded) return;
    setMonthKeys((keys) => [olderKey, ...keys]);
    setIndex(0);
  }, [index, initialMonthKey, loadMonth, loadedKeys, monthKeys]);

  const goNext = useCallback(async () => {
    if (index < monthKeys.length - 1) {
      const targetKey = monthKeys[index + 1] ?? initialMonthKey;
      if (!loadedKeys.has(targetKey)) {
        const loaded = await loadMonth(targetKey);
        if (!loaded) return;
      }
      setIndex((current) => current + 1);
      return;
    }

    const newestKey = monthKeys[monthKeys.length - 1] ?? initialMonthKey;
    if (newestKey >= currentMonthKey) return;
    const newerKey = shiftMonthKey(newestKey, 1);
    const loaded = await loadMonth(newerKey);
    if (!loaded) return;
    setMonthKeys((keys) => [...keys, newerKey]);
    setIndex((current) => current + 1);
  }, [currentMonthKey, index, initialMonthKey, loadMonth, loadedKeys, monthKeys]);

  const isLoadingActive = loadingKey === activeKey;

  const emptyText = useMemo(() => {
    if (isLoadingActive || !activeLoaded) {
      return lang === "zh" ? "加载中…" : "Loading…";
    }
    return emptyMonthText;
  }, [activeLoaded, emptyMonthText, isLoadingActive, lang]);

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
        {!activeLoaded || (active.sessions.length ?? 0) === 0 ? (
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
