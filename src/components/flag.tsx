import type { ReactNode } from "react";

// Simplified flags on a 30×22 grid, drawn to read at badge size rather than
// to be exact. Keyed by the language code, so a language maps to the flag
// most learners associate with it.
const FLAGS: Record<string, ReactNode> = {
  en: (
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
  es: (
    <>
      <rect width="30" height="22" fill="#AA151B" />
      <rect y="5.5" width="30" height="11" fill="#F1BF00" />
      <rect x="5" y="8.5" width="4" height="5" rx="0.6" fill="#AD1519" />
    </>
  ),
  fr: (
    <>
      <rect width="10" height="22" fill="#002395" />
      <rect x="10" width="10" height="22" fill="#FFFFFF" />
      <rect x="20" width="10" height="22" fill="#ED2939" />
    </>
  ),
  de: (
    <>
      <rect width="30" height="7.34" fill="#111111" />
      <rect y="7.34" width="30" height="7.33" fill="#DD0000" />
      <rect y="14.67" width="30" height="7.33" fill="#FFCE00" />
    </>
  ),
  it: (
    <>
      <rect width="10" height="22" fill="#009246" />
      <rect x="10" width="10" height="22" fill="#FFFFFF" />
      <rect x="20" width="10" height="22" fill="#CE2B37" />
    </>
  ),
  pt: (
    <>
      <rect width="30" height="22" fill="#FF0000" />
      <rect width="12" height="22" fill="#006600" />
      <circle cx="12" cy="11" r="4" fill="#FFCC00" />
      <circle cx="12" cy="11" r="2.4" fill="#FF0000" />
    </>
  ),
  nl: (
    <>
      <rect width="30" height="7.34" fill="#AE1C28" />
      <rect y="7.34" width="30" height="7.33" fill="#FFFFFF" />
      <rect y="14.67" width="30" height="7.33" fill="#21468B" />
    </>
  ),
  sv: (
    <>
      <rect width="30" height="22" fill="#006AA7" />
      <rect x="9" width="4" height="22" fill="#FECC00" />
      <rect y="9" width="30" height="4" fill="#FECC00" />
    </>
  ),
  da: (
    <>
      <rect width="30" height="22" fill="#C60C30" />
      <rect x="9" width="3.5" height="22" fill="#FFFFFF" />
      <rect y="9.25" width="30" height="3.5" fill="#FFFFFF" />
    </>
  ),
  fi: (
    <>
      <rect width="30" height="22" fill="#FFFFFF" />
      <rect x="8.5" width="5" height="22" fill="#003580" />
      <rect y="8.5" width="30" height="5" fill="#003580" />
    </>
  ),
  no: (
    <>
      <rect width="30" height="22" fill="#BA0C2F" />
      <rect x="8" width="6" height="22" fill="#FFFFFF" />
      <rect y="8" width="30" height="6" fill="#FFFFFF" />
      <rect x="9.5" width="3" height="22" fill="#00205B" />
      <rect y="9.5" width="30" height="3" fill="#00205B" />
    </>
  ),
  tr: (
    <>
      <rect width="30" height="22" fill="#E30A17" />
      <circle cx="12" cy="11" r="5.2" fill="#FFFFFF" />
      <circle cx="13.3" cy="11" r="4.2" fill="#E30A17" />
      <path
        d="M19.2 11l1.9-.6 1.2-1.6v2l1.9.6-1.9.6v2l-1.2-1.6z"
        fill="#FFFFFF"
      />
    </>
  ),
  hi: (
    <>
      <rect width="30" height="7.34" fill="#FF9933" />
      <rect y="7.34" width="30" height="7.33" fill="#FFFFFF" />
      <rect y="14.67" width="30" height="7.33" fill="#138808" />
      <circle cx="15" cy="11" r="2.6" fill="none" stroke="#000080" strokeWidth="0.7" />
    </>
  ),
  vi: (
    <>
      <rect width="30" height="22" fill="#DA251D" />
      <path
        d="M15 5.2l1.5 4.6h4.8l-3.9 2.8 1.5 4.6-3.9-2.8-3.9 2.8 1.5-4.6-3.9-2.8h4.8z"
        fill="#FFFF00"
      />
    </>
  ),
  ar: (
    <>
      <rect width="30" height="22" fill="#1A7A47" />
      <path
        d="M18.8 11 a5.4 5.4 0 1 1 -4.2 -5.27 a4.3 4.3 0 1 0 4.2 5.27 Z"
        fill="#FFFFFF"
      />
    </>
  ),
  he: (
    <>
      <rect width="30" height="22" fill="#FFFFFF" />
      <rect y="2.5" width="30" height="2.6" fill="#0038B8" />
      <rect y="16.9" width="30" height="2.6" fill="#0038B8" />
      <path
        d="M15 7.2l3.3 5.7h-6.6z M15 14.8l-3.3-5.7h6.6z"
        fill="none"
        stroke="#0038B8"
        strokeWidth="0.9"
      />
    </>
  ),
  ja: (
    <>
      <rect width="30" height="22" fill="#FFFFFF" />
      <circle cx="15" cy="11" r="6.2" fill="#BC002D" />
    </>
  ),
  zh: (
    <>
      <rect width="30" height="22" fill="#DE2910" />
      <path
        d="M7 3.2l1.25 3.85h4.05l-3.28 2.38 1.26 3.85L7 10.9l-3.28 2.38 1.26-3.85L1.7 7.05h4.05z"
        fill="#FFDE00"
      />
      <circle cx="14.6" cy="3" r="1.15" fill="#FFDE00" />
      <circle cx="17.4" cy="5.6" r="1.15" fill="#FFDE00" />
      <circle cx="17.4" cy="9.3" r="1.15" fill="#FFDE00" />
      <circle cx="14.6" cy="11.9" r="1.15" fill="#FFDE00" />
    </>
  ),
};

/** A round flag badge for a language code. */
export function Flag({ code, size = 48 }: { code: string; size?: number }) {
  return (
    <span
      className="block shrink-0 overflow-hidden rounded-full shadow-[inset_0_0_0_1px_rgba(20,16,10,0.08)]"
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 30 22"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden
      >
        {FLAGS[code] ?? <rect width="30" height="22" fill="#E0DFDB" />}
      </svg>
    </span>
  );
}
