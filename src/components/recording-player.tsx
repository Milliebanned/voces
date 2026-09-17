"use client";

import { useEffect, useRef, useState } from "react";

type State = "idle" | "loading" | "playing" | "paused" | "unavailable";

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds)) return "0:00";
  const whole = Math.floor(seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}

export function RecordingPlayer({
  sessionId,
  size = "compact",
}: {
  sessionId: string;
  size?: "compact" | "full";
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [state, setState] = useState<State>("idle");
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => () => audioRef.current?.pause(), []);

  function toggle() {
    // Created on first press, so a dashboard full of sessions doesn't fetch a
    // recording link for every row on page load.
    if (!audioRef.current) {
      const audio = new Audio(`/api/sessions/${sessionId}/recording`);
      audio.addEventListener("playing", () => setState("playing"));
      audio.addEventListener("pause", () => setState("paused"));
      audio.addEventListener("ended", () => {
        setState("paused");
        setCurrent(0);
      });
      audio.addEventListener("timeupdate", () => setCurrent(audio.currentTime));
      audio.addEventListener("loadedmetadata", () => setDuration(audio.duration));
      audio.addEventListener("error", () => {
        setState("unavailable");
        audioRef.current = null;
      });
      audioRef.current = audio;
    }

    const audio = audioRef.current;
    if (state === "playing") {
      audio.pause();
    } else {
      setState("loading");
      audio.play().catch(() => {
        setState("unavailable");
        audioRef.current = null;
      });
    }
  }

  const playing = state === "playing";
  const progress = duration > 0 ? (current / duration) * 100 : 0;

  const button = (
    <button
      type="button"
      onClick={toggle}
      aria-label={playing ? "Pause recording" : "Play recording"}
      className={`grid shrink-0 place-items-center rounded-full bg-accent text-white transition-colors hover:bg-accent-hover ${
        size === "full" ? "size-12" : "size-9"
      }`}
    >
      {playing ? (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <rect x="6" y="5" width="4" height="14" rx="1" />
          <rect x="14" y="5" width="4" height="14" rx="1" />
        </svg>
      ) : (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z" />
        </svg>
      )}
    </button>
  );

  if (state === "unavailable") {
    return (
      <span className="text-[12px] text-muted">
        {size === "full" ? "Recording is still processing — try again in a minute." : "Processing…"}
      </span>
    );
  }

  if (size === "compact") return button;

  return (
    <div className="flex items-center gap-4 rounded-2xl border border-border bg-surface p-4">
      {button}
      <div className="flex flex-1 flex-col gap-2">
        <div className="h-1 overflow-hidden rounded-full bg-border">
          <div
            className="h-full rounded-full bg-accent transition-[width] duration-200"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex justify-between text-[12px] text-muted">
          <span>{state === "loading" ? "Loading…" : formatTime(current)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>
    </div>
  );
}
