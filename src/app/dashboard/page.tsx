import Link from "next/link";
import { redirect } from "next/navigation";
import { Wordmark } from "@/components/wordmark";
import { languageName } from "@/lib/languages";
import { createClient } from "@/lib/supabase/server";
import { logout } from "../login/actions";

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
  });
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, target_language, native_language, skill_level, onboarded_at")
    .eq("id", user.id)
    .single();

  if (!profile?.onboarded_at) redirect("/onboarding");

  const targetLanguage = profile.target_language ?? "";

  const [{ data: weakest, count: vocabularyCount }, { data: sessions }] =
    await Promise.all([
      supabase
        .from("vocabulary_items")
        .select("id, text, translation, confidence_score", { count: "exact" })
        .eq("target_language", targetLanguage)
        .order("confidence_score", { ascending: true })
        .limit(5),
      supabase
        .from("sessions")
        .select("id, scenario, mode, started_at, status")
        .eq("target_language", targetLanguage)
        .order("started_at", { ascending: false })
        .limit(4),
    ]);

  const greeting = profile.display_name
    ? `Welcome back, ${profile.display_name}`
    : "Welcome back";

  return (
    <main className="flex flex-1 flex-col">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-6">
        <Wordmark />
        <form action={logout}>
          <button
            type="submit"
            className="text-sm font-medium text-muted transition-colors hover:text-foreground"
          >
            Sign out
          </button>
        </form>
      </header>

      <div className="mx-auto w-full max-w-5xl px-6 pb-24">
        <p className="text-sm font-medium text-muted">{greeting}</p>
        <h1 className="mt-2 text-[32px] leading-tight font-bold tracking-[-0.02em]">
          Your {languageName(targetLanguage)}
        </h1>

        <section className="mt-8 overflow-hidden rounded-3xl border border-border bg-surface">
          <div className="flex flex-col gap-6 p-8 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-[420px]">
              <h2 className="text-xl font-semibold tracking-[-0.01em]">
                Start a conversation
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                Speak for as long as you like. Corrections wait until you&apos;re
                done, so nothing interrupts you mid-sentence.
              </p>
            </div>
            <Link
              href="/conversation/new"
              className="shrink-0 self-start rounded-full bg-accent px-7 py-4 text-base font-semibold text-white transition-colors hover:bg-accent-hover"
            >
              Start speaking
            </Link>
          </div>
        </section>

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <section className="rounded-3xl border border-border bg-surface p-7">
            <div className="flex items-baseline justify-between">
              <h2 className="text-[17px] font-semibold tracking-[-0.01em]">
                Needs work
              </h2>
              <Link
                href="/vocabulary"
                className="text-[13px] font-medium text-accent hover:underline"
              >
                {vocabularyCount ?? 0} saved
              </Link>
            </div>

            {weakest && weakest.length > 0 ? (
              <ul className="mt-5 flex flex-col gap-3">
                {weakest.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-baseline justify-between gap-4 border-b border-border pb-3 last:border-0 last:pb-0"
                  >
                    <span className="text-[15px] font-medium">{item.text}</span>
                    <span className="text-right text-[13px] text-muted">
                      {item.translation}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-5 text-sm leading-relaxed text-muted">
                Nothing saved yet. Words you stumble over in conversation land
                here automatically, or you can{" "}
                <Link href="/vocabulary" className="text-accent hover:underline">
                  add some yourself
                </Link>
                .
              </p>
            )}
          </section>

          <section className="rounded-3xl border border-border bg-surface p-7">
            <h2 className="text-[17px] font-semibold tracking-[-0.01em]">
              Recent sessions
            </h2>

            {sessions && sessions.length > 0 ? (
              <ul className="mt-5 flex flex-col gap-3">
                {sessions.map((session) => (
                  <li
                    key={session.id}
                    className="flex items-baseline justify-between gap-4 border-b border-border pb-3 last:border-0 last:pb-0"
                  >
                    <Link
                      href={`/conversation/${session.id}/analysis`}
                      className="text-[15px] font-medium hover:text-accent"
                    >
                      {session.scenario ?? "Free conversation"}
                    </Link>
                    <span className="text-[13px] text-muted">
                      {formatDate(session.started_at)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-5 text-sm leading-relaxed text-muted">
                No conversations yet. Your first one will show up here with a
                breakdown of what went well and what to work on.
              </p>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
