import { NextResponse, type NextRequest } from "next/server";

// The landing page's "Try it live" taster needs no account, so this route is
// public. What keeps it cheap is the token itself: AssemblyAI ends the session
// at MAX_SESSION_SECONDS whatever the page does, so a trial can't be stretched
// by skipping the page's own 30-second cut-off.
const MAX_SESSION_SECONDS = 60; // the smallest cap AssemblyAI accepts

// A best-effort brake on one visitor minting token after token. It lives in
// the memory of a single server instance, so it is not a hard quota; the
// per-session cap above is what bounds the cost of any one token.
const WINDOW_MS = 60 * 60 * 1000;
const TRIALS_PER_WINDOW = 5;
const recent = new Map<string, number[]>();

function allow(visitor: string) {
  const now = Date.now();
  const times = (recent.get(visitor) ?? []).filter((t) => now - t < WINDOW_MS);
  if (times.length >= TRIALS_PER_WINDOW) {
    recent.set(visitor, times);
    return false;
  }
  times.push(now);
  recent.set(visitor, times);
  if (recent.size > 10000) recent.clear();
  return true;
}

export async function GET(request: NextRequest) {
  const visitor =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";

  if (!allow(visitor)) {
    return NextResponse.json(
      { error: "You've used your free tries for now. Sign up to keep talking." },
      { status: 429 },
    );
  }

  const apiKey = process.env.ASSEMBLYAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "ASSEMBLYAI_API_KEY is not configured." },
      { status: 500 },
    );
  }

  const url = new URL("https://agents.assemblyai.com/v1/token");
  url.searchParams.set("expires_in_seconds", "60");
  url.searchParams.set("max_session_duration_seconds", String(MAX_SESSION_SECONDS));

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
