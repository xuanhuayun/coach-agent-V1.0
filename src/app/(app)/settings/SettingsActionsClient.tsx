"use client";

import { useMemo, useRef, useState } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { LESSON_MODE_CODES, LESSON_MODE_DEFINITIONS } from "@/lib/lesson-mode";

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
          modeTitle: "上课模式和价格",
          modePriceLabel: "人均价格",
          savePrice: "保存价格",
          confirmSave: "确认保存？",
          confirmDelete: "确认删除？",
          confirmPriceChange: (label: string, from: string, to: string) =>
            `确认把「${label}」的每人单价从 S$${from || "—"} 改为 S$${to || "—"}？\n\n` +
            `已记课程、已有财务统计和已创建的约课都不会改价。保存后，新记的课程、新的收入统计，以及之后创建的约课才会按新单价计算。`,
        }
      : {
          venues: "Venues",
          addVenue: "Add venue",
          venueNamePh: "Venue name (e.g. XYZ Sports Hall)",
          venueAddrPh: "Address (optional)",
          delete: "Delete",
          modeTitle: "Lesson modes & pricing",
          modePriceLabel: "Per-person price (S$)",
          modePriceNote: "1:1 counts as 1 student; 1:2 / 1:3 / 1:4 total = per-person price × attendance.",
          savePrice: "Save price",
          confirmSave: "Confirm save?",
          confirmDelete: "Confirm delete?",
          confirmPriceChange: (label: string, from: string, to: string) =>
            `Change ${label} from S$${from || "—"} to S$${to || "—"} per person?\n\n` +
            `Past sessions, existing revenue totals, and bookings already created will not be updated. After you save, newly logged sessions, new revenue calculations, and bookings you create later will use this price.`,
        };
  }, [lang]);

  const [venueName, setVenueName] = useState("");
  const [venueAddr, setVenueAddr] = useState("");
  const [priceConfirm, setPriceConfirm] = useState<{
    code: string;
    label: string;
    from: string;
    to: string;
  } | null>(null);
  const allowPriceSubmitRef = useRef<string | null>(null);

  const canAddVenue = venueName.trim().length > 0;

  const modePriceByCode = useMemo(() => {
    const m = new Map<string, string>();
    for (const code of LESSON_MODE_CODES) {
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
            className="sm:col-span-2 rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-500/25"
          />
          <input
            name="venueAddress"
            value={venueAddr}
            onChange={(e) => setVenueAddr(e.target.value)}
            placeholder={t.venueAddrPh}
            className="sm:col-span-2 rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-500/25"
          />
          {canAddVenue ? (
            <button
              type="submit"
              aria-label={t.addVenue}
              title={t.addVenue}
              className="inline-flex h-6 w-6 items-center justify-center text-lg font-bold leading-none text-sky-700 hover:text-sky-800"
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
                    className="absolute right-3 top-3 inline-flex h-6 w-6 items-center justify-center rounded-full border border-red-200 bg-red-50 text-lg font-bold leading-none text-red-700 hover:bg-red-100"
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

        {lang === "en" ? (
          <p className="mt-2 text-sm text-slate-600/90">{t.modePriceNote}</p>
        ) : null}

        <div className="mt-4 grid gap-3">
          {LESSON_MODE_DEFINITIONS.map((def) => {
            const code = def.code;
            const dirty = isDirty(code);
            const label = lang === "zh" ? def.labelZh : def.labelEn;
            return (
              <form
                key={code}
                id={`mode-price-form-${code}`}
                action={upsertLessonMode}
                className="grid items-center gap-3 rounded-xl border border-slate-200 p-4 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto]"
                onSubmit={(e) => {
                  if (!isDirty(code)) {
                    e.preventDefault();
                    return;
                  }
                  if (allowPriceSubmitRef.current !== code) {
                    e.preventDefault();
                    setPriceConfirm({
                      code,
                      label,
                      from: modePriceByCode.get(code) ?? "",
                      to: draftPrice[code] ?? "",
                    });
                    return;
                  }
                  allowPriceSubmitRef.current = null;
                }}
              >
                <input type="hidden" name="code" value={code} />
                <div className="text-sm font-semibold text-slate-900">{label}</div>
                <div className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 focus-within:border-sky-600 focus-within:ring-2 focus-within:ring-sky-500/25">
                  <span className="shrink-0 text-sm text-slate-500">S$</span>
                  <input
                    name="price"
                    value={draftPrice[code] ?? ""}
                    onChange={(e) => setDraftPrice((m) => ({ ...m, [code]: e.target.value }))}
                    placeholder={t.modePriceLabel}
                    aria-label={t.modePriceLabel}
                    className="min-w-0 flex-1 border-0 bg-transparent p-0 text-sm text-slate-900 outline-none focus:ring-0"
                    inputMode="numeric"
                  />
                </div>
                {dirty ? (
                  <button
                    type="button"
                    onClick={() =>
                      setPriceConfirm({
                        code,
                        label,
                        from: modePriceByCode.get(code) ?? "",
                        to: draftPrice[code] ?? "",
                      })
                    }
                    className="rounded-xl bg-gradient-to-r from-sky-600 to-sky-700 px-3 py-1.5 text-xs font-medium text-white shadow-sm shadow-sky-900/15 hover:from-sky-700 hover:to-sky-800"
                  >
                    {lang === "zh" ? "保存" : "Save"}
                  </button>
                ) : (
                  <div className="h-6 w-6" />
                )}
              </form>
            );
          })}
        </div>
      </section>

      <ConfirmDialog
        open={priceConfirm != null}
        title={lang === "zh" ? "确认修改单价？" : "Update lesson price?"}
        description={
          priceConfirm
            ? t.confirmPriceChange(priceConfirm.label, priceConfirm.from, priceConfirm.to)
            : ""
        }
        cancelLabel={lang === "zh" ? "取消" : "Cancel"}
        confirmLabel={lang === "zh" ? "确认保存" : "Save"}
        onCancel={() => setPriceConfirm(null)}
        onConfirm={() => {
          if (!priceConfirm) return;
          const form = document.getElementById(`mode-price-form-${priceConfirm.code}`) as HTMLFormElement | null;
          allowPriceSubmitRef.current = priceConfirm.code;
          setPriceConfirm(null);
          form?.requestSubmit();
        }}
      />
    </>
  );
}

