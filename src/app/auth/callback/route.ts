import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/sessions/new";
  const error = url.searchParams.get("error");
  const errorCode = url.searchParams.get("error_code");
  const errorDescription = url.searchParams.get("error_description");

  if (error || errorCode || errorDescription) {
    const msg = errorDescription || errorCode || error || "unknown_error";
    const loginUrl = new URL("/login", url.origin);
    loginUrl.searchParams.set("authError", msg);
    loginUrl.searchParams.set("redirectTo", next);
    return NextResponse.redirect(loginUrl);
  }

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error: exchangeError } =
      await supabase.auth.exchangeCodeForSession(code);
    if (exchangeError) {
      const loginUrl = new URL("/login", url.origin);
      loginUrl.searchParams.set("authError", exchangeError.message);
      loginUrl.searchParams.set("redirectTo", next);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.redirect(new URL(next, url.origin));
}

