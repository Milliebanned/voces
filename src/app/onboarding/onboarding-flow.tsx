"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { Flag } from "@/components/flag";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  NATIVE_LANGUAGES,
  SKILL_LEVELS,
  TARGET_LANGUAGES,
  endonym,
} from "@/lib/languages";
import { completeOnboarding } from "./actions";

const ORANGE = "#ED6A28";
const STEPS = 3;

type Initial = {
  displayName: string;
  nativeLanguage: string;
  targetLanguage: string;
  skillLevel: string;
  goals: string;
};

function Check() {
  return (
    <span
      className="grid size-6 shrink-0 place-items-center rounded-full"
      style={{ background: ORANGE }}
    >
      <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M2.6 7.4 L5.6 10.2 L11.4 4" />
      </svg>
    </span>
  );
}

function EmptyCheck() {
  return (
    <span className="size-6 shrink-0 rounded-full border-2 border-line-strong" />
  );
}

// Shared card chrome for every choice in the flow, selected or not.
function choiceClass(selected: boolean) {
  return `relative flex cursor-pointer items-center gap-4 rounded-[18px] px-5 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[#ED6A28]/40 ${
    selected
      ? "border-2 border-[#ED6A28] bg-tint px-[19px]"
      : "border border-line bg-card hover:border-[#ED6A28]/50"
  }`;
}

// What a learner already has in each language, keyed by language code.
type Saved = Record<string, { talks: number; words: number }>;

function savedLabel({ talks, words }: { talks: number; words: number }) {
  const parts = [];
  if (talks) parts.push(`${talks} ${talks === 1 ? "conversation" : "conversations"}`);
  if (words) parts.push(`${words} ${words === 1 ? "word" : "words"}`);
  return `${parts.join(" · ")} saved`;
}

function LanguageStep({
  title,
  subtitle,
  options,
  name,
  value,
  onChange,
  saved = {},
}: {
  title: string;
  subtitle: string;
  options: readonly { code: string; label: string }[];
  name: string;
  value: string;
  onChange: (code: string) => void;
  saved?: Saved;
}) {
  const [query, setQuery] = useState("");
  const needle = query.trim().toLowerCase();
  const shown = needle
    ? options.filter(
        (option) =>
          option.label.toLowerCase().includes(needle) ||
          endonym(option.code).toLowerCase().includes(needle),
      )
    : options;

  return (
    <>
      <h1 className="text-center text-[32px] leading-[1.2] font-bold tracking-[-0.025em] sm:text-[40px]">
        {title}
      </h1>
      <p className="mt-3 text-center text-[17px] leading-7 text-mute sm:text-[19px]">
        {subtitle}
      </p>

      <label className="mx-auto mt-8 flex h-14 w-full max-w-[520px] items-center gap-3 rounded-full bg-card-2 px-5 focus-within:ring-2 focus-within:ring-[#ED6A28]/40">
        <svg width="19" height="19" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" className="text-mute" aria-hidden>
          <circle cx="8.6" cy="8.6" r="6.4" />
          <path d="M13.4 13.4 L18 18" />
        </svg>
        <span className="sr-only">Search languages</span>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          // Enter would otherwise submit the whole onboarding form.
          onKeyDown={(event) => event.key === "Enter" && event.preventDefault()}
          placeholder="Search languages…"
          className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-mute"
        />
      </label>

      <fieldset className="mt-9">
        <legend className="sr-only">{title}</legend>
        {shown.length > 0 ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
            {shown.map((option) => {
              const selected = option.code === value;
              return (
                <label
                  key={option.code}
                  className={`${choiceClass(selected)} h-[78px] sm:h-[108px]`}
                >
                  <input
                    type="radio"
                    name={`${name}_choice`}
                    value={option.code}
                    checked={selected}
                    onChange={() => onChange(option.code)}
                    className="sr-only"
                  />
                  <span className="sm:hidden">
                    <Flag code={option.code} size={40} />
                  </span>
                  <span className="hidden sm:block">
                    <Flag code={option.code} />
                  </span>
                  <span className="flex flex-1 flex-col gap-0.5">
                    <span className="text-base font-semibold text-ink sm:text-lg">
                      {option.label}
                    </span>
                    <span dir="auto" className="text-sm text-mute sm:text-[15px]">
                      {endonym(option.code)}
                    </span>
                    {saved[option.code] && (
                      <span className="text-[12.5px] font-medium text-tint-ink">
                        {savedLabel(saved[option.code])}
                      </span>
                    )}
                  </span>
                  {selected ? <Check /> : <EmptyCheck />}
                </label>
              );
            })}
          </div>
        ) : (
          <p className="text-center text-[15px] text-mute">
            No language matches &ldquo;{query}&rdquo;.
          </p>
        )}
      </fieldset>

      {/* The radios above can be filtered out of the page, so the choice is
          submitted from here instead. */}
      <input type="hidden" name={name} value={value} />
    </>
  );
}

