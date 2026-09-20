"use client";

import { useState } from "react";
import { PronounceButton } from "./pronounce-button";

export type Flashcard = {
  id: string;
  text: string;
  translation: string | null;
  example: string | null;
  confidence_score: number;
};

// Confidence is 0-1; three bands read at a glance where a number would not.
function strength(score: number) {
  if (score >= 0.6) return { label: "Strong", filled: 3 };
  if (score >= 0.25) return { label: "Getting there", filled: 2 };
  return { label: "New", filled: 1 };
}

export function Flashcards({
  cards,
  direction,
  languageCode,
}: {
  cards: Flashcard[];
  direction: "ltr" | "rtl";
  languageCode: string;
}) {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  const card = cards[index];
  const { label, filled } = strength(card.confidence_score);

  function go(step: number) {
    // The next card always opens on its front, or the answer is given away.
    setFlipped(false);
    setIndex((current) => (current + step + cards.length) % cards.length);
  }

  return (
    <div className="mt-5 flex flex-col gap-4">
      <div
        role="button"
        tabIndex={0}
        onClick={() => setFlipped((value) => !value)}
        onKeyDown={(event) => {
          if (event.key === "ArrowRight") go(1);
          if (event.key === "ArrowLeft") go(-1);
          // Only when the card itself has focus: the nested pronounce button
          // handles its own Enter/Space, and this would otherwise fire twice.
          if (
            event.target === event.currentTarget &&
            (event.key === "Enter" || event.key === " ")
          ) {
            event.preventDefault();
            setFlipped((value) => !value);
          }
        }}
        aria-label={flipped ? "Show the word" : "Show the meaning"}
        className="group h-48 w-full cursor-pointer perspective-[1200px] outline-none"
      >
        <div
          className={`relative size-full transition-transform duration-500 transform-3d motion-reduce:transition-none ${
            flipped ? "rotate-y-180" : ""
          }`}
        >
          <div className="absolute inset-0 flex flex-col rounded-2xl border border-border bg-background p-5 backface-hidden group-focus-visible:border-accent">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold tracking-wide text-muted uppercase">
                {label}
              </span>
              <span className="flex gap-1" aria-hidden>
                {[1, 2, 3].map((level) => (
                  <span
                    key={level}
                    className={`h-1.5 w-4 rounded-full ${
                      level <= filled ? "bg-accent" : "bg-border"
                    }`}
                  />
                ))}
              </span>
            </div>
            <div className="flex flex-1 items-center justify-center gap-2.5">
              <p
                dir={direction}
                className="text-center text-[26px] leading-tight font-bold tracking-[-0.01em]"
              >
                {card.text}
              </p>
              <PronounceButton text={card.text} languageCode={languageCode} size={20} />
            </div>
            <span className="text-center text-[12px] text-muted">
              Tap to reveal
            </span>
          </div>

          <div className="absolute inset-0 flex rotate-y-180 flex-col items-center justify-center gap-3 rounded-2xl border border-accent/40 bg-accent-soft p-5 text-center backface-hidden">
            <p className="text-[20px] leading-snug font-semibold">
              {card.translation ?? "No meaning saved yet"}
            </p>
            {card.example && (
              <p
                dir="auto"
                className="line-clamp-3 text-[13px] leading-relaxed text-muted italic"
              >
                &ldquo;{card.example}&rdquo;
              </p>
            )}
          </div>
        </div>
      </div>

      {cards.length > 1 && (
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => go(-1)}
            aria-label="Previous card"
            className="grid size-9 place-items-center rounded-full border border-border text-muted transition-colors hover:border-accent hover:text-accent"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <span className="text-[13px] text-muted tabular-nums">
            {index + 1} / {cards.length}
          </span>
          <button
            type="button"
            onClick={() => go(1)}
            aria-label="Next card"
            className="grid size-9 place-items-center rounded-full border border-border text-muted transition-colors hover:border-accent hover:text-accent"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
