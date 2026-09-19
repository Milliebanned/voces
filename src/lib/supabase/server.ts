import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Server Components cannot set cookies; the proxy refreshes the
            // session instead, so this is safe to swallow.
          }
        },
      },
    },
  );
}

/**
 * The signed-in user, or null. Verifies the session JWT locally against the
 * project's published signing key, where getUser() made a round trip to the
 * Auth server on every call — over half a second each from here, paid once in
 * the proxy and again in every page, action and route.
 */
export async function currentUser(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<{ id: string } | null> {
  const { data } = await supabase.auth.getClaims();
  return data?.claims.sub ? { id: data.claims.sub } : null;
}
