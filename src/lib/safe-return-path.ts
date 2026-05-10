/** Only allow same-app relative paths (no protocol / no query). */
export function safeInternalPath(v: string | null | undefined): string | null {
  if (v == null || typeof v !== "string") return null;
  const t = v.trim();
  if (!t.startsWith("/") || t.startsWith("//")) return null;
  if (t.includes("?") || t.includes("#")) return null;
  if (!/^\/[a-zA-Z0-9/_-]+$/.test(t)) return null;
  return t;
}
