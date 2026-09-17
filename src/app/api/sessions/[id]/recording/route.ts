import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Artifact = { type: string; url: string; content_type: string };

// Resolves a VOCES session to a fresh, short-lived download link for its
// recording and redirects there, so an <audio> element can point at this route
// directly and never hold a link that has already expired.
export async function GET(
  _request: Request,
  { params }: RouteContext<"/api/sessions/[id]/recording">,
) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  // Row-level security means another learner's session reads as missing.
  const { data: session } = await supabase
    .from("sessions")
    .select("agent_session_id")
    .eq("id", id)
    .single();

  if (!session?.agent_session_id) {
    return NextResponse.json({ error: "No recording." }, { status: 404 });
  }

  const response = await fetch(
    `https://agents.assemblyai.com/v1/sessions/${encodeURIComponent(session.agent_session_id)}`,
    {
      headers: { Authorization: `Bearer ${process.env.ASSEMBLYAI_API_KEY}` },
      cache: "no-store",
    },
  );

  if (!response.ok) {
    return NextResponse.json(
      { error: "Recording unavailable." },
      { status: response.status === 404 ? 404 : 502 },
    );
  }

  const { artifacts } = (await response.json()) as { artifacts?: Artifact[] };
  const audio = artifacts?.find((artifact) => artifact.type === "audio");

  // Artifacts only appear once AssemblyAI has finished processing the session.
  if (!audio) {
    return NextResponse.json(
      { error: "Recording still processing." },
      { status: 425 },
    );
  }

  return NextResponse.redirect(audio.url);
}
