import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Tokens are single-use and short-lived, but they still spend against our
// AssemblyAI account, so only signed-in learners can mint one.
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const apiKey = process.env.ASSEMBLYAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "ASSEMBLYAI_API_KEY is not configured." },
      { status: 500 },
    );
  }

  const url = new URL("https://agents.assemblyai.com/v1/token");
  url.searchParams.set("expires_in_seconds", "120");
  url.searchParams.set("max_session_duration_seconds", "1800");

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  if (!response.ok) {
    return NextResponse.json(
      { error: await response.text() },
      { status: response.status },
    );
  }

  const { token } = await response.json();
  return NextResponse.json({ token });
}
