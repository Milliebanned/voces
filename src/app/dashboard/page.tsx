import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { startConversation } from "@/app/conversation/new/actions";
import {
  ACCENT,
  AppShell,
  Avatar,
  Card,
  Chevron,
  levelName,
} from "@/components/app-shell";
import { Flag } from "@/components/flag";
import { Landmark } from "@/components/landmarks";
import { Stars } from "@/components/night-sky";
import { SessionRow } from "@/components/session-row";
import { ThemeToggle } from "@/components/theme-toggle";
import { languageName } from "@/lib/languages";
import { GETTING_THERE, loadProgress } from "@/lib/progress";
import { SCENARIOS, scenarioBlurb } from "@/lib/scenarios";
import { createClient, currentUser } from "@/lib/supabase/server";

// Said in the language being learned: the first words of practice each visit.
const HELLO: Record<string, string> = {
  fr: "Bonjour",
  es: "Hola",
  de: "Hallo",
  it: "Ciao",
  pt: "Olá",
  en: "Hello",
};

// The dusk skyline behind the greeting, with the landmark of the language's
// country. Anchored right, so a narrow card crops to the landmark rather than
// to empty sky.
function HeroScene({ code, id }: { code: string; id: string }) {
  // Each copy on the page needs its own gradient ids: a url(#…) reference
  // resolves to the first match, which may sit in the hidden layout.
  const target = code;
  return (
    <svg viewBox="0 0 936 288" preserveAspectRatio="xMaxYMid slice" fill="none" className="absolute inset-0 size-full" aria-hidden>
      <defs>
        <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2B2438" />
          <stop offset="0.28" stopColor="#5E3A3E" />
          <stop offset="0.52" stopColor="#B0522A" />
          <stop offset="0.68" stopColor="#E2802F" />
          <stop offset="0.84" stopColor="#8A4A22" />
          <stop offset="1" stopColor="#2A1B12" />
        </linearGradient>
        <linearGradient id={`${id}-night`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0B0E1C" />
          <stop offset="0.45" stopColor="#1B1B36" />
          <stop offset="0.72" stopColor="#3B2636" />
          <stop offset="1" stopColor="#1A120E" />
        </linearGradient>
        <linearGradient id={`${id}-left`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#1A1109" stopOpacity="0.86" />
          <stop offset="0.5" stopColor="#1A1109" stopOpacity="0.42" />
          <stop offset="0.86" stopColor="#1A1109" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect width="936" height="288" fill={`url(#${id}-sky)`} />
      <g fill="#C98A5E" fillOpacity="0.22">
        <ellipse cx="300" cy="52" rx="300" ry="12" />
        <ellipse cx="760" cy="92" rx="250" ry="10" />
        <ellipse cx="420" cy="128" rx="280" ry="11" />
      </g>
      {/* By night the dusk gives way to a starry sky over the same city. */}
      <g className="hidden dark:inline">
        <rect width="936" height="288" fill={`url(#${id}-night)`} />
        <circle cx="560" cy="62" r="20" fill="#F6E7D2" />
        {/* A crescent: the moon with the night sky's own colour bitten out. */}
        <circle cx="552" cy="56" r="19" fill="#11132A" />
        <Stars width={936} height={200} count={70} seed={target.length * 17 + 3} />
      </g>
      <g style={{ filter: "brightness(0.45)" }}>
        <Landmark code={target} x={640} baseline={262} scale={0.6} />
      </g>
      <g fill="#2E1C12">
        <path d="M0 214 h120 v54 H0 Z" />
        <path d="M130 224 h96 v44 h-96 Z" />
        <path d="M238 208 h110 v60 H238 Z" />
        <path d="M360 226 h120 v42 H360 Z" />
        <path d="M492 216 h96 v52 h-96 Z" />
        <path d="M828 218 h108 v50 H828 Z" />
      </g>
      <g fill="#F0B45E" fillOpacity="0.75">
        {[[22, 230], [52, 238], [160, 240], [268, 226], [300, 240], [404, 242], [522, 232], [864, 234]].map(([x, y]) => (
          <rect key={x} x={x} y={y} width="6" height="9" rx="2" />
        ))}
      </g>
      <rect y="256" width="936" height="32" fill="#1E1309" />
      <rect width="936" height="288" fill={`url(#${id}-left)`} />
    </svg>
  );
}

// The coastal scene behind the suggested scenario, rendered once in the
// narrow layout and once in the wide one, so its gradient ids are
// parameterised the same way HeroScene's are.
function CoastScene({ id }: { id: string }) {
  return (
    <svg viewBox="0 0 892 112" preserveAspectRatio="xMidYMid slice" fill="none" className="absolute inset-0 size-full" aria-hidden>
      <defs>
        <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8FC6DC" />
          <stop offset="1" stopColor="#CFE3E2" />
        </linearGradient>
        <linearGradient id={`${id}-sea`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2E7FA6" />
          <stop offset="1" stopColor="#1D5D80" />
        </linearGradient>
        <linearGradient id={`${id}-scrim`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#10222C" stopOpacity="0.80" />
          <stop offset="0.52" stopColor="#10222C" stopOpacity="0.18" />
          <stop offset="1" stopColor="#10222C" stopOpacity="0.34" />
        </linearGradient>
      </defs>
      <rect width="892" height="112" fill={`url(#${id}-sky)`} />
      <path d="M0 28 C 90 18 150 34 220 30 L 220 112 L 0 112 Z" fill="#6E8E8C" />
      <rect y="46" width="892" height="66" fill={`url(#${id}-sea)`} />
      <path d="M250 112 C 268 66 320 44 392 40 C 470 36 540 52 600 44 C 680 34 780 46 892 30 L 892 112 Z" fill="#3E6A46" />
      <g fill="#E8CBAE">
        {[[418, 46, 26, 30], [452, 38, 30, 38], [490, 48, 24, 28], [560, 42, 30, 34], [600, 52, 26, 24], [676, 40, 30, 36], [716, 50, 26, 26], [790, 36, 32, 40]].map(([x, y, w, h]) => (
          <rect key={x} x={x} y={y} width={w} height={h} />
        ))}
      </g>
      <g fill="#B4603C">
        {[[416, 42, 30], [450, 34, 34], [488, 44, 28], [558, 38, 34], [598, 48, 30], [674, 36, 34], [714, 46, 30], [788, 32, 36]].map(([x, y, w]) => (
          <rect key={x} x={x} y={y} width={w} height="6" />
        ))}
      </g>
      <path d="M250 112 C 300 96 360 100 420 92 C 500 82 580 96 660 88 C 750 78 830 92 892 84 L 892 112 Z" fill="#2F5637" />
      <g className="hidden dark:inline">
        <rect width="892" height="112" fill="#0B1024" fillOpacity="0.6" />
        <Stars width={892} height={44} count={24} seed={11} />
      </g>
      <rect width="892" height="112" fill={`url(#${id}-scrim)`} />
    </svg>
  );
}

function ContinueLearningCard({
  suggested,
  id,
}: {
  suggested: (typeof SCENARIOS)[number];
  id: string;
}) {
  return (
    <Card>
      <h2 className="text-[17px] font-bold tracking-[-0.01em]">Continue Learning</h2>
      <p className="mt-1.5 text-sm text-mute">
        Your next session is ready. Keep the momentum going.
      </p>
      <div className="relative mt-3.5 h-28 overflow-hidden rounded-[14px]">
        <CoastScene id={id} />
        <div className="relative flex h-full items-center gap-6 px-5">
          <div className="min-w-0 flex-1">
            <span className="inline-flex h-[26px] items-center gap-1.5 rounded-full bg-[#10181E]/55 px-3 text-xs font-semibold text-white">
              Scenario
            </span>
            <p className="mt-1.5 text-[22px] font-bold tracking-[-0.02em] text-white">{suggested.label}</p>
            <p className="truncate text-[13.5px] text-white/86">{scenarioBlurb(suggested.id)}</p>
          </div>
          <form action={startConversation}>
            <input type="hidden" name="scenario" value={suggested.id} />
            <button
              type="submit"
              className="flex h-[46px] items-center gap-2.5 rounded-full px-6 text-[15px] font-semibold text-white transition-colors hover:bg-[#B94A13]"
              style={{ background: ACCENT }}
            >
              Start
              <Arrow />
            </button>
          </form>
        </div>
      </div>
    </Card>
  );
}

// The closing note at the foot of the dashboard, in both layouts.
function MomentumCard({ className = "" }: { className?: string }) {
  return (
    <section className={`relative flex flex-col items-center overflow-hidden rounded-[20px] border border-tint bg-tint px-5 pt-7 pb-16 text-center ${className}`}>
      <svg width="54" height="42" viewBox="0 0 48 48" fill={ACCENT} aria-hidden>
        <rect x="0" y="17" width="6" height="14" rx="3" />
        <rect x="10.5" y="9" width="6" height="30" rx="3" />
        <rect x="21" y="0" width="6" height="48" rx="3" />
        <rect x="31.5" y="9" width="6" height="30" rx="3" />
        <rect x="42" y="17.5" width="6" height="13" rx="3" />
      </svg>
      <p className="mt-5 text-xl leading-snug font-bold tracking-[-0.02em]">
        Small steps.
        <br />
        <span style={{ color: ACCENT }}>Big conversations.</span>
      </p>
      <p className="mt-3 text-[13px] text-mute">Keep speaking, keep learning.</p>
      <svg viewBox="0 0 272 70" preserveAspectRatio="none" fill="none" className="absolute inset-x-0 bottom-0 h-[70px] w-full" aria-hidden>
        <g stroke="#E8722A" strokeLinecap="round" strokeWidth="2">
          <path d="M-10 36 C 40 14 92 54 140 34 C 188 14 232 46 282 26" strokeOpacity="0.34" />
          <path d="M-10 50 C 40 28 92 68 140 48 C 188 28 232 60 282 40" strokeOpacity="0.26" />
          <path d="M-10 64 C 40 42 92 82 140 62 C 188 42 232 74 282 54" strokeOpacity="0.18" />
        </g>
      </svg>
    </section>
  );
}

function MicIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <rect x="9" y="2.4" width="6" height="12" rx="3" fill="#FFFFFF" stroke="none" />
      <path d="M5.5 11.2v1a6.5 6.5 0 0 0 13 0v-1" />
      <path d="M12 19.4V22" />
    </svg>
  );
}

function BookIcon({ stroke = "#FFFFFF", size = 18 }: { stroke?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 4.6 h5.2 A2.8 2.8 0 0 1 12 7.4 V20 a2.4 2.4 0 0 0 -2.4 -2.4 H4 Z" />
      <path d="M20 4.6 h-5.2 A2.8 2.8 0 0 0 12 7.4 V20 a2.4 2.4 0 0 1 2.4 -2.4 H20 Z" />
    </svg>
  );
}

function Arrow() {
  return (
    <svg width="15" height="12" viewBox="0 0 18 14" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M1 7 h15" />
      <path d="M10.4 1.4 L16 7 l-5.6 5.6" />
    </svg>
  );
}

function Ring({ percent, size = 92, label }: { percent: number; size?: number; label?: string }) {
  const stroke = size > 80 ? 9 : 8;
  const r = size / 2 - stroke / 2 - 1;
  const circumference = 2 * Math.PI * r;
  const filled = (circumference * Math.min(100, percent)) / 100;
  return (
    <span className="relative block shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-line" />
        {percent > 0 && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="#E86E23"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${filled} ${circumference}`}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        )}
      </svg>
      <span className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[19px] font-bold">{percent}%</span>
        {label && <span className="text-[11px] text-mute">{label}</span>}
      </span>
    </span>
  );
}

function Stat({ value, label, icon }: { value: number; label: string; icon: ReactNode }) {
  return (
    <span className="flex flex-1 flex-col gap-1.5 px-4 first:pl-0">
      <span className="flex items-center gap-2 text-[#8F959D] dark:text-mute">
        {icon}
        <span className="text-xl font-bold text-ink">{value}</span>
      </span>
      <span className="text-[12.5px] text-mute">{label}</span>
    </span>
  );
}

function QuickAction({ href, title, hint, icon }: { href: string; title: string; hint: string; icon: ReactNode }) {
  return (
    <Link
      href={href}
      className="flex h-[54px] items-center gap-3 rounded-2xl border border-line bg-card-2 px-3.5 transition-colors hover:border-[#DA5C1B]/50"
    >
      <span className="grid size-[34px] shrink-0 place-items-center rounded-full" style={{ background: ACCENT }}>
        {icon}
      </span>
      <span className="flex flex-1 flex-col">
        <span className="text-sm font-semibold">{title}</span>
        <span className="text-xs text-mute">{hint}</span>
      </span>
      <Chevron />
    </Link>
  );
}

function strengthBadge(score: number) {
  return score < GETTING_THERE ? (
    <span className="shrink-0 rounded-full bg-tint px-2.5 py-1 text-[11px] font-semibold text-tint-ink">Weak</span>
  ) : (
    <span className="shrink-0 rounded-full bg-amber px-2.5 py-1 text-[11px] font-semibold text-amber-ink">Medium</span>
  );
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const user = await currentUser(supabase);

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, target_language, skill_level, goals, onboarded_at")
    .eq("id", user.id)
    .single();

  if (!profile?.onboarded_at) redirect("/onboarding");

  const target = profile.target_language ?? "fr";
  const language = languageName(target) ?? target;
  const progress = await loadProgress(supabase, target);
  const name = profile.display_name;
  const hello = `${HELLO[target] ?? "Hello"}${name ? `, ${name}` : ""}`;

  // The scenario practised longest ago, or never, is the one to suggest next.
  const lastPractised = new Map<string, number>();
  for (const session of progress.sessions) {
    if (session.scenario && !lastPractised.has(session.scenario)) {
      lastPractised.set(session.scenario, new Date(session.startedAt).getTime());
    }
  }
  const suggested = [...SCENARIOS].sort(
    (a, b) => (lastPractised.get(a.id) ?? 0) - (lastPractised.get(b.id) ?? 0),
  )[0];

  const recent = progress.sessions.slice(0, 4);
  const { strong, gettingThere, fresh } = progress.strength;
  const total = Math.max(1, progress.wordCount);

  const stats = (
    <>
      <Stat
        value={progress.wordsLearned}
        label="Words learned"
        icon={<BookIcon stroke="currentColor" size={16} />}
      />
      <span className="w-px self-stretch bg-line" />
      <Stat
        value={progress.streak}
        label="Day streak"
        icon={
          <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
            <path d="M12 2.6 C 12 8 16.6 9 16.6 13.6 a4.6 4.6 0 0 1 -9.2 0 C 7.4 9 12 8 12 2.6 Z" fill="#E8722A" />
          </svg>
        }
      />
      <span className="w-px self-stretch bg-line" />
      <Stat
        value={progress.conversationCount}
        label="Conversations"
        icon={
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M20.5 11.6 a7.6 7.6 0 0 1 -10.8 6.9 L5 19.8 l1.1 -4.8 A7.6 7.6 0 1 1 20.5 11.6 Z" />
          </svg>
        }
      />
    </>
  );

  const suggestedReview = (
    <Card>
      <div className="flex items-center">
        <h2 className="flex-1 text-base font-bold tracking-[-0.01em]">Suggested Review</h2>
        <Link href="/vocabulary#review" className="text-[12.5px] font-medium text-mute hover:text-ink">
          Review all
        </Link>
      </div>
      {progress.weakest.length > 0 ? (
        <ul className="mt-3 flex flex-col gap-1">
          {progress.weakest.map((word) => (
            <li key={word.id}>
              <Link href="/vocabulary#review" className="flex h-[46px] items-center gap-2.5 rounded-xl">
                <span className="grid size-7 shrink-0 place-items-center rounded-[9px]" style={{ background: ACCENT }}>
                  <BookIcon size={14} />
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-[13.5px] font-semibold">{word.text}</span>
                  {word.translation && (
                    <span className="truncate text-[11.5px] text-mute">{word.translation}</span>
                  )}
                </span>
                {strengthBadge(word.confidence_score)}
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-[13px] leading-relaxed text-mute">
          Words you reach for in conversation will show up here to review.
        </p>
      )}
    </Card>
  );

  return (
    <AppShell active="home" name={name} targetLanguage={target} level={profile.skill_level}>
      {/* ------------------------------------------------------------ narrow */}
      <div className="flex flex-col gap-5 px-5 pt-8 lg:hidden">
        <section className="relative flex min-h-[220px] flex-col overflow-hidden rounded-[20px] p-5">
          <HeroScene code={target} id="hero-narrow" />
          <div className="relative flex items-start gap-3">
            <div className="flex-1">
              <h1 className="text-[26px] font-bold tracking-[-0.02em] text-white">{hello}</h1>
              <p className="mt-1.5 text-sm text-white/80">Keep going, you&apos;re making progress.</p>
            </div>
            <ThemeToggle className="size-11 border-white/25 bg-white/15 text-white backdrop-blur-sm" />
            <Avatar name={name} size={44} />
          </div>
          <Link
            href="/settings"
            className="relative mt-auto flex h-12 items-center gap-2.5 self-start rounded-full bg-card-2/92 pr-4 pl-1.5 backdrop-blur-sm"
          >
            <Flag code={target} size={36} />
            <span className="flex flex-col leading-tight">
              <span className="text-sm font-semibold">{language}</span>
              <span className="text-xs text-mute">{levelName(profile.skill_level)}</span>
            </span>
            <Chevron />
          </Link>
        </section>

        <div>
          <div className="flex items-baseline">
            <span className="flex-1 text-[15px] font-semibold">Vocabulary strength</span>
            <span className="text-[15px] font-bold">{progress.averageStrength}%</span>
          </div>
          <div className="mt-2.5 h-2.5 rounded-full bg-line">
            <div className="h-2.5 rounded-full bg-[#E86E23]" style={{ width: `${progress.averageStrength}%` }} />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2.5">
          {[
            [progress.wordsLearned, "Words learned"],
            [progress.streak, "Day streak"],
            [progress.conversationCount, "Conversations"],
          ].map(([value, label]) => (
            <div key={label} className="flex h-[86px] flex-col gap-2 rounded-[14px] border border-line px-3.5 py-4">
              <span className="text-xl font-bold">{value}</span>
              <span className="text-xs text-mute">{label}</span>
            </div>
          ))}
        </div>

        <Link
          href="/conversation/new"
          className="flex h-[60px] items-center justify-center gap-3 rounded-full text-[17px] font-semibold text-white shadow-[0_12px_26px_rgba(160,64,14,0.24)]"
          style={{ background: ACCENT }}
        >
          <MicIcon size={20} />
          Start Conversation
        </Link>

        <Link href="/vocabulary#review" className="flex h-[76px] items-center gap-3.5 rounded-2xl border border-line px-4">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-tint">
            <BookIcon stroke={ACCENT} size={20} />
          </span>
          <span className="flex flex-1 flex-col gap-0.5">
            <span className="text-[15px] font-semibold">Suggested Review</span>
            <span className="text-[13px] text-mute">
              {progress.weakest.length > 0
                ? `${Math.min(progress.strength.fresh + progress.strength.gettingThere, 99)} words need review`
                : "Nothing to review yet"}
            </span>
          </span>
          <Chevron />
        </Link>

        <ContinueLearningCard suggested={suggested} id="continue-narrow" />

        <section>
          <div className="flex items-center">
            <h2 className="flex-1 text-[17px] font-bold tracking-[-0.01em]">Recent Sessions</h2>
            {progress.conversationCount > recent.length && (
              <Link href="/conversations" className="text-[12.5px] font-medium text-mute">View all</Link>
            )}
          </div>
          {recent.length > 0 ? (
            <ul className="mt-3 flex flex-col divide-y divide-line border-y border-line">
              {recent.map((session) => (
                <SessionRow key={session.id} session={session} languageLabel={language} />
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-mute">Your conversations will show up here.</p>
          )}
        </section>

        <MomentumCard />
      </div>

      {/* ------------------------------------------------------------ wide */}
      <div className="hidden gap-4 lg:grid lg:grid-cols-[minmax(0,1fr)_284px]">
        <div className="flex min-w-0 flex-col gap-4">
          <section className="relative min-h-72 overflow-hidden rounded-[20px]">
            <HeroScene code={target} id="hero-wide" />

            <Link
              href="/settings"
              className="absolute top-6 right-6 flex h-10 items-center gap-2 rounded-xl bg-card-2/92 pr-3.5 pl-2 text-sm font-semibold"
            >
              <Flag code={target} size={24} />
              {language}
              <Chevron />
            </Link>

            <div className="relative px-10 pt-10 pb-9">
              <p className="text-[13px] font-bold tracking-[0.12em] text-[#F2913F] uppercase">{hello}</p>
              <h1 className="mt-3.5 text-[38px] leading-[1.22] font-bold tracking-[-0.03em] text-white">
                Practice the language by
                <br />
                actually <span className="text-[#F2913F]">speaking it.</span>
              </h1>
              <p className="mt-4 max-w-[440px] text-[15px] leading-[23px] text-white/82">
                Voice-first language immersion. Real conversations, smarter
                learning, lasting progress.
              </p>
              <div className="mt-6 flex items-center gap-4">
                <Link
                  href="/conversation/new"
                  className="flex h-[52px] items-center gap-2.5 rounded-full px-6 text-[15px] font-semibold text-white transition-colors hover:bg-[#B94A13]"
                  style={{ background: ACCENT }}
                >
                  <MicIcon />
                  Start Conversation
                  <Arrow />
                </Link>
                <Link
                  href="/vocabulary#review"
                  className="flex h-[52px] items-center gap-2.5 rounded-full border border-white/55 px-6 text-[15px] font-semibold text-white transition-colors hover:bg-white/10"
                >
                  <BookIcon />
                  Review Vocabulary
                </Link>
              </div>
            </div>
          </section>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_416px]">
            <Card>
              <h2 className="text-[17px] font-bold tracking-[-0.01em]">Your Progress</h2>
              <div className="mt-4 flex items-center gap-6">
                <Ring percent={progress.averageStrength} label="Strength" />
                <span className="flex flex-1 items-center">{stats}</span>
              </div>
            </Card>

            <Card className="flex flex-col gap-3">
              <h2 className="mb-0.5 text-[17px] font-bold tracking-[-0.01em]">Quick Actions</h2>
              <QuickAction href="/conversation/new" title="Start Conversation" hint="Practice speaking naturally" icon={<MicIcon size={16} />} />
              <QuickAction href="/vocabulary#review" title="Review Weak Words" hint="Focus on what you struggle with" icon={<BookIcon size={16} />} />
              <QuickAction
                href="/vocabulary"
                title="View Vocabulary"
                hint="Manage your word bank"
                icon={
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M4.4 5.2 h6.2 v14.2 H4.4 Z" />
                    <path d="M13.4 5.2 h6.2 v14.2 h-6.2 Z" />
                  </svg>
                }
              />
            </Card>
          </div>

          <ContinueLearningCard suggested={suggested} id="continue-wide" />

          <div className="grid gap-4 xl:grid-cols-[1.1fr_1fr_0.9fr]">
            {suggestedReview}

            <Card>
              <div className="flex items-center">
                <h2 className="flex-1 text-base font-bold tracking-[-0.01em]">Vocabulary Progress</h2>
                <Link href="/vocabulary" className="text-[12.5px] font-medium text-mute hover:text-ink">View all</Link>
              </div>
              <div className="mt-4 flex flex-col gap-3.5">
                {[
                  ["Strong", strong, "#29B46C"],
                  ["Getting there", gettingThere, "#E8A02A"],
                  ["New", fresh, "#E8722A"],
                ].map(([label, count, color]) => (
                  <div key={label as string} className="flex flex-col gap-1.5">
                    <span className="flex items-baseline">
                      <span className="flex-1 text-[13.5px] font-medium">{label}</span>
                      <span className="text-[12.5px] font-semibold text-mute">
                        {count} {count === 1 ? "word" : "words"}
                      </span>
                    </span>
                    <span className="block h-2 rounded-full bg-line">
                      <span
                        className="block h-2 rounded-full"
                        style={{ width: `${(100 * (count as number)) / total}%`, background: color as string }}
                      />
                    </span>
                  </div>
                ))}
              </div>
            </Card>

            <MomentumCard />
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <Card>
            <div className="flex items-center gap-3.5">
              <Avatar name={name} size={56} />
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="truncate text-[19px] font-bold tracking-[-0.01em]">{name ?? "You"}</span>
                <span className="text-[12.5px] text-mute">
                  {levelName(profile.skill_level)} · {language}
                </span>
                <Link
                  href="/settings"
                  className="mt-1 self-start rounded-full border border-[#E5A97F] px-3 py-1 text-[12.5px] font-semibold"
                  style={{ color: ACCENT }}
                >
                  Edit Profile
                </Link>
              </span>
            </div>
            {profile.goals && (
              <div className="mt-5 border-t border-line pt-4">
                <p className="text-xs font-semibold tracking-wide text-mute uppercase">Learning goal</p>
                <p className="mt-1.5 text-[13.5px] leading-relaxed">{profile.goals}</p>
              </div>
            )}
          </Card>

          <Card>
            <h2 className="text-base font-bold tracking-[-0.01em]">This Week</h2>
            <div className="mt-3.5 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-card-2 px-4 py-3">
                <p className="text-xl font-bold">{progress.weekConversations}</p>
                <p className="text-xs text-mute">
                  {progress.weekConversations === 1 ? "conversation" : "conversations"}
                </p>
              </div>
              <div className="rounded-2xl bg-card-2 px-4 py-3">
                <p className="text-xl font-bold">{progress.weekMinutes}</p>
                <p className="text-xs text-mute">minutes speaking</p>
              </div>
            </div>
          </Card>

          <Card className="flex-1">
            <div className="flex items-center">
              <h2 className="flex-1 text-base font-bold tracking-[-0.01em]">Recent Sessions</h2>
              {progress.conversationCount > recent.length && (
                <Link href="/conversations" className="text-[12.5px] font-medium text-mute hover:text-ink">
                  View all
                </Link>
              )}
            </div>
            {recent.length > 0 ? (
              <ul className="mt-3 flex flex-col gap-2">
                {recent.map((session) => (
                  <SessionRow key={session.id} session={session} languageLabel={language} compact />
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-[13px] leading-relaxed text-mute">
                No conversations yet. Your first one will show up here with a
                review of what went well.
              </p>
            )}
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
