import { NextResponse, type NextRequest } from "next/server";
import {
  beginFreeSession,
  freeSecondsLeft,
  freeSessionCap,
  isPremium,
} from "@/lib/billing";
import { createClient, currentUser } from "@/lib/supabase/server";

const PREMIUM_SESSION_CAP = 1800;

// Tokens are single-use and short-lived, but they still spend against our
// AssemblyAI account, so only signed-in learners can mint one. Free learners'
// tokens are also capped at what's left of their free minutes, so the page's
// own cut-off can't be skipped to stretch them.
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const user = await currentUser(supabase);

  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  // Row-level security confirms the session is this learner's own.
  const sessionId = request.nextUrl.searchParams.get("session");
  const { data: session } = sessionId
    ? await supabase.from("sessions").select("id").eq("id", sessionId).maybeSingle()
    : { data: null };
  if (!session) {
    return NextResponse.json({ error: "Unknown session." }, { status: 400 });
  }

  const apiKey = process.env.ASSEMBLYAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "ASSEMBLYAI_API_KEY is not configured." },
      { status: 500 },
    );
  }

  let remainingSeconds: number | null = null;
  let sessionCap = PREMIUM_SESSION_CAP;
  if (!(await isPremium(user.id))) {
    remainingSeconds = await freeSecondsLeft(user.id);
    const cap = freeSessionCap(remainingSeconds);
    if (cap === null) {
      return NextResponse.json(
        { error: "Your free minutes are used up.", upgrade: true },
        { status: 402 },
      );
    }
    sessionCap = cap;
  }

  const url = new URL("https://agents.assemblyai.com/v1/token");
  url.searchParams.set("expires_in_seconds", "120");
  url.searchParams.set("max_session_duration_seconds", String(sessionCap));

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  if (!response.ok) {
    return NextResponse.json(
      { error: await response.text() },
      { status: response.status },
    );
  }

  // The clock starts once the token is in hand, so a failed start costs nothing.
  if (remainingSeconds !== null) await beginFreeSession(user.id, session.id);
  const { token } = await response.json();
  return NextResponse.json({ token, remainingSeconds });
}
