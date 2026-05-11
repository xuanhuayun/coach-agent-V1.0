/**
 * Middleware runs in Edge and often cannot read non-NEXT_PUBLIC_ env vars.
 * Use NEXT_PUBLIC_COACH_AGENT_DEV_SKIP=1 so the skip flag is visible there.
 *
 * Never set these on Vercel: VERCEL=1 disables bypass.
 */
export function isMiddlewareDevAuthSkip(): boolean {
  if (process.env.VERCEL === "1") return false;
  if (process.env.NEXT_PUBLIC_COACH_AGENT_DEV_SKIP !== "1") return false;
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);
}

/**
 * Full server-side bypass: needs service role + a real auth.users UUID for FKs.
 */
export function isDevAuthBypass(): boolean {
  const enabled =
    process.env.COACH_AGENT_PROD_SKIP_AUTH === "1" ||
    process.env.NEXT_PUBLIC_COACH_AGENT_DEV_SKIP === "1" ||
    process.env.COACH_AGENT_DEV_SKIP_AUTH === "1";
  if (!enabled) return false;
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.SUPABASE_SERVICE_ROLE_KEY &&
      process.env.COACH_AGENT_DEV_USER_ID,
  );
}
