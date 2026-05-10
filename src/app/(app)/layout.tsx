import Link from "next/link";

const nav = [
  { href: "/sessions/new", label: "课后记录" },
  { href: "/students", label: "学员" },
  { href: "/revenue", label: "当月收入" },
  { href: "/settings", label: "设置" },
] as const;

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <div className="mx-auto flex min-h-screen max-w-6xl">
        <aside className="hidden w-56 flex-col gap-1 border-r border-zinc-200 bg-white p-4 sm:flex">
          <div className="mb-2">
            <div className="text-sm font-semibold tracking-tight">
              Coach Agent
            </div>
            <div className="text-xs text-zinc-500">羽毛球教练工作台</div>
          </div>

          <nav className="flex flex-col gap-1">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-lg px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center justify-between border-b border-zinc-200 bg-white px-4 py-3 sm:hidden">
            <div className="text-sm font-semibold">Coach Agent</div>
            <Link href="/settings" className="text-sm text-zinc-700">
              设置
            </Link>
          </header>
          <div className="flex-1 p-4 sm:p-8">{children}</div>
        </main>
      </div>
    </div>
  );
}

