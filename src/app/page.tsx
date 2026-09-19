import Link from "next/link";
import { Wordmark } from "@/components/wordmark";

/**
 * The hero is drawn from the brand mockups: a 1280x984 desktop artboard and a
 * 390x844 mobile artboard. `--u` is one artboard pixel, so every measurement
 * below is the value taken off the mockup and the whole composition scales
 * proportionally instead of reflowing.
 */
const u = (n: number) => `calc(var(--u) * ${n})`;

const NAV_LINKS = [
  { label: "Home", href: "#top", active: true },
  { label: "Features", href: "#how-it-works", active: false },
  { label: "Languages", href: "#languages", active: false },
  { label: "About", href: "#about", active: false },
];

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

/* ------------------------------------------------------------------ flags */

type Language = { name: string; flag: React.ReactNode };

const LANGUAGES: Language[] = [
  {
    name: "English",
    flag: (
      <>
        <rect width="30" height="22" fill="#f2f2f4" />
        {[0, 3.4, 6.8, 10.2, 13.6, 17, 20.3].map((y) => (
          <rect key={y} y={y} width="30" height="1.7" fill="#c8102e" />
        ))}
        <rect width="13" height="11.9" fill="#2a3560" />
      </>
    ),
  },
  {
    name: "Spanish",
    flag: (
      <>
        <rect width="30" height="22" fill="#aa151b" />
        <rect y="5.5" width="30" height="11" fill="#f1bf00" />
        <rect x="5" y="8.5" width="4" height="5" rx="0.6" fill="#ad1519" />
      </>
    ),
  },
  {
    name: "French",
    flag: (
      <>
        <rect width="10" height="22" fill="#002395" />
        <rect x="10" width="10" height="22" fill="#fff" />
        <rect x="20" width="10" height="22" fill="#ed2939" />
      </>
    ),
  },
  {
    name: "German",
    flag: (
      <>
        <rect width="30" height="7.34" fill="#111" />
        <rect y="7.34" width="30" height="7.33" fill="#d00" />
        <rect y="14.67" width="30" height="7.33" fill="#ffce00" />
      </>
    ),
  },
  {
    name: "Japanese",
    flag: (
      <>
        <rect width="30" height="22" fill="#fff" />
        <circle cx="15" cy="11" r="6.2" fill="#bc002d" />
      </>
    ),
  },
  {
    name: "Chinese",
    flag: (
      <>
        <rect width="30" height="22" fill="#de2910" />
        <path
          d="M7 3.2l1.25 3.85h4.05l-3.28 2.38 1.26 3.85L7 10.9l-3.28 2.38 1.26-3.85L1.7 7.05h4.05z"
          fill="#ffde00"
        />
        <circle cx="14.6" cy="3" r="1.15" fill="#ffde00" />
        <circle cx="17.4" cy="5.6" r="1.15" fill="#ffde00" />
        <circle cx="17.4" cy="9.3" r="1.15" fill="#ffde00" />
        <circle cx="14.6" cy="11.9" r="1.15" fill="#ffde00" />
      </>
    ),
  },
];

function LanguageStrip() {
  return (
    <ul
      id="languages"
      className="flex list-none items-start scroll-mt-12"
      style={{ marginTop: u(78), gap: u(61) }}
    >
      {LANGUAGES.map((language) => (
        <li
          key={language.name}
          className="flex flex-col items-center"
          style={{ width: u(41), gap: u(10) }}
        >
          <span
            className="block overflow-hidden rounded-full bg-white"
            style={{
              width: u(41),
              height: u(41),
              boxShadow: "0 5px 14px rgba(86,52,20,0.16)",
            }}
          >
            <svg
              viewBox="0 0 30 22"
              preserveAspectRatio="xMidYMid slice"
              style={{ width: u(41), height: u(41) }}
              aria-hidden
            >
              {language.flag}
            </svg>
          </span>
          <span
            className="font-medium whitespace-nowrap"
            style={{ fontSize: u(16) }}
          >
            {language.name}
          </span>
        </li>
      ))}
    </ul>
  );
}

/* ------------------------------------------------------------- phone scene */

const WAVEFORM_BARS = [
  8, 20, 30, 13, 40, 24, 46, 27, 15, 36, 21, 44, 17, 31, 10, 6,
];

