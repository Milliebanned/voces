"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Wordmark } from "@/components/wordmark";
import { login, signup, type AuthState } from "./actions";

export default function LoginPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const action = mode === "signin" ? login : signup;
  const [state, formAction, pending] = useActionState<AuthState, FormData>(
    action,
    {},
  );

  const isSignup = mode === "signup";

  return (
    <main className="landing-sky flex flex-1 flex-col">
      <header className="mx-auto flex w-full max-w-6xl px-6 py-6">
        <Link href="/">
          <Wordmark />
        </Link>
      </header>

      <div className="flex flex-1 items-start justify-center px-6 pt-12 pb-24">
        <div className="w-full max-w-[400px]">
          <h1 className="text-[32px] leading-tight font-bold tracking-[-0.02em]">
            {isSignup ? "Start speaking" : "Welcome back"}
          </h1>
          <p className="mt-3 text-[15px] leading-relaxed text-muted">
            {isSignup
              ? "Create an account and hold your first conversation in minutes."
              : "Sign in to pick up where your last conversation left off."}
          </p>

          <form action={formAction} className="mt-8 flex flex-col gap-4">
            <label className="flex flex-col gap-2">
              <span className="text-[13px] font-medium">Email</span>
              <input
                type="email"
                name="email"
                autoComplete="email"
                required
                placeholder="you@example.com"
                className="rounded-xl border border-border bg-surface px-4 py-3 text-[15px] outline-none placeholder:text-muted/60 focus:border-accent"
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-[13px] font-medium">Password</span>
              <input
                type="password"
                name="password"
                autoComplete={isSignup ? "new-password" : "current-password"}
                required
                minLength={isSignup ? 8 : undefined}
                placeholder={isSignup ? "At least 8 characters" : "••••••••"}
                className="rounded-xl border border-border bg-surface px-4 py-3 text-[15px] outline-none placeholder:text-muted/60 focus:border-accent"
              />
            </label>

            {state.error && (
              <p className="rounded-xl bg-accent-soft px-4 py-3 text-[13px] leading-relaxed text-accent">
                {state.error}
              </p>
            )}
            {state.notice && (
              <p className="rounded-xl border border-border bg-surface px-4 py-3 text-[13px] leading-relaxed text-muted">
                {state.notice}
              </p>
            )}

            <button
              type="submit"
              disabled={pending}
              className="mt-2 rounded-full bg-accent px-7 py-4 text-base font-semibold text-white transition-colors hover:bg-accent-hover disabled:opacity-60"
            >
              {pending
                ? "One moment…"
                : isSignup
                  ? "Create account"
                  : "Sign in"}
            </button>
          </form>

          <p className="mt-6 text-center text-[14px] text-muted">
            {isSignup ? "Already have an account?" : "New to VOCES?"}{" "}
            <button
              type="button"
              onClick={() => setMode(isSignup ? "signin" : "signup")}
              className="font-semibold text-accent hover:underline"
            >
              {isSignup ? "Sign in" : "Create one"}
            </button>
          </p>
        </div>
      </div>
    </main>
  );
}
