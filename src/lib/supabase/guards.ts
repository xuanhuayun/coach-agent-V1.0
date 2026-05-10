import "server-only";

import { redirect } from "next/navigation";
import {
  createSupabaseServerClient,
  isSupabaseConfigured,
} from "@/lib/supabase/server";

export async function requireUser() {
  if (!isSupabaseConfigured()) {
    redirect("/login");
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
}