function PhoneRender() {
  return (
    <div
      className="relative"
      style={{
        width: u(344),
        height: u(726),
        transform:
          "perspective(1600px) rotateX(3deg) rotateY(-11deg) rotateZ(8.5deg) scale(1.1)",
      }}
    >
      {/* right side wall of the device */}
      <div
        className="absolute"
        style={{
          left: u(16),
          top: u(8),
          width: u(330),
          height: u(712),
          borderRadius: u(54),
          background:
            "linear-gradient(90deg, #2b2b2e 0%, #121214 45%, #35353a 100%)",
          boxShadow: "44px 58px 90px rgba(62,34,12,0.34)",
        }}
      />

      <div
        className="absolute inset-0 box-border"
        style={{
          borderRadius: u(54),
          padding: u(9),
          background:
            "linear-gradient(115deg, #3a3a3f 0%, #141417 22%, #0c0c0e 62%, #2e2e33 100%)",
        }}
      >
        <div
          className="relative h-full w-full overflow-hidden bg-[#131315]"
          style={{ borderRadius: u(46) }}
        >
          {/* dusk scene */}
          <svg
            viewBox="0 0 326 708"
            preserveAspectRatio="none"
            className="absolute inset-0 h-full w-full"
            aria-hidden
          >
            <defs>
              <linearGradient id="voces-sky" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#25323f" />
                <stop offset="0.38" stopColor="#465360" />
                <stop offset="0.66" stopColor="#8a6a3d" />
                <stop offset="1" stopColor="#4a3720" />
              </linearGradient>
              <linearGradient id="voces-fade" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#0f0f11" stopOpacity="0" />
                <stop offset="0.45" stopColor="#121214" stopOpacity="0.22" />
                <stop offset="0.62" stopColor="#141416" stopOpacity="0.74" />
                <stop offset="0.74" stopColor="#151517" stopOpacity="1" />
                <stop offset="1" stopColor="#151517" stopOpacity="1" />
              </linearGradient>
            </defs>
            <rect width="326" height="708" fill="url(#voces-sky)" />
            <g fill="#7c5d2f">
              <path d="M238 176 L246 118 L254 176 Z" />
              <path d="M214 214 C214 196 226 184 246 176 C266 184 278 196 278 214 Z" />
              <rect x="214" y="212" width="64" height="196" />
              <path d="M292 250 L297 214 L302 250 Z" />
              <rect x="278" y="248" width="40" height="160" />
              <path d="M182 276 L186 244 L190 276 Z" />
              <rect x="170" y="274" width="46" height="134" />
            </g>
            <g fill="#d9a24e">
              <rect x="222" y="238" width="14" height="30" rx="7" />
              <rect x="256" y="238" width="14" height="30" rx="7" />
              <rect x="286" y="288" width="12" height="26" rx="6" />
              <rect x="180" y="306" width="12" height="26" rx="6" />
            </g>
            <path
              d="M-6 250 C 30 228 58 250 74 226 C 92 248 104 262 116 300 C 126 336 118 384 96 408 L -6 408 Z"
              fill="#33351f"
            />
            <path
              d="M22 236 C 40 214 56 232 66 218 C 78 240 86 258 92 292 L 22 292 Z"
              fill="#434527"
            />
            <rect y="404" width="326" height="130" fill="#33280f" />
            <rect width="326" height="708" fill="url(#voces-fade)" />
          </svg>

          {/* status bar */}
          <div
            className="absolute inset-x-0 top-0 box-border flex items-center justify-between text-white"
            style={{ height: u(46), paddingInline: u(26) }}
          >
            <span className="font-semibold" style={{ fontSize: u(13) }}>
              9:41
            </span>
            <span className="flex items-center" style={{ gap: u(5) }}>
              <svg
                viewBox="0 0 16 11"
                fill="#fff"
                style={{ width: u(16), height: u(11) }}
                aria-hidden
              >
                <rect y="7" width="3" height="4" rx="1" />
                <rect x="4.3" y="5" width="3" height="6" rx="1" />
                <rect x="8.6" y="2.6" width="3" height="8.4" rx="1" />
                <rect x="12.9" width="3" height="11" rx="1" />
              </svg>
              <svg
                viewBox="0 0 15 11"
                fill="none"
                stroke="#fff"
                strokeWidth="1.6"
                strokeLinecap="round"
                style={{ width: u(15), height: u(11) }}
                aria-hidden
              >
                <path d="M1 3.6 C4.6 0.6 10.4 0.6 14 3.6" />
                <path d="M3.6 6.4 C6 4.4 9 4.4 11.4 6.4" />
                <path d="M6.2 9.1 C7 8.4 8 8.4 8.8 9.1" />
              </svg>
              <svg
                viewBox="0 0 24 11"
                fill="none"
                style={{ width: u(24), height: u(11) }}
                aria-hidden
              >
                <rect
                  x="0.6"
                  y="0.6"
                  width="20"
                  height="9.8"
                  rx="3"
                  stroke="#fff"
                  strokeOpacity="0.5"
                  strokeWidth="1.1"
                />
                <rect
                  x="2.2"
                  y="2.2"
                  width="16.5"
                  height="6.6"
                  rx="1.9"
                  fill="#fff"
                />
                <path
                  d="M22.2 4 v3"
                  stroke="#fff"
                  strokeOpacity="0.5"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
            </span>
          </div>

          {/* app bar */}
          <div
            className="absolute inset-x-0 box-border flex items-center justify-between"
            style={{ top: u(56), height: u(34), paddingInline: u(22) }}
          >
            <span className="flex items-center" style={{ gap: u(7) }}>
              <svg
                viewBox="0 0 20 20"
                fill="#fff"
                style={{ width: u(20), height: u(20) }}
                aria-hidden
              >
                <rect y="8" width="2.6" height="4" rx="1.3" />
                <rect x="3.9" y="5.6" width="2.6" height="8.8" rx="1.3" />
                <rect x="7.8" y="1" width="2.6" height="18" rx="1.3" />
                <rect x="11.7" y="5.6" width="2.6" height="8.8" rx="1.3" />
                <rect x="15.6" y="8.2" width="2.6" height="3.6" rx="1.3" />
              </svg>
              <span
                className="font-extrabold text-white"
                style={{ fontSize: u(15), letterSpacing: "0.05em" }}
              >
                VOCES
              </span>
            </span>
            <span className="flex items-center" style={{ gap: u(10) }}>
              {[
                <path
                  key="globe"
                  d="M12 2.8 C15.2 6.4 15.2 17.6 12 21.2 C8.8 17.6 8.8 6.4 12 2.8Z M3 12h18"
                />,
                <path
                  key="sliders"
                  d="M4 8h10 M18 8h2 M4 16h4 M12 16h8 M14 5v6 M8 13v6"
                />,
              ].map((icon, i) => (
                <span
                  key={i}
                  className="grid place-items-center rounded-full bg-white/15"
                  style={{ width: u(30), height: u(30) }}
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#fff"
                    strokeWidth="1.9"
                    strokeLinecap="round"
                    style={{ width: u(15), height: u(15) }}
                    aria-hidden
                  >
                    {i === 0 ? <circle cx="12" cy="12" r="9.2" /> : null}
                    {icon}
                  </svg>
                </span>
              ))}
            </span>
          </div>

          {/* conversation */}
          <div
            className="absolute bg-white"
            style={{
              left: u(20),
              top: u(252),
              maxWidth: u(244),
              borderRadius: u(22),
              padding: `${u(15)} ${u(20)}`,
              boxShadow: "0 12px 26px rgba(0,0,0,0.26)",
            }}
          >
            <span
              className="font-medium text-[#17181b]"
              style={{ fontSize: u(14.5), lineHeight: u(20) }}
            >
              Let&apos;s talk about your day
            </span>
          </div>

          <div
            className="absolute bg-[#ea742a]"
            style={{
              right: u(20),
              top: u(348),
              maxWidth: u(214),
              borderRadius: u(22),
              padding: `${u(15)} ${u(20)}`,
              boxShadow: "0 14px 28px rgba(0,0,0,0.28)",
            }}
          >
            <span
              className="font-medium text-white"
              style={{ fontSize: u(14.5), lineHeight: u(21) }}
            >
              I went to the Plaza and ate tacos
            </span>
          </div>

          {/* listening */}
          <div
            className="absolute inset-x-0 flex flex-col items-center"
            style={{ top: u(440), gap: u(10) }}
          >
            <svg
              viewBox="0 0 80 46"
              fill="#fff"
              style={{ width: u(80), height: u(46) }}
              aria-hidden
            >
              {WAVEFORM_BARS.map((height, i) => (
                <rect
                  key={i}
                  x={i * 5}
                  y={(46 - height) / 2}
                  width="2.6"
                  height={height}
                  rx="1.5"
                />
              ))}
            </svg>
            <span
              className="font-medium text-white/85"
              style={{ fontSize: u(14), letterSpacing: "0.02em" }}
            >
              Listening…
            </span>
          </div>

          {/* controls */}
          <div
            className="absolute inset-x-0 flex items-center justify-center"
            style={{ bottom: u(56), gap: u(40) }}
          >
            <span
              className="grid place-items-center rounded-full bg-white/10"
              style={{ width: u(46), height: u(46) }}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="#fff"
                strokeWidth="1.9"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ width: u(20), height: u(20) }}
                aria-hidden
              >
                <path d="M4 5h11" />
                <path d="M9 3v2" />
                <path d="M12.5 5c0 5-4 9-8.5 10" />
                <path d="M6.5 9c1.6 3 4.2 5.3 7 6.2" />
                <path d="M13 21l4.2-9.6L21.4 21" />
                <path d="M14.7 17.6h5" />
              </svg>
            </span>
            <span
              className="grid place-items-center rounded-full bg-accent"
              style={{
                width: u(70),
                height: u(70),
                boxShadow: "0 10px 24px rgba(237,106,40,0.3)",
              }}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="#fff"
                strokeWidth="2"
                strokeLinecap="round"
                style={{ width: u(28), height: u(28) }}
                aria-hidden
              >
                <rect x="9" y="2.4" width="6" height="12" rx="3" fill="#fff" />
                <path d="M5.5 11.2v1a6.5 6.5 0 0 0 13 0v-1" />
                <path d="M12 19.4V22" />
              </svg>
            </span>
            <span
              className="grid place-items-center rounded-full bg-white/10"
              style={{ width: u(46), height: u(46) }}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="#fff"
                strokeWidth="1.9"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ width: u(20), height: u(20) }}
                aria-hidden
              >
                <rect x="3" y="4.5" width="18" height="15" rx="3.5" />
                <path d="M7 10.5h4" />
                <path d="M7 14h8" />
                <path d="M14.5 10.5h2.5" />
              </svg>
            </span>
          </div>

          {/* dynamic island */}
          <div
            className="absolute left-1/2 bg-black"
            style={{
              top: u(11),
              width: u(92),
              height: u(26),
              marginLeft: u(-46),
              borderRadius: u(13),
            }}
          />
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ hero */

