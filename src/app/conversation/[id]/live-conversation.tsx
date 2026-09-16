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
  greeting: string;
  languageCodes: string[];
  keyterms: string[];
  voice: string;
};

type Status = "idle" | "connecting" | "live" | "ending" | "error";

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
  greeting,
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
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const workletRef = useRef<AudioWorkletNode | null>(null);

  // Chunks arrive faster than they play, so each one is scheduled against a
  // moving playhead rather than started immediately, which would overlap them.
  const playheadRef = useRef(0);
  const scheduledRef = useRef<AudioBufferSourceNode[]>([]);
  const transcriptRef = useRef<Turn[]>([]);
  const endedRef = useRef(false);

  const appendTurn = useCallback((role: Turn["role"], text: string) => {
    if (!text.trim()) return;
    const turn: Turn = { role, text, at: new Date().toISOString() };
    transcriptRef.current = [...transcriptRef.current, turn];
    setTurns(transcriptRef.current);
  }, []);

  const stopScheduledAudio = useCallback(() => {
    scheduledRef.current.forEach((source) => {
      try {
        source.stop();
      } catch {
        // Already finished playing.
      }
    });
    scheduledRef.current = [];
    playheadRef.current = audioContextRef.current?.currentTime ?? 0;
  }, []);

  const teardown = useCallback(() => {
    stopScheduledAudio();
    workletRef.current?.port.close();
    workletRef.current?.disconnect();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    audioContextRef.current?.close().catch(() => {});
    socketRef.current?.close();
    workletRef.current = null;
    streamRef.current = null;
    audioContextRef.current = null;
    socketRef.current = null;
  }, [stopScheduledAudio]);

  const playChunk = useCallback((base64: string) => {
    const context = audioContextRef.current;
    if (!context) return;

    const bytes = fromBase64(base64);
    const samples = new Int16Array(
      bytes.buffer,
      bytes.byteOffset,
      Math.floor(bytes.byteLength / 2),
    );

    const buffer = context.createBuffer(1, samples.length, SAMPLE_RATE);
    const channel = buffer.getChannelData(0);
    for (let i = 0; i < samples.length; i++) channel[i] = samples[i] / 32768;

    const source = context.createBufferSource();
    source.buffer = buffer;
    source.connect(context.destination);

    playheadRef.current = Math.max(playheadRef.current, context.currentTime);
    source.start(playheadRef.current);
    playheadRef.current += buffer.duration;

    scheduledRef.current.push(source);
    source.onended = () => {
      scheduledRef.current = scheduledRef.current.filter((s) => s !== source);
    };
  }, []);

  const handleMessage = useCallback(
    (event: MessageEvent) => {
      const message = JSON.parse(event.data);

      switch (message.type) {
        case "session.ready":
          setStatus("live");
          break;
        case "input.speech.started":
          setUserSpeaking(true);
          // Barge-in: drop whatever the agent still had queued.
          stopScheduledAudio();
          setAgentSpeaking(false);
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
        case "reply.started":
          setAgentSpeaking(true);
          break;
        case "reply.audio":
          playChunk(message.data);
          break;
        case "transcript.agent":
          appendTurn("agent", message.text ?? "");
          break;
        case "reply.done":
          setAgentSpeaking(false);
          break;
        case "session.error":
          setError(message.message ?? "The session hit an error.");
          setStatus("error");
          break;
        case "session.ended":
          endedRef.current = true;
          break;
      }
    },
    [appendTurn, playChunk, stopScheduledAudio],
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
      const context = new AudioContext();
      audioContextRef.current = context;
      await context.audioWorklet.addModule("/pcm-processor.js");

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
              greeting,
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

        const source = context.createMediaStreamSource(stream);
        const worklet = new AudioWorkletNode(context, "pcm-processor", {
          processorOptions: {
            inputSampleRate: context.sampleRate,
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
  }, [
    greeting,
    handleMessage,
    keyterms,
    languageCodes,
    systemPrompt,
    teardown,
    voice,
  ]);

  const end = useCallback(async () => {
    setStatus("ending");

    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: "session.end" }));
    }
    teardown();

    await saveTranscript(sessionId, transcriptRef.current);
    router.push(`/conversation/${sessionId}/analysis`);
  }, [router, sessionId, teardown]);

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
                Listening — say hello.
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
