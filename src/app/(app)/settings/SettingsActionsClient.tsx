"use client";

import { useMemo, useState } from "react";

type Venue = { id: string; name: string; address: string | null };
type Mode = { id: string; code: string; default_price_cents: number };

export function SettingsActionsClient({
  lang,
  venues,
  modes,
  createVenue,
  deleteVenue,
  upsertLessonMode,
}: {
  lang: "zh" | "en";
  venues: Venue[];
  modes: Mode[];
  createVenue: (formData: FormData) => void;
  deleteVenue: (formData: FormData) => void;
  upsertLessonMode: (formData: FormData) => void;
}) {
  const t = useMemo(() => {
    return lang === "zh"
      ? {
          venues: "场地",
          addVenue: "添加场地",
          venueNamePh: "场地名称（例如：XX 体育馆）",
          venueAddrPh: "地址（可选）",
          delete: "删除",
          modeTitle: "上课模式价格",
          savePrice: "保存价格",
          confirmSave: "确认保存？",
          confirmDelete: "确认删除？",
          confirmPriceChange: (code: string, from: string, to: string) =>
            `确认更新 ${code} 的价格？\n\n` +
            `从：S$${from || "（空）"} / 人\n` +
            `改为：S$${to || "（空）"} / 人\n\n` +
            `说明：以前已经记录过的课程，不会被改价；之后新记录的课程，才会按新价格计算。`,
        }
      : {
          venues: "Venues",
          addVenue: "Add venue",
          venueNamePh: "Venue name (e.g. XYZ Sports Hall)",
          venueAddrPh: "Address (optional)",
          delete: "Delete",
          modeTitle: "Lesson mode pricing",
          savePrice: "Save price",
          confirmSave: "Confirm save?",
          confirmDelete: "Confirm delete?",
          confirmPriceChange: (code: string, from: string, to: string) =>
            `Update price for ${code}?\n\n` +
            `From: S$${from || "(blank)"} / person\n` +
            `To:   S$${to || "(blank)"} / person\n\n` +
            `Note: This won’t change prices on past sessions. Only newly logged sessions will use the new price.`,
        };
  }, [lang]);

  const [venueName, setVenueName] = useState("");
  const [venueAddr, setVenueAddr] = useState("");

  const canAddVenue = venueName.trim().length > 0;

  const modePriceByCode = useMemo(() => {
    const m = new Map<string, string>();
    for (const code of ["1:1", "1:2", "1:3", "1:4"]) {
      const existing = modes.find((x) => x.code === code);
      const price =
        existing?.default_price_cents != null ? String(Math.round(existing.default_price_cents / 100)) : "";
      m.set(code, price);
    }
    return m;
  }, [modes]);

  const [draftPrice, setDraftPrice] = useState<Record<string, string>>(() => {
    const out: Record<string, string> = {};
    for (const [k, v] of modePriceByCode.entries()) out[k] = v;
    return out;
  });

  // If modes change (after save), refresh drafts to new baseline.
  // This keeps "changed" indicator accurate after navigation refresh.
  const baselineKey = useMemo(() => JSON.stringify(Array.from(modePriceByCode.entries())), [modePriceByCode]);
  useState(() => {
    // no-op initializer only; actual syncing handled below
    return null;
  });
  if (baselineKey && Object.keys(draftPrice).length === 0) {
    // never happens; keep TS happy
  }

  // Sync drafts when baseline changes (client component remounts on navigation).
  // So we can just keep the initializer above; no extra effect needed.

  function isDirty(code: string) {
    return (draftPrice[code] ?? "") !== (modePriceByCode.get(code) ?? "");
  }

  return (
    <>
      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="text-sm font-semibold text-slate-900">{t.venues}</h2>

        <form
          action={createVenue}
          className="mt-4 grid gap-3 sm:grid-cols-5"
          onSubmit={(e) => {
            if (!canAddVenue) {
              e.preventDefault();
              return;
            }
            if (!window.confirm(t.confirmSave)) {
              e.preventDefault();
              return;
            }
          }}
        >
          <input
            name="venueName"
            value={venueName}
            onChange={(e) => setVenueName(e.target.value)}
            placeholder={t.venueNamePh}
            className="sm:col-span-2 rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-500/25"
          />
          <input
            name="venueAddress"
            value={venueAddr}
            onChange={(e) => setVenueAddr(e.target.value)}
            placeholder={t.venueAddrPh}
            className="sm:col-span-2 rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-500/25"
          />
          {canAddVenue ? (
            <button
              type="submit"
              aria-label={t.addVenue}
              title={t.addVenue}
              className="inline-flex h-6 w-6 items-center justify-center text-lg font-bold leading-none text-cyan-700 hover:text-cyan-800"
            >
              +
            </button>
          ) : (
            <div className="h-6 w-6" />
          )}
        </form>

        {venues.length === 0 ? (
          <div className="mt-5 rounded-xl border border-slate-100 p-4 text-sm text-slate-600/90">
            {lang === "zh" ? "还没有场地。" : "No venues yet."}
          </div>
        ) : (
          <div className="mt-5 divide-y divide-slate-200 rounded-xl border border-slate-100">
            {venues.map((v) => (
              <div key={v.id} className="relative flex items-center justify-between p-4 pr-10">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-slate-900">{v.name}</div>
                  {v.address ? <div className="truncate text-xs text-slate-500">{v.address}</div> : null}
                </div>
                <form
                  action={deleteVenue}
                  onSubmit={(e) => {
                    if (!window.confirm(t.confirmDelete)) e.preventDefault();
                  }}
                >
                  <input type="hidden" name="id" value={v.id} />
                  <button
                    type="submit"
                    className="absolute right-3 top-3 inline-flex h-6 w-6 items-center justify-center text-lg font-bold leading-none text-red-600 hover:text-red-700"
                    aria-label={lang === "zh" ? `删除场地：${v.name}` : `Delete venue: ${v.name}`}
                    title={t.delete}
                  >
                    ×
                  </button>
                </form>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="text-sm font-semibold text-slate-900">{t.modeTitle}</h2>

        <div className="mt-4 grid gap-3">
          {(["1:1", "1:2", "1:3", "1:4"] as const).map((code) => {
            const dirty = isDirty(code);
            return (
              <form
                key={code}
                action={upsertLessonMode}
                className="grid items-center gap-3 rounded-xl border border-slate-200 p-4 sm:grid-cols-4"
                onSubmit={(e) => {
                  if (!dirty) {
                    e.preventDefault();
                    return;
                  }
                  const from = modePriceByCode.get(code) ?? "";
                  const to = draftPrice[code] ?? "";
                  if (!window.confirm(t.confirmPriceChange(code, from, to))) {
                    e.preventDefault();
                  }
                }}
              >
                <input type="hidden" name="code" value={code} />
                <div className="text-sm font-semibold text-slate-900">{code}</div>
                <input
                  name="price"
                  value={draftPrice[code] ?? ""}
                  onChange={(e) => setDraftPrice((m) => ({ ...m, [code]: e.target.value }))}
                  placeholder={lang === "zh" ? "单价（S$）" : "Price (S$)"}
                  className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-500/25"
                  inputMode="numeric"
                />
                {dirty ? (
                  <button
                    type="submit"
                    aria-label={t.savePrice}
                    title={t.savePrice}
                    className="inline-flex h-6 w-6 items-center justify-center text-lg font-bold leading-none text-emerald-700 hover:text-emerald-800"
                  >
                    ✓
                  </button>
                ) : (
                  <div className="h-6 w-6" />
                )}
              </form>
            );
          })}
        </div>
      </section>
    </>
  );
}

