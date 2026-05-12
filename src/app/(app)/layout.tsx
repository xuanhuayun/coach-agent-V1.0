import { TopModuleNav } from "@/components/TopModuleNav";
import { ToastBar } from "@/components/ToastBar";
import { getLang } from "@/lib/i18n-server";
import { dict } from "@/lib/i18n";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const lang = await getLang();
  const d = dict[lang];

  return (
    <div className="min-h-dvh text-slate-900">
      <div className="mx-auto min-h-dvh max-w-6xl">
        <header className="sticky top-0 z-40 border-b border-sky-100/90 bg-sky-50/90 px-4 py-3 shadow-sm shadow-sky-100/50 backdrop-blur-md sm:px-6">
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="text-sm font-bold text-slate-700">{d.appName}</div>
                <div className="text-xs font-medium text-slate-500">
                  {d.appSubtitle}
                </div>
              </div>
            </div>

            <div>
              <TopModuleNav
                items={[
                  {
                    href: "/bookings",
                    label: d.nav_bookings,
                    activePrefix: "/bookings",
                  },
                  {
                    href: "/sessions",
                    label: d.nav_session_list,
                    activePrefix: "/sessions",
                  },
                  {
                    href: "/students",
                    label: d.nav_students,
                    activePrefix: "/students",
                  },
                  {
                    href: "/revenue",
                    label: d.nav_revenue,
                    activePrefix: "/revenue",
                  },
                  {
                    href: "/settings",
                    label: d.nav_settings,
                    activePrefix: "/settings",
                  },
                ]}
              />
            </div>
          </div>
        </header>

        <ToastBar />

        <main className="px-4 py-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:px-6 sm:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
