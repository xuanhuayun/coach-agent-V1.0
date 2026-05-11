"use client";

import { useMemo, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function LoginForm() {
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") ?? "/sessions";
  const authError = searchParams.get("authError");

  const supabaseConfigured = useMemo(() => {
    return Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    );
  }, []);

  const devSkipUi = useMemo(() => {
    return process.env.NEXT_PUBLIC_COACH_AGENT_DEV_SKIP === "1";
  }, []);

  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [msgIsError, setMsgIsError] = useState(false);
  const [isPending, startTransition] = useTransition();

  async function onSendLink() {
    setMsg(null);
    setMsgIsError(false);
    if (!supabaseConfigured) {
      setMsgIsError(true);
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
    setMsgIsError(Boolean(error));
    setMsg(error ? error.message : "登录链接已发到邮箱啦～去收一下，点开就能进来。");
  }

  return (
    <div className="min-h-screen bg-sky-50/70 text-slate-900">
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-10">
        <div className="rounded-2xl border border-sky-100 bg-white p-6 shadow-md shadow-sky-100/50">
          <h1 className="text-lg font-bold tracking-tight text-slate-700">
            Coach Xing's Agent
          </h1>
          <p className="mt-2 text-sm text-slate-600/90">
            用邮箱收一次性登录链接（Magic Link）。登录后就能开始记课啦～
          </p>

          {devSkipUi && (
            <div className="mt-4 rounded-xl border border-sky-100 bg-sky-50/70 p-3 text-sm text-slate-700">
              你已开启本地开发跳过登录（<code className="font-mono">NEXT_PUBLIC_COACH_AGENT_DEV_SKIP=1</code>
              ）。若仍停在本页，请重启 <code className="font-mono">npm run dev</code>，并确认{" "}
              <code className="font-mono">.env.local</code> 里同时配置了 service role 与{" "}
              <code className="font-mono">COACH_AGENT_DEV_USER_ID</code>。
            </div>
          )}

          {authError && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              登录失败：{authError}
            </div>
          )}

          {!supabaseConfigured && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              还没配置 Supabase。参考仓库里的 <code className="font-mono">env.example</code>{" "}
              配置 <code className="font-mono">.env.local</code>。
            </div>
          )}

          <label className="mt-5 block text-sm font-semibold text-slate-800">
            邮箱
          </label>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-500/25"
            inputMode="email"
            autoComplete="email"
          />

          <button
            onClick={() => startTransition(onSendLink)}
            disabled={isPending || !email}
            className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-sky-600 to-sky-700 shadow-md shadow-sky-900/15 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
          >
            {isPending ? "发送中..." : "发送登录链接"}
          </button>

          {msg && (
            <p
              className={`mt-3 text-sm ${
                msgIsError ? "text-red-700" : "text-emerald-800"
              }`}
            >
              {msg}
            </p>
          )}

          <p className="mt-6 text-xs text-slate-500">
            登录后会自动跳转到：<code className="font-mono">{redirectTo}</code>
          </p>
        </div>
      </div>
    </div>
  );
}
