import type { CSSProperties } from "react";
import { Landmark } from "@/components/landmarks";

// The landing hero's sunset: a striped sun with rings of sound, the six
// cities as layered orange skylines, greetings floating above them, and the
// brand's waves across the bottom. Drawn twice — a wide board for desktop and
// the guide's portrait cover for phones — from the same pieces.

type Mark = [code: string, x: number, baseline: number, scale: number];
type Greeting = [
  text: string,
  lang: string,
  x: number,
  y: number,
  filled: boolean,
];

const PALE = { color: "#F6C9A4", lit: "#FFF0E2" };
const MID = { color: "#F2B283", lit: "#FFE7D2" };
const NEAR = { color: "#D9601C", lit: "#FFD2A8" };

// Horizontal bands cut from the lower sun, as fractions of its radius.
const STRIPES = [
  [-0.02, 0.035],
  [0.13, 0.05],
  [0.28, 0.065],
  [0.43, 0.08],
];

function Skyline({ tone, marks }: { tone: typeof PALE; marks: Mark[] }) {
  return (
    <g
      className="silhouette"
      style={
        {
          "--silhouette": tone.color,
          "--silhouette-lit": tone.lit,
        } as CSSProperties
      }
    >
      {marks.map(([code, x, baseline, scale]) => (
        <Landmark
          key={`${code}-${x}`}
          code={code}
          x={x}
          baseline={baseline}
          scale={scale}
        />
      ))}
    </g>
  );
}

