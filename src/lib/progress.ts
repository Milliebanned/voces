import type { createClient } from "@/lib/supabase/server";

type Supabase = Awaited<ReturnType<typeof createClient>>;

export type SessionSummary = {
  id: string;
  scenario: string | null;
  startedAt: string;
  minutes: number;
  // null until the post-session review has run.
  corrections: number | null;
};

export type WordSummary = {
  id: string;
  text: string;
  translation: string | null;
  example: string | null;
  confidence_score: number;
};

const MS_PER_DAY = 86_400_000;

// Confidence bands, shared with the flashcards so a word reads the same
// everywhere it appears.
export const STRONG = 0.6;
export const GETTING_THERE = 0.25;

function dayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

/**
 * Consecutive days with at least one conversation, counting back from today,
 * or from yesterday when today has none yet so a streak isn't lost at dawn.
 */
function streak(sessions: SessionSummary[], now: Date) {
  const days = new Set(sessions.map((session) => dayKey(new Date(session.startedAt))));
  let cursor = new Date(now);
  if (!days.has(dayKey(cursor))) cursor = new Date(cursor.getTime() - MS_PER_DAY);
  let count = 0;
  while (days.has(dayKey(cursor))) {
    count++;
    cursor = new Date(cursor.getTime() - MS_PER_DAY);
  }
  return count;
}

export async function loadSessions(supabase: Supabase, targetLanguage: string, limit = 400) {
  const { data } = await supabase
    .from("sessions")
    .select("id, scenario, started_at, ended_at, session_analysis(grammar_notes)")
    .eq("target_language", targetLanguage)
    // Sessions opened but never started are noise, not history.
    .neq("status", "active")
    .order("started_at", { ascending: false })
    .limit(limit);

  return (data ?? []).map((row): SessionSummary => {
    const analysis = Array.isArray(row.session_analysis)
      ? row.session_analysis[0]
      : row.session_analysis;
    const ended = row.ended_at ? new Date(row.ended_at).getTime() : null;
    return {
      id: row.id,
      scenario: row.scenario,
      startedAt: row.started_at,
      minutes: ended
        ? Math.max(1, Math.round((ended - new Date(row.started_at).getTime()) / 60_000))
        : 0,
      corrections: analysis
        ? ((analysis.grammar_notes as unknown[] | null)?.length ?? 0)
        : null,
    };
  });
}

export async function loadProgress(supabase: Supabase, targetLanguage: string) {
  const [{ data: words }, sessions] = await Promise.all([
    supabase
      .from("vocabulary_items")
      .select("id, text, translation, example, confidence_score, success_count")
      .eq("target_language", targetLanguage)
      .order("confidence_score", { ascending: true }),
    loadSessions(supabase, targetLanguage),
  ]);

  const vocabulary = words ?? [];
  const now = new Date();
  const weekAgo = now.getTime() - 7 * MS_PER_DAY;
  const thisWeek = sessions.filter(
    (session) => new Date(session.startedAt).getTime() >= weekAgo,
  );

  const strong = vocabulary.filter((word) => word.confidence_score >= STRONG).length;
  const gettingThere = vocabulary.filter(
    (word) => word.confidence_score >= GETTING_THERE && word.confidence_score < STRONG,
  ).length;

  return {
    words: vocabulary as (WordSummary & { success_count: number })[],
    weakest: vocabulary.slice(0, 4) as WordSummary[],
    wordCount: vocabulary.length,
    // A word counts as learned once it has been used correctly in conversation.
    wordsLearned: vocabulary.filter((word) => word.success_count > 0).length,
    strength: {
      strong,
      gettingThere,
      fresh: vocabulary.length - strong - gettingThere,
    },
    averageStrength: vocabulary.length
      ? Math.round(
          (100 * vocabulary.reduce((sum, word) => sum + word.confidence_score, 0)) /
            vocabulary.length,
        )
      : 0,
    sessions,
    conversationCount: sessions.length,
    streak: streak(sessions, now),
    weekConversations: thisWeek.length,
    weekMinutes: thisWeek.reduce((sum, session) => sum + session.minutes, 0),
  };
}
