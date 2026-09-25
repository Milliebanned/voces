import Link from "next/link";
import { Wordmark } from "@/components/wordmark";

export default function EmailConfirmedPage() {
  return (
    <main className="landing-sky flex flex-1 flex-col">
      <header className="mx-auto flex w-full max-w-6xl px-6 py-6">
        <Wordmark />
      </header>

      <div className="flex flex-1 flex-col items-center justify-center px-6 pb-24 text-center">
        <span className="grid size-16 place-items-center rounded-full bg-accent-soft">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" className="text-accent" aria-hidden>
            <path d="M4.6 12.6 L9.6 17.4 L19.4 7" />
          </svg>
        </span>
        <h1 className="mt-6 text-[28px] leading-tight font-bold tracking-[-0.02em]">
          Your email is confirmed
        </h1>
        <p className="mt-3 max-w-[380px] text-[15px] leading-relaxed text-muted">
          Your account is ready. Log in to pick up where you left off.
        </p>
        <Link
          href="/login"
          className="mt-8 rounded-full bg-accent px-7 py-4 text-base font-semibold text-white transition-colors hover:bg-accent-hover"
        >
          Log in
        </Link>
      </div>
    </main>
  );
}
