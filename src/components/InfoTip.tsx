"use client";

import { useId, useState } from "react";

export function InfoTip({
  text,
  side = "bottom",
}: {
  text: string;
  side?: "top" | "bottom";
}) {
  const id = useId();
  const [open, setOpen] = useState(false);

  const pos =
    side === "top"
      ? "bottom-full mb-2 origin-bottom"
      : "top-full mt-2 origin-top";

  return (
    <span className="relative inline-flex align-middle">
      <button
        type="button"
        aria-label="Info"
        aria-describedby={open ? id : undefined}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-300 bg-white text-xs font-bold text-slate-700 shadow-sm shadow-slate-200/40 hover:bg-slate-50"
      >
        i
      </button>

      {open && (
        <span
          id={id}
          role="tooltip"
          className={`absolute ${pos} right-0 z-50 w-[min(22rem,80vw)] whitespace-pre-wrap rounded-xl border border-slate-200 bg-slate-900 px-3 py-2 text-xs leading-relaxed text-white shadow-lg shadow-slate-900/25`}
        >
          {text}
        </span>
      )}
    </span>
  );
}