function Headline({ size, width }: { size: number; width?: number }) {
  return (
    <h1
      className="m-0 font-bold"
      style={{
        fontSize: u(size),
        lineHeight: 1.28,
        letterSpacing: "-0.03em",
        // the mockup sets the third line flush to both edges of the screen
        width: width ? u(width) : undefined,
        maxWidth: width ? "none" : undefined,
      }}
    >
      Practice the
      <br />
      language by
      <br />
      actually <span className="text-accent">speaking it.</span>
    </h1>
  );
}

function DesktopHero() {
  return (
    <section
      id="top"
      className="relative hidden overflow-hidden md:block"
      style={{
        // one mockup pixel; 0.078125vw === 1px at the 1280px artboard width
        ["--u" as string]: "clamp(0.6px, 0.078125vw, 1px)",
        minHeight: u(984),
      }}
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(70% 55% at 6% 2%, #ffffff 0%, rgba(255,255,255,0) 62%), radial-gradient(85% 75% at 102% 104%, #f0e1cf 0%, rgba(240,225,207,0) 62%)",
        }}
      />

      <svg
        viewBox="0 0 1280 984"
        preserveAspectRatio="xMidYMid slice"
        className="pointer-events-none absolute inset-0 h-full w-full"
        aria-hidden
      >
        <g strokeLinecap="round" fill="none">
          <path
            d="M1330 356 L906 640"
            stroke="var(--wave-2)"
            strokeOpacity="0.42"
            strokeWidth="104"
          />
          <path
            d="M762 300 L836 468"
            stroke="var(--wave-2)"
            strokeOpacity="0.46"
            strokeWidth="72"
          />
          <path d="M748 396 L1206 736" stroke="var(--wave-2)" strokeWidth="106" />
        </g>
        <ellipse cx="1196" cy="738" rx="92" ry="84" fill="var(--wave-2)" />
      </svg>

      <div
        className="relative mx-auto w-full"
        style={{ maxWidth: u(1280), height: u(984) }}
      >
        <div className="absolute" style={{ left: u(805), top: u(156) }}>
          <PhoneRender />
        </div>

        <header
          className="absolute inset-x-0 top-0"
          style={{ height: u(110) }}
        >
          <Link
            href="#top"
            aria-label="VOCES home"
            className="absolute flex items-center"
            style={{ left: u(59), top: u(32) }}
          >
            <Wordmark size={48} />
          </Link>

          <nav
            aria-label="Main"
            className="absolute flex -translate-y-1/2 items-center"
            style={{ left: u(498), top: u(55), gap: u(41) }}
          >
            {NAV_LINKS.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                aria-current={link.active ? "page" : undefined}
                className={
                  link.active
                    ? "font-semibold text-accent"
                    : "font-medium transition-colors hover:text-accent"
                }
                style={{ fontSize: u(17) }}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <Link
            href="/login"
            className="absolute flex items-center justify-center bg-accent-hover font-semibold text-white transition-colors hover:bg-accent-deep"
            style={{
              right: u(59),
              top: u(27),
              width: u(155),
              height: u(55),
              borderRadius: u(28),
              fontSize: u(15),
              boxShadow: "0 10px 22px rgba(196,80,22,0.3)",
            }}
          >
            Get Started
          </Link>
        </header>

        <div className="absolute" style={{ left: u(73), top: u(209) }}>
          <Headline size={60} />

          <p
            className="text-muted"
            style={{
              marginTop: u(25),
              fontSize: u(26),
              lineHeight: u(42),
            }}
          >
            Voice-first language immersion. Real conversations,
            <br />
            smarter review, lasting progress.
          </p>

          <Link
            href="/login"
            className="box-border flex items-center bg-accent-hover text-white transition-colors hover:bg-accent-deep"
            style={{
              marginTop: u(37),
              width: u(297),
              height: u(78),
              borderRadius: u(39),
              paddingLeft: u(52),
              paddingRight: u(40),
              boxShadow: "0 16px 34px rgba(196,80,22,0.32)",
            }}
          >
            <span
              className="grow font-semibold"
              style={{ fontSize: u(21) }}
            >
              Start Learning
            </span>
            <svg
              viewBox="0 0 13 22"
              fill="none"
              stroke="#fff"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ width: u(13), height: u(22) }}
              aria-hidden
            >
              <path d="M2 2l9 9-9 9" />
            </svg>
          </Link>

          <LanguageStrip />
        </div>
      </div>
    </section>
  );
}

