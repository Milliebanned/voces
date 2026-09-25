import Link from "next/link";
import type { ReactNode } from "react";
import { logout } from "@/app/login/actions";
import { Flag } from "@/components/flag";
import { ThemeToggle } from "@/components/theme-toggle";
import { languageName } from "@/lib/languages";

export const ACCENT = "#DA5C1B";

type Tab = "home" | "conversations" | "vocabulary" | "settings";

const icons: Record<Tab, (active: boolean) => ReactNode> = {
  home: (active) =>
    active ? (
      <path d="M12 3.2 L21 10.4 V20 a1.4 1.4 0 0 1 -1.4 1.4 h-4.2 v-6 h-4.8 v6 H4.4 A1.4 1.4 0 0 1 3 20 V10.4 Z" fill="currentColor" stroke="none" />
    ) : (
      <path d="M12 3.2 L21 10.4 V20 a1.4 1.4 0 0 1 -1.4 1.4 h-4.2 v-6 h-4.8 v6 H4.4 A1.4 1.4 0 0 1 3 20 V10.4 Z" />
    ),
  conversations: () => (
    <path d="M20.5 11.6 a7.6 7.6 0 0 1 -10.8 6.9 L5 19.8 l1.1 -4.8 A7.6 7.6 0 1 1 20.5 11.6 Z" />
  ),
  vocabulary: () => (
    <>
      <path d="M4 4.6 h5.2 A2.8 2.8 0 0 1 12 7.4 V20 a2.4 2.4 0 0 0 -2.4 -2.4 H4 Z" />
      <path d="M20 4.6 h-5.2 A2.8 2.8 0 0 0 12 7.4 V20 a2.4 2.4 0 0 1 2.4 -2.4 H20 Z" />
    </>
  ),
  settings: () => (
    <>
      <circle cx="12" cy="8.2" r="3.9" />
      <path d="M4.6 20.2 a7.6 7.6 0 0 1 14.8 0" />
    </>
  ),
};

const NAV: { tab: Tab; href: string; label: string; short: string }[] = [
  { tab: "home", href: "/dashboard", label: "Home", short: "Home" },
  { tab: "conversations", href: "/conversations", label: "Conversations", short: "Conversations" },
  { tab: "vocabulary", href: "/vocabulary", label: "Vocabulary", short: "Vocabulary" },
  { tab: "settings", href: "/settings", label: "Settings", short: "Profile" },
];

function NavIcon({ tab, active, size = 19 }: { tab: Tab; active: boolean; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {icons[tab](active)}
    </svg>
  );
}

export function Logo({ size = 30 }: { size?: number }) {
  return (
    <span className="flex items-center gap-2.5">
      <svg width={size} height={size} viewBox="0 0 48 48" fill={ACCENT} aria-hidden>
        <rect x="0" y="17" width="6" height="14" rx="3" />
        <rect x="10.5" y="9" width="6" height="30" rx="3" />
        <rect x="21" y="0" width="6" height="48" rx="3" />
        <rect x="31.5" y="9" width="6" height="30" rx="3" />
        <rect x="42" y="17.5" width="6" height="13" rx="3" />
      </svg>
      <span className="font-extrabold tracking-[0.05em]" style={{ color: ACCENT, fontSize: size * 0.7 }}>
        VOCES
      </span>
    </span>
  );
}

export function Avatar({ name, size = 34 }: { name: string | null; size?: number }) {
  return (
    <span
      className="grid shrink-0 place-items-center rounded-full bg-tint font-bold text-tint-ink"
      style={{ width: size, height: size, fontSize: size * 0.42 }}
      aria-hidden
    >
      {(name?.trim()[0] ?? "V").toUpperCase()}
    </span>
  );
}

const LEVELS: Record<string, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

export function levelName(level: string | null) {
  return LEVELS[level ?? ""] ?? "Intermediate";
}

/**
 * The signed-in frame: a sidebar on wide screens, a bottom tab bar on narrow
 * ones. Pages supply their own content, and optionally a right-hand rail.
 */
export function AppShell({
  active,
  name,
  targetLanguage,
  level,
  children,
}: {
  active: Tab;
  name: string | null;
  targetLanguage: string;
  level: string | null;
  children: ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-canvas text-ink">
      <div className="mx-auto flex w-full max-w-[1536px] gap-3 lg:p-7 lg:pl-7">
        <aside className="sticky top-7 hidden h-[calc(100dvh-56px)] w-56 shrink-0 flex-col rounded-[20px] border border-line bg-card px-[18px] py-7 lg:flex">
          <div className="flex items-center justify-between">
            <Link href="/dashboard" aria-label="VOCES home" className="pl-1.5">
              <Logo />
            </Link>
            <ThemeToggle className="size-9" />
          </div>

          <nav aria-label="Main" className="mt-8 flex flex-col gap-1">
            {NAV.map((item) => {
              const current = item.tab === active;
              return (
                <Link
                  key={item.tab}
                  href={item.href}
                  aria-current={current ? "page" : undefined}
                  className={`flex h-11 items-center gap-3 rounded-xl px-3.5 text-[14.5px] transition-colors ${
                    current
                      ? "bg-tint font-semibold text-tint-ink"
                      : "font-medium text-ink-2 hover:bg-card-2"
                  }`}
                >
                  <NavIcon tab={item.tab} active={current} />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <Link
            href="/settings"
            className="mt-auto flex h-[62px] items-center gap-3 rounded-2xl border border-line px-3 transition-colors hover:border-[#DA5C1B]/50"
          >
            <Flag code={targetLanguage} size={32} />
            <span className="flex flex-1 flex-col">
              <span className="text-sm font-semibold">{languageName(targetLanguage)}</span>
              <span className="text-xs text-mute">{levelName(level)}</span>
            </span>
            <svg width="7" height="12" viewBox="0 0 8 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-[#A9AEB4] dark:text-mute" aria-hidden>
              <path d="M1.5 1 L6.5 7 L1.5 13" />
            </svg>
          </Link>

          <div className="mt-3.5 flex items-center gap-3 border-t border-line pt-4">
            <Avatar name={name} />
            <span className="flex-1 truncate text-[14.5px] font-semibold">{name ?? "You"}</span>
            <form action={logout}>
              <button type="submit" className="text-xs font-medium text-mute hover:text-ink">
                Sign out
              </button>
            </form>
          </div>
        </aside>

        <div className="min-w-0 flex-1 pb-24 lg:pb-0">{children}</div>
      </div>

      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-20 flex h-[69px] items-center border-t border-line bg-card/95 backdrop-blur lg:hidden"
      >
        {NAV.map((item) => {
          const current = item.tab === active;
          return (
            <Link
              key={item.tab}
              href={item.href}
              aria-current={current ? "page" : undefined}
              className={`flex flex-1 flex-col items-center gap-1.5 text-[11px] ${
                current ? "font-semibold text-[#DA5C1B]" : "font-medium text-mute"
              }`}
            >
              <NavIcon tab={item.tab} active={current} size={22} />
              {item.short}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-[20px] border border-line bg-card p-5 ${className}`}>
      {children}
    </section>
  );
}

export function Chevron() {
  return (
    <svg width="7" height="12" viewBox="0 0 8 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="shrink-0 text-[#A9AEB4] dark:text-mute">
      <path d="M1.5 1 L6.5 7 L1.5 13" />
    </svg>
  );
}
