import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { DeleteSessionButton } from "@/components/delete-session-button";
import type { SessionSummary } from "@/lib/progress";
import { scenarioLabel } from "@/lib/scenarios";

// One stroke icon and tint per scenario, so a list of sessions scans by shape.
const SCENARIO_ICONS: Record<string, { tint: string; ink: string; icon: ReactNode }> = {
  free: {
    tint: "#DFF1DC",
    ink: "#2E8A52",
    icon: <path d="M20.5 12.4 a8 8 0 0 1 -11.3 7.3 L4 20.8 l1.1 -5.1 A8 8 0 1 1 20.5 12.4 Z" />,
  },
  travel: {
    tint: "#DCE9FA",
    ink: "#2C6BD4",
    icon: (
      <>
        <path d="M12 21 C 16.5 16.2 19 12.9 19 9.8 a7 7 0 1 0 -14 0 C 5 12.9 7.5 16.2 12 21 Z" />
        <circle cx="12" cy="9.6" r="2.6" />
      </>
    ),
  },
  restaurant: {
    tint: "#FBE6D3",
    ink: "#C0570F",
    icon: (
      <>
        <path d="M6.5 3 v7 a2.6 2.6 0 0 0 5.2 0 V3" />
        <path d="M9.1 10.2 V21" />
        <path d="M17.5 3 c -1.9 0 -3 2.2 -3 5.4 c 0 2 1.2 3 3 3 Z" />
        <path d="M17.5 11.4 V21" />
      </>
    ),
  },
  shopping: {
    tint: "#F3E3F7",
    ink: "#8A3FA3",
    icon: (
      <>
        <path d="M5 8 h14 l-1.2 12 H6.2 Z" />
        <path d="M9 8 V6.5 a3 3 0 0 1 6 0 V8" />
      </>
    ),
  },
  doctor: {
    tint: "#E0F2F1",
    ink: "#1F7F78",
    icon: (
      <>
        <path d="M12 6 v12" />
        <path d="M6 12 h12" />
      </>
    ),
  },
  work: {
    tint: "#ECEAE4",
    ink: "#5A5D64",
    icon: (
      <>
        <rect x="3" y="7.4" width="18" height="12.2" rx="2.4" />
        <path d="M9 7.4 V5.6 a1.8 1.8 0 0 1 1.8 -1.8 h2.4 A1.8 1.8 0 0 1 15 5.6 V7.4" />
      </>
    ),
  },
  interview: {
    tint: "#ECEAE4",
    ink: "#5A5D64",
    icon: (
      <>
        <circle cx="12" cy="8.2" r="3.9" />
        <path d="M4.6 20.2 a7.6 7.6 0 0 1 14.8 0" />
      </>
    ),
  },
  friends: {
    tint: "#FCEFDC",
    ink: "#B07510",
    icon: (
      <>
        <circle cx="9" cy="9" r="3.2" />
        <circle cx="16.5" cy="10" r="2.6" />
        <path d="M3.5 19.5 a5.6 5.6 0 0 1 11 0" />
        <path d="M14.5 15.2 a4.6 4.6 0 0 1 6 4.3" />
      </>
    ),
  },
};

export function ScenarioIcon({ scenario, size = 44 }: { scenario: string | null; size?: number }) {
  const { tint, ink, icon } =
    SCENARIO_ICONS[scenario ?? "free"] ?? SCENARIO_ICONS.free;
  return (
    // By night the pastel tile would glare, so it is mixed from the icon's
    // own colour instead.
    <span
      className="grid shrink-0 place-items-center rounded-xl bg-(--tile) dark:bg-[color-mix(in_srgb,var(--tile-ink)_22%,transparent)]"
      style={{ width: size, height: size, "--tile": tint, "--tile-ink": ink } as CSSProperties}
    >
      <svg width={size * 0.45} height={size * 0.45} viewBox="0 0 24 24" fill="none" stroke={ink} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        {icon}
      </svg>
    </span>
  );
}

function when(startedAt: string) {
  const date = new Date(startedAt);
  const days = Math.floor((Date.now() - date.getTime()) / 86_400_000);
  if (days < 1) return "Today";
  if (days < 2) return "Yesterday";
  return date.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

function Badge({ corrections }: { corrections: number | null }) {
  // More than a couple of corrections means the review is worth reading.
  if (corrections === null) {
    return (
      <span className="shrink-0 rounded-full bg-card-2 px-2.5 py-1 text-[11px] font-semibold text-ink-2">
        Not reviewed
      </span>
    );
  }
  return corrections > 2 ? (
    <span className="shrink-0 rounded-full bg-tint px-2.5 py-1 text-[11px] font-semibold text-tint-ink">
      Needs review
    </span>
  ) : (
    <span className="shrink-0 rounded-full bg-ok px-2.5 py-1 text-[11px] font-semibold text-ok-ink">
      Good
    </span>
  );
}

export function SessionRow({
  session,
  languageLabel,
  compact = false,
}: {
  session: SessionSummary;
  languageLabel: string;
  // For narrow columns: drops the language and the delete button, which stay
  // available on the full list and on the session's own page.
  compact?: boolean;
}) {
  return (
    <li className="flex items-center gap-3">
      <Link
        href={`/conversation/${session.id}/analysis`}
        className="group flex min-w-0 flex-1 items-center gap-3 rounded-xl py-1.5"
      >
        <ScenarioIcon scenario={session.scenario} size={compact ? 38 : 44} />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate text-[13.5px] font-semibold text-ink group-hover:text-[#DA5C1B]">
            {scenarioLabel(session.scenario) ?? "Free conversation"}
          </span>
          <span className="text-[11.5px] text-mute">
            {when(session.startedAt)}
            {!compact && ` · ${languageLabel}`}
            {session.minutes > 0 && ` · ${session.minutes} min`}
          </span>
        </span>
        <Badge corrections={session.corrections} />
      </Link>
      {!compact && <DeleteSessionButton sessionId={session.id} />}
    </li>
  );
}