function MobileHero() {
  return (
    <section
      className="relative flex min-h-[100dvh] flex-col overflow-hidden md:hidden"
      style={{
        // one mockup pixel; 0.2564vw === 1px at the 390px artboard width
        ["--u" as string]: "clamp(0.7px, 0.2564vw, 1.2px)",
        background:
          "linear-gradient(180deg, #fcfaf4 0%, #faf6ef 46%, #f8f4eb 100%)",
      }}
    >
      <svg
        viewBox="0 0 390 844"
        preserveAspectRatio="none"
        className="pointer-events-none absolute inset-0 h-full w-full"
        aria-hidden
      >
        <path
          d="M0 596 C 40 586 78 496 165 494 C 232 492 268 546 306 620 L 390 760 L 390 844 L 0 844 Z"
          fill="var(--wave-1)"
        />
        <path
          d="M0 648 C 32 632 68 584 118 588 C 152 591 176 616 198 606 C 226 592 244 492 300 490 C 348 488 378 520 390 552 L 390 844 L 0 844 Z"
          fill="var(--wave-2)"
        />
        <path
          d="M0 782 C 30 772 70 730 120 682 C 158 644 200 604 252 596 C 308 588 360 584 390 578 L 390 844 L 0 844 Z"
          fill="var(--wave-3)"
        />
        <path
          d="M0 840 C 58 800 128 778 210 786 C 288 794 348 818 390 840 L 390 844 L 0 844 Z"
          fill="var(--wave-2)"
          fillOpacity="0.3"
        />
      </svg>

      <div
        className="relative mx-auto flex w-full flex-1 flex-col"
        style={{
          maxWidth: u(390),
          paddingInline: u(21),
          paddingTop: u(93),
        }}
      >
        <Wordmark size={48} className="justify-center" />

        <div style={{ marginTop: u(66) }}>
          <Headline size={40} width={368} />
          <p
            className="text-muted"
            style={{ marginTop: u(20), fontSize: u(16), lineHeight: u(28) }}
          >
            Voice-first language immersion.
            <br />
            Real conversations, smarter learning.
          </p>
        </div>

        <Link
          href="/login"
          className="mt-auto flex items-center justify-center bg-accent-deep text-white"
          style={{
            marginBottom: u(105),
            height: u(71),
            borderRadius: u(36),
            gap: u(18),
            boxShadow: "0 14px 30px rgba(140,52,12,0.3)",
          }}
        >
          <span className="font-semibold" style={{ fontSize: u(18) }}>
            Get Started
          </span>
          <svg
            viewBox="0 0 20 16"
            fill="none"
            stroke="#fff"
            strokeWidth="2.1"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ width: u(20), height: u(16) }}
            aria-hidden
          >
            <path d="M1 8h17" />
            <path d="M11.6 1.6L18 8l-6.4 6.4" />
          </svg>
        </Link>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------- page */

export default function Home() {
  return (
    <main className="flex-1">
      <MobileHero />
      <DesktopHero />

      <div id="about" className="scroll-mt-12">
        <section
          id="how-it-works"
          className="mx-auto grid w-full max-w-6xl scroll-mt-12 gap-6 px-6 py-24 md:grid-cols-3"
        >
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
      </div>
    </main>
  );
}
