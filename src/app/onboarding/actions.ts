"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function completeOnboarding(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: String(formData.get("display_name") ?? "").trim() || null,
      native_language: String(formData.get("native_language") ?? ""),
      target_language: String(formData.get("target_language") ?? ""),
      skill_level: String(formData.get("skill_level") ?? ""),
      goals: String(formData.get("goals") ?? "").trim() || null,
      onboarded_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) throw new Error(error.message);

  revalidatePath("/", "layout");
  redirect("/dashboard");
}
