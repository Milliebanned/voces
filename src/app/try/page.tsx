import { cookies, headers } from "next/headers";
import Link from "next/link";
import { Flag } from "@/components/flag";
import { Wordmark } from "@/components/wordmark";
import {
  NATIVE_LANGUAGES,
  TARGET_LANGUAGES,
  isSupportedTarget,
  languageName,
  textDirection,
  voiceFor,
} from "@/lib/languages";
import { buildSystemPrompt, buildTranscriptionPrompt } from "@/lib/prompt";
import { TRIAL_COOKIE, addressHasTried, visitorAddress } from "@/lib/trial";
import { LiveConversation } from "../conversation/[id]/live-conversation";

// How long the landing page's taster lasts before asking for a sign-up.
const TRIAL_SECONDS = 30;

export const metadata = {
  title: "Try VOCES live — 30 seconds with the AI",
};

export default async function TryPage({ searchParams }: PageProps<"/try">) {
  // One try per visitor: after it, this page only offers the sign-up.
  const [cookieStore, headerList] = await Promise.all([cookies(), headers()]);
  if (
    cookieStore.has(TRIAL_COOKIE) ||
    (await addressHasTried(visitorAddress(headerList)))
  ) {
    return <TrialUsed />;
  }

  const params = await searchParams;
  const learn = typeof params.learn === "string" ? params.learn : null;
  const speak = typeof params.speak === "string" ? params.speak : null;
  const speakValid = NATIVE_LANGUAGES.some((language) => language.code === speak);

  if (learn && speak && isSupportedTarget(learn) && speakValid) {
    const targetLanguage = languageName(learn)!;
    const nativeLanguage = languageName(speak)!;
    return (
      <LiveConversation
        sessionId={null}
        trialSeconds={TRIAL_SECONDS}
        languageLabel={targetLanguage}
        direction={textDirection(learn)}
        targetLanguageCode={learn}
        nativeLanguageCode={speak}
        translationDirection={textDirection(speak)}
        voice={voiceFor(learn)}
        // A visitor's level is unknown, so the taster speaks at the beginner
        // level: anyone can follow it, and it is what most first-timers need.
        systemPrompt={buildSystemPrompt({
          displayName: null,
          targetLanguageCode: learn,
          targetLanguage,
          nativeLanguage,
          skillLevel: "beginner",
          goals: null,
          scenario: null,
          reinforcement: [],
          topicsDiscussed: [],
          sessionSeed: crypto.randomUUID(),
        })}
        transcriptionPrompt={buildTranscriptionPrompt({
          targetLanguage,
          nativeLanguage,
          skillLevel: "beginner",
          scenario: null,
        })}
        languageCodes={[learn, speak].filter((code, index, all) => all.indexOf(code) === index)}
        keyterms={[]}
      />
    );
  }

  return (
    <main className="landing-sky flex min-h-dvh flex-1 flex-col">
      <header className="mx-auto flex w-full max-w-[880px] items-center justify-between px-5 py-6">
        <Link href="/" aria-label="VOCES home">
          <Wordmark />
        </Link>
        <Link href="/login" className="text-[15px] font-medium text-mute transition-colors hover:text-ink">
          Sign in
        </Link>
      </header>

      <form action="/try" className="mx-auto flex w-full max-w-[880px] flex-col px-5 pb-20">
        <p className="text-center text-[13px] font-semibold tracking-[0.14em] text-[#ED6A28] uppercase">
          Try it live · {TRIAL_SECONDS} seconds · no account
        </p>
        <h1 className="mt-3 text-center text-[32px] leading-[1.2] font-bold tracking-[-0.025em] sm:text-[40px]">
          Talk with the VOCES AI
        </h1>
        <p className="mx-auto mt-3 max-w-[520px] text-center text-[17px] leading-7 text-mute">
          Pick a language, press the mic and speak out loud. You get{" "}
          {TRIAL_SECONDS} seconds to see how it feels.
        </p>

        <LanguageChoice
          title="Which language do you want to practise?"
          name="learn"
          options={TARGET_LANGUAGES}
          defaultValue={learn && isSupportedTarget(learn) ? learn : "es"}
        />
        <LanguageChoice
          title="Which language do you speak?"
          hint="Say a word in it whenever one escapes you."
          name="speak"
          options={NATIVE_LANGUAGES}
          defaultValue={speakValid ? speak! : "en"}
          compact
        />

        <button
          type="submit"
          className="mx-auto mt-10 grid h-[60px] w-full place-items-center rounded-full bg-[#DB611C] text-lg font-semibold text-white shadow-[0_12px_26px_rgba(160,64,14,0.24)] transition-colors hover:bg-[#C74D17] sm:w-72"
        >
          Continue
        </button>
        <p className="mt-4 text-center text-[14px] text-mute">
          You&apos;ll need a microphone. Works best in Chrome.
        </p>
      </form>
    </main>
  );
}

