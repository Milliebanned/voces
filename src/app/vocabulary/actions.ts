"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function addVocabularyItem(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const text = String(formData.get("text") ?? "").trim();
  if (!text) return;

  const { data: profile } = await supabase
    .from("profiles")
    .select("target_language")
    .eq("id", user.id)
    .single();

  if (!profile?.target_language) redirect("/onboarding");

  await supabase.from("vocabulary_items").insert({
    user_id: user.id,
    target_language: profile.target_language,
    text,
    translation: String(formData.get("translation") ?? "").trim() || null,
    item_type: text.includes(" ") ? "phrase" : "word",
    source: "manual",
  });

  revalidatePath("/vocabulary");
  revalidatePath("/dashboard");
}

export async function deleteVocabularyItem(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  // Row-level security scopes this to the signed-in user's own rows.
  await supabase.from("vocabulary_items").delete().eq("id", id);

  revalidatePath("/vocabulary");
  revalidatePath("/dashboard");
}
