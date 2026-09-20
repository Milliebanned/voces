"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export type AuthState = { error?: string; notice?: string };

function credentials(formData: FormData) {
  return {
    email: String(formData.get("email") ?? "").trim(),
    password: String(formData.get("password") ?? ""),
  };
}

// Supabase falls back to the dashboard's Site URL (localhost in dev, and
// wrong for every other deployment) unless a redirect is passed explicitly.
// Built from the request rather than an env var so it's correct on every
// deployment without extra configuration — but Supabase only honours it when
// this exact URL is also added to Authentication → URL Configuration →
// Redirect URLs in the dashboard, otherwise it silently falls back to Site URL.
async function confirmRedirectUrl() {
  const list = await headers();
  const host = list.get("x-forwarded-host") ?? list.get("host");
  // Plain `npm run dev` sets neither header nor puts itself behind a proxy,
  // so there's no x-forwarded-proto to read — defaulting to https built a
  // link Supabase would never match against a localhost entry.
  const proto =
    list.get("x-forwarded-proto") ??
    (host?.startsWith("localhost") || host?.startsWith("127.0.0.1")
      ? "http"
      : "https");
  return `${proto}://${host}/auth/confirm`;
}

export async function login(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const { email, password } = credentials(formData);

  if (!email || !password) {
    return { error: "Enter your email and password." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function signup(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const { email, password } = credentials(formData);

  if (!email || !password) {
    return { error: "Enter your email and password." };
  }
  if (password.length < 8) {
    return { error: "Use at least 8 characters for your password." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: await confirmRedirectUrl() },
  });

  if (error) return { error: error.message };

  // With email confirmation switched on, Supabase returns no session and the
  // account stays dormant until the link is clicked.
  if (!data.session) {
    return { notice: "Check your email to confirm your account." };
  }

  revalidatePath("/", "layout");
  redirect("/onboarding");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}
