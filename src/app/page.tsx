import Link from "next/link";
import type { ReactNode } from "react";
import { Landmark } from "@/components/landmarks";
import { SCENARIOS, scenarioLabel } from "@/lib/scenarios";

// The landing page carries its own slightly deeper orange and cream than the
// app's tokens, as drawn in the design.
const ORANGE = "#ED6A28";
const CTA = "#D9601C";

// Each feature leads with a small scene of it happening. The scenes are
// components rather than JSX here because they use constants defined below.
const features = [
  {
    title: "Speak from the first minute",
    body: "Real voice conversations that adapt to your level. No lessons to sit through, no decks to grind.",
    Scene: SpeakScene,
  },
  {
    title: "Never break immersion",
    body: "Forget a word? Say it in your own language. You stay understood, the conversation keeps moving.",
    Scene: FallbackScene,
  },
  {
    title: "Corrections after, not during",
    body: "Grammar notes and the words you reached for arrive once you're done, and come back in later conversations until they stick.",
    Scene: RecallScene,
  },
];

// Only languages the agent can actually hold a conversation in; see
// TARGET_LANGUAGES in lib/languages.
const languages: { name: string; flag: ReactNode }[] = [
  {
    name: "English",
    flag: (
      <>
        <rect width="30" height="22" fill="#F2F2F4" />
        <g fill="#C8102E">
          {[0, 3.4, 6.8, 10.2, 13.6, 17, 20.3].map((y) => (
            <rect key={y} y={y} width="30" height="1.7" />
          ))}
        </g>
        <rect width="13" height="11.9" fill="#2A3560" />
      </>
    ),
  },
  {
    name: "Spanish",
    flag: (
      <>
        <rect width="30" height="22" fill="#AA151B" />
        <rect y="5.5" width="30" height="11" fill="#F1BF00" />
        <rect x="5" y="8.5" width="4" height="5" rx="0.6" fill="#AD1519" />
      </>
    ),
  },
  {
    name: "French",
    flag: (
      <>
        <rect width="10" height="22" fill="#002395" />
        <rect x="10" width="10" height="22" fill="#FFFFFF" />
        <rect x="20" width="10" height="22" fill="#ED2939" />
      </>
    ),
  },
  {
    name: "German",
    flag: (
      <>
        <rect width="30" height="7.34" fill="#111111" />
        <rect y="7.34" width="30" height="7.33" fill="#DD0000" />
        <rect y="14.67" width="30" height="7.33" fill="#FFCE00" />
      </>
    ),
  },
  {
    name: "Italian",
    flag: (
      <>
        <rect width="10" height="22" fill="#009246" />
        <rect x="10" width="10" height="22" fill="#FFFFFF" />
        <rect x="20" width="10" height="22" fill="#CE2B37" />
      </>
    ),
  },
  {
    name: "Portuguese",
    flag: (
      <>
        <rect width="30" height="22" fill="#FF0000" />
        <rect width="12" height="22" fill="#006600" />
        <circle cx="12" cy="11" r="4" fill="#FFCC00" />
        <circle cx="12" cy="11" r="2.4" fill="#FF0000" />
      </>
    ),
  },
];

function Logo({ size = 46 }: { size?: number }) {
  return (
    <span className="flex items-center gap-3">
      <svg
        width={size * (48 / 46)}
        height={size}
        viewBox="0 0 48 46"
        fill={ORANGE}
        aria-hidden
      >
        <rect x="0" y="16" width="6" height="14" rx="3" />
        <rect x="10.5" y="8.5" width="6" height="29" rx="3" />
        <rect x="21" y="0" width="6" height="46" rx="3" />
        <rect x="31.5" y="8.5" width="6" height="29" rx="3" />
        <rect x="42" y="16" width="6" height="13" rx="3" />
      </svg>
      <span
        className="font-extrabold tracking-[0.04em]"
        style={{ color: ORANGE, fontSize: size * 0.72 }}
      >
        VOCES
      </span>
    </span>
  );
}

function Arrow({ color = "#FFFFFF" }: { color?: string }) {
  return (
    <svg
      width="13"
      height="22"
      viewBox="0 0 13 22"
      fill="none"
      stroke={color}
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M2 2l9 9-9 9" />
    </svg>
  );
}

