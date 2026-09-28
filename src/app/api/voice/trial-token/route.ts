import { NextResponse, type NextRequest } from "next/server";
import {
  TRIAL_COOKIE,
  TRIAL_COOKIE_MAX_AGE,
  addressHasTried,
  recordAddress,
  visitorAddress,
} from "@/lib/trial";

// The landing page's "Try it live" taster needs no account, so this route is
// public. A visitor gets one token, ever (see lib/trial), and that token asks
// AssemblyAI to end the session at MAX_SESSION_SECONDS whatever the page does,
// so a trial can't be stretched by skipping the page's 30-second cut-off.
const MAX_SESSION_SECONDS = 60; // the smallest cap AssemblyAI accepts

export async function GET(request: NextRequest) {
  const address = visitorAddress(request.headers);

  if (request.cookies.has(TRIAL_COOKIE) || (await addressHasTried(address))) {
    return NextResponse.json(
      { error: "You've had your free try. Sign up to keep talking.", used: true },
      { status: 403 },
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

  // Spent the moment it's handed out, so reloading mid-conversation doesn't
  // buy a second one either.
  await recordAddress(address);
  const { token } = await response.json();
  const reply = NextResponse.json({ token });
  reply.cookies.set(TRIAL_COOKIE, "1", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: TRIAL_COOKIE_MAX_AGE,
  });
  return reply;
}
