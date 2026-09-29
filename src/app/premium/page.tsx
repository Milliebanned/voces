import Link from "next/link";
import { redirect } from "next/navigation";
import { Logo } from "@/components/app-shell";
import { formatMinutes, loadPlan } from "@/components/plan-card";
import { ThemeToggle } from "@/components/theme-toggle";
import { FREE_SECONDS } from "@/lib/billing";
import { createClient, currentUser } from "@/lib/supabase/server";
import { PremiumCheckout } from "./premium-checkout";

export default async function PremiumPage({ searchParams }: PageProps<"/premium">) {
  const { code } = await searchParams;
  const supabase = await createClient();
  const user = await currentUser(supabase);

  if (!user) redirect("/login?next=/premium");

  const plan = await loadPlan(user.id);
  // Passed to the checkout so a signed-in learner isn't asked for it again.
  const { data } = await supabase.auth.getClaims();
  const email = typeof data?.claims.email === "string" ? data.claims.email : null;

  return (
    <main className="min-h-dvh bg-canvas text-ink">
      <div className="mx-auto flex w-full max-w-[880px] flex-col px-4 pt-6 pb-16 sm:px-6 md:pt-10">
        <header className="flex items-center justify-between">
          <Link href="/dashboard" aria-label="VOCES dashboard">
            <Logo size={28} />
          </Link>
          <ThemeToggle />
        </header>

        <h1 className="mt-10 text-[32px] leading-tight font-bold tracking-[-0.02em] md:text-[44px]">
          {plan.premium ? "You're on Premium" : "Keep talking with VOCES Premium"}
        </h1>
        <p className="mt-3 max-w-[560px] text-[16px] leading-relaxed text-mute">
          {plan.premium
            ? "Unlimited conversations with the VOCES AI, in every language you learn."
            : plan.freeSecondsLeft > 0
              ? `You have ${formatMinutes(plan.freeSecondsLeft)} of your ${formatMinutes(FREE_SECONDS)} free minutes left. Premium removes the limit.`
              : "Your 5 free minutes are used up. Premium removes the limit, so you can keep speaking every day."}
        </p>

        <PremiumCheckout
          appUserId={user.id}
          apiKey={process.env.NEXT_PUBLIC_REVENUECAT_WEB_KEY ?? null}
          premium={plan.premium}
          initialCode={typeof code === "string" ? code : ""}
          email={email}
        />

        <Link
          href="/dashboard"
          className="mt-8 self-center text-[15px] font-medium text-mute underline-offset-4 hover:text-ink hover:underline"
        >
          {plan.premium ? "Back to the dashboard" : "Not now, back to the dashboard"}
        </Link>
      </div>
    </main>
  );
}
