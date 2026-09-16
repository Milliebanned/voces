import Link from "next/link";
import { redirect } from "next/navigation";
import { Wordmark } from "@/components/wordmark";
import {
  NATIVE_LANGUAGES,
  SKILL_LEVELS,
  TARGET_LANGUAGES,
} from "@/lib/languages";
import { createClient } from "@/lib/supabase/server";
import { completeOnboarding } from "./actions";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "display_name, native_language, target_language, skill_level, goals, onboarded_at",
    )
    .eq("id", user.id)
    .single();

  // Doubles as the settings page once onboarding is done.
  const returning = Boolean(profile?.onboarded_at);

  return (
    <main className="flex flex-1 flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
        <Wordmark />
        {returning && (
          <Link
            href="/dashboard"
            className="text-sm font-medium text-muted transition-colors hover:text-foreground"
          >
            Cancel
          </Link>
        )}
      </header>

      <div className="mx-auto w-full max-w-[520px] px-6 pt-8 pb-24">
        <h1 className="text-[32px] leading-tight font-bold tracking-[-0.02em]">
          {returning
            ? "Your learning setup"
            : "Let's set up your first conversation"}
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-muted">
          This shapes how your conversation partner speaks to you. You can
          change any of it later.
        </p>

        <form action={completeOnboarding} className="mt-10 flex flex-col gap-7">
          <label className="flex flex-col gap-2">
            <span className="text-[13px] font-medium">
              What should we call you?
            </span>
            <input
              type="text"
              name="display_name"
              autoComplete="given-name"
              defaultValue={profile?.display_name ?? ""}
              placeholder="Your name"
              className="rounded-xl border border-border bg-surface px-4 py-3 text-[15px] outline-none placeholder:text-muted/60 focus:border-accent"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-2">
              <span className="text-[13px] font-medium">
                Language you&apos;re learning
              </span>
              <select
                name="target_language"
                required
                defaultValue={profile?.target_language ?? "fr"}
                className="rounded-xl border border-border bg-surface px-4 py-3 text-[15px] outline-none focus:border-accent"
              >
                {TARGET_LANGUAGES.map((language) => (
                  <option key={language.code} value={language.code}>
                    {language.label}
                  </option>
                ))}
              </select>
              <span className="text-[12px] leading-relaxed text-muted">
                These are the languages your partner can speak aloud.
              </span>
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-[13px] font-medium">
                Your native language
              </span>
              <select
                name="native_language"
                required
                defaultValue={profile?.native_language ?? "en"}
                className="rounded-xl border border-border bg-surface px-4 py-3 text-[15px] outline-none focus:border-accent"
              >
                {NATIVE_LANGUAGES.map((language) => (
                  <option key={language.code} value={language.code}>
                    {language.label}
                  </option>
                ))}
              </select>
              <span className="text-[12px] leading-relaxed text-muted">
                What you&apos;ll fall back to when a word escapes you.
              </span>
            </label>
          </div>

          <fieldset className="flex flex-col gap-3">
            <legend className="mb-1 text-[13px] font-medium">
              Where are you right now?
            </legend>
            {SKILL_LEVELS.map((level, index) => (
              <label
                key={level.value}
                className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-surface p-4 transition-colors hover:border-accent has-checked:border-accent has-checked:bg-accent-soft"
              >
                <input
                  type="radio"
                  name="skill_level"
                  value={level.value}
                  required
                  defaultChecked={
                    profile?.skill_level
                      ? profile.skill_level === level.value
                      : index === 0
                  }
                  className="mt-1 accent-accent"
                />
                <span className="flex flex-col gap-1">
                  <span className="text-[15px] font-semibold">
                    {level.label}
                  </span>
                  <span className="text-[13px] leading-relaxed text-muted">
                    {level.hint}
                  </span>
                </span>
              </label>
            ))}
          </fieldset>

          <label className="flex flex-col gap-2">
            <span className="text-[13px] font-medium">
              What are you learning it for?{" "}
              <span className="font-normal text-muted">(optional)</span>
            </span>
            <textarea
              name="goals"
              rows={3}
              defaultValue={profile?.goals ?? ""}
              placeholder="Travelling to Lyon next spring, and I want to order food without switching to English."
              className="resize-none rounded-xl border border-border bg-surface px-4 py-3 text-[15px] leading-relaxed outline-none placeholder:text-muted/60 focus:border-accent"
            />
          </label>

          <button
            type="submit"
            className="mt-1 self-start rounded-full bg-accent px-7 py-4 text-base font-semibold text-white transition-colors hover:bg-accent-hover"
          >
            {returning ? "Save changes" : "Go to my dashboard"}
          </button>
        </form>
      </div>
    </main>
  );
}
