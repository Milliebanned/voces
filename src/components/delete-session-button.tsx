"use client";

import { useState, useTransition } from "react";
import { deleteConversation } from "@/app/conversation/[id]/analysis/actions";

// Compact confirm-in-place delete for a row in a list of past conversations.
export function DeleteSessionButton({ sessionId }: { sessionId: string }) {
  const [confirming, setConfirming] = useState(false);
  const [failed, setFailed] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        aria-label="Delete conversation"
        className="grid size-8 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-accent-soft hover:text-accent"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m2 0v14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V6" />
        </svg>
      </button>
    );
  }

  return (
    <span className="flex shrink-0 items-center gap-2">
      <button
        type="button"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            const result = await deleteConversation(sessionId);
            // Success redirects; only a failure comes back here.
            if (result?.error) setFailed(true);
          })
        }
        className="rounded-full bg-accent px-3 py-1 text-[12px] font-semibold text-white transition-colors hover:bg-accent-hover disabled:opacity-60"
      >
        {isPending ? "Deleting…" : failed ? "Retry" : "Delete"}
      </button>
      <button
        type="button"
        disabled={isPending}
        onClick={() => {
          setConfirming(false);
          setFailed(false);
        }}
        className="text-[12px] font-medium text-muted hover:text-foreground"
      >
        Cancel
      </button>
    </span>
  );
}
