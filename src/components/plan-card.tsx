import Link from "next/link";
import { ACCENT, Card } from "@/components/app-shell";
import { FREE_SECONDS, freeSecondsLeft, isPremium } from "@/lib/billing";

export type Plan = { premium: boolean; freeSecondsLeft: number };

export async function loadPlan(userId: string): Promise<Plan> {
  const premium = await isPremium(userId);
  return {
    premium,
    freeSecondsLeft: premium ? FREE_SECONDS : await freeSecondsLeft(userId),
  };
}

export function formatMinutes(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

function Sparkle({ size = 14, color = "#FFFFFF" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden>
      <path d="M12 1.8 L14.3 9.7 L22.2 12 L14.3 14.3 L12 22.2 L9.7 14.3 L1.8 12 L9.7 9.7 Z" />
    </svg>
  );
}

/** The dashboard's plan summary: free minutes left and the way to Premium. */
export function PlanCard({ plan }: { plan: Plan }) {
  if (plan.premium) {
    return (
      <Card className="flex items-center gap-3.5">
        <span className="grid size-10 shrink-0 place-items-center rounded-full" style={{ background: ACCENT }}>
          <Sparkle size={18} />
        </span>
        <span className="flex flex-1 flex-col">
          <span className="text-[15px] font-bold">VOCES Premium</span>
          <span className="text-[13px] text-mute">Unlimited conversations with the VOCES AI</span>
        </span>
        <Link href="/premium" className="text-[12.5px] font-medium text-mute hover:text-ink">
          Manage
        </Link>
      </Card>
    );
  }

  const left = plan.freeSecondsLeft;
  const used = Math.min(100, Math.round(((FREE_SECONDS - left) / FREE_SECONDS) * 100));
  return (
    <Card className="border-[#DA5C1B]/40">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <div className="min-w-[200px] flex-1">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-tint px-2.5 py-1 text-[11px] font-semibold text-tint-ink">
              Free plan
            </span>
            <span className="text-[13px] font-semibold tabular-nums">
              {left > 0
                ? `${formatMinutes(left)} of ${formatMinutes(FREE_SECONDS)} free minutes left`
                : "Your free minutes are used up"}
            </span>
          </div>
          <div
            className="mt-2.5 h-2 overflow-hidden rounded-full bg-card-2"
            role="progressbar"
            aria-label="Free minutes used"
            aria-valuenow={used}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div className="h-full rounded-full" style={{ width: `${used}%`, background: ACCENT }} />
          </div>
          <p className="mt-2 text-[12.5px] text-mute">
            Free accounts get 5 minutes of conversation with the VOCES AI.
            Premium is unlimited.
          </p>
        </div>
        <Link
          href="/premium"
          className="flex h-[46px] items-center gap-2 rounded-full px-6 text-[15px] font-semibold text-white transition-colors hover:bg-[#B94A13]"
          style={{ background: ACCENT }}
        >
          <Sparkle />
          Upgrade to Premium
        </Link>
      </div>
    </Card>
  );
}

/** A small reminder of the plan in the sidebar, on every signed-in page. */
export function PlanChip({ plan }: { plan: Plan }) {
  return (
    <Link
      href="/premium"
      className="mb-3 flex items-center gap-2.5 rounded-2xl bg-tint px-3.5 py-3 text-tint-ink transition-opacity hover:opacity-85"
    >
      <span className="grid size-7 shrink-0 place-items-center rounded-full" style={{ background: ACCENT }}>
        <Sparkle size={12} />
      </span>
      <span className="flex flex-col leading-tight">
        <span className="text-[13px] font-semibold">{plan.premium ? "Premium" : "Go Premium"}</span>
        <span className="text-[11.5px] opacity-80">
          {plan.premium ? "Unlimited" : `${formatMinutes(plan.freeSecondsLeft)} free left`}
        </span>
      </span>
    </Link>
  );
}
