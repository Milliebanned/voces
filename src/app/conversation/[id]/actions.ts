"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type Turn = { role: "user" | "agent"; text: string; at: string };

export async function saveTranscript(
  sessionId: string,
  transcript: Turn[],
  agentSessionId: string | null,
) {
  const supabase = await createClient();

  // Row-level security scopes this to the signed-in learner's own session.
  await supabase
    .from("sessions")
    .update({
      transcript,
      agent_session_id: agentSessionId,
      status: "ended",
      ended_at: new Date().toISOString(),
    })
    .eq("id", sessionId);

  revalidatePath("/dashboard");
}
