"use server";

import { endFreeSession } from "@/lib/billing";
import { createClient, currentUser } from "@/lib/supabase/server";

export type Turn = {
  role: "user" | "agent";
  text: string;
  at: string;
  translation?: string;
};

export async function saveTranscript(
  sessionId: string,
  transcript: Turn[],
  agentSessionId: string | null,
): Promise<{ error: string | null }> {
  const supabase = await createClient();

  // Row-level security scopes this to the signed-in learner's own session.
  const { error } = await supabase
    .from("sessions")
    .update({
      transcript,
      agent_session_id: agentSessionId,
      status: "ended",
      ended_at: new Date().toISOString(),
    })
    .eq("id", sessionId);

  if (error) return { error: error.message };

  const user = await currentUser(supabase);
  if (user) await endFreeSession(user.id, sessionId);

  // No revalidatePath here. Revalidating from a Server Action also refreshes
  // the page it was called from, and this page redirects an ended session to
  // its review, which overrode the "free minutes are up" panel. The dashboard
  // is dynamic and dynamic pages aren't held in the client cache, so it is
  // fresh on the next visit anyway.
  return { error: null };
}