function Sun({
  id,
  cx,
  cy,
  r,
}: {
  id: string;
  cx: number;
  cy: number;
  r: number;
}) {
  return (
    <>
      <defs>
        <linearGradient id={`${id}-fill`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFE1C4" />
          <stop offset="0.5" stopColor="#F4A265" />
          <stop offset="1" stopColor="#E8692A" />
        </linearGradient>
        <mask id={`${id}-cut`}>
          <rect
            x={cx - r}
            y={cy - r}
            width={2 * r}
            height={2 * r}
            fill="#FFFFFF"
          />
          {STRIPES.map(([offset, height]) => (
            <rect
              key={offset}
              x={cx - r}
              y={cy + r * offset}
              width={2 * r}
              height={r * height}
              fill="#000000"
            />
          ))}
        </mask>
      </defs>
      {/* Solid and dotted rings, like sound travelling out. */}
      {[
        [r + 36, 0.3],
        [r + 68, 0.34],
        [r + 106, 0.12],
      ].map(([radius, opacity], i) => (
        <circle
          key={radius}
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke="#ED6A28"
          strokeOpacity={opacity}
          {...(i % 2
            ? {
                strokeWidth: 3,
                strokeDasharray: "1 9",
                strokeLinecap: "round" as const,
              }
            : { strokeWidth: 1.4 })}
        />
      ))}
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill={`url(#${id}-fill)`}
        mask={`url(#${id}-cut)`}
      />
    </>
  );
}

function Bubble({
  greeting: [text, lang, x, y, filled],
  size,
}: {
  greeting: Greeting;
  size: number;
}) {
  const width = text.length * 7.6 + 26;
  const background = filled ? "#EA742A" : "#FFFFFF";
  // Filled bubbles are the partner's replies, so their tails sit on the right.
  const tail = filled
    ? `M${width - 14} 28 l2 10 l-12 -10 z`
    : "M14 28 l-2 10 l12 -10 z";
  return (
    <g transform={`translate(${x} ${y}) scale(${size})`}>
      <rect width={width} height="30" rx="15" fill={background} />
      <path d={tail} fill={background} />
      <text
        x={width / 2}
        y="19.5"
        textAnchor="middle"
        fontSize="12.5"
        fontWeight="600"
        fill={filled ? "#FFFFFF" : "#D9601C"}
        lang={lang}
      >
        {text}
      </text>
    </g>
  );
}

function Waves({ paths }: { paths: string[] }) {
  const fills = ["#F6D7B7", "#E97C2A", "#DF641E"];
  return (
    <>
      {paths.map((d, i) => (
        <path key={i} d={d} fill={fills[i]} />
      ))}
    </>
  );
}

const WIDE = {
  viewBox: "0 0 1108 600",
  sun: { cx: 800, cy: 330, r: 178 },
  pale: [
    ["de", -40, 470, 0.42],
    ["pt", 150, 462, 0.38],
    ["it", 300, 468, 0.36],
    ["en", 1000, 470, 0.4],
  ] as Mark[],
  mid: [
    ["fr", 560, 452, 0.48],
    ["en", 710, 458, 0.46],
    ["it", 846, 450, 0.48],
  ] as Mark[],
  near: [
    ["en", 30, 500, 0.4],
    ["es", 582, 494, 0.58],
    ["de", 766, 500, 0.52],
    ["pt", 874, 492, 0.56],
    ["fr", 1000, 498, 0.46],
  ] as Mark[],
  greetings: [
    ["Hello", "en", 850, 32, true],
    ["Olá", "pt", 784, 106, false],
    ["Hola", "es", 914, 114, true],
    ["Bonjour", "fr", 874, 204, false],
    ["Ciao", "it", 734, 234, true],
    ["Hallo", "de", 1000, 262, false],
  ] as Greeting[],
  waves: [
    "M0 452 C 180 420 330 486 540 466 C 760 446 900 408 1108 428 L1108 600 L0 600 Z",
    "M0 500 C 200 474 360 520 580 506 C 800 492 940 470 1108 484 L1108 600 L0 600 Z",
    "M0 540 C 220 524 420 552 640 544 C 860 536 980 526 1108 532 L1108 600 L0 600 Z",
  ],
  edge: "M-10 610 L-10 584 C 200 566 420 594 640 586 C 860 578 1000 570 1118 574 L1118 610 Z",
  bubbleSize: 1,
};

// The guide's cover, cropped to the art below its headline.
const TALL = {
  viewBox: "150 540 644 600",
  sun: { cx: 590, cy: 820, r: 178 },
  pale: [
    ["de", -60, 992, 0.42],
    ["pt", 110, 984, 0.38],
    ["it", 230, 990, 0.36],
  ] as Mark[],
  mid: [
    ["fr", 350, 966, 0.48],
    ["en", 500, 972, 0.46],
    ["it", 636, 964, 0.48],
  ] as Mark[],
  near: [
    ["en", 20, 1024, 0.4],
    ["es", 372, 1010, 0.58],
    ["de", 556, 1016, 0.52],
    ["pt", 664, 1008, 0.56],
  ] as Mark[],
  greetings: [
    ["Hello", "en", 600, 622, true],
    ["Olá", "pt", 462, 650, false],
    ["Hola", "es", 700, 660, true],
    ["Bonjour", "fr", 640, 745, false],
    ["Ciao", "it", 440, 760, true],
    ["Hallo", "de", 210, 800, false],
  ] as Greeting[],
  waves: [
    "M0 960 C 110 930 200 1010 330 990 C 470 968 560 900 794 930 L794 1140 L0 1140 Z",
    "M0 1010 C 140 980 250 1050 390 1030 C 520 1012 640 970 794 990 L794 1140 L0 1140 Z",
    "M0 1062 C 160 1040 300 1080 450 1068 C 590 1058 690 1040 794 1048 L794 1140 L0 1140 Z",
  ],
  edge: "M-10 1150 L-10 1118 C 200 1096 420 1128 600 1116 C 700 1110 760 1104 804 1106 L804 1150 Z",
  // Drawn larger so the greetings stay readable at phone width.
  bubbleSize: 1.45,
};

export function HeroArt({
  variant,
  className,
}: {
  variant: "wide" | "tall";
  className?: string;
}) {
  const board = variant === "wide" ? WIDE : TALL;
  return (
    <svg viewBox={board.viewBox} aria-hidden className={className}>
      {/* The bottom edge is cut away rather than painted cream, so the page's
          own gradient shows through with no seam, and nothing (the sun's
          rings included) can show below the waves. */}
      <defs>
        <mask id={`hero-edge-${variant}`}>
          <rect x="-200" y="0" width="1400" height="1400" fill="#FFFFFF" />
          <path d={board.edge} fill="#000000" />
        </mask>
      </defs>
      <g mask={`url(#hero-edge-${variant})`}>
        <Sun id={`hero-sun-${variant}`} {...board.sun} />
        <Skyline tone={PALE} marks={board.pale} />
        <Skyline tone={MID} marks={board.mid} />
        <Skyline tone={NEAR} marks={board.near} />
        {board.greetings.map((greeting) => (
          <Bubble
            key={greeting[0]}
            greeting={greeting}
            size={board.bubbleSize}
          />
        ))}
        <Waves paths={board.waves} />
      </g>
    </svg>
  );
}
