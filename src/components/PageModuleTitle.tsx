import type { ModuleTabHref } from "@/lib/module-tab-icons";
import { moduleTabIcons } from "@/lib/module-tab-icons";

export function PageModuleTitle({
  module,
  children,
  className = "text-lg",
}: {
  module: ModuleTabHref;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <h1
      className={`flex min-w-0 items-center gap-1.5 font-semibold tracking-tight text-slate-900 ${className}`}
    >
      <img
        src={moduleTabIcons[module]}
        alt=""
        width={26}
        height={26}
        decoding="async"
        className="h-[26px] w-[26px] shrink-0 object-contain"
        aria-hidden
      />
      <span className="min-w-0">{children}</span>
    </h1>
  );
}
