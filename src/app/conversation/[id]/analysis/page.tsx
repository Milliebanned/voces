import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { RecordingPlayer } from "@/components/recording-player";
import { Wordmark } from "@/components/wordmark";
import { languageName, textDirection } from "@/lib/languages";
import { scenarioLabel } from "@/lib/scenarios";
import { createClient } from "@/lib/supabase/server";
import type { Turn } from "../actions";

export default async function AnalysisPage({
  params,
}: PageProps<"/conversation/[id]/analysis">) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: session, error } = await supabase
    .from("sessions")
    .select(
      "id, target_language, scenario, started_at, ended_at, transcript, agent_session_id",
    )
    .eq("id", id)
    .single();

  // PGRST116 is "no rows": a genuinely missing (or someone else's) session.
  // Anything else is a real failure and should not masquerade as a 404.
  if (error && error.code !== "PGRST116") throw new Error(error.message);
  if (!session) notFound();

  const transcript = (session.transcript ?? []) as Turn[];
  const direction = textDirection(session.target_language);
  const spokenTurns = transcript.filter((turn) => turn.role === "user").length;

  return (
    <main className="flex flex-1 flex-col">
      <header className="mx-auto flex w-full max-w-2xl items-center justify-between px-6 py-6">
        <Link href="/dashboard">
          <Wordmark />
        </Link>
        <Link
          href="/dashboard"
          className="text-sm font-medium text-muted transition-colors hover:text-foreground"
        >
          Dashboard
        </Link>
      </header>

      <div className="mx-auto w-full max-w-2xl px-6 pb-24">
        <p className="text-sm font-medium text-muted">
          {scenarioLabel(session.scenario) ?? "Free conversation"} ·{" "}
          {languageName(session.target_language)}
        </p>
        <h1 className="mt-2 text-[32px] leading-tight font-bold tracking-[-0.02em]">
          {spokenTurns > 0
            ? `You spoke ${spokenTurns} ${spokenTurns === 1 ? "time" : "times"}`
            : "That one stayed quiet"}
        </h1>

        {session.agent_session_id && (
          <div className="mt-8">
            <RecordingPlayer sessionId={session.id} size="full" />
          </div>
        )}

        <div className="mt-6 rounded-2xl border border-border bg-surface p-6">
          <h2 className="text-[15px] font-semibold">Review coming next</h2>
          <p className="mt-2 text-[14px] leading-relaxed text-muted">
            Grammar notes, the words you reached for and couldn&apos;t find, and
            what to work on will appear here once the analysis step is wired up.
          </p>
        </div>

        {transcript.length > 0 ? (
          <div className="mt-10">
            <h2 className="text-[17px] font-semibold tracking-[-0.01em]">
              Transcript
            </h2>
            <div className="mt-5 flex flex-col gap-5" dir={direction}>
              {transcript.map((turn, index) =>
                turn.role === "agent" ? (
                  <div key={index} className="flex flex-col gap-2">
                    <span className="text-[9px] font-bold tracking-[0.18em] text-accent">
                      VOCES
                    </span>
                    <p className="text-[16px] leading-relaxed">{turn.text}</p>
                  </div>
                ) : (
                  <div key={index} className="flex justify-end">
                    <p className="max-w-[80%] rounded-2xl border border-border bg-surface px-4 py-3 text-[16px] leading-relaxed text-muted">
                      {turn.text}
                    </p>
                  </div>
                ),
              )}
            </div>
          </div>
        ) : (
          <p className="mt-10 text-sm leading-relaxed text-muted">
            Nothing was said in this one.
          </p>
        )}

        <Link
          href="/conversation/new"
          className="mt-12 inline-block rounded-full bg-accent px-7 py-4 text-base font-semibold text-white transition-colors hover:bg-accent-hover"
        >
          Start another conversation
        </Link>
      </div>
    </main>
  );
}
