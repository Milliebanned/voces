"use client";

import { useState, useTransition } from "react";
import { RecordingPlayer } from "@/components/recording-player";
import { deleteConversation, deleteRecording } from "./actions";

type Pending = "recording" | "conversation" | null;

const COPY = {
  recording: {
    prompt: "Delete this recording? The transcript and review stay.",
    confirm: "Delete recording",
  },
  conversation: {
    prompt:
      "Delete this whole conversation, including the recording, transcript and review? Words you saved stay in your vocabulary.",
    confirm: "Delete conversation",
  },
} as const;

export function RecordingSection({
  sessionId,
  hasRecording,
}: {
  sessionId: string;
  hasRecording: boolean;
}) {
  const [confirming, setConfirming] = useState<Pending>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function confirm(target: Exclude<Pending, null>) {
    setError(null);
    startTransition(async () => {
      const result =
        target === "recording"
          ? await deleteRecording(sessionId)
          : await deleteConversation(sessionId);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setConfirming(null);
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {hasRecording && <RecordingPlayer sessionId={sessionId} size="full" />}

      {confirming ? (
        <div
          role="alertdialog"
          aria-label={COPY[confirming].confirm}
          className="rounded-2xl border border-border bg-surface p-4"
        >
          <p className="text-[14px] leading-relaxed">{COPY[confirming].prompt}</p>
          <p className="mt-1 text-[13px] text-muted">This can&apos;t be undone.</p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={isPending}
              onClick={() => confirm(confirming)}
              className="rounded-full bg-accent px-5 py-2.5 text-[14px] font-semibold text-white transition-colors hover:bg-accent-hover disabled:opacity-60"
            >
              {isPending ? "Deleting…" : COPY[confirming].confirm}
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => setConfirming(null)}
              className="px-2 py-2.5 text-[14px] font-medium text-muted transition-colors hover:text-foreground"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-x-5 gap-y-2 px-1">
          {hasRecording && (
            <button
              type="button"
              onClick={() => setConfirming("recording")}
              className="text-[13px] font-medium text-muted transition-colors hover:text-accent"
            >
              Delete recording
            </button>
          )}
          <button
            type="button"
            onClick={() => setConfirming("conversation")}
            className="text-[13px] font-medium text-muted transition-colors hover:text-accent"
          >
            Delete conversation
          </button>
        </div>
      )}

      {error && (
        <p role="alert" className="px-1 text-[13px] text-accent">
          {error}
        </p>
      )}
    </div>
  );
}
