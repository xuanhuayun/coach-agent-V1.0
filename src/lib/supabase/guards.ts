import "server-only";

import type { User } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { cache } from "react";
import { isDevAuthBypass } from "@/lib/dev-auth";
import {
  createSupabaseAdminForDev,
  createSupabaseServerClient,
  isSupabaseConfigured,
} from "@/lib/supabase/server";

export const requireUser = cache(async function requireUser() {
  if (!isSupabaseConfigured()) {
    redirect("/login");
  }

  if (isDevAuthBypass()) {
    const devId = process.env.COACH_AGENT_DEV_USER_ID!;
    const user = { id: devId } as User;
    return { supabase: createSupabaseAdminForDev(), user };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    // Most commonly: AuthSessionMissingError (not logged in yet)
    redirect("/login");
  }
  if (!user) redirect("/login");

  return { supabase, user };
});

