import type { CSSProperties } from "react";

// Seeded rather than Math.random(), so the server and the browser draw the
// same sky and hydration has nothing to disagree about.
function seeded(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * A field of stars over a box, denser towards the top where the sky is
 * darkest. Each twinkles on its own period, so the sky never pulses as one.
 */
export function Stars({
  width,
  height,
  count,
  seed = 1,
}: {
  width: number;
  height: number;
  count: number;
  seed?: number;
}) {
  const next = seeded(seed);
  const stars = Array.from({ length: count }, () => {
    const x = next() * width;
    // Squaring pulls stars up the sky, away from the horizon glow.
    const y = next() ** 1.6 * height;
    const bright = next() > 0.86;
    return {
      x,
      y,
      r: bright ? 1.3 + next() * 0.7 : 0.5 + next() * 0.6,
      glow: bright ? 1 : 0.45 + next() * 0.4,
      period: 3 + next() * 5,
      delay: -next() * 8,
      warm: next() > 0.8,
    };
  });
  return (
    <g>
      {stars.map((star, i) => (
        <circle
          key={i}
          className="star"
          cx={star.x.toFixed(1)}
          cy={star.y.toFixed(1)}
          r={star.r.toFixed(2)}
          fill={star.warm ? "#FFE2C2" : "#F4F1FF"}
          style={
            {
              "--star-glow": star.glow,
              "--star-period": `${star.period.toFixed(1)}s`,
              "--star-delay": `${star.delay.toFixed(1)}s`,
            } as CSSProperties
          }
        />
      ))}
    </g>
  );
}

/**
 * Comets that streak down and to the left now and then. Each starts at its
 * (x, y) and rests invisible for most of its period, so the sky stays calm.
 */
export function Comets({
  id,
  comets,
}: {
  id: string;
  comets: { x: number; y: number; delay: number; period: number; length?: number }[];
}) {
  return (
    <g>
      <defs>
        {/* The tail fades from the head, bottom-left, to nothing, top-right. */}
        <linearGradient id={`${id}-tail`} x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.95" />
          <stop offset="0.35" stopColor="#FFD9B8" stopOpacity="0.45" />
          <stop offset="1" stopColor="#FFD9B8" stopOpacity="0" />
        </linearGradient>
      </defs>
      {comets.map(({ x, y, delay, period, length = 120 }, i) => (
        <g
          key={i}
          className="comet"
          style={{ "--comet-delay": `${delay}s`, "--comet-period": `${period}s` } as CSSProperties}
        >
          <line
            x1={x}
            y1={y}
            x2={x + length}
            y2={y - length * 0.58}
            stroke={`url(#${id}-tail)`}
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <circle cx={x} cy={y} r="1.9" fill="#FFFFFF" />
        </g>
      ))}
    </g>
  );
}
