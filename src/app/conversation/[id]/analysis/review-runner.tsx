"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { runAnalysis } from "./actions";

// Kicked off from the page rather than while saving the transcript, so ending
// a conversation lands on the transcript at once and the review fills in.
export function ReviewRunner({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  const run = useCallback(async () => {
    setError(null);
    const result = await runAnalysis(sessionId);
    if (result.error) {
      setError(result.error);
      return;
    }
    router.refresh();
  }, [router, sessionId]);

  useEffect(() => {
    // Strict mode mounts twice in development; one review is enough.
    if (started.current) return;
    started.current = true;
    void run();
  }, [run]);

  if (error) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-6">
        <h2 className="text-[15px] font-semibold">Review unavailable</h2>
        <p className="mt-2 text-[14px] leading-relaxed text-muted">{error}</p>
        <button
          type="button"
          onClick={() => void run()}
          className="mt-4 rounded-full bg-accent px-5 py-2.5 text-[14px] font-semibold text-white transition-colors hover:bg-accent-hover"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-6">
      <div className="flex items-center gap-3">
        <span className="size-2 animate-pulse rounded-full bg-accent" />
        <h2 className="text-[15px] font-semibold">Reviewing your conversation…</h2>
      </div>
      <p className="mt-2 text-[14px] leading-relaxed text-muted">
        Corrections, the words you reached for and what to work on next will
        appear here in a few seconds.
      </p>
    </div>
  );
}
