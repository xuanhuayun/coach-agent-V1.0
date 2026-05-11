"use client";

import { useEffect, useMemo, useState } from "react";
import type { Lang } from "@/lib/i18n";
import type { RecentPaymentRow } from "@/lib/recent-payment-rows";

function paymentStatusClass(paid: boolean) {
  return paid
    ? "border border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700"
    : "border border-orange-300 bg-orange-50 text-orange-800 hover:bg-orange-100";
}

export function RecentPaymentsClient({
  rows,
  title,
  lang,
  emptyText,
  variant = "default",
  showPaidSection = true,
}: {
  rows: RecentPaymentRow[];
  title: string;
  lang: Lang;
  emptyText?: string;
  variant?: "default" | "warning";
  showPaidSection?: boolean;
}) {
  const t =
    lang === "zh"
      ? {
          expandPaid: (count: number) => `查看已收费（${count}）`,
          collapsePaid: "收起已收费",
          pending: "待收费",
          paid: "已收费",
          emptyPaid: "暂无已收费。",
          emptyList: "过去三天没有到课学员。",
          updateFailed: "更新失败",
          networkError: "网络异常，更新失败",
        }
      : {
          expandPaid: (count: number) => `Show paid (${count})`,
          collapsePaid: "Hide paid",
          pending: "Unpaid",
          paid: "Paid",
          emptyPaid: "No paid entries yet.",
          emptyList: "No students attended in the last 3 days.",
          updateFailed: "Update failed",
          networkError: "Network error. Update failed.",
        };

  const [paidByKey, setPaidByKey] = useState<Record<string, boolean>>(() => {
    const m: Record<string, boolean> = {};
    rows.forEach((r) => {
      m[r.key] = r.paid;
    });
    return m;
  });
  const [showPaid, setShowPaid] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const m: Record<string, boolean> = {};
    rows.forEach((r) => {
      m[r.key] = r.paid;
    });
    setPaidByKey(m);
  }, [rows]);

  const pendingRows = useMemo(() => {
    return rows.filter((r) => !(paidByKey[r.key] ?? r.paid));
  }, [rows, paidByKey]);

  const paidRows = useMemo(() => {
    return rows.filter((r) => paidByKey[r.key] ?? r.paid);
  }, [rows, paidByKey]);

  async function setPaid(row: RecentPaymentRow, paid: boolean) {
    setErr(null);
    setPaidByKey((m) => ({ ...m, [row.key]: paid }));

    try {
      const res = await fetch("/api/session-students/paid", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sessionId: row.sessionId, studentId: row.studentId, paid }),
      });
      const json = (await res.json()) as { message?: string };
      if (!res.ok) {
        setErr(String(json?.message ?? t.updateFailed));
        setPaidByKey((m) => ({ ...m, [row.key]: !paid }));
      }
    } catch {
      setErr(t.networkError);
      setPaidByKey((m) => ({ ...m, [row.key]: !paid }));
    }
  }

  const listEmptyText = emptyText ?? t.emptyList;
  const isWarning = variant === "warning";

  function renderRow(r: RecentPaymentRow, surface: "default" | "paid") {
    const paid = paidByKey[r.key] ?? r.paid;
    const metaText =
      surface === "default" ? `${r.sessionDate} · ${r.feeText}` : `${r.timeText} · ${r.feeText}`;
    return (
      <div
        key={r.key}
        className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border px-3 py-2 ${
          isWarning
            ? "border-red-200 bg-red-50/80"
            : surface === "paid"
              ? "border-slate-200 bg-slate-50"
              : "border-slate-200 bg-white"
        }`}
      >
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-slate-900">{r.studentName}</div>
          <div className="mt-0.5 text-xs text-slate-500">{metaText}</div>
        </div>
        <button
          type="button"
          onClick={() => setPaid(r, !paid)}
          className={`rounded-full px-3 py-1 text-xs font-semibold ${paymentStatusClass(paid)}`}
        >
          {paid ? t.paid : t.pending}
        </button>
      </div>
    );
  }

  if (isWarning && rows.length === 0) return null;

  return (
    <section
      className={`space-y-3 rounded-2xl border p-4 ${
        isWarning ? "border-red-300 bg-red-50/60" : "border-slate-200 bg-white"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className={`text-sm font-semibold ${isWarning ? "text-red-900" : "text-slate-900"}`}>
          {title}
        </div>
        {showPaidSection ? (
          <button
            type="button"
            onClick={() => setShowPaid((v) => !v)}
            className="text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            {showPaid ? t.collapsePaid : t.expandPaid(paidRows.length)}
          </button>
        ) : null}
      </div>

      {err ? <div className="select-text text-sm text-red-700">{err}</div> : null}

      <div className="space-y-2">
        {!isWarning && pendingRows.length === 0 && paidRows.length === 0 ? (
          <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-3 text-sm text-slate-600/90">
            {listEmptyText}
          </div>
        ) : null}
        {pendingRows.map((r) => renderRow(r, "default"))}
      </div>

      {showPaidSection && showPaid ? (
        <div className="space-y-2 pt-2">
          {paidRows.length === 0 ? (
            <div className="text-sm text-slate-600/90">{t.emptyPaid}</div>
          ) : (
            paidRows.map((r) => renderRow(r, "paid"))
          )}
        </div>
      ) : null}
    </section>
  );
}
