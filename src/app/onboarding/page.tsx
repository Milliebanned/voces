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

  return (
    <OnboardingFlow
      returning={returning}
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
