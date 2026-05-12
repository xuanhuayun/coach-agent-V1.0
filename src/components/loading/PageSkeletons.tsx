import type { Lang } from "@/lib/i18n";
import { LoadingHint, LoadingHintStatic } from "./LoadingHint";

export function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-slate-200/70 ${className}`} />;
}

export function ListCardSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-4">
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <SkeletonBlock key={i} className="h-14 w-full" />
        ))}
      </div>
    </div>
  );
}

export function SectionLoadingFallback({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      <LoadingHintStatic />
      <ListCardSkeleton rows={rows} />
    </div>
  );
}

export function PanelLoadingFallback() {
  return (
    <div className="space-y-3">
      <LoadingHintStatic />
      <SkeletonBlock className="h-12 w-full rounded-2xl" />
    </div>
  );
}

export function SessionsPageSkeleton({ lang }: { lang: Lang }) {
  return (
    <div className="max-w-3xl space-y-8">
      <LoadingHint lang={lang} />
      <div className="space-y-2">
        <SkeletonBlock className="h-6 w-40" />
        <SkeletonBlock className="h-4 w-full max-w-xl" />
      </div>
      <ListCardSkeleton rows={2} />
      <ListCardSkeleton rows={3} />
      <SkeletonBlock className="h-12 w-full rounded-2xl" />
      <ListCardSkeleton rows={4} />
    </div>
  );
}

export function BookingsPageSkeleton({ lang }: { lang: Lang }) {
  return (
    <div className="max-w-3xl space-y-6">
      <LoadingHint lang={lang} />
      <SkeletonBlock className="h-6 w-24" />
      <ListCardSkeleton rows={3} />
      <SkeletonBlock className="h-12 w-full rounded-2xl" />
      <ListCardSkeleton rows={2} />
    </div>
  );
}

export function StudentsPageSkeleton({ lang }: { lang: Lang }) {
  return (
    <div className="max-w-4xl space-y-4">
      <LoadingHint lang={lang} />
      <div className="flex items-center justify-between gap-3">
        <SkeletonBlock className="h-5 w-24" />
        <SkeletonBlock className="h-5 w-16" />
      </div>
      <SkeletonBlock className="h-10 w-full max-w-xs rounded-xl" />
      <ListCardSkeleton rows={6} />
    </div>
  );
}

export function RevenuePageSkeleton({ lang }: { lang: Lang }) {
  return (
    <div className="max-w-4xl space-y-6">
      <LoadingHint lang={lang} />
      <SkeletonBlock className="h-6 w-28" />
      <div className="grid gap-3 sm:grid-cols-2">
        <SkeletonBlock className="h-24 rounded-2xl" />
        <SkeletonBlock className="h-24 rounded-2xl" />
      </div>
      <SkeletonBlock className="h-56 w-full rounded-2xl" />
      <ListCardSkeleton rows={4} />
    </div>
  );
}
