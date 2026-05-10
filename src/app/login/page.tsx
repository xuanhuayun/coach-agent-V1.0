"use client";

import { useMemo, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") ?? "/sessions/new";
  const authError = searchParams.get("authError");

  const supabaseConfigured = useMemo(() => {
    return Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    );
  }, []);

  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function onSendLink() {
    setMsg(null);
    if (!supabaseConfigured) {
      setMsg("还没配置 Supabase 环境变量，先填好 .env.local 再试。");
      return;
    }
    const supabase = createSupabaseBrowserClient();
    const emailRedirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(
      redirectTo,
    )}`;
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo,
      },
    });
    setMsg(error ? error.message : "登录链接已发送到邮箱。");
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-10">
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h1 className="text-xl font-semibold tracking-tight">Coach Agent</h1>
          <p className="mt-2 text-sm text-zinc-600">
            用邮箱收取一次性登录链接（Magic Link）。
          </p>

          {authError && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-900">
              登录失败：{authError}
            </div>
          )}

          {!supabaseConfigured && (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              还没配置 Supabase。把 <code className="font-mono">.env.local.example</code>{" "}
              复制成 <code className="font-mono">.env.local</code>，填入{" "}
              <code className="font-mono">NEXT_PUBLIC_SUPABASE_URL</code> 和{" "}
              <code className="font-mono">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>。
            </div>
          )}

          <label className="mt-5 block text-sm font-medium">邮箱</label>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="mt-2 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-400"
            inputMode="email"
            autoComplete="email"
          />

          <button
            onClick={() => startTransition(onSendLink)}
            disabled={isPending || !email}
            className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
          >
            {isPending ? "发送中..." : "发送登录链接"}
          </button>

          {msg && <p className="mt-3 text-sm text-zinc-700">{msg}</p>}

          <p className="mt-6 text-xs text-zinc-500">
            登录后会自动跳转到：<code className="font-mono">{redirectTo}</code>
          </p>
        </div>
      </div>
    </div>
  );
}

