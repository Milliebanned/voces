"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Wordmark } from "@/components/wordmark";
import { saveTranscript, type Turn } from "./actions";

type Props = {
  sessionId: string;
  languageLabel: string;
  direction: "ltr" | "rtl";
  systemPrompt: string;
  languageCodes: string[];
  keyterms: string[];
  voice: string;
};

type Status =
  | "idle"
  | "connecting"
  | "live"
  | "ending"
  | "error"
  | "save-failed";

const SAMPLE_RATE = 24000;

function toBase64(bytes: Uint8Array) {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function fromBase64(value: string) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export function LiveConversation({
  sessionId,
  languageLabel,
  direction,
  systemPrompt,
  languageCodes,
  keyterms,
  voice,
}: Props) {
  const router = useRouter();

  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [partial, setPartial] = useState("");
  const [agentSpeaking, setAgentSpeaking] = useState(false);
  const [userSpeaking, setUserSpeaking] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  const socketRef = useRef<WebSocket | null>(null);
  const captureContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const workletRef = useRef<AudioWorkletNode | null>(null);

  // Playback runs in its own context at the agent's native 24 kHz, fed into a
  // worklet that plays one continuous stream on the audio thread.
  const playbackContextRef = useRef<AudioContext | null>(null);
  const playerRef = useRef<AudioWorkletNode | null>(null);
  // A chunk can split a 16-bit sample across its boundary; the dangling byte is
  // held for the next chunk, otherwise every later sample is misaligned and
  // plays as static.
  const leftoverByteRef = useRef<number | null>(null);

  const transcriptRef = useRef<Turn[]>([]);
  const agentSessionIdRef = useRef<string | null>(null);

  const appendTurn = useCallback((role: Turn["role"], text: string) => {
    if (!text.trim()) return;
    const turn: Turn = { role, text, at: new Date().toISOString() };
    transcriptRef.current = [...transcriptRef.current, turn];
    setTurns(transcriptRef.current);
  }, []);

  const clearPlayback = useCallback(() => {
    playerRef.current?.port.postMessage({ type: "clear" });
    leftoverByteRef.current = null;
  }, []);

  const teardown = useCallback(() => {
    clearPlayback();
    playerRef.current?.port.close();
    playerRef.current?.disconnect();
    playerRef.current = null;
    workletRef.current?.port.close();
    workletRef.current?.disconnect();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    captureContextRef.current?.close().catch(() => {});
    playbackContextRef.current?.close().catch(() => {});
    socketRef.current?.close();
    workletRef.current = null;
    streamRef.current = null;
    captureContextRef.current = null;
    playbackContextRef.current = null;
    socketRef.current = null;
  }, [clearPlayback]);

  const playChunk = useCallback((base64: string) => {
    const player = playerRef.current;
    if (!player) return;

    let bytes = fromBase64(base64);
    if (leftoverByteRef.current !== null) {
      const joined = new Uint8Array(bytes.length + 1);
      joined[0] = leftoverByteRef.current;
      joined.set(bytes, 1);
      bytes = joined;
      leftoverByteRef.current = null;
    }
    if (bytes.length % 2 === 1) {
      leftoverByteRef.current = bytes[bytes.length - 1];
      bytes = bytes.subarray(0, bytes.length - 1);
    }
    if (bytes.length === 0) return;

    // Copied into a standalone buffer so it can be transferred to the audio
    // thread without copying again.
    const pcm = bytes.slice().buffer;
    player.port.postMessage({ type: "audio", buffer: pcm }, [pcm]);
  }, []);

  const handleMessage = useCallback(
    (event: MessageEvent) => {
      const message = JSON.parse(event.data);

      switch (message.type) {
        case "session.ready":
          agentSessionIdRef.current = message.session_id ?? null;
          setStatus("live");
          // No fixed greeting: that field is spoken verbatim, so it can't adapt
          // to the scenario. Asking for a reply lets the system prompt open.
          socketRef.current?.send(JSON.stringify({ type: "reply.create" }));
          break;
        case "input.speech.started":
          setUserSpeaking(true);
          // Barge-in: drop whatever the agent still had queued.
          clearPlayback();
          break;
        case "input.speech.stopped":
          setUserSpeaking(false);
          break;
        case "transcript.user.delta":
          setPartial(message.text ?? "");
          break;
        case "transcript.user":
          setPartial("");
          appendTurn("user", message.text ?? "");
          break;
        case "reply.audio":
          playChunk(message.data);
          break;
        case "transcript.agent":
          appendTurn("agent", message.text ?? "");
          break;
        case "reply.done":
          playerRef.current?.port.postMessage({ type: "end" });
          leftoverByteRef.current = null;
          break;
        case "session.error":
          setError(message.message ?? "The session hit an error.");
          setStatus("error");
          break;
      }
    },
    [appendTurn, clearPlayback, playChunk],
  );

  const start = useCallback(async () => {
    setStatus("connecting");
    setError(null);

    try {
      const response = await fetch("/api/voice/token");
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? "Could not start the session.");
      }
      const { token } = await response.json();

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: false },
      });
      streamRef.current = stream;

      // Left at the hardware rate: forcing 24 kHz silently disables echo
      // cancellation in Firefox and Safari, so the worklet resamples instead.
      const captureContext = new AudioContext();
      captureContextRef.current = captureContext;
      await captureContext.audioWorklet.addModule("/pcm-processor.js");

      const playbackContext = new AudioContext({ sampleRate: SAMPLE_RATE });
      playbackContextRef.current = playbackContext;
      await playbackContext.audioWorklet.addModule("/playback-processor.js");
      const player = new AudioWorkletNode(playbackContext, "playback-processor", {
        outputChannelCount: [1],
      });
      // Driven by what is actually audible, not by when the reply was sent,
      // so the indicator doesn't stop while the voice is still playing.
      player.port.onmessage = ({ data }) => {
        setAgentSpeaking(data.type === "playing");
      };
      player.connect(playbackContext.destination);
      playerRef.current = player;

      const socket = new WebSocket(
        `wss://agents.assemblyai.com/v1/ws?token=${encodeURIComponent(token)}`,
      );
      socketRef.current = socket;

      socket.addEventListener("open", () => {
        socket.send(
          JSON.stringify({
            type: "session.update",
            session: {
              system_prompt: systemPrompt,
              output: { voice },
              input: {
                language_codes: languageCodes,
                keyterms: keyterms.length > 0 ? keyterms : undefined,
                turn_detection: {
                  // Learners pause mid-sentence while they search for a word,
                  // so the agent waits longer than it would for a native
                  // speaker before taking its turn.
                  min_silence: 900,
                  max_silence: 2600,
                  interrupt_response: true,
                },
              },
            },
          }),
        );

        const source = captureContext.createMediaStreamSource(stream);
        const worklet = new AudioWorkletNode(captureContext, "pcm-processor", {
          processorOptions: {
            inputSampleRate: captureContext.sampleRate,
            targetSampleRate: SAMPLE_RATE,
          },
        });
        workletRef.current = worklet;

        worklet.port.onmessage = (event: MessageEvent<ArrayBuffer>) => {
          if (socket.readyState !== WebSocket.OPEN) return;
          socket.send(
            JSON.stringify({
              type: "input.audio",
              audio: toBase64(new Uint8Array(event.data)),
            }),
          );
        };

        source.connect(worklet);
      });

      socket.addEventListener("message", handleMessage);
      socket.addEventListener("error", () => {
        setError("Lost the connection to the voice service.");
        setStatus("error");
      });
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not start the session.",
      );
      setStatus("error");
      teardown();
    }
  }, [handleMessage, keyterms, languageCodes, systemPrompt, teardown, voice]);

  const save = useCallback(async () => {
    setStatus("ending");
    const { error: saveError } = await saveTranscript(
      sessionId,
      transcriptRef.current,
      agentSessionIdRef.current,
    );

    // The transcript only exists in memory at this point, so a failed save
    // must stay on screen with a retry rather than navigate away and lose it.
    if (saveError) {
      setError(saveError);
      setStatus("save-failed");
      return;
    }
    router.push(`/conversation/${sessionId}/analysis`);
  }, [router, sessionId]);

  const end = useCallback(async () => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: "session.end" }));
    }
    teardown();
    await save();
  }, [save, teardown]);

  useEffect(() => {
    if (status !== "live") return;
    const timer = setInterval(() => setElapsed((value) => value + 1), 1000);
    return () => clearInterval(timer);
  }, [status]);

  // An unsent session.end leaves a billable resume window open.
  useEffect(() => {
    const handleUnload = () => {
      if (socketRef.current?.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({ type: "session.end" }));
      }
    };
    window.addEventListener("pagehide", handleUnload);
    return () => {
      window.removeEventListener("pagehide", handleUnload);
      handleUnload();
    };
  }, []);

  const minutes = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const seconds = String(elapsed % 60).padStart(2, "0");

  return (
    <main className="flex flex-1 flex-col">
      <header className="mx-auto flex w-full max-w-2xl items-center justify-between px-6 py-6">
        <Wordmark />
        <div className="flex items-center gap-2">
          <span
            className={`size-1.5 rounded-full ${
              status === "live" ? "bg-accent" : "bg-muted"
            }`}
          />
          <span className="text-[13px] font-semibold">{languageLabel}</span>
          {status === "live" && (
            <span className="ml-2 text-xs font-medium text-muted">
              {minutes}:{seconds}
            </span>
          )}
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-6 pb-40">
        {status === "idle" && (
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <h1 className="max-w-[420px] text-[28px] leading-tight font-bold tracking-[-0.02em]">
              Ready when you are
            </h1>
            <p className="mt-3 max-w-[420px] text-[15px] leading-relaxed text-muted">
              Speak naturally. If a word escapes you, say it in your own
              language and keep going — you&apos;ll be understood.
            </p>
            <button
              onClick={start}
              className="mt-8 rounded-full bg-accent px-8 py-4 text-base font-semibold text-white transition-colors hover:bg-accent-hover"
            >
              Start the conversation
            </button>
          </div>
        )}

        {status === "connecting" && (
          <p className="flex flex-1 items-center justify-center text-[15px] text-muted">
            Connecting…
          </p>
        )}

        {status === "save-failed" && (
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <h1 className="text-[24px] leading-tight font-bold tracking-[-0.02em]">
              Your conversation didn&apos;t save
            </h1>
            <p className="mt-3 max-w-[420px] text-[14px] leading-relaxed text-muted">
              It&apos;s still here — don&apos;t close this tab. Try again, and
              if it keeps failing, send this on:
            </p>
            <p className="mt-4 max-w-[420px] rounded-2xl bg-accent-soft px-5 py-4 font-mono text-[12px] leading-relaxed text-accent">
              {error}
            </p>
            <button
              onClick={save}
              className="mt-6 rounded-full bg-accent px-7 py-4 text-base font-semibold text-white transition-colors hover:bg-accent-hover"
            >
              Try saving again
            </button>
          </div>
        )}

        {status === "error" && (
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <p className="max-w-[420px] rounded-2xl bg-accent-soft px-5 py-4 text-[14px] leading-relaxed text-accent">
              {error}
            </p>
            <button
              onClick={start}
              className="mt-6 rounded-full border border-border px-6 py-3 text-[15px] font-semibold transition-colors hover:bg-surface"
            >
              Try again
            </button>
          </div>
        )}

        {(status === "live" || status === "ending") && (
          <div className="flex flex-col gap-6 pt-4" dir={direction}>
            {turns.length === 0 && !partial && (
              <p className="text-[15px] text-muted" dir="ltr">
                Connected — your partner is about to speak.
              </p>
            )}

            {turns.map((turn, index) =>
              turn.role === "agent" ? (
                <div key={index} className="flex flex-col gap-2">
                  <span className="text-[9px] font-bold tracking-[0.18em] text-accent">
                    VOCES
                  </span>
                  <p className="text-[17px] leading-relaxed">{turn.text}</p>
                </div>
              ) : (
                <div key={index} className="flex justify-end">
                  <p className="max-w-[80%] rounded-2xl border border-border bg-surface px-4 py-3 text-[17px] leading-relaxed text-muted">
                    {turn.text}
                  </p>
                </div>
              ),
            )}

            {partial && (
              <div className="flex justify-end">
                <p className="max-w-[80%] rounded-2xl border border-dashed border-border px-4 py-3 text-[17px] leading-relaxed text-muted/70">
                  {partial}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {(status === "live" || status === "ending") && (
        <div className="fixed inset-x-0 bottom-0 border-t border-border bg-background/90 backdrop-blur">
          <div className="mx-auto flex w-full max-w-2xl items-center justify-between px-6 py-6">
            <div className="flex items-center gap-2.5">
              <div className="flex h-4 items-end gap-[3px]">
                {[6, 13, 16, 10, 6].map((height, i) => (
                  <span
                    key={i}
                    className="w-[3px] rounded-full bg-accent transition-transform duration-200"
                    style={{
                      height,
                      transform:
                        userSpeaking || agentSpeaking
                          ? "scaleY(1)"
                          : "scaleY(0.4)",
                    }}
                  />
                ))}
              </div>
              <span className="text-[13px] font-medium text-muted">
                {agentSpeaking
                  ? "Speaking…"
                  : userSpeaking
                    ? "Listening…"
                    : "Your turn"}
              </span>
            </div>

            <button
              onClick={end}
              disabled={status === "ending"}
              className="rounded-full border border-border px-6 py-3 text-[15px] font-semibold transition-colors hover:bg-surface disabled:opacity-60"
            >
              {status === "ending" ? "Wrapping up…" : "End conversation"}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
