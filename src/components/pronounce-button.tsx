"use client";

import { useState } from "react";
import { pronounce } from "@/lib/pronounce";

export function PronounceButton({
  text,
  languageCode,
  size = 16,
  className = "",
}: {
  text: string;
  languageCode: string;
  size?: number;
  className?: string;
}) {
  const [speaking, setSpeaking] = useState(false);

  return (
    <button
      type="button"
      onClick={async (event) => {
        // Sits inside cards and list rows that are themselves clickable
        // (the flashcard flip, the row link), so the click must stop here.
        event.stopPropagation();
        event.preventDefault();
        setSpeaking(true);
        const utterance = await pronounce(text, languageCode);
        if (!utterance) {
          setSpeaking(false);
          return;
        }
        utterance.addEventListener("end", () => setSpeaking(false));
        utterance.addEventListener("error", () => setSpeaking(false));
      }}
      aria-label={`Hear how to say "${text}"`}
      className={`inline-grid shrink-0 place-items-center rounded-full text-muted transition-colors hover:text-accent disabled:opacity-40 ${
        speaking ? "text-accent" : ""
      } ${className}`}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
        className={speaking ? "animate-pulse" : ""}
      >
        <path d="M4 9.5 h3.4 L12.4 5.4 v13.2 L7.4 14.5 H4 Z" fill="currentColor" stroke="none" />
        <path d="M16.4 9.4 a4 4 0 0 1 0 5.2" />
        <path d="M19.2 6.9 a7.6 7.6 0 0 1 0 10.2" />
      </svg>
    </button>
  );
}
