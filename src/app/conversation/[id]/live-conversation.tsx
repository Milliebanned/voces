"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Wordmark } from "@/components/wordmark";
import { isEchoOf } from "@/lib/echo";
import { prepareTranslator, type TranslatorStatus } from "@/lib/translator";
import { saveTranscript, type Turn } from "./actions";

type Props = {
  sessionId: string;
  languageLabel: string;
  direction: "ltr" | "rtl";
  targetLanguageCode: string;
  nativeLanguageCode: string;
  translationDirection: "ltr" | "rtl";
  systemPrompt: string;
  transcriptionPrompt: string;
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
const ECHO_TAIL_MS = 300;

// Left adaptive, end-of-turn almost never fired early for a learner: across
// five recorded sessions nearly every reply started 3.07-3.3 s after they
// stopped, which is the service's 3000 ms fallback. The semantic check is
// rarely sure of accented, mixed-language speech, so it ran out the clock.
// The same sessions show replies can start in 0.6 s once the turn ends, so the
// wait is set explicitly: end after 500 ms of silence when the sentence reads
// as complete, and after 1.5 s regardless.
const TURN_DETECTION = {
  interrupt_response: true,
  // The 500 ms default makes barge-in feel like the agent ploughs on over you.
  // 200 ms still rides above the echo the guard catches.
  interruption_delay: 200,
  min_silence: 500,
  max_silence: 1500,
};

// Answering a question is where a learner pauses longest to find the words,
// so after the agent asks one they get more room, until they have answered.
const THINKING_TURN_DETECTION = {
  ...TURN_DETECTION,
  min_silence: 700,
  max_silence: 2200,
};

// A beginner in a real session sat silent for 29 seconds after a reply that
// gave them nothing easy to answer, and the agent simply waited. After this
// much quiet, the agent is asked to offer an easy way back in. At 8 seconds it
// cut in while learners were still composing an answer, and a second nudge in a
// row just re-asked its own question, so it waits longer and only once.
const NUDGE_AFTER_MS = 15000;
const MAX_NUDGES_IN_A_ROW = 1;

// Built in blocks rather than one character at a time. This runs on the same
// thread that has to keep handing audio to the playback worklet, twenty times a
// second for the microphone alone, and appending to a string per byte was long
// enough to show up as gaps in the agent's voice.
function toBase64(bytes: Uint8Array) {
  const BLOCK = 0x8000;
  let binary = "";
  for (let i = 0; i < bytes.length; i += BLOCK) {
    binary += String.fromCharCode(
      ...bytes.subarray(i, Math.min(i + BLOCK, bytes.length)),
    );
  }
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
  targetLanguageCode,
  nativeLanguageCode,
  translationDirection,
  systemPrompt,
  transcriptionPrompt,
  languageCodes,
  keyterms,
  voice,
}: Props) {
  const router = useRouter();

  // Safe to read during render: the toggle only appears once a session is
  // live, after a click, so server and client markup never disagree about it.
  const [showTranslations, setShowTranslations] = useState(() => {
    try {
      return (
        typeof window === "undefined" ||
        localStorage.getItem("voces:translations") !== "hidden"
      );
    } catch {
      return true;
    }
  });
  const [translatorStatus, setTranslatorStatus] =
    useState<TranslatorStatus>("loading");
  const translatorRef = useRef<Awaited<
    ReturnType<typeof prepareTranslator>
  > | null>(null);

  const toggleTranslations = useCallback(() => {
    setShowTranslations((shown) => {
      try {
        localStorage.setItem("voces:translations", shown ? "hidden" : "shown");
      } catch {
        // Preference just won't persist.
      }
      return !shown;
    });
  }, []);

  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [partial, setPartial] = useState("");
  // The agent's line while it is still being spoken, revealed in step with the
  // audio rather than when the text arrived.
  const [caption, setCaption] = useState<string | null>(null);
  const [agentSpeaking, setAgentSpeaking] = useState(false);
  const [userSpeaking, setUserSpeaking] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [echoDetected, setEchoDetected] = useState(false);

  // Speaker echo: at just 2% loudness, the agent's own voice picked up by the
  // mic is enough for it to interrupt itself and then answer its own words.
  // Once that is seen, the mic is muted only while the agent is audible.
  const agentPlayingRef = useRef(false);
  const agentStoppedAtRef = useRef(0);
  const agentSpeechRef = useRef("");
  const speechBeganOverAgentRef = useRef(false);
  const echoGuardRef = useRef(false);
  // Whether the longer thinking-time turn detection is currently applied.
  const thinkingTimeRef = useRef(false);

  const userSpeakingRef = useRef(false);
  // From the moment the learner stops talking until the agent's reply is done,
  // silence is the agent's to break, not the learner's.
  const replyInFlightRef = useRef(true);
  const quietSinceRef = useRef(0);
  const nudgesInARowRef = useRef(0);

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

  // Each transcript.agent.delta carries the word and the moment it is spoken
  // within the reply (start_ms), so the caption can be driven off how much
  // audio has actually reached the speakers instead of guessing a speech rate.
  // The whole reply's text lands in a burst about a second in, some fifteen to
  // twenty-five seconds before the voice finishes saying it, so without this it
  // arrives as one lump wildly ahead of what is being heard.
  const agentWordsRef = useRef<{ delta: string; startMs: number }[]>([]);
  const agentFinalRef = useRef<string | null>(null);
  const agentCommittedRef = useRef(true);
  const revealedCountRef = useRef(0);
  // The agent's line goes into the transcript only once the voice has finished
  // it, but the text itself is known far earlier. Translating on arrival rather
  // than on commit is worth the whole of that gap.
  const agentTranslationRef = useRef<Promise<string | null> | null>(null);

  const transcriptRef = useRef<Turn[]>([]);
  const agentSessionIdRef = useRef<string | null>(null);
  // The socket's close listener is registered before `save` is defined.
  const saveRef = useRef<(() => Promise<void>) | null>(null);

  const translate = useCallback((text: string) => {
    const translator = translatorRef.current;
    if (!translator || !text.trim()) return null;
    return translator.translate(text).catch(() => null);
  }, []);

  const appendTurn = useCallback(
    (
      role: Turn["role"],
      text: string,
      pending?: Promise<string | null> | null,
    ) => {
      if (!text.trim()) return;
      const turn: Turn = { role, text, at: new Date().toISOString() };
      const index = transcriptRef.current.length;
      transcriptRef.current = [...transcriptRef.current, turn];
      setTurns(transcriptRef.current);

      // Already under way for an agent line whose text arrived early; started
      // here for anything else. The transcript is append-only, so the turn's
      // index stays a stable address for the result however late it lands.
      (pending ?? translate(text))
        ?.then((translation) => {
          const current = transcriptRef.current;
          if (!translation || !current[index]) return;
          const updated = [...current];
          updated[index] = { ...current[index], translation };
          transcriptRef.current = updated;
          setTurns(updated);
        })
        .catch(() => {});
    },
    [translate],
  );

  // Moves the agent's line out of the live caption and into the transcript.
  // Held back until the voice has finished it, so the transcript and what is
  // audible stay in the same order as the learner's own turns land between them.
  const commitAgentTurn = useCallback(() => {
    if (agentCommittedRef.current) return;
    agentCommittedRef.current = true;

    const spoken = agentWordsRef.current.map((word) => word.delta).join("");
    // The deltas occasionally come up a few words short of the final text, so
    // the authoritative line wins once it has arrived.
    const text = agentFinalRef.current ?? spoken;
    // Started when that final text arrived. If it never did, this line is the
    // deltas instead and needs a translation of its own.
    const pending = agentFinalRef.current ? agentTranslationRef.current : null;

    agentWordsRef.current = [];
    agentFinalRef.current = null;
    agentTranslationRef.current = null;
    revealedCountRef.current = 0;
    setCaption(null);

    appendTurn("agent", text, pending);
  }, [appendTurn]);

  const revealTo = useCallback((playedSamples: number) => {
    const words = agentWordsRef.current;
    if (agentCommittedRef.current || words.length === 0) return;

    const playedMs = (playedSamples / SAMPLE_RATE) * 1000;
    let count = 0;
    while (count < words.length && words[count].startMs <= playedMs) count++;

    // Only ever forwards, and only when a word has actually been added, so a
    // caption redraw costs a render no more often than the voice says a word.
    if (count <= revealedCountRef.current) return;
    revealedCountRef.current = count;
    setCaption(
      words
        .slice(0, count)
        .map((word) => word.delta)
        .join(""),
    );
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
    thinkingTimeRef.current = false;
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

  const setThinkingTime = useCallback((on: boolean) => {
    const socket = socketRef.current;
    if (thinkingTimeRef.current === on) return;
    if (!socket || socket.readyState !== WebSocket.OPEN) return;
    thinkingTimeRef.current = on;
    socket.send(
      JSON.stringify({
        type: "session.update",
        session: {
          input: {
            turn_detection: on ? THINKING_TURN_DETECTION : TURN_DETECTION,
          },
        },
      }),
    );
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
          // Room reverb keeps echo going a moment after playback stops.
          speechBeganOverAgentRef.current =
            agentPlayingRef.current ||
            performance.now() - agentStoppedAtRef.current < ECHO_TAIL_MS;
          userSpeakingRef.current = true;
          nudgesInARowRef.current = 0;
          setUserSpeaking(true);
          // Barge-in: drop whatever the agent still had queued.
          clearPlayback();
          break;
        case "input.speech.stopped":
          userSpeakingRef.current = false;
          replyInFlightRef.current = true;
          setUserSpeaking(false);
          break;
        case "transcript.user.delta":
          setPartial(message.text ?? "");
          break;
        case "transcript.user":
          setPartial("");
          setThinkingTime(false);
          // Whatever the agent had already said belongs above this reply.
          commitAgentTurn();
          if (
            !echoGuardRef.current &&
            speechBeganOverAgentRef.current &&
            isEchoOf(message.text ?? "", agentSpeechRef.current)
          ) {
            echoGuardRef.current = true;
            setEchoDetected(true);
          }
          appendTurn("user", message.text ?? "");
          break;
        case "reply.started":
          agentWordsRef.current = [];
          agentFinalRef.current = null;
          agentTranslationRef.current = null;
          agentCommittedRef.current = false;
          revealedCountRef.current = 0;
          setCaption("");
          // Restarts the worklet's played-sample count, which the caption and
          // the start-of-reply cushion are both measured from.
          playerRef.current?.port.postMessage({ type: "reply" });
          break;
        case "transcript.agent.delta":
          // Normally reply.started opens the reply. If it is ever missed, the
          // first delta opens it instead, rather than the line being dropped.
          if (agentCommittedRef.current) {
            agentWordsRef.current = [];
            agentFinalRef.current = null;
            agentTranslationRef.current = null;
            agentCommittedRef.current = false;
            revealedCountRef.current = 0;
          }
          agentWordsRef.current = [
            ...agentWordsRef.current,
            { delta: message.delta ?? "", startMs: message.start_ms ?? 0 },
          ];
          // Deltas already carry their own trailing space, so they are joined
          // as-is rather than padded.
          agentSpeechRef.current = `${agentSpeechRef.current}${
            message.delta ?? ""
          }`.slice(-600);
          break;
        case "reply.audio":
          playChunk(message.data);
          break;
        case "transcript.agent":
          // A question they heard in full is what they are about to answer.
          if (!message.interrupted && /[?？؟]\s*$/.test(message.text ?? "")) {
            setThinkingTime(true);
          }
          // With no reply open there is nothing to reveal it against, so it
          // goes straight into the transcript rather than being lost.
          if (agentCommittedRef.current) {
            appendTurn("agent", message.text ?? "");
            break;
          }
          agentFinalRef.current = message.text ?? "";
          // Translate now rather than when the line is committed: this text
          // lands about a second into the reply, and the voice can still have
          // twenty-odd seconds of it left to say. Waiting for the commit meant
          // the translation only started once the agent had stopped talking.
          agentTranslationRef.current = translate(message.text ?? "");
          // An interrupted reply has no more audio coming, so the trimmed text
          // is final and there is nothing left to reveal it against.
          if (message.interrupted) commitAgentTurn();
          break;
        case "reply.done":
          playerRef.current?.port.postMessage({ type: "end" });
          leftoverByteRef.current = null;
          replyInFlightRef.current = false;
          quietSinceRef.current = performance.now();
          if (message.status === "interrupted") commitAgentTurn();
          break;
        case "session.error":
          setError(message.message ?? "The session hit an error.");
          setStatus("error");
          break;
      }
    },
    [
      appendTurn,
      clearPlayback,
      commitAgentTurn,
      playChunk,
      setThinkingTime,
      translate,
    ],
  );

  const start = useCallback(async () => {
    // First, while this click still counts as a user gesture: Chrome only
    // allows downloading a translation model with user activation.
    if (!translatorRef.current) {
      setTranslatorStatus("loading");
      prepareTranslator(targetLanguageCode, nativeLanguageCode).then(
        (translator) => {
          translatorRef.current = translator;
          setTranslatorStatus(translator ? "ready" : "unsupported");
        },
      );
    }

    // Also inside the gesture, before any await. Chrome starts an AudioContext
    // suspended once the click's activation has lapsed, and the token fetch,
    // microphone prompt and worklet loads below easily outlast it: the agent's
    // audio then streams in and plays as silence.
    const playbackContext = new AudioContext({ sampleRate: SAMPLE_RATE });
    playbackContextRef.current = playbackContext;
    void playbackContext.resume();

    setStatus("connecting");
    setError(null);

    try {
      const response = await fetch("/api/voice/token");
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? "Could not start the session.");
      }
      const { token } = await response.json();

      // Echo cancellation is what lets a learner talk over the agent on a
      // laptop's own speakers, but on macOS Chrome it is also known to pull the
      // Web Audio output gain down a few seconds into a session, which is heard
      // as the agent going quiet and metallic. Automatic gain control adds a
      // ramp of its own on top, so it is turned off explicitly rather than left
      // to the browser's default of on.
      //
      // `?aec=off` disables cancellation entirely for a side-by-side listen. It
      // is a diagnostic, not a setting: without it the agent hears itself and
      // interrupts itself on speakers.
      const echoCancellation =
        new URLSearchParams(window.location.search).get("aec") !== "off";
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });
      streamRef.current = stream;
      console.info(
        `[voces] echo cancellation ${echoCancellation ? "on" : "off"}, auto gain control off`,
      );

      // Left at the hardware rate: forcing 24 kHz silently disables echo
      // cancellation in Firefox and Safari, so the worklet resamples instead.
      const captureContext = new AudioContext();
      captureContextRef.current = captureContext;
      await captureContext.audioWorklet.addModule("/pcm-processor.js");

      // The agent's audio is 24 kHz PCM16 and is fed to the worklet as raw
      // samples, so a context that came back at some other rate would play it
      // at the wrong speed. Chromium honours the request and other browsers may
      // not, and the device can also force a rate of its own, so it is worth
      // being able to see what was actually granted.
      if (playbackContext.sampleRate !== SAMPLE_RATE) {
        console.warn(
          `[voces] playback context is ${playbackContext.sampleRate}Hz, expected ${SAMPLE_RATE}Hz`,
        );
      }
      console.info(
        `[voces] playback ${playbackContext.sampleRate}Hz, capture ${captureContext.sampleRate}Hz`,
      );
      await playbackContext.audioWorklet.addModule("/playback-processor.js");
      // Resuming again is harmless if it is already running, and catches a
      // context that was created suspended regardless.
      await playbackContext.resume().catch(() => {});
      if (playbackContext.state !== "running") {
        console.warn(`[voces] playback context is ${playbackContext.state}`);
      }
      const player = new AudioWorkletNode(playbackContext, "playback-processor", {
        outputChannelCount: [1],
      });
      // Driven by what is actually audible, not by when the reply was sent,
      // so the indicator doesn't stop while the voice is still playing.
      player.port.onmessage = ({ data }) => {
        if (data.type === "progress") {
          revealTo(data.played);
          return;
        }

        if (data.type === "stats") {
          // One line per reply, so a rough session can be read off the console
          // instead of guessed at: how much silence had to be inserted, and how
          // much head start the next reply will take because of it.
          console.info(
            `[voces] reply ${data.spokenMs}ms spoken, ${data.starvedMs}ms starved, cushion used ${data.cushionMs}ms | peak ${data.peak}, rms ${data.rms}, splices ${data.jumps} (${data.jumpsPerSecond}/s)`,
          );
          return;
        }

        const playing = data.type === "playing";
        agentPlayingRef.current = playing;
        revealTo(data.played);
        if (!playing) {
          agentStoppedAtRef.current = performance.now();
          // Quiet is counted from when the voice stops being audible, not from
          // when the service finished sending it.
          quietSinceRef.current = performance.now();
          // Stopping because the reply ran out, not because it stalled: the
          // line has now been heard in full and can join the transcript.
          if (data.drained) commitAgentTurn();
        }
        setAgentSpeaking(playing);
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
              // Volume is left unset by default; asking for the top of the
              // 0-100 range keeps the agent audible against a laptop speaker.
              output: { voice, volume: 100 },
              input: {
                language_codes: languageCodes,
                keyterms: keyterms.length > 0 ? keyterms : undefined,
                transcription_prompt: transcriptionPrompt,
                // max_accuracy was tried for accented speech and added 0.5-1 s to
                // every reply on top of the fallback above, so the default stays.
                // Server-side suppression of room noise and of the agent's own
                // voice bouncing back off the room. Browser noise suppression
                // stays off, since running both eats real speech.
                voice_focus: "near-field",
                turn_detection: TURN_DETECTION,
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
          const muted =
            echoGuardRef.current &&
            (agentPlayingRef.current ||
              performance.now() - agentStoppedAtRef.current < ECHO_TAIL_MS);
          // Silence rather than nothing, so the stream keeps its timing.
          const pcm = muted
            ? new Uint8Array(event.data.byteLength)
            : new Uint8Array(event.data);
          socket.send(
            JSON.stringify({ type: "input.audio", audio: toBase64(pcm) }),
          );
        };

        source.connect(worklet);
      });

      socket.addEventListener("message", handleMessage);
      // "close" always follows "error", and also fires on its own when the
      // service ends the session (a dropped network, the session time cap).
      // Without handling it the screen would sit on "live" with nothing
      // listening.
      socket.addEventListener("close", () => {
        if (socketRef.current !== socket) return;
        teardown();
        if (transcriptRef.current.length > 0) {
          // Keep what was said: treat it as the end of the conversation.
          saveRef.current?.();
        } else {
          setError("Lost the connection to the voice service.");
          setStatus("error");
        }
      });
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not start the session.",
      );
      setStatus("error");
      teardown();
    }
  }, [
    handleMessage,
    keyterms,
    languageCodes,
    nativeLanguageCode,
    systemPrompt,
    targetLanguageCode,
    teardown,
    transcriptionPrompt,
    voice,
    commitAgentTurn,
    revealTo,
  ]);

  const save = useCallback(async () => {
    setStatus("ending");
    // A reply cut off by the learner ending the session is still part of the
    // conversation, and transcriptRef is read below.
    commitAgentTurn();
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
  }, [commitAgentTurn, router, sessionId]);

  useEffect(() => {
    saveRef.current = save;
  }, [save]);

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

  useEffect(() => {
    if (status !== "live") return;
    const check = setInterval(() => {
      const socket = socketRef.current;
      if (
        !socket ||
        socket.readyState !== WebSocket.OPEN ||
        userSpeakingRef.current ||
        agentPlayingRef.current ||
        replyInFlightRef.current ||
        nudgesInARowRef.current >= MAX_NUDGES_IN_A_ROW ||
        performance.now() - quietSinceRef.current < NUDGE_AFTER_MS
      ) {
        return;
      }
      nudgesInARowRef.current += 1;
      replyInFlightRef.current = true;
      socket.send(
        JSON.stringify({
          type: "reply.create",
          instructions: `They've gone quiet and may be stuck. Don't mention the silence or their ${languageLabel}. Ask one simple, friendly question about their own life that they can answer in one or two words.`,
        }),
      );
    }, 1000);
    return () => clearInterval(check);
  }, [languageLabel, status]);

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
            {echoDetected && (
              <p
                dir="ltr"
                className="rounded-2xl border border-border bg-surface px-4 py-3 text-[13px] leading-relaxed text-muted"
              >
                Your mic was picking up the voice from your speakers, so
                it&apos;s now muted while your partner talks. Wait for them to
                finish before you reply, or use headphones to talk over them
                freely.
              </p>
            )}
            {turns.length === 0 && !partial && !caption && (
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
                  {showTranslations && turn.translation && (
                    <p
                      dir={translationDirection}
                      className="text-[13px] leading-relaxed text-muted/70"
                    >
                      {turn.translation}
                    </p>
                  )}
                </div>
              ) : (
                <div key={index} className="flex flex-col items-end gap-1.5">
                  <p className="max-w-[80%] rounded-2xl border border-border bg-surface px-4 py-3 text-[17px] leading-relaxed text-muted">
                    {turn.text}
                  </p>
                  {showTranslations && turn.translation && (
                    <p
                      dir={translationDirection}
                      className="max-w-[80%] px-1 text-[13px] leading-relaxed text-muted/70"
                    >
                      {turn.translation}
                    </p>
                  )}
                </div>
              ),
            )}

            {caption && (
              <div className="flex flex-col gap-2">
                <span className="text-[9px] font-bold tracking-[0.18em] text-accent">
                  VOCES
                </span>
                <p className="text-[17px] leading-relaxed">{caption}</p>
              </div>
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

            <div className="flex items-center gap-3">
            {translatorStatus === "unsupported" ? (
              <span className="hidden text-[12px] text-muted sm:inline">
                Translations need Chrome
              </span>
            ) : (
              <button
                type="button"
                onClick={toggleTranslations}
                aria-pressed={showTranslations}
                className={`rounded-full px-4 py-3 text-[13px] font-medium transition-colors ${
                  showTranslations
                    ? "bg-accent-soft text-accent"
                    : "text-muted hover:text-foreground"
                }`}
              >
                {translatorStatus === "loading" && showTranslations
                  ? "Preparing translation…"
                  : showTranslations
                    ? "Translation on"
                    : "Translation off"}
              </button>
            )}
            <button
              onClick={end}
              disabled={status === "ending"}
              className="rounded-full border border-border px-6 py-3 text-[15px] font-semibold transition-colors hover:bg-surface disabled:opacity-60"
            >
              {status === "ending" ? "Wrapping up…" : "End conversation"}
            </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
