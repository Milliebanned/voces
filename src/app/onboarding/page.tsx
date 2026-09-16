import { redirect } from "next/navigation";
import { Wordmark } from "@/components/wordmark";
import { LANGUAGES, SKILL_LEVELS } from "@/lib/languages";
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
    .select("onboarded_at")
    .eq("id", user.id)
    .single();

  if (profile?.onboarded_at) redirect("/dashboard");

  return (
    <main className="flex flex-1 flex-col">
      <header className="mx-auto flex w-full max-w-6xl px-6 py-6">
        <Wordmark />
      </header>

      <div className="mx-auto w-full max-w-[520px] px-6 pt-8 pb-24">
        <h1 className="text-[32px] leading-tight font-bold tracking-[-0.02em]">
          Let&apos;s set up your first conversation
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
              placeholder="Your name"
              className="rounded-xl border border-border bg-surface px-4 py-3 text-[15px] outline-none placeholder:text-muted/60 focus:border-accent"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-2">
              <span className="text-[13px] font-medium">
                Your native language
              </span>
              <select
                name="native_language"
                required
                defaultValue="en"
                className="rounded-xl border border-border bg-surface px-4 py-3 text-[15px] outline-none focus:border-accent"
              >
                {LANGUAGES.map((language) => (
                  <option key={language.code} value={language.code}>
                    {language.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-[13px] font-medium">
                Language you&apos;re learning
              </span>
              <select
                name="target_language"
                required
                defaultValue="fr"
                className="rounded-xl border border-border bg-surface px-4 py-3 text-[15px] outline-none focus:border-accent"
              >
                {LANGUAGES.map((language) => (
                  <option key={language.code} value={language.code}>
                    {language.label}
                  </option>
                ))}
              </select>
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
                  defaultChecked={index === 0}
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
              placeholder="Travelling to Lyon next spring, and I want to order food without switching to English."
              className="resize-none rounded-xl border border-border bg-surface px-4 py-3 text-[15px] leading-relaxed outline-none placeholder:text-muted/60 focus:border-accent"
            />
          </label>

          <button
            type="submit"
            className="mt-1 self-start rounded-full bg-accent px-7 py-4 text-base font-semibold text-white transition-colors hover:bg-accent-hover"
          >
            Go to my dashboard
          </button>
        </form>
      </div>
    </main>
  );
}
