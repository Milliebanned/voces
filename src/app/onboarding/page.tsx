import { redirect } from "next/navigation";
import { createClient, currentUser } from "@/lib/supabase/server";
import { OnboardingFlow } from "./onboarding-flow";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const user = await currentUser(supabase);

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

  // Everything is stored per language, so switching only changes which
  // language's history is shown. Counting what each one holds lets the
  // language step say so, rather than a switch looking like data loss.
  const saved: Record<string, { talks: number; words: number }> = {};
  if (returning) {
    const [{ data: sessions }, { data: words }] = await Promise.all([
      supabase.from("sessions").select("target_language").neq("status", "active"),
      supabase.from("vocabulary_items").select("target_language"),
    ]);
    for (const row of sessions ?? []) {
      saved[row.target_language] ??= { talks: 0, words: 0 };
      saved[row.target_language].talks++;
    }
    for (const row of words ?? []) {
      saved[row.target_language] ??= { talks: 0, words: 0 };
      saved[row.target_language].words++;
    }
  }

  return (
    <OnboardingFlow
      returning={returning}
      saved={saved}
      initial={{
        displayName: profile?.display_name ?? "",
        targetLanguage: profile?.target_language ?? "fr",
        nativeLanguage: profile?.native_language ?? "en",
        skillLevel: profile?.skill_level ?? "beginner",
        goals: profile?.goals ?? "",
      }}
    />
  );
}
