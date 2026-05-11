import { Suspense } from "react";
import { redirect } from "next/navigation";
import { isDevAuthBypass } from "@/lib/dev-auth";
import LoginForm from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string }>;
}) {
  if (isDevAuthBypass()) {
    const sp = await searchParams;
    const nextPath = sp.redirectTo?.startsWith("/") ? sp.redirectTo : "/sessions";
    redirect(nextPath);
  }

  return (
    <Suspense
      fallback={<div className="min-h-screen bg-sky-50/70 text-slate-900" />}
    >
      <LoginForm />
    </Suspense>
  );
}
