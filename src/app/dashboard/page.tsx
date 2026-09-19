import Link from "next/link";
import { redirect } from "next/navigation";
import { DeleteSessionButton } from "@/components/delete-session-button";
import { Flashcards } from "@/components/flashcards";
import { RecordingPlayer } from "@/components/recording-player";
import { Wordmark } from "@/components/wordmark";
import { languageName, textDirection } from "@/lib/languages";
import { scenarioLabel } from "@/lib/scenarios";
import { createClient, currentUser } from "@/lib/supabase/server";
import { logout } from "../login/actions";

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
  });
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const user = await currentUser(supabase);

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
        .select("id, text, translation, example, confidence_score", {
          count: "exact",
        })
        .eq("target_language", targetLanguage)
        // Weakest first, so the deck opens on what most needs practice.
        .order("confidence_score", { ascending: true })
        .limit(20),
      supabase
        .from("sessions")
        .select("id, scenario, started_at, agent_session_id")
        .eq("target_language", targetLanguage)
        // Sessions opened but never started are noise, not history.
        .neq("status", "active")
        .order("started_at", { ascending: false })
        .limit(5),
    ]);

  const greeting = profile.display_name
    ? `Welcome back, ${profile.display_name}`
    : "Welcome back";

  return (
    <main className="flex flex-1 flex-col">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-6">
        <Wordmark />
        <div className="flex items-center gap-6">
          <Link
            href="/settings"
            className="text-sm font-medium text-muted transition-colors hover:text-foreground"
          >
            Settings
          </Link>
          <form action={logout}>
            <button
              type="submit"
              className="text-sm font-medium text-muted transition-colors hover:text-foreground"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>

      <div className="mx-auto w-full max-w-5xl px-6 pb-24">
        <p className="text-sm font-medium text-muted">{greeting}</p>
        <div className="mt-2 flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <h1 className="text-[32px] leading-tight font-bold tracking-[-0.02em]">
            Your {languageName(targetLanguage)}
          </h1>
          <Link
            href="/settings"
            className="text-[13px] font-medium text-accent hover:underline"
          >
            Change language or level
          </Link>
        </div>

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
                Vocabulary bank
              </h2>
              <Link
                href="/vocabulary"
                className="text-[13px] font-medium text-accent hover:underline"
              >
                {vocabularyCount ?? 0} saved
              </Link>
            </div>

            {weakest && weakest.length > 0 ? (
              <Flashcards
                cards={weakest}
                direction={textDirection(targetLanguage)}
              />
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
                    className="flex items-center gap-3 border-b border-border pb-3 last:border-0 last:pb-0"
                  >
                    {session.agent_session_id ? (
                      <RecordingPlayer sessionId={session.id} />
                    ) : (
                      <span className="size-9 shrink-0" />
                    )}
                    <Link
                      href={`/conversation/${session.id}/analysis`}
                      className="flex-1 text-[15px] font-medium hover:text-accent"
                    >
                      {scenarioLabel(session.scenario) ?? "Free conversation"}
                    </Link>
                    <span className="text-[13px] text-muted">
                      {formatDate(session.started_at)}
                    </span>
                    <DeleteSessionButton sessionId={session.id} />
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