// Heights of the listening waveform, left to right.
const WAVE = [8, 20, 30, 13, 40, 24, 46, 27, 15, 36, 21, 44, 17, 31, 10, 6];

// A picture of the app mid-conversation. Nothing on it is interactive, so it
// is hidden from assistive tech as a whole.
function Phone() {
  return (
    <div
      aria-hidden
      className="relative h-[726px] w-[344px]"
      style={{
        transform:
          "perspective(1600px) rotateX(3deg) rotateY(-11deg) rotateZ(8.5deg)",
      }}
    >
      <div
        className="absolute top-2 left-4 h-[712px] w-[330px] rounded-[54px]"
        style={{
          background:
            "linear-gradient(90deg, #2B2B2E 0%, #121214 45%, #35353A 100%)",
          boxShadow: "44px 58px 90px rgba(62, 34, 12, 0.34)",
        }}
      />
      <div
        className="absolute inset-0 rounded-[54px] p-[9px]"
        style={{
          background:
            "linear-gradient(115deg, #3A3A3F 0%, #141417 22%, #0C0C0E 62%, #2E2E33 100%)",
        }}
      >
        <div className="relative h-[708px] w-[326px] overflow-hidden rounded-[46px] bg-[#131315]">
          <svg
            width="326"
            height="708"
            viewBox="0 0 326 708"
            fill="none"
            className="absolute inset-0"
          >
            <defs>
              <linearGradient id="phoneSky" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#25323F" />
                <stop offset="0.38" stopColor="#465360" />
                <stop offset="0.66" stopColor="#8A6A3D" />
                <stop offset="1" stopColor="#4A3720" />
              </linearGradient>
              <linearGradient id="phoneFade" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#0F0F11" stopOpacity="0" />
                <stop offset="0.45" stopColor="#121214" stopOpacity="0.22" />
                <stop offset="0.62" stopColor="#141416" stopOpacity="0.74" />
                <stop offset="0.74" stopColor="#151517" stopOpacity="1" />
                <stop offset="1" stopColor="#151517" stopOpacity="1" />
              </linearGradient>
            </defs>
            <rect width="326" height="708" fill="url(#phoneSky)" />
            <g fill="#7C5D2F">
              <path d="M238 176 L246 118 L254 176 Z" />
              <path d="M214 214 C214 196 226 184 246 176 C266 184 278 196 278 214 Z" />
              <rect x="214" y="212" width="64" height="196" />
              <path d="M292 250 L297 214 L302 250 Z" />
              <rect x="278" y="248" width="40" height="160" />
              <path d="M182 276 L186 244 L190 276 Z" />
              <rect x="170" y="274" width="46" height="134" />
            </g>
            <g fill="#D9A24E">
              <rect x="222" y="238" width="14" height="30" rx="7" />
              <rect x="256" y="238" width="14" height="30" rx="7" />
              <rect x="286" y="288" width="12" height="26" rx="6" />
              <rect x="180" y="306" width="12" height="26" rx="6" />
            </g>
            <path
              d="M-6 250 C 30 228 58 250 74 226 C 92 248 104 262 116 300 C 126 336 118 384 96 408 L -6 408 Z"
              fill="#33351F"
            />
            <path
              d="M22 236 C 40 214 56 232 66 218 C 78 240 86 258 92 292 L 22 292 Z"
              fill="#434527"
            />
            <rect y="404" width="326" height="130" fill="#33280F" />
            <rect width="326" height="708" fill="url(#phoneFade)" />
          </svg>

          <div className="absolute top-14 left-0 flex h-[34px] w-full items-center px-[22px]">
            <span className="flex items-center gap-[7px]">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="#FFFFFF">
                <rect x="0" y="8" width="2.6" height="4" rx="1.3" />
                <rect x="3.9" y="5.6" width="2.6" height="8.8" rx="1.3" />
                <rect x="7.8" y="1" width="2.6" height="18" rx="1.3" />
                <rect x="11.7" y="5.6" width="2.6" height="8.8" rx="1.3" />
                <rect x="15.6" y="8.2" width="2.6" height="3.6" rx="1.3" />
              </svg>
              <span className="text-[15px] font-extrabold tracking-[0.05em] text-white">
                VOCES
              </span>
            </span>
          </div>

          <div className="absolute top-[252px] left-5 max-w-[244px] rounded-[22px] bg-white px-5 py-[15px] shadow-[0_12px_26px_rgba(0,0,0,0.26)]">
            <span className="text-[14.5px] leading-5 font-medium text-[#17181B]">
              Let&apos;s talk about your day
            </span>
          </div>

          <div
            className="absolute top-[348px] right-5 max-w-[214px] rounded-[22px] px-5 py-[15px] shadow-[0_14px_28px_rgba(0,0,0,0.28)]"
            style={{ background: "#EA742A" }}
          >
            <span className="text-[14.5px] leading-[21px] font-medium text-white">
              I went to the Plaza and ate tacos
            </span>
          </div>

          <div className="absolute top-[440px] left-0 flex w-full flex-col items-center gap-2.5">
            <svg width="80" height="46" viewBox="0 0 80 46" fill="#FFFFFF">
              {WAVE.map((height, i) => (
                <rect
                  key={i}
                  x={i * 5}
                  y={(46 - height) / 2}
                  width="2.6"
                  height={height}
                  rx="1.3"
                />
              ))}
            </svg>
            <span className="text-sm font-medium tracking-[0.02em] text-white/85">
              Listening…
            </span>
          </div>

          <div className="absolute bottom-14 left-0 flex w-full items-center justify-center gap-10">
            <span className="grid size-[46px] place-items-center rounded-full bg-white/10">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 5h11" />
                <path d="M9 3v2" />
                <path d="M12.5 5c0 5-4 9-8.5 10" />
                <path d="M6.5 9c1.6 3 4.2 5.3 7 6.2" />
                <path d="M13 21l4.2-9.6L21.4 21" />
                <path d="M14.7 17.6h5" />
              </svg>
            </span>
            <span
              className="grid size-[70px] place-items-center rounded-full shadow-[0_10px_24px_rgba(237,106,40,0.3)]"
              style={{ background: ORANGE }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round">
                <rect x="9" y="2.4" width="6" height="12" rx="3" fill="#FFFFFF" stroke="none" />
                <path d="M5.5 11.2v1a6.5 6.5 0 0 0 13 0v-1" />
                <path d="M12 19.4V22" />
              </svg>
            </span>
            <span className="grid size-[46px] place-items-center rounded-full bg-white/10">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4.5" width="18" height="15" rx="3.5" />
                <path d="M7 10.5h4" />
                <path d="M7 14h8" />
                <path d="M14.5 10.5h2.5" />
              </svg>
            </span>
          </div>

          <div className="absolute top-[11px] left-1/2 h-[26px] w-[92px] -translate-x-1/2 rounded-[13px] bg-black" />
        </div>
      </div>
    </div>
  );
}

// The mic mid-conversation, on the CTA's orange.
function SpeakScene() {
  return (
    <div
      className="absolute inset-0 flex items-center justify-center gap-6"
      style={{ background: "linear-gradient(160deg, #EE8240 0%, #DF641E 100%)" }}
    >
      <svg width="64" height="46" viewBox="0 0 80 46" fill="#FFFFFF" fillOpacity="0.75">
        {WAVE.map((height, i) => (
          <rect key={i} x={i * 5} y={(46 - height) / 2} width="2.6" height={height} rx="1.3" />
        ))}
      </svg>
      <span className="relative grid size-[76px] place-items-center rounded-full bg-[#FAF6EF] shadow-[0_14px_30px_rgba(92,36,6,0.3)]">
        <span className="absolute -inset-4 rounded-full border border-white/35" />
        <span className="absolute -inset-9 rounded-full border border-white/20" />
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke={CTA} strokeWidth="2" strokeLinecap="round">
          <rect x="9" y="2.4" width="6" height="12" rx="3" fill={CTA} stroke="none" />
          <path d="M5.5 11.2v1a6.5 6.5 0 0 0 13 0v-1" />
          <path d="M12 19.4V22" />
        </svg>
      </span>
      <svg width="64" height="46" viewBox="0 0 80 46" fill="#FFFFFF" fillOpacity="0.75">
        {[...WAVE].reverse().map((height, i) => (
          <rect key={i} x={i * 5} y={(46 - height) / 2} width="2.6" height={height} rx="1.3" />
        ))}
      </svg>
    </div>
  );
}

// A learner falling back on English and the partner carrying on, set in the
// live conversation's dusk.
function FallbackScene() {
  return (
    <div
      className="absolute inset-0 px-5 pt-6"
      style={{ background: "linear-gradient(180deg, #25323F 0%, #465360 55%, #8A6A3D 100%)" }}
    >
      <svg
        viewBox="0 0 340 210"
        preserveAspectRatio="xMidYMax slice"
        className="absolute inset-0 size-full opacity-70"
      >
        <Landmark code="es" x={150} baseline={216} scale={0.42} />
      </svg>
      <p
        className="relative ml-auto w-fit max-w-[82%] rounded-[18px] rounded-br-md px-4 py-2.5 text-[13.5px] leading-[19px] font-medium text-white shadow-[0_12px_24px_rgba(0,0,0,0.25)]"
        style={{ background: "#EA742A" }}
      >
        Necesito el… <span className="italic opacity-85">how do you say receipt?</span>
      </p>
      <p className="relative mt-3 w-fit max-w-[82%] rounded-[18px] rounded-bl-md bg-white px-4 py-2.5 text-[13.5px] leading-[19px] font-medium text-[#17181B] shadow-[0_12px_24px_rgba(0,0,0,0.25)]">
        ¡El recibo! Claro, aquí lo tienes.
      </p>
    </div>
  );
}

// A word card on its way to sticking, in the waves' sand.
function RecallScene() {
  return (
    <div
      className="absolute inset-0 grid place-items-center"
      style={{ background: "linear-gradient(160deg, #FBE2CE 0%, #F6D7B7 100%)" }}
    >
      <span className="absolute h-[112px] w-[200px] rotate-[7deg] rounded-[18px] bg-[#F2C39A]" />
      <span className="absolute h-[112px] w-[200px] -rotate-[4deg] rounded-[18px] bg-[#FCEEDF]" />
      <span className="relative flex h-[112px] w-[200px] flex-col justify-between rounded-[18px] bg-white p-4 shadow-[0_16px_30px_rgba(120,60,20,0.18)]">
        <span className="flex items-baseline justify-between">
          <span className="text-[17px] font-semibold">el recibo</span>
          <span className="text-[12.5px] text-[#6F757B]">receipt</span>
        </span>
        <span className="flex items-center justify-between">
          <span className="flex gap-1">
            {[0, 1, 2].map((bar) => (
              <span key={bar} className="h-1.5 w-5 rounded-full" style={{ background: ORANGE }} />
            ))}
          </span>
          <span className="text-[11.5px] font-medium text-[#6F757B]">Strong</span>
        </span>
      </span>
    </div>
  );
}

// One opening line per language, each in a different scenario, so the row
// shows the range rather than six restaurants.
const postcards = [
  { code: "es", language: "Spanish", scenario: "restaurant", line: "¡Buenas! ¿Qué os pongo?", gloss: "Hi there! What can I get you?" },
  { code: "fr", language: "French", scenario: "travel", line: "Bienvenue ! C'est votre première fois à Paris ?", gloss: "Welcome! Is this your first time in Paris?" },
  { code: "it", language: "Italian", scenario: "friends", line: "Quanto tempo! Raccontami tutto.", gloss: "It's been ages! Tell me everything." },
  { code: "de", language: "German", scenario: "work", line: "Hast du kurz Zeit vor dem Meeting?", gloss: "Got a minute before the meeting?" },
  { code: "pt", language: "Portuguese", scenario: "shopping", line: "Posso ajudar? Procura algum tamanho?", gloss: "Can I help? Looking for a particular size?" },
  { code: "en", language: "English", scenario: "interview", line: "So, tell me about your last role.", gloss: "Straight into the interview." },
];

// A dusk card in the live conversation's palette, with that language's
// landmark on the skyline. Decorative apart from its text.
function Postcard({ card, index }: { card: (typeof postcards)[number]; index: number }) {
  const sky = `postcardSky-${card.code}`;
  const fade = `postcardFade-${card.code}`;
  return (
    <li
      className={`relative h-[430px] w-[78%] shrink-0 snap-center overflow-hidden rounded-[30px] bg-[#151517] shadow-[0_24px_48px_rgba(62,34,12,0.22)] transition-transform duration-500 sm:w-[300px] lg:w-auto lg:hover:rotate-0 ${
        // Staggered by column, so the middle column drops as one.
        ["lg:-rotate-[1.6deg]", "lg:translate-y-12 lg:rotate-[1.4deg]", "lg:-rotate-[0.8deg]"][index % 3]
      }`}
    >
      <svg
        viewBox="0 0 340 430"
        preserveAspectRatio="xMidYMax slice"
        className="absolute inset-0 size-full"
        aria-hidden
      >
        <defs>
          <linearGradient id={sky} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#25323F" />
            <stop offset="0.4" stopColor="#465360" />
            <stop offset="0.7" stopColor="#8A6A3D" />
            <stop offset="1" stopColor="#4A3720" />
          </linearGradient>
          <linearGradient id={fade} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0.5" stopColor="#151517" stopOpacity="0" />
            <stop offset="0.78" stopColor="#151517" stopOpacity="0.82" />
            <stop offset="1" stopColor="#151517" stopOpacity="1" />
          </linearGradient>
        </defs>
        <rect width="340" height="430" fill={`url(#${sky})`} />
        <circle cx="262" cy="232" r="54" fill="#E8A45A" fillOpacity="0.22" />
        <Landmark code={card.code} x={34} baseline={360} scale={0.8} />
        <rect y="358" width="340" height="72" fill="#33280F" />
        <rect width="340" height="430" fill={`url(#${fade})`} />
      </svg>

      <p
        lang={card.code}
        className="absolute top-6 left-5 max-w-[78%] rounded-[20px] rounded-tl-md bg-white px-4 py-3 text-[14.5px] leading-5 font-medium text-[#17181B] shadow-[0_12px_26px_rgba(0,0,0,0.26)]"
      >
        {card.line}
      </p>

      <div className="absolute inset-x-0 bottom-0 p-6">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[19px] font-bold tracking-[-0.01em] text-white">
            {card.language}
          </span>
          <span className="rounded-full bg-[#EA742A] px-3 py-1 text-[12px] font-semibold text-white">
            {scenarioLabel(card.scenario)}
          </span>
        </div>
        <p className="mt-1.5 text-[13.5px] text-white/60">{card.gloss}</p>
      </div>
    </li>
  );
}

// The post-session review, restyled as paper slips on the closing band.
function Slip({
  label,
  className = "",
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={`rounded-[22px] border border-[#EDE3D6] bg-[#FCFBF7] p-5 shadow-[0_22px_44px_rgba(92,36,6,0.28)] sm:p-6 ${className}`}
    >
      <span className="text-[11px] font-semibold tracking-[0.08em] text-[#6F757B] uppercase">
        {label}
      </span>
      {children}
    </div>
  );
}

export default function Home() {
  return (
    <main
      id="top"
      className="relative flex-1 overflow-hidden text-[#131518]"
      style={{
        background:
          "radial-gradient(70% 55% at 6% 2%, #FFFFFF 0%, rgba(255,255,255,0) 62%), radial-gradient(85% 75% at 102% 104%, #F0E1CF 0%, rgba(240,225,207,0) 62%), #FAF6EF",
      }}
    >
      <header className="relative z-10 mx-auto flex w-full max-w-[1280px] items-center justify-between px-6 py-6 lg:px-[59px] lg:py-8">
        <Link href="/" aria-label="VOCES home">
          <span className="hidden sm:block">
            <Logo />
          </span>
          <span className="sm:hidden">
            <Logo size={34} />
          </span>
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-10 md:flex">
          <a href="#top" aria-current="page" className="text-[17px] font-semibold" style={{ color: ORANGE }}>
            Home
          </a>
          <a href="#features" className="text-[17px] font-medium text-[#22262B] transition-colors hover:text-[#C74D17]">
            Features
          </a>
          <a href="#languages" className="text-[17px] font-medium text-[#22262B] transition-colors hover:text-[#C74D17]">
            Languages
          </a>
          <a
            href="/doc.pdf"
            target="_blank"
            rel="noopener"
            className="text-[17px] font-medium text-[#22262B] transition-colors hover:text-[#C74D17]"
          >
            Guide
          </a>
          <Link href="/login" className="text-[17px] font-medium text-[#22262B] transition-colors hover:text-[#C74D17]">
            Sign in
          </Link>
        </nav>

        <Link
          href="/login"
          className="grid h-11 place-items-center rounded-full px-5 text-[15px] font-semibold text-white shadow-[0_10px_22px_rgba(196,80,22,0.3)] transition-colors hover:bg-[#C74D17] sm:h-[55px] sm:px-8"
          style={{ background: CTA }}
        >
          Get Started
        </Link>
      </header>

      <section className="relative">
        {/* Brush strokes behind the phone, as drawn for the desktop board. */}
        <svg
          viewBox="0 0 1280 984"
          fill="none"
          aria-hidden
          className="pointer-events-none absolute top-[-110px] left-1/2 hidden h-[984px] w-[1280px] -translate-x-1/2 lg:block"
        >
          <g strokeLinecap="round">
            <path d="M1330 356 L906 640" stroke="#EA7429" strokeOpacity="0.42" strokeWidth="104" />
            <path d="M762 300 L836 468" stroke="#EA7429" strokeOpacity="0.46" strokeWidth="72" />
            <path d="M748 396 L1206 736" stroke="#EA7429" strokeWidth="106" />
          </g>
          <ellipse cx="1196" cy="738" rx="92" ry="84" fill="#EA7429" />
        </svg>

        <div className="relative mx-auto grid w-full max-w-[1280px] items-start px-6 pt-10 pb-64 lg:grid-cols-[1fr_auto] lg:px-[73px] lg:pt-[99px] lg:pb-28">
          <div>
            <h1 className="text-[40px] leading-[1.28] font-bold tracking-[-0.03em] sm:text-[52px] lg:text-[60px]">
              Practice the
              <br />
              language by
              <br />
              actually{" "}
              <span className="whitespace-nowrap" style={{ color: ORANGE }}>
                speaking it.
              </span>
            </h1>

            <p className="mt-5 max-w-[640px] text-base leading-7 text-[#6F757B] sm:text-xl sm:leading-9 lg:mt-[25px] lg:text-[26px] lg:leading-[42px]">
              Voice-first language immersion. Real conversations, smarter
              review, lasting progress.
            </p>

            <Link
              href="/login"
              className="mt-9 flex h-[71px] w-full items-center justify-center gap-5 rounded-full px-10 text-white shadow-[0_16px_34px_rgba(196,80,22,0.32)] transition-colors hover:bg-[#C74D17] sm:h-[78px] sm:w-[297px] sm:justify-between sm:pl-[52px]"
              style={{ background: CTA }}
            >
              <span className="text-lg font-semibold tracking-[0.005em] sm:text-[21px]">
                Start Learning
              </span>
              <Arrow />
            </Link>

            <ul
              id="languages"
              aria-label="Languages you can practise"
              className="mt-14 flex scroll-mt-24 flex-wrap gap-x-10 gap-y-6 lg:mt-[78px] lg:gap-x-[52px]"
            >
              {languages.map((language) => (
                <li key={language.name} className="flex w-[52px] flex-col items-center gap-2.5">
                  <span className="block size-[41px] overflow-hidden rounded-full bg-white shadow-[0_5px_14px_rgba(86,52,20,0.16)]">
                    <svg width="41" height="41" viewBox="0 0 30 22" preserveAspectRatio="xMidYMid slice" aria-hidden>
                      {language.flag}
                    </svg>
                  </span>
                  <span className="text-[15px] font-medium whitespace-nowrap text-[#22262B]">
                    {language.name}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="hidden pt-8 pr-6 lg:block">
            <Phone />
          </div>
        </div>

        {/* The mobile board's waves stand in for the phone on small screens. */}
        <svg
          viewBox="0 0 390 350"
          preserveAspectRatio="none"
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[260px] w-full lg:hidden"
        >
          <path d="M0 102 C 40 92 78 2 165 0 C 232 -2 268 52 306 126 L 390 266 L 390 350 L 0 350 Z" fill="#F6D7B7" />
          <path d="M0 154 C 32 138 68 90 118 94 C 152 97 176 122 198 112 C 226 98 244 -2 300 -4 C 348 -6 378 26 390 58 L 390 350 L 0 350 Z" fill="#E97C2A" />
          <path d="M0 288 C 30 278 70 236 120 188 C 158 150 200 110 252 102 C 308 94 360 90 390 84 L 390 350 L 0 350 Z" fill="#DF641E" />
          {/* Hands the waves back to the cream page instead of a hard line. */}
          <path d="M0 350 L0 322 C 90 300 170 334 260 326 C 320 320 360 304 390 300 L 390 350 Z" fill="#FAF6EF" />
        </svg>
      </section>

      <section
        id="features"
        className="relative mx-auto grid w-full max-w-[1280px] scroll-mt-12 gap-6 px-6 py-24 md:grid-cols-3 lg:gap-8 lg:px-[73px]"
      >
        {features.map((feature, index) => (
          <div
            key={feature.title}
            className="overflow-hidden rounded-[30px] border border-[#ECE1D5] bg-white shadow-[0_24px_48px_rgba(62,34,12,0.12)] transition-transform duration-300 hover:-translate-y-1"
          >
            <div aria-hidden className="relative h-[210px] overflow-hidden">
              <feature.Scene />
            </div>
            <div className="p-7">
              <span className="text-[13px] font-semibold tracking-[0.08em]" style={{ color: ORANGE }}>
                0{index + 1}
              </span>
              <h2 className="mt-2 text-[19px] font-bold tracking-[-0.015em]">
                {feature.title}
              </h2>
              <p className="mt-2.5 text-[14.5px] leading-relaxed text-[#6F757B]">
                {feature.body}
              </p>
            </div>
          </div>
        ))}
      </section>

      <section
        id="scenes"
        aria-labelledby="scenes-heading"
        className="relative mx-auto w-full max-w-[1280px] scroll-mt-12 px-6 pt-8 pb-24 lg:px-[73px] lg:pb-40"
      >
        <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr] lg:items-end lg:gap-16">
          <div>
            <h2
              id="scenes-heading"
              className="text-[34px] leading-[1.2] font-bold tracking-[-0.03em] sm:text-[44px]"
            >
              Six cities at dusk.
              <br />
              <span style={{ color: ORANGE }}>Eight ways in.</span>
            </h2>
            <p className="mt-5 max-w-[520px] text-base leading-7 text-[#6F757B] sm:text-lg sm:leading-8">
              Each conversation is set against a landmark from its
              language&apos;s country. Pick an opening, then follow the talk
              wherever it goes. The scenario only gets you started.
            </p>
          </div>

          <ul aria-label="Scenarios" className="flex flex-wrap gap-2.5 lg:justify-end">
            {SCENARIOS.map((scenario) => (
              <li
                key={scenario.id}
                className="rounded-full border border-[#ECE1D5] bg-white/70 px-4 py-2 text-[14px] font-medium text-[#22262B]"
              >
                {scenario.label}
              </li>
            ))}
          </ul>
        </div>

        <ul
          aria-label="Example openings"
          className="-mx-6 mt-12 flex snap-x snap-mandatory gap-4 overflow-x-auto px-6 pb-6 [scrollbar-width:none] lg:mx-0 lg:mt-16 lg:grid lg:grid-cols-3 lg:gap-x-8 lg:gap-y-10 lg:overflow-visible lg:px-0 lg:pb-12"
        >
          {postcards.map((card, index) => (
            <Postcard key={card.code} card={card} index={index} />
          ))}
        </ul>
      </section>

      <section aria-labelledby="review-heading" className="relative">
        {/* The mobile hero's wave stack, reused as the band's top edge. */}
        <svg
          viewBox="0 0 390 120"
          preserveAspectRatio="none"
          aria-hidden
          className="pointer-events-none block h-[90px] w-full lg:h-[150px]"
        >
          <path d="M0 70 C 60 40 120 10 200 22 C 280 34 330 70 390 48 L 390 120 L 0 120 Z" fill="#F6D7B7" />
          <path d="M0 92 C 50 70 110 44 180 52 C 250 60 310 96 390 74 L 390 120 L 0 120 Z" fill="#E97C2A" />
          <path d="M0 110 C 70 96 140 78 220 86 C 290 93 340 104 390 98 L 390 120 L 0 120 Z" fill="#DF641E" />
        </svg>

        <div className="-mt-px bg-[#DF641E]">
          <div className="mx-auto grid w-full max-w-[1280px] gap-14 px-6 pt-10 pb-24 lg:grid-cols-[1fr_1fr] lg:items-center lg:gap-10 lg:px-[73px] lg:pt-12 lg:pb-32">
            <div>
              <h2
                id="review-heading"
                className="text-[34px] leading-[1.2] font-bold tracking-[-0.03em] text-white sm:text-[44px] lg:text-[52px]"
              >
                Talk now.
                <br />
                The notes come after.
              </h2>
              <p className="mt-5 max-w-[500px] text-base leading-7 text-white/85 sm:text-lg sm:leading-8">
                Hang up and VOCES reads the conversation back: what to fix,
                the words you had to reach for, and which ones will turn up
                in your next conversation.
              </p>
              <Link
                href="/login"
                className="mt-9 flex h-[71px] w-full items-center justify-center gap-5 rounded-full bg-[#FAF6EF] px-10 shadow-[0_16px_34px_rgba(92,36,6,0.28)] transition-colors hover:bg-white sm:h-[78px] sm:w-[297px] sm:justify-between sm:pl-[52px]"
                style={{ color: CTA }}
              >
                <span className="text-lg font-semibold tracking-[0.005em] sm:text-[21px]">
                  Start Learning
                </span>
                <Arrow color={CTA} />
              </Link>
            </div>

            {/* A sample review. It follows on from the hero phone, where the
                learner fell back on English mid-sentence. */}
            <div aria-hidden className="relative mx-auto flex w-full max-w-[460px] flex-col gap-4 lg:gap-0">
              <Slip label="You reached for" className="lg:-rotate-[2deg]">
                <div className="mt-3 flex items-baseline justify-between gap-4">
                  <span className="text-[18px] font-semibold">fui a la plaza</span>
                  <span className="text-[14px] text-[#6F757B]">I went to the plaza</span>
                </div>
                <p className="mt-1.5 text-[13px] text-[#6F757B] italic">
                  &ldquo;I went to the Plaza and ate tacos&rdquo;
                </p>
              </Slip>

              <Slip label="Gender agreement" className="lg:-mt-3 lg:ml-10 lg:rotate-[1.5deg]">
                <span className="ml-2 rounded-full bg-[#FBE6D3] px-2.5 py-0.5 text-[11px] font-semibold text-[#A84A0C]">
                  Came up before
                </span>
                <p className="mt-3 text-[15px] text-[#6F757B] line-through decoration-[#6F757B]/60">
                  La comida estaba muy rico.
                </p>
                <p className="mt-1 text-[16px] font-medium">
                  La comida estaba muy <span style={{ color: ORANGE }}>rica</span>.
                </p>
                <p className="mt-3 text-[13.5px] leading-relaxed text-[#6F757B]">
                  <i>Comida</i> is feminine, so the adjective follows it.
                </p>
              </Slip>

              <Slip label="Back next time" className="lg:-mt-3 lg:mr-12 lg:-rotate-[1deg]">
                <div className="mt-3 flex items-center justify-between gap-4">
                  <span className="flex flex-col">
                    <span className="text-[18px] font-semibold">abarrotado</span>
                    <span className="text-[14px] text-[#6F757B]">crowded</span>
                  </span>
                  <span className="flex flex-col items-end gap-1.5">
                    <span className="flex gap-1">
                      {[0, 1, 2].map((bar) => (
                        <span
                          key={bar}
                          className="h-1.5 w-6 rounded-full"
                          style={{ background: bar < 2 ? ORANGE : "#EDE3D6" }}
                        />
                      ))}
                    </span>
                    <span className="text-[12px] font-medium text-[#6F757B]">Getting there</span>
                  </span>
                </div>
              </Slip>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
