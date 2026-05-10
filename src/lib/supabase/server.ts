import "server-only";

import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export function isSupabaseConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

/**
 * Admin client: bypasses RLS. Only used when isDevAuthBypass() is true.
 * Requires SUPABASE_SERVICE_ROLE_KEY (server-only, never NEXT_PUBLIC_*).
 */
export function createSupabaseAdminForDev() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );
}

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          const anyStore = cookieStore as unknown as {
            getAll?: () => { name: string; value: string }[];
            [Symbol.iterator]?: () => IterableIterator<
              [string, { name: string; value: string }]
            >;
          };

          if (typeof anyStore.getAll === "function") return anyStore.getAll();
          if (typeof anyStore[Symbol.iterator] === "function") {
            return Array.from(anyStore as any).map(([, c]: any) => c);
          }
          return [];
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              (cookieStore as any).set?.(name, value, options);
            });
          } catch {
            // Called from a Server Component where setting cookies is not allowed.
          }
        },
      },
    },
  );
}

