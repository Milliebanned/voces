import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Handles the link Supabase emails when confirmation is switched on.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  if (tokenHash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });

    if (!error) {
      // verifyOtp signs them in, but the confirmation page sends them to log
      // in on purpose, so that page's "Log in" link means what it says.
      await supabase.auth.signOut();
      return NextResponse.redirect(new URL("/auth/confirmed", origin));
    }
  }

  return NextResponse.redirect(new URL("/login", origin));
}
