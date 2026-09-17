import { notFound, redirect } from "next/navigation";
import { languageName, textDirection, voiceFor } from "@/lib/languages";
import { buildSystemPrompt } from "@/lib/prompt";
import { scenarioPrompt } from "@/lib/scenarios";
import { createClient } from "@/lib/supabase/server";
import { selectReinforcementCandidates } from "@/lib/vocabulary";
import { LiveConversation } from "./live-conversation";

export default async function ConversationPage({
  params,
}: PageProps<"/conversation/[id]">) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: session } = await supabase
    .from("sessions")
    .select("id, target_language, scenario, status")
    .eq("id", id)
    .single();

  if (!session) notFound();
  if (session.status !== "active") redirect(`/conversation/${id}/analysis`);

  const [{ data: profile }, { data: vocabulary }, { data: memory }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("display_name, native_language, target_language, skill_level, goals")
        .eq("id", user.id)
        .single(),
      supabase
        .from("vocabulary_items")
        .select(
          "id, text, translation, usage_count, success_count, struggle_count, confidence_score, last_used_at",
        )
        .eq("target_language", session.target_language)
        .order("confidence_score", { ascending: true })
        .limit(40),
      supabase
        .from("learner_memory")
        .select("topics_discussed")
        .eq("target_language", session.target_language)
        .maybeSingle(),
    ]);

  if (!profile) redirect("/onboarding");

  const reinforcement = selectReinforcementCandidates(vocabulary ?? []);

  const systemPrompt = buildSystemPrompt({
    displayName: profile.display_name,
    targetLanguage: languageName(session.target_language)!,
    nativeLanguage: languageName(profile.native_language)!,
    skillLevel: profile.skill_level ?? "intermediate",
    goals: profile.goals,
    scenario: scenarioPrompt(session.scenario),
    reinforcement,
    topicsDiscussed: (memory?.topics_discussed as string[]) ?? [],
  });

  return (
    <LiveConversation
      sessionId={session.id}
      languageLabel={languageName(session.target_language)!}
      direction={textDirection(session.target_language)}
      targetLanguageCode={session.target_language}
      nativeLanguageCode={profile.native_language ?? "en"}
      translationDirection={textDirection(profile.native_language)}
      voice={voiceFor(session.target_language)}
      systemPrompt={systemPrompt}
      // Listing the native language alongside the target is what lets a learner
      // drop an English word mid-sentence and still be transcribed correctly.
      languageCodes={[
        session.target_language,
        profile.native_language ?? "en",
      ].filter((code, index, all) => all.indexOf(code) === index)}
      // Saved vocabulary is far more likely to be recognised when the
      // recogniser is told to expect it.
      keyterms={(vocabulary ?? []).map((item) => item.text).slice(0, 100)}
    />
  );
}
