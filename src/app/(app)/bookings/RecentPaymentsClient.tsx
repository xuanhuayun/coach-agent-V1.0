"use client";

import { useEffect, useMemo, useState } from "react";

type Row = {
  key: string;
  sessionId: string;
  studentId: string;
  studentName: string;
  timeText: string;
  feeText: string;
  paid: boolean;
};

export function RecentPaymentsClient({
  rows,
  title,
}: {
  rows: Row[];
  title: string;
}) {
  const [paidByKey, setPaidByKey] = useState<Record<string, boolean>>(() => {
    const m: Record<string, boolean> = {};
    rows.forEach((r) => (m[r.key] = r.paid));
    return m;
  });
  const [paidAtMs, setPaidAtMs] = useState<Record<string, number>>({});
  const [showPaid, setShowPaid] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    // refresh local state when server rerenders
    const m: Record<string, boolean> = {};
    rows.forEach((r) => (m[r.key] = r.paid));
    setPaidByKey(m);
  }, [rows]);

  const now = Date.now();
  const mainRows = useMemo(() => {
    return rows.filter((r) => {
      const paid = paidByKey[r.key] ?? r.paid;
      if (!paid) return true;
      const t = paidAtMs[r.key];
      return t != null ? now - t < 30_000 : false; // show paid briefly
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, paidByKey, paidAtMs]);

  const paidRows = useMemo(() => {
    return rows.filter((r) => (paidByKey[r.key] ?? r.paid) === true);
  }, [rows, paidByKey]);

  useEffect(() => {
    if (Object.keys(paidAtMs).length === 0) return;
    const t = window.setInterval(() => {
      // trigger recalculation via state touch (cheap)
      setPaidAtMs((m) => ({ ...m }));
    }, 1000);
    return () => window.clearInterval(t);
  }, [paidAtMs]);

  async function setPaid(row: Row, paid: boolean) {
    setErr(null);
    setPaidByKey((m) => ({ ...m, [row.key]: paid }));
    if (paid) setPaidAtMs((m) => ({ ...m, [row.key]: Date.now() }));
    else
      setPaidAtMs((m) => {
        const n = { ...m };
        delete n[row.key];
        return n;
      });

    try {
      const res = await fetch("/api/session-students/paid", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sessionId: row.sessionId, studentId: row.studentId, paid }),
      });
      const json = (await res.json()) as any;
      if (!res.ok) {
        setErr(String(json?.message ?? "更新失败"));
        // revert
        setPaidByKey((m) => ({ ...m, [row.key]: !paid }));
      }
    } catch {
      setErr("网络异常，更新失败");
      setPaidByKey((m) => ({ ...m, [row.key]: !paid }));
    }
  }

  if (rows.length === 0) return null;

  return (
    <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm font-semibold text-slate-900">{title}</div>
        <button
          type="button"
          onClick={() => setShowPaid((v) => !v)}
          className="text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          {showPaid ? "收起已付款" : `查看已付款（${paidRows.length}）`}
        </button>
      </div>

      {err ? <div className="text-sm text-red-600">{err}</div> : null}

      <div className="space-y-2">
        {mainRows.map((r) => {
          const paid = paidByKey[r.key] ?? r.paid;
          return (
            <div
              key={r.key}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2"
            >
              <div className="min-w-0">
                <div className="text-sm font-semibold text-slate-900 truncate">
                  {r.studentName}
                </div>
                <div className="mt-0.5 text-xs text-slate-500">
                  {r.timeText} · {r.feeText}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPaid(r, !paid)}
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  paid
                    ? "bg-emerald-600 text-white hover:bg-emerald-700"
                    : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                {paid ? "已付款" : "未付款"}
              </button>
            </div>
          );
        })}
      </div>

      {showPaid ? (
        <div className="space-y-2 pt-2">
          {paidRows.length === 0 ? (
            <div className="text-sm text-slate-600/90">暂无已付款。</div>
          ) : (
            paidRows.map((r) => (
              <div
                key={`paid-${r.key}`}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
              >
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-slate-900 truncate">
                    {r.studentName}
                  </div>
                  <div className="mt-0.5 text-xs text-slate-500">
                    {r.timeText} · {r.feeText}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setPaid(r, false)}
                  className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  标记未付款
                </button>
              </div>
            ))
          )}
        </div>
      ) : null}
    </section>
  );
}

