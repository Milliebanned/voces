"use server";

import { redirect } from "next/navigation";
import { createClient, currentUser } from "@/lib/supabase/server";

export async function startConversation(formData: FormData) {
  const supabase = await createClient();
  const user = await currentUser(supabase);

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("target_language")
    .eq("id", user.id)
    .single();

  if (!profile?.target_language) redirect("/onboarding");

  const scenario = String(formData.get("scenario") ?? "") || null;

  const { data: session, error } = await supabase
    .from("sessions")
    .insert({
      user_id: user.id,
      target_language: profile.target_language,
      mode: scenario ? "scenario" : "ai_led",
      scenario,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  redirect(`/conversation/${session.id}`);
}
