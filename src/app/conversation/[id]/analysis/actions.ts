"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ANALYSIS_MODEL, analyzeConversation } from "@/lib/analysis";
import { languageName } from "@/lib/languages";
import { createClient, currentUser } from "@/lib/supabase/server";
import { computeConfidence } from "@/lib/vocabulary";
import type { Turn } from "../actions";

// Topics are folded into every later system prompt, so only the latest few
// are kept.
const TOPIC_MEMORY = 12;

function key(text: string) {
  return text.trim().toLowerCase();
}

/**
 * Reviews a finished conversation, then feeds what it found back into the
 * learner's vocabulary bank and memory. Safe to call more than once: the
 * review row is written first, and only the call that writes it goes on to
 * touch vocabulary, so nothing is counted twice.
 */
export async function runAnalysis(
  sessionId: string,
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const user = await currentUser(supabase);

  if (!user) return { error: "Not signed in." };

  const { data: session } = await supabase
    .from("sessions")
    .select("id, target_language, transcript, status")
    .eq("id", sessionId)
    .single();

  if (!session) return { error: "Conversation not found." };
  if (session.status === "analyzed") return { error: null };

  const transcript = (session.transcript ?? []) as Turn[];
  if (!transcript.some((turn) => turn.role === "user")) {
    return { error: "Nothing was said, so there is nothing to review." };
  }

  const [{ data: profile }, { data: vocabulary }, { data: memory }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("native_language, skill_level")
        .eq("id", user.id)
        .single(),
      supabase
        .from("vocabulary_items")
        .select(
          "id, text, usage_count, success_count, struggle_count, last_used_at",
        )
        .eq("target_language", session.target_language),
      supabase
        .from("learner_memory")
        .select("grammar_patterns, topics_discussed")
        .eq("target_language", session.target_language)
        .maybeSingle(),
    ]);

  const saved = vocabulary ?? [];

  let analysis;
  try {
    analysis = await analyzeConversation({
      transcript,
      targetLanguage: languageName(session.target_language)!,
      nativeLanguage: languageName(profile?.native_language ?? "en")!,
      skillLevel: profile?.skill_level ?? "intermediate",
      savedWords: saved.map((item) => item.text),
      knownPatterns: (memory?.grammar_patterns as string[]) ?? [],
    });
  } catch (error) {
    console.error("Session review failed", error);
    return { error: "The review couldn't be generated. Try again in a minute." };
  }

  const { error: insertError } = await supabase.from("session_analysis").insert({
    session_id: session.id,
    grammar_notes: analysis.corrections,
    vocab_used: analysis.saved_words,
    vocab_forgotten: analysis.reached_for,
    vocab_suggested: analysis.suggestions,
    fluency_notes: analysis.fluency_notes,
    summary_text: analysis.summary,
    strengths: analysis.strengths,
    next_steps: analysis.next_steps,
    model: ANALYSIS_MODEL,
  });

  // 23505 is a unique violation: another request reviewed it first and has
  // already updated the vocabulary.
  if (insertError?.code === "23505") return { error: null };
  if (insertError) return { error: insertError.message };

  const now = new Date();
  const byText = new Map(saved.map((item) => [key(item.text), item]));
  const updates = new Map<string, (typeof saved)[number]>();

  function touch(id: string) {
    return updates.get(id) ?? { ...saved.find((item) => item.id === id)! };
  }

  for (const { text, outcome } of analysis.saved_words) {
    const existing = byText.get(key(text));
    if (!existing) continue;
    const item = touch(existing.id);
    if (outcome === "used") {
      item.usage_count += 1;
      item.success_count += 1;
      item.last_used_at = now.toISOString();
    } else {
      item.struggle_count += 1;
    }
    updates.set(item.id, item);
  }

  // A word they reached for and didn't have is the clearest signal of a gap:
  // bump it if it's already saved, otherwise add it to the bank.
  const additions = new Map<string, (typeof analysis.reached_for)[number]>();
  for (const word of analysis.reached_for) {
    const existing = byText.get(key(word.text));
    if (existing) {
      const item = touch(existing.id);
      item.struggle_count += 1;
      updates.set(item.id, item);
    } else {
      additions.set(key(word.text), word);
    }
  }

  const writes = [
    ...[...updates.values()].map((item) =>
      supabase
        .from("vocabulary_items")
        .update({
          usage_count: item.usage_count,
          success_count: item.success_count,
          struggle_count: item.struggle_count,
          last_used_at: item.last_used_at,
          last_reviewed_at: now.toISOString(),
          confidence_score: computeConfidence(item, now.getTime()),
        })
        .eq("id", item.id),
    ),
    ...(additions.size > 0
      ? [
          supabase.from("vocabulary_items").insert(
            [...additions.values()].map((word) => ({
              user_id: user.id,
              target_language: session.target_language,
              text: word.text,
              translation: word.translation || null,
              example: word.context || null,
              item_type: word.text.includes(" ") ? "phrase" : "word",
              source: "session",
              session_id: session.id,
              struggle_count: 1,
            })),
          ),
        ]
      : []),
    supabase.from("learner_memory").upsert(
      {
        user_id: user.id,
        target_language: session.target_language,
        grammar_patterns: analysis.grammar_patterns,
        topics_discussed: [
          ...analysis.topics,
          ...((memory?.topics_discussed as string[]) ?? []),
        ]
          .filter((topic, index, all) => all.indexOf(topic) === index)
          .slice(0, TOPIC_MEMORY),
        updated_at: now.toISOString(),
      },
      { onConflict: "user_id,target_language" },
    ),
    supabase.from("sessions").update({ status: "analyzed" }).eq("id", session.id),
  ];

  // The review itself is already saved, so a failed side effect is logged
  // rather than shown: the learner still gets their feedback.
  for (const { error } of await Promise.all(writes)) {
    if (error) console.error("Post-review update failed", error);
  }

  revalidatePath(`/conversation/${sessionId}/analysis`);
  revalidatePath("/vocabulary");
  revalidatePath("/dashboard");
  return { error: null };
}

