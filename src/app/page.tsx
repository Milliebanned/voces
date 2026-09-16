const features = [
  {
    title: "Speak from the first minute",
    body: "Real voice conversations that adapt to your level. No lessons to sit through, no decks to grind.",
    icon: (
      <>
        <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
        <line x1="12" y1="19" x2="12" y2="22" />
      </>
    ),
  },
  {
    title: "Never break immersion",
    body: "Forget a word? Say it in your own language. You stay understood, the conversation keeps moving.",
    icon: (
      <>
        <polyline points="17 1 21 5 17 9" />
        <path d="M3 11V9a4 4 0 0 1 4-4h14" />
        <polyline points="7 23 3 19 7 15" />
        <path d="M21 13v2a4 4 0 0 1-4 4H3" />
      </>
    ),
  },
  {
    title: "It remembers what you miss",
    body: "Words you stumble on resurface naturally in later conversations, until you use them without thinking.",
    icon: (
      <>
        <polyline points="23 4 23 10 17 10" />
        <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
      </>
    ),
  },
];

function Wordmark() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex h-4 items-center gap-[2.5px]">
        {[6, 12, 16, 10, 6].map((height, i) => (
          <span
            key={i}
            className="w-[3px] rounded-full bg-accent"
            style={{ height }}
          />
        ))}
      </div>
      <span className="text-[15px] font-bold tracking-[0.16em]">VOCES</span>
    </div>
  );
}

function PhoneMockup() {
  return (
    <div className="relative h-[640px] w-[320px] overflow-hidden rounded-[36px] border border-border bg-surface shadow-[0_24px_60px_-24px_rgba(90,50,20,0.35)]">
      <div className="flex items-center justify-between px-5 pt-7">
        <div className="flex items-center gap-2">
          <span className="size-1.5 rounded-full bg-accent" />
          <span className="text-[13px] font-semibold">Français</span>
        </div>
        <span className="text-xs font-medium text-muted">04:12</span>
      </div>

      <div className="flex flex-col gap-[18px] px-5 pt-7">
        <div className="flex flex-col gap-[7px]">
          <span className="text-[9px] font-bold tracking-[0.18em] text-accent">
            VOCES
          </span>
          <p className="text-[13.5px] leading-relaxed">
            Alors, qu&apos;est-ce que tu as fait ce week-end&nbsp;?
          </p>
        </div>

        <div className="flex justify-end">
          <div className="max-w-[232px] rounded-2xl rounded-br-sm border border-border bg-background px-3 py-2.5">
            <p className="text-[13.5px] leading-relaxed text-muted">
              J&apos;ai visité un musée avec mon{" "}
              <span className="font-semibold text-accent">friend</span>…
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-[7px]">
          <span className="text-[9px] font-bold tracking-[0.18em] text-accent">
            VOCES
          </span>
          <p className="text-[13.5px] leading-relaxed">
            Ah, avec ton <span className="font-semibold text-accent">ami</span>{" "}
            ! C&apos;était comment, le musée&nbsp;?
          </p>
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 flex h-44 flex-col items-center justify-center gap-[18px]">
        <div className="flex items-center gap-2">
          <div className="flex h-3.5 items-center gap-[2.5px]">
            {[5, 11, 14, 8, 4].map((height, i) => (
              <span
                key={i}
                className="w-[2.5px] rounded-full bg-accent"
                style={{ height }}
              />
            ))}
          </div>
          <span className="text-[11.5px] font-medium text-muted">
            Listening…
          </span>
        </div>

        <div className="relative grid size-28 place-items-center">
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background:
                "radial-gradient(closest-side, var(--accent-glow) 0%, transparent 78%)",
            }}
          />
          <div className="relative grid size-[72px] place-items-center rounded-full bg-accent">
            <svg
              width="26"
              height="26"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#fff"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="22" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <main className="flex-1">
      <header className="mx-auto flex w-full max-w-6xl items-center px-6 py-6">
        <Wordmark />
      </header>

      <section className="relative overflow-hidden">
        <svg
          viewBox="0 0 1440 520"
          preserveAspectRatio="none"
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[520px] w-full"
        >
          <path
            d="M0,150 C220,60 420,20 620,44 C900,78 1180,190 1440,120 L1440,520 L0,520 Z"
            fill="var(--wave-1)"
          />
          <path
            d="M0,250 C240,158 440,118 640,142 C920,176 1190,286 1440,220 L1440,520 L0,520 Z"
            fill="var(--wave-2)"
          />
          <path
            d="M0,350 C260,256 460,216 660,240 C940,274 1200,382 1440,320 L1440,520 L0,520 Z"
            fill="var(--wave-3)"
          />
          <path
            d="M0,450 C280,354 480,314 680,338 C960,372 1210,478 1440,420 L1440,520 L0,520 Z"
            fill="var(--wave-4)"
          />
        </svg>

        <div className="relative mx-auto flex max-w-6xl flex-col items-center px-6 pt-12 pb-20 md:pt-20">
          <h1 className="text-center text-[38px] leading-[1.1] font-bold tracking-[-0.02em] text-balance md:text-[52px]">
            Practice Languages
            <br />
            Through Real <span className="text-accent">Conversation</span>
          </h1>

          <p className="mt-6 max-w-[540px] text-center text-base leading-relaxed text-muted md:text-lg">
            Voice-first immersion with an AI that listens, adapts and remembers.
            Stop studying a language — start using it.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-3.5">
            <button className="rounded-full bg-accent px-7 py-4 text-base font-semibold text-white transition-colors hover:bg-accent-hover">
              Start Speaking
            </button>
            <button className="rounded-full border border-border bg-transparent px-7 py-4 text-base font-semibold transition-colors hover:bg-surface">
              See How It Works
            </button>
          </div>

          <div className="mt-20">
            <PhoneMockup />
          </div>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-6xl gap-6 px-6 py-24 md:grid-cols-3">
        {features.map((feature) => (
          <div
            key={feature.title}
            className="rounded-3xl border border-border bg-surface p-7"
          >
            <div className="grid size-10 place-items-center rounded-xl bg-accent-soft">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--accent)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                {feature.icon}
              </svg>
            </div>
            <h2 className="mt-5 text-[17px] font-semibold tracking-[-0.01em]">
              {feature.title}
            </h2>
            <p className="mt-2.5 text-sm leading-relaxed text-muted">
              {feature.body}
            </p>
          </div>
        ))}
      </section>
    </main>
  );
}
