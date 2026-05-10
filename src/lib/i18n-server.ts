import "server-only";

import { cookies } from "next/headers";
import { dict, LANG_COOKIE, type Lang } from "@/lib/i18n";

export async function getLang(): Promise<Lang> {
  const store = await cookies();
  const v = store.get(LANG_COOKIE)?.value;
  return v === "en" ? "en" : "zh";
}

export async function t() {
  const lang = await getLang();
  return dict[lang];
}