function FinishButton({ returning }: { returning: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="grid h-[60px] w-full place-items-center rounded-full bg-[#DB611C] text-lg font-semibold tracking-[0.01em] text-white shadow-[0_12px_26px_rgba(160,64,14,0.24)] transition-colors hover:bg-[#C74D17] disabled:opacity-70 sm:w-60"
    >
      {pending ? "Saving…" : returning ? "Save changes" : "Start speaking"}
    </button>
  );
}

export function OnboardingFlow({
  initial,
  returning,
  saved,
}: {
  initial: Initial;
  returning: boolean;
  saved: Saved;
}) {
  const [step, setStep] = useState(0);
  const [target, setTarget] = useState(initial.targetLanguage);
  const [native, setNative] = useState(initial.nativeLanguage);
  const [level, setLevel] = useState(initial.skillLevel);

  // Each step is a new screen, so it should open at its top.
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [step]);

  const exit = returning ? "/dashboard" : "/";

  return (
    <main className="landing-sky relative flex-1 overflow-hidden text-ink">
      {/* Faint brand brush, kept low so it never competes with the form. */}
      <svg
        viewBox="0 0 1280 900"
        fill="none"
        aria-hidden
        className="pointer-events-none absolute top-0 left-1/2 hidden h-[900px] w-[1280px] -translate-x-1/2 lg:block"
      >
        <g strokeLinecap="round" stroke="#EA7429">
          <path d="M1214 452 L1352 660" strokeOpacity="0.13" strokeWidth="150" />
          <path d="M-66 300 L64 96" strokeOpacity="0.10" strokeWidth="130" />
        </g>
      </svg>

      <header className="relative mx-auto flex h-24 w-full max-w-[1280px] items-center justify-between px-5 sm:px-[60px]">
        <Link href={exit} aria-label="VOCES home" className="flex items-center gap-2.5">
          <svg width="34" height="34" viewBox="0 0 48 48" fill={ORANGE} aria-hidden>
            <rect x="0" y="17" width="6" height="14" rx="3" />
            <rect x="10.5" y="9" width="6" height="30" rx="3" />
            <rect x="21" y="0" width="6" height="48" rx="3" />
            <rect x="31.5" y="9" width="6" height="30" rx="3" />
            <rect x="42" y="17.5" width="6" height="13" rx="3" />
          </svg>
          <span className="text-[23px] font-extrabold tracking-[0.04em]" style={{ color: ORANGE }}>
            VOCES
          </span>
        </Link>

        <span className="flex items-center gap-4">
          <span className="hidden text-[15px] font-medium text-mute sm:inline">
            Step {step + 1} of {STEPS}
          </span>
          <span
            role="img"
            aria-label={`Step ${step + 1} of ${STEPS}`}
            className="flex items-center gap-2"
          >
            {Array.from({ length: STEPS }, (_, index) => (
              <span
                key={index}
                className={`h-2 w-10 rounded-full transition-colors sm:w-[60px] ${
                  index <= step ? "bg-[#EB5F28]" : "bg-line-strong"
                }`}
              />
            ))}
          </span>
          <ThemeToggle className="size-10" />
        </span>
      </header>

      <form
        action={completeOnboarding}
        className="relative mx-auto flex w-full max-w-[880px] flex-col px-5 pt-6 pb-24 sm:px-5 lg:pt-[72px]"
      >
        {step === 0 ? (
          <Link
            href={exit}
            className="flex items-center gap-2 self-start text-base font-medium text-mute transition-colors hover:text-ink"
          >
            <svg width="9" height="15" viewBox="0 0 12 20" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M10 2 L2 10 L10 18" />
            </svg>
            {returning ? "Cancel" : "Back"}
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => setStep(step - 1)}
            className="flex items-center gap-2 self-start text-base font-medium text-mute transition-colors hover:text-ink"
          >
            <svg width="9" height="15" viewBox="0 0 12 20" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M10 2 L2 10 L10 18" />
            </svg>
            Back
          </button>
        )}

        <div className="mt-7">
          {/* Every step stays mounted so its fields are all submitted at the
              end; only the current one is shown. */}
          <div hidden={step !== 0}>
            <LanguageStep
              title="Which language do you want to learn?"
              subtitle={
                returning
                  ? "Each language keeps its own progress. Switch back any time."
                  : "Choose your target language"
              }
              options={TARGET_LANGUAGES}
              saved={saved}
              name="target_language"
              value={target}
              onChange={setTarget}
            />
          </div>

          <div hidden={step !== 1}>
            <LanguageStep
              title="What's your native language?"
              subtitle="Fall back into it whenever a word escapes you"
              options={NATIVE_LANGUAGES}
              name="native_language"
              value={native}
              onChange={setNative}
            />
          </div>

          <div hidden={step !== 2} className="mx-auto max-w-[560px]">
            <h1 className="text-center text-[32px] leading-[1.2] font-bold tracking-[-0.025em] sm:text-[40px]">
              A little about you
            </h1>
            <p className="mt-3 text-center text-[17px] leading-7 text-mute sm:text-[19px]">
              So your partner speaks at the right level
            </p>

            <label className="mt-9 flex flex-col gap-2">
              <span className="text-[15px] font-semibold">What should we call you?</span>
              <input
                type="text"
                name="display_name"
                autoComplete="given-name"
                defaultValue={initial.displayName}
                placeholder="Your name"
                className="h-14 rounded-2xl border border-line bg-card px-5 text-base outline-none placeholder:text-mute focus:border-[#ED6A28]"
              />
            </label>

            <fieldset className="mt-7 flex flex-col gap-3">
              <legend className="mb-2 text-[15px] font-semibold">
                Where are you right now?
              </legend>
              {SKILL_LEVELS.map((option) => {
                const selected = option.value === level;
                return (
                  <label key={option.value} className={`${choiceClass(selected)} py-4`}>
                    <input
                      type="radio"
                      name="skill_level"
                      value={option.value}
                      checked={selected}
                      onChange={() => setLevel(option.value)}
                      className="sr-only"
                    />
                    <span className="flex flex-1 flex-col gap-1">
                      <span className="text-[17px] font-semibold text-ink">
                        {option.label}
                      </span>
                      <span className="text-sm leading-relaxed text-mute">
                        {option.hint}
                      </span>
                    </span>
                    {selected ? <Check /> : <EmptyCheck />}
                  </label>
                );
              })}
            </fieldset>

            <label className="mt-7 flex flex-col gap-2">
              <span className="text-[15px] font-semibold">
                What are you learning it for?{" "}
                <span className="font-normal text-mute">(optional)</span>
              </span>
              <textarea
                name="goals"
                rows={3}
                defaultValue={initial.goals}
                placeholder="Travelling to Lyon next spring, and I want to order food without switching to English."
                className="resize-none rounded-2xl border border-line bg-card px-5 py-4 text-base leading-relaxed outline-none placeholder:text-mute focus:border-[#ED6A28]"
              />
            </label>
          </div>
        </div>

        <div className="mt-10 flex justify-center">
          {step < STEPS - 1 ? (
            <button
              type="button"
              onClick={() => setStep(step + 1)}
              className="grid h-[60px] w-full place-items-center rounded-full bg-[#DB611C] text-lg font-semibold tracking-[0.01em] text-white shadow-[0_12px_26px_rgba(160,64,14,0.24)] transition-colors hover:bg-[#C74D17] sm:w-60"
            >
              Continue
            </button>
          ) : (
            <FinishButton returning={returning} />
          )}
        </div>
      </form>
    </main>
  );
}