function TrialUsed() {
  return (
    <main className="landing-sky flex min-h-dvh flex-1 flex-col">
      <header className="mx-auto flex w-full max-w-[880px] items-center justify-between px-5 py-6">
        <Link href="/" aria-label="VOCES home">
          <Wordmark />
        </Link>
        <Link href="/login" className="text-[15px] font-medium text-mute transition-colors hover:text-ink">
          Sign in
        </Link>
      </header>
      <div className="mx-auto flex max-w-[520px] flex-1 flex-col items-center justify-center px-5 pb-24 text-center">
        <p className="text-[13px] font-semibold tracking-[0.14em] text-[#ED6A28] uppercase">
          Free try used
        </p>
        <h1 className="mt-3 text-[32px] leading-[1.2] font-bold tracking-[-0.025em] sm:text-[40px]">
          You&apos;ve had your {TRIAL_SECONDS} seconds
        </h1>
        <p className="mt-4 text-[17px] leading-7 text-mute">
          Sign up free for 5 more minutes of conversation, a review of
          everything you said, and the words you reached for saved as
          flashcards. Go Premium any time for unlimited conversations.
        </p>
        <Link
          href="/login?mode=signup"
          className="mt-8 grid h-[60px] w-full place-items-center rounded-full bg-[#DB611C] text-lg font-semibold text-white shadow-[0_12px_26px_rgba(160,64,14,0.24)] transition-colors hover:bg-[#C74D17] sm:w-72"
        >
          Sign up to keep talking
        </Link>
        <Link href="/login" className="mt-4 text-[15px] font-medium text-mute hover:text-ink">
          Already have an account? Sign in
        </Link>
      </div>
    </main>
  );
}

function LanguageChoice({
  title,
  hint,
  name,
  options,
  defaultValue,
  compact = false,
}: {
  title: string;
  hint?: string;
  name: string;
  options: readonly { code: string; label: string }[];
  defaultValue: string;
  compact?: boolean;
}) {
  return (
    <fieldset className="mt-10">
      <legend className="w-full text-center text-[19px] font-semibold">{title}</legend>
      {hint && <p className="mt-1 text-center text-[15px] text-mute">{hint}</p>}
      <div
        className={`mt-5 grid gap-3 ${
          compact ? "grid-cols-2 sm:grid-cols-4 lg:grid-cols-6" : "grid-cols-2 sm:grid-cols-3"
        }`}
      >
        {options.map((option) => (
          <label
            key={option.code}
            className={`flex cursor-pointer items-center gap-3 rounded-2xl border-2 border-line bg-card transition-colors hover:border-[#ED6A28]/50 has-checked:border-[#ED6A28] has-checked:bg-tint ${
              compact ? "h-14 px-3" : "h-[76px] px-4"
            }`}
          >
            <input
              type="radio"
              name={name}
              value={option.code}
              defaultChecked={option.code === defaultValue}
              className="sr-only"
            />
            <Flag code={option.code} size={compact ? 26 : 34} />
            <span className={`font-semibold text-ink ${compact ? "text-[14px]" : "text-[17px]"}`}>
              {option.label}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
