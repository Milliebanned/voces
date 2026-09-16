import Link from "next/link";
import { redirect } from "next/navigation";
import { Wordmark } from "@/components/wordmark";
import { isSupportedTarget, languageName } from "@/lib/languages";
import { SCENARIOS } from "@/lib/scenarios";
import { createClient } from "@/lib/supabase/server";
import { startConversation } from "./actions";

export default async function NewConversationPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("target_language, native_language, onboarded_at")
    .eq("id", user.id)
    .single();

  if (!profile?.onboarded_at) redirect("/onboarding");

  // Recognition covers more languages than synthesis does, so a learner can
  // end up with a target language the agent cannot speak back in.
  if (!isSupportedTarget(profile.target_language)) {
    return (
      <main className="flex flex-1 flex-col">
        <header className="mx-auto flex w-full max-w-3xl px-6 py-6">
          <Link href="/dashboard">
            <Wordmark />
          </Link>
        </header>
        <div className="mx-auto w-full max-w-[520px] px-6 pt-8 pb-24">
          <h1 className="text-[28px] leading-tight font-bold tracking-[-0.02em]">
            No voice for {languageName(profile.target_language)} yet
          </h1>
          <p className="mt-3 text-[15px] leading-relaxed text-muted">
            Your partner can understand{" "}
            {languageName(profile.target_language)}, but can&apos;t speak it
            aloud — so a conversation would only go one way. Pick a language it
            can answer in and you&apos;re set.
          </p>
          <Link
            href="/onboarding"
            className="mt-8 inline-block rounded-full bg-accent px-7 py-4 text-base font-semibold text-white transition-colors hover:bg-accent-hover"
          >
            Change my language
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col">
      <header className="mx-auto flex w-full max-w-3xl items-center justify-between px-6 py-6">
        <Link href="/dashboard">
          <Wordmark />
        </Link>
        <Link
          href="/dashboard"
          className="text-sm font-medium text-muted transition-colors hover:text-foreground"
        >
          Cancel
        </Link>
      </header>

      <div className="mx-auto w-full max-w-3xl px-6 pb-24">
        <h1 className="text-[32px] leading-tight font-bold tracking-[-0.02em]">
          What do you want to talk about?
        </h1>
        <p className="mt-3 max-w-[520px] text-[15px] leading-relaxed text-muted">
          Pick a situation to get going, or just start talking. Either way the
          conversation goes wherever you take it.
        </p>

        <form action={startConversation} className="mt-10">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex cursor-pointer flex-col gap-1 rounded-2xl border border-border bg-surface p-5 transition-colors hover:border-accent has-checked:border-accent has-checked:bg-accent-soft">
              <input
                type="radio"
                name="scenario"
                value=""
                defaultChecked
                className="sr-only"
              />
              <span className="text-[15px] font-semibold">Just talk</span>
              <span className="text-[13px] leading-relaxed text-muted">
                They open with a question about your day.
              </span>
            </label>

            {SCENARIOS.map((scenario) => (
              <label
                key={scenario.id}
                className="flex cursor-pointer flex-col gap-1 rounded-2xl border border-border bg-surface p-5 transition-colors hover:border-accent has-checked:border-accent has-checked:bg-accent-soft"
              >
                <input
                  type="radio"
                  name="scenario"
                  value={scenario.id}
                  className="sr-only"
                />
                <span className="text-[15px] font-semibold">
                  {scenario.label}
                </span>
                <span className="text-[13px] leading-relaxed text-muted">
                  {scenario.prompt.charAt(0).toUpperCase() +
                    scenario.prompt.slice(1)}
                  .
                </span>
              </label>
            ))}
          </div>

          <div className="mt-10 flex flex-wrap items-center gap-4">
            <button
              type="submit"
              className="rounded-full bg-accent px-7 py-4 text-base font-semibold text-white transition-colors hover:bg-accent-hover"
            >
              Start speaking {languageName(profile.target_language)}
            </button>
            <p className="text-[13px] text-muted">
              Your browser will ask for microphone access.
            </p>
          </div>
        </form>
      </div>
    </main>
  );
}
