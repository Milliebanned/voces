"use client";

import { useState, useTransition } from "react";
import { saveSuggestedWord } from "./actions";

export function SaveWordButton({
  sessionId,
  word,
  saved: initiallySaved,
}: {
  sessionId: string;
  word: { text: string; translation: string; example: string };
  saved: boolean;
}) {
  const [saved, setSaved] = useState(initiallySaved);
  const [failed, setFailed] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (saved) {
    return (
      <span className="shrink-0 text-[13px] font-medium text-muted">Saved</span>
    );
  }

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          const { error } = await saveSuggestedWord(sessionId, word);
          setFailed(Boolean(error));
          if (!error) setSaved(true);
        })
      }
      className="shrink-0 rounded-full border border-border px-4 py-1.5 text-[13px] font-semibold text-accent transition-colors hover:border-accent disabled:opacity-60"
    >
      {isPending ? "Saving…" : failed ? "Retry" : "Save"}
    </button>
  );
}