export async function saveSuggestedWord(
  sessionId: string,
  word: { text: string; translation: string; example: string },
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const user = await currentUser(supabase);

  if (!user) return { error: "Not signed in." };

  const { data: session } = await supabase
    .from("sessions")
    .select("target_language")
    .eq("id", sessionId)
    .single();

  if (!session) return { error: "Conversation not found." };

  const { data: existing } = await supabase
    .from("vocabulary_items")
    .select("id")
    .eq("target_language", session.target_language)
    .ilike("text", word.text.replace(/[\\%_]/g, "\\$&"))
    .limit(1);

  if (existing && existing.length > 0) return { error: null };

  const { error } = await supabase.from("vocabulary_items").insert({
    user_id: user.id,
    target_language: session.target_language,
    text: word.text,
    translation: word.translation || null,
    example: word.example || null,
    item_type: word.text.includes(" ") ? "phrase" : "word",
    source: "session",
    session_id: sessionId,
  });

  if (error) return { error: error.message };

  revalidatePath(`/conversation/${sessionId}/analysis`);
  revalidatePath("/vocabulary");
  revalidatePath("/dashboard");
  return { error: null };
}

// AssemblyAI holds the audio, so deleting it there is what actually removes
// it. A 404 means it's already gone, which is the outcome we want anyway.
async function deleteAgentSession(agentSessionId: string) {
  const response = await fetch(
    `https://agents.assemblyai.com/v1/sessions/${encodeURIComponent(agentSessionId)}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${process.env.ASSEMBLYAI_API_KEY}` },
    },
  );
  return response.ok || response.status === 404;
}

export async function deleteRecording(
  sessionId: string,
): Promise<{ error: string | null }> {
  const supabase = await createClient();

  const { data: session } = await supabase
    .from("sessions")
    .select("agent_session_id")
    .eq("id", sessionId)
    .single();

  if (!session) return { error: "Conversation not found." };

  if (session.agent_session_id) {
    if (!(await deleteAgentSession(session.agent_session_id))) {
      return { error: "The recording couldn't be deleted. Try again." };
    }

    const { error } = await supabase
      .from("sessions")
      .update({ agent_session_id: null })
      .eq("id", sessionId);

    if (error) return { error: error.message };
  }

  revalidatePath(`/conversation/${sessionId}/analysis`);
  revalidatePath("/dashboard");
  return { error: null };
}

/** Deletes the recording, transcript and review. Saved words are kept. */
export async function deleteConversation(
  sessionId: string,
): Promise<{ error: string | null }> {
  const recording = await deleteRecording(sessionId);
  if (recording.error) return recording;

  const supabase = await createClient();
  const { error } = await supabase.from("sessions").delete().eq("id", sessionId);
  if (error) return { error: error.message };

  revalidatePath("/dashboard");
  revalidatePath("/vocabulary");
  redirect("/dashboard");
}
