"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { Flag } from "@/components/flag";
import { Landmark } from "@/components/landmarks";
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

// The partner voices do not come out of the service at the same level. Measured
// on the raw audio of a spoken reply from each, every voice but alba arrived 4-10
// dB quieter, and lola 10 dB duller above 8 kHz; the service's volume setting
// made no measurable difference. Learners heard the others as low and muffled,
// turned their speakers up to compensate, and heard those distort. Each voice is
// brought up to alba's level here, with a gentle treble lift for the dull ones,
// and a limiter after so the boost can never clip.
const VOICE_TUNING: Record<string, { gainDb: number; brightenDb: number }> = {
  alba: { gainDb: 0, brightenDb: 0 },
  estelle: { gainDb: 4, brightenDb: 1.5 },
  lola: { gainDb: 5, brightenDb: 5 },
  giovanni: { gainDb: 6, brightenDb: 3 },
  rafael: { gainDb: 8, brightenDb: 3 },
  juergen: { gainDb: 8, brightenDb: 3 },
};

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
  // Set when the microphone in use can only send narrowband audio, named so
  // the learner knows which device to switch away from.
  const [lowQualityMic, setLowQualityMic] = useState<string | null>(null);
  const [micMuted, setMicMuted] = useState(false);
  const [speakerMuted, setSpeakerMuted] = useState(false);
  const micMutedRef = useRef(false);
  const speakerMutedRef = useRef(false);
  // Sits between the player and the speakers, so muting the agent's voice
  // leaves the worklet running and the captions still advancing.
  const outputGainRef = useRef<GainNode | null>(null);

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
    outputGainRef.current = null;
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

      // Recordings of real sessions showed the learner's audio cut off above
      // about 5 kHz, with the consonants that tell "pasta" from "basta" gone
      // before it ever reached the recogniser. A Bluetooth headset's mic does
      // exactly that: using it switches the headset into its call profile.
      const track = stream.getAudioTracks()[0];
      const settings = track?.getSettings() ?? {};
      console.info(
        `[voces] microphone "${track?.label ?? "unknown"}" at ${settings.sampleRate ?? "?"} Hz`,
      );
      if (
        track &&
        ((settings.sampleRate !== undefined && settings.sampleRate <= 16000) ||
          /airpods|bluetooth|hands-?free|headset|buds|beats|bose|sony wh|jabra/i.test(
            track.label,
          ))
      ) {
        setLowQualityMic(track.label || "your headset");
      }
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
      const tuning = VOICE_TUNING[voice] ?? VOICE_TUNING.alba;
      const brighten = playbackContext.createBiquadFilter();
      brighten.type = "highshelf";
      brighten.frequency.value = 5000;
      brighten.gain.value = tuning.brightenDb;
      const makeup = playbackContext.createGain();
      makeup.gain.value = 10 ** (tuning.gainDb / 20);
      // A brick-wall limiter just under full scale: transparent on normal
      // speech, and only ever touches the loudest syllables of a boosted voice.
      const limiter = playbackContext.createDynamicsCompressor();
      limiter.threshold.value = -3;
      limiter.knee.value = 0;
      limiter.ratio.value = 20;
      limiter.attack.value = 0.002;
      limiter.release.value = 0.1;
      const outputGain = playbackContext.createGain();
      outputGain.gain.value = speakerMutedRef.current ? 0 : 1;
      player
        .connect(brighten)
        .connect(makeup)
        .connect(limiter)
        .connect(outputGain)
        .connect(playbackContext.destination);
      outputGainRef.current = outputGain;
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
            micMutedRef.current ||
            (echoGuardRef.current &&
              (agentPlayingRef.current ||
                performance.now() - agentStoppedAtRef.current < ECHO_TAIL_MS));
          // Silence rather than nothing, so the stream keeps its timing.
          const pcm = muted
            ? new Uint8Array(event.data.byteLength)
            : new Uint8Array(event.data);
          socket.send(
            JSON.stringify({ type: "input.audio", audio: toBase64(pcm) }),
          );
        };

        // Rumble below 80 Hz (desk knocks, fans, handling) was over half the
        // energy in recorded learner audio and carries no speech.
        const highPass = captureContext.createBiquadFilter();
        highPass.type = "highpass";
        highPass.frequency.value = 80;
        source.connect(highPass).connect(worklet);
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

  // Keeps the newest line in view as the conversation grows, unless the
  // learner has scrolled up to reread something: then it waits until they
  // come back near the bottom rather than pulling them away mid-read.
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const followRef = useRef(true);
  const lastScrollTopRef = useRef(0);

  const onTranscriptScroll = useCallback(() => {
    const element = scrollRef.current;
    if (!element) return;
    const fromBottom =
      element.scrollHeight - element.clientHeight - element.scrollTop;
    if (fromBottom < 120) {
      followRef.current = true;
    } else if (element.scrollTop < lastScrollTopRef.current - 2) {
      // Only an upward scroll opts out. A smooth scroll towards a line that
      // just grew the transcript also reads as "far from the bottom" part-way.
      followRef.current = false;
    }
    lastScrollTopRef.current = element.scrollTop;
  }, []);

  useEffect(() => {
    const element = scrollRef.current;
    if (!element || !followRef.current) return;
    element.scrollTo({ top: element.scrollHeight, behavior: "smooth" });
  }, [turns, caption, partial, showTranslations, echoDetected]);

  const toggleMic = useCallback(() => {
    setMicMuted((muted) => {
      micMutedRef.current = !muted;
      return !muted;
    });
  }, []);

  const toggleSpeaker = useCallback(() => {
    setSpeakerMuted((muted) => {
      speakerMutedRef.current = !muted;
      const gain = outputGainRef.current;
      if (gain) gain.gain.value = muted ? 1 : 0;
      return !muted;
    });
  }, []);

  const active = status === "live" || status === "ending";

  const statusText =
    status === "ending"
      ? "Wrapping up…"
      : micMuted
        ? "Your mic is muted"
        : agentSpeaking
          ? "Speaking…"
          : userSpeaking
            ? "Listening…"
            : "Your turn";

  return (
    <main className="fixed inset-0 flex flex-col overflow-hidden bg-[#14110A] text-white">
      <DuskScene code={targetLanguageCode} />

      <header className="relative z-10 flex h-[66px] shrink-0 items-center justify-between gap-3 px-5 md:h-[76px] md:px-10">
        <div className="flex items-center gap-4">
          {active && (
            <button
              type="button"
              onClick={end}
              disabled={status === "ending"}
              aria-label="End conversation"
              className="grid size-9 place-items-center rounded-full bg-[#120E0A]/35 backdrop-blur-sm transition-colors hover:bg-[#120E0A]/55 md:hidden"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
                <path d="M2.4 2.4 L11.6 11.6" />
                <path d="M11.6 2.4 L2.4 11.6" />
              </svg>
            </button>
          )}
          <Link href="/dashboard" aria-label="VOCES dashboard" className="flex items-center gap-2">
            <svg width="22" height="22" viewBox="0 0 48 48" fill="#FFFFFF" aria-hidden>
              <rect x="0" y="17" width="6" height="14" rx="3" />
              <rect x="10.5" y="9" width="6" height="30" rx="3" />
              <rect x="21" y="0" width="6" height="48" rx="3" />
              <rect x="31.5" y="9" width="6" height="30" rx="3" />
              <rect x="42" y="17.5" width="6" height="13" rx="3" />
            </svg>
            <span className="text-[15px] font-bold tracking-[0.14em] md:text-[17px]">
              VOCES
            </span>
          </Link>
          {status === "live" && (
            <span className="hidden text-[13px] font-medium text-white/70 tabular-nums sm:inline">
              {minutes}:{seconds}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2.5 md:gap-3.5">
          {active &&
            (translatorStatus === "unsupported" ? (
              <span className="hidden text-[12px] text-white/70 lg:inline">
                Translations need Chrome
              </span>
            ) : (
              <button
                type="button"
                onClick={toggleTranslations}
                aria-pressed={showTranslations}
                aria-label={showTranslations ? "Hide translations" : "Show translations"}
                className={`grid h-10 min-w-10 place-items-center rounded-full text-[13px] font-semibold backdrop-blur-sm transition-colors sm:px-4 md:h-11 ${
                  showTranslations
                    ? "bg-white text-[#14110A]"
                    : "bg-[#1C1610]/40 hover:bg-[#1C1610]/60"
                }`}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="sm:hidden">
                  <path d="M4 5h11" />
                  <path d="M9 3v2" />
                  <path d="M12.5 5c0 5-4 9-8.5 10" />
                  <path d="M6.5 9c1.6 3 4.2 5.3 7 6.2" />
                  <path d="M13 21l4.2-9.6L21.4 21" />
                  <path d="M14.7 17.6h5" />
                </svg>
                <span aria-hidden className="hidden sm:inline">
                  {translatorStatus === "loading" && showTranslations
                    ? "Preparing…"
                    : "Translation"}
                </span>
              </button>
            ))}

          {/* Changing language mid-conversation would drop the session, so the
              pill only links to settings before one has started. */}
          {active ? (
            <span className="flex h-10 items-center gap-2.5 rounded-full bg-[#1C1610]/40 pr-4 pl-2 backdrop-blur-sm md:h-11">
              <Flag code={targetLanguageCode} size={28} />
              <span className="text-[14px] font-semibold md:text-[15px]">{languageLabel}</span>
            </span>
          ) : (
            <Link
              href="/settings"
              className="flex h-10 items-center gap-2.5 rounded-full bg-[#1C1610]/40 pr-4 pl-2 backdrop-blur-sm transition-colors hover:bg-[#1C1610]/60 md:h-11"
            >
              <Flag code={targetLanguageCode} size={28} />
              <span className="text-[14px] font-semibold md:text-[15px]">{languageLabel}</span>
              <svg width="7" height="12" viewBox="0 0 7 12" fill="none" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M1 1 L6 6 L1 11" />
              </svg>
            </Link>
          )}

          {active && (
            <button
              type="button"
              onClick={end}
              disabled={status === "ending"}
              aria-label="End conversation"
              className="hidden size-11 place-items-center rounded-full bg-[#1C1610]/40 backdrop-blur-sm transition-colors hover:bg-[#1C1610]/60 md:grid"
            >
              <svg width="16" height="16" viewBox="0 0 14 14" fill="none" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
                <path d="M2.4 2.4 L11.6 11.6" />
                <path d="M11.6 2.4 L2.4 11.6" />
              </svg>
            </button>
          )}
        </div>
      </header>

      {status === "idle" && (
        <CenteredPanel>
          <h1 className="text-[32px] leading-tight font-bold tracking-[-0.02em] md:text-[40px]">
            Ready when you are
          </h1>
          <p className="mt-3 max-w-[420px] text-[16px] leading-relaxed text-white/80">
            Speak naturally. If a word escapes you, say it in your own language
            and keep going — you&apos;ll be understood.
          </p>
          <button
            onClick={start}
            className="mt-8 flex h-[60px] items-center gap-3 rounded-full bg-[#DB611C] pr-8 pl-6 text-lg font-semibold shadow-[0_16px_40px_rgba(238,112,33,0.38)] transition-colors hover:bg-[#C74D17]"
          >
            <MicIcon size={24} />
            Start the conversation
          </button>
        </CenteredPanel>
      )}

      {status === "connecting" && (
        <CenteredPanel>
          <p className="text-[17px] text-white/85">Connecting…</p>
        </CenteredPanel>
      )}

      {status === "save-failed" && (
        <CenteredPanel>
          <h1 className="text-[26px] leading-tight font-bold tracking-[-0.02em]">
            Your conversation didn&apos;t save
          </h1>
          <p className="mt-3 max-w-[420px] text-[15px] leading-relaxed text-white/80">
            It&apos;s still here — don&apos;t close this tab. Try again, and if
            it keeps failing, send this on:
          </p>
          <p className="mt-4 max-w-[420px] rounded-2xl bg-black/40 px-5 py-4 font-mono text-[12px] leading-relaxed text-[#F7B98E]">
            {error}
          </p>
          <button
            onClick={save}
            className="mt-6 h-14 rounded-full bg-[#DB611C] px-7 text-base font-semibold transition-colors hover:bg-[#C74D17]"
          >
            Try saving again
          </button>
        </CenteredPanel>
      )}

      {status === "error" && (
        <CenteredPanel>
          <p className="max-w-[420px] rounded-2xl bg-black/40 px-5 py-4 text-[15px] leading-relaxed text-[#F7B98E]">
            {error}
          </p>
          <button
            onClick={start}
            className="mt-6 h-12 rounded-full bg-white/15 px-6 text-[15px] font-semibold backdrop-blur-sm transition-colors hover:bg-white/25"
          >
            Try again
          </button>
        </CenteredPanel>
      )}

      {active && (
        <>
          <div
            ref={scrollRef}
            onScroll={onTranscriptScroll}
            className="relative z-10 min-h-0 flex-1 overflow-y-auto [mask-image:linear-gradient(to_bottom,transparent,black_40px)]"
          >
            <div className="mx-auto w-full max-w-[1280px] px-5 md:px-20">
              <div className="flex max-w-[620px] flex-col gap-[18px] pt-10 pb-6 md:gap-[22px] md:pt-16" dir={direction}>
                {lowQualityMic && (
                  <p dir="ltr" className="rounded-2xl bg-black/45 px-4 py-3 text-[13px] leading-relaxed text-white/85 backdrop-blur-sm">
                    You&apos;re speaking into {lowQualityMic}. Headset
                    microphones send low-quality audio, so words can be
                    misheard. For better recognition, switch to your
                    computer&apos;s built-in microphone (the mic icon in the
                    address bar) and keep the headphones for listening.
                  </p>
                )}
                {echoDetected && (
                  <p dir="ltr" className="rounded-2xl bg-black/45 px-4 py-3 text-[13px] leading-relaxed text-white/85 backdrop-blur-sm">
                    Your mic was picking up the voice from your speakers, so
                    it&apos;s now muted while your partner talks. Wait for them
                    to finish before you reply, or use headphones to talk over
                    them freely.
                  </p>
                )}
                {turns.length === 0 && !partial && !caption && (
                  <p dir="ltr" className="text-[16px] text-white/85">
                    Connected — your partner is about to speak.
                  </p>
                )}

                {turns.map((turn, index) =>
                  turn.role === "agent" ? (
                    <AgentBubble
                      key={index}
                      text={turn.text}
                      translation={showTranslations ? turn.translation : undefined}
                      translationDirection={translationDirection}
                    />
                  ) : (
                    <UserBubble
                      key={index}
                      text={turn.text}
                      translation={showTranslations ? turn.translation : undefined}
                      translationDirection={translationDirection}
                    />
                  ),
                )}

                {caption && <AgentBubble text={caption} />}
                {partial && <UserBubble text={partial} pending />}
              </div>
            </div>
          </div>

          <div className="relative z-10 flex shrink-0 flex-col items-center gap-4 pt-4 pb-7 md:gap-5 md:pb-10">
            <div className="flex items-center gap-14 md:gap-[60px]">
              <button
                type="button"
                onClick={toggleSpeaker}
                aria-pressed={speakerMuted}
                aria-label={speakerMuted ? "Unmute your partner" : "Mute your partner"}
                className={`grid size-14 place-items-center rounded-full backdrop-blur-sm transition-colors md:size-[60px] ${
                  speakerMuted ? "bg-white text-[#14110A]" : "bg-white/13 hover:bg-white/20"
                }`}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M4 9.5 h3.4 L12.4 5.4 v13.2 L7.4 14.5 H4 Z" fill="currentColor" />
                  {speakerMuted ? (
                    <>
                      <path d="M16.2 9.4 L21 14.2" />
                      <path d="M21 9.4 L16.2 14.2" />
                    </>
                  ) : (
                    <>
                      <path d="M16.4 9.4 a4 4 0 0 1 0 5.2" />
                      <path d="M19.2 6.9 a7.6 7.6 0 0 1 0 10.2" />
                    </>
                  )}
                </svg>
              </button>

              <button
                type="button"
                onClick={toggleMic}
                aria-pressed={micMuted}
                aria-label={micMuted ? "Unmute your microphone" : "Mute your microphone"}
                className={`relative grid size-[88px] place-items-center rounded-full transition-colors md:size-24 ${
                  micMuted
                    ? "bg-white/20 backdrop-blur-sm"
                    : "bg-[#EE7021] shadow-[0_16px_40px_rgba(238,112,33,0.38)] hover:bg-[#DB611C]"
                }`}
              >
                {!micMuted && userSpeaking && (
                  <span className="absolute inset-0 animate-ping rounded-full bg-[#EE7021]/40 motion-reduce:animate-none" />
                )}
                <MicIcon size={36} muted={micMuted} />
              </button>

              <button
                type="button"
                onClick={end}
                disabled={status === "ending"}
                aria-label="End conversation"
                className="grid size-14 place-items-center rounded-full bg-white/13 backdrop-blur-sm transition-colors hover:bg-white/20 disabled:opacity-60 md:size-[60px]"
              >
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
                  <circle cx="12" cy="12" r="8.6" />
                  <path d="M8.8 8.8 L15.2 15.2" />
                  <path d="M15.2 8.8 L8.8 15.2" />
                </svg>
              </button>
            </div>

            <p aria-live="polite" className="text-[15px] font-medium tracking-[0.01em] text-white/90 md:text-base">
              {statusText}
            </p>
          </div>
        </>
      )}
    </main>
  );
}

function CenteredPanel({ children }: { children: ReactNode }) {
  return (
    <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 pb-16 text-center">
      {children}
    </div>
  );
}

function MicIcon({ size, muted = false }: { size: number; muted?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <rect x="9" y="2.4" width="6" height="12" rx="3" fill="#FFFFFF" stroke="none" />
      <path d="M5.5 11.2v1a6.5 6.5 0 0 0 13 0v-1" />
      <path d="M12 19.4V22" />
      {muted && <path d="M3.5 3.5 L20.5 20.5" strokeWidth="2.2" />}
    </svg>
  );
}

function AgentBubble({
  text,
  translation,
  translationDirection,
}: {
  text: string;
  translation?: string;
  translationDirection?: "ltr" | "rtl";
}) {
  return (
    <div className="max-w-[85%] self-start rounded-[20px_20px_20px_5px] bg-[#F7F1EC] px-[17px] py-[13px] shadow-[0_12px_28px_rgba(0,0,0,0.24)] md:max-w-[470px] md:rounded-[24px_24px_24px_6px] md:px-[22px] md:py-4">
      <p className="text-[15px] leading-5 font-semibold text-[#17181A] md:text-[17px] md:leading-6">
        {text}
      </p>
      {translation && (
        <p dir={translationDirection} className="mt-1 text-[13px] leading-[19px] text-[#6F757B] md:mt-[5px] md:text-[15px] md:leading-[22px]">
          {translation}
        </p>
      )}
    </div>
  );
}

function UserBubble({
  text,
  translation,
  translationDirection,
  pending = false,
}: {
  text: string;
  translation?: string;
  translationDirection?: "ltr" | "rtl";
  pending?: boolean;
}) {
  return (
    <div
      className={`max-w-[85%] self-end rounded-[20px_20px_5px_20px] px-[17px] py-[13px] shadow-[0_12px_28px_rgba(0,0,0,0.26)] md:max-w-[400px] md:rounded-[24px_24px_6px_24px] md:px-[22px] md:py-4 ${
        // Words still being recognised read as provisional until the turn ends.
        pending ? "border-2 border-dashed border-white/40 bg-[#DB611C]/60" : "bg-[#DB611C]"
      }`}
    >
      <p className="text-[15px] leading-5 font-semibold text-white md:text-[17px] md:leading-6">
        {text}
      </p>
      {translation && (
        <p dir={translationDirection} className="mt-1.5 text-[13px] leading-[19px] text-white/85 md:text-[15px] md:leading-[22px]">
          {translation}
        </p>
      )}
    </div>
  );
}

// The dusk city from the design, drawn behind everything, with a landmark
// from the country of the language being practised on its skyline.
function DuskScene({ code }: { code: string }) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <svg viewBox="0 0 1280 800" preserveAspectRatio="xMidYMax slice" fill="none" className="absolute inset-0 hidden size-full md:block">
        <defs>
          <linearGradient id="cdSky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#454449" />
            <stop offset="0.12" stopColor="#57514F" />
            <stop offset="0.26" stopColor="#72605A" />
            <stop offset="0.40" stopColor="#99745E" />
            <stop offset="0.54" stopColor="#B8845F" />
            <stop offset="0.66" stopColor="#C28C63" />
            <stop offset="0.78" stopColor="#A97350" />
            <stop offset="1" stopColor="#6B4429" />
          </linearGradient>
          <linearGradient id="cdFloor" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#3A2A14" stopOpacity="0" />
            <stop offset="0.5" stopColor="#241B0E" stopOpacity="0.85" />
            <stop offset="1" stopColor="#13110A" stopOpacity="1" />
          </linearGradient>
          <linearGradient id="cdReadScrim" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#120F0B" stopOpacity="0.68" />
            <stop offset="0.42" stopColor="#120F0B" stopOpacity="0.30" />
            <stop offset="0.72" stopColor="#120F0B" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="cdTopScrim" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#1B1A20" stopOpacity="0.58" />
            <stop offset="1" stopColor="#1B1A20" stopOpacity="0" />
          </linearGradient>
        </defs>
        <rect width="1280" height="620" fill="url(#cdSky)" />
        <g fill="#C79A7C" fillOpacity="0.28">
          <ellipse cx="380" cy="150" rx="440" ry="18" />
          <ellipse cx="980" cy="214" rx="380" ry="15" />
          <ellipse cx="300" cy="286" rx="400" ry="16" />
          <ellipse cx="1040" cy="330" rx="330" ry="13" />
        </g>
        <g fill="#6E5A56" fillOpacity="0.32">
          <ellipse cx="820" cy="122" rx="420" ry="15" />
          <ellipse cx="260" cy="206" rx="360" ry="12" />
          <ellipse cx="900" cy="270" rx="380" ry="13" />
        </g>
        <path d="M0 402 C 220 386 400 396 620 390 C 840 384 1060 396 1280 382 L 1280 450 L 0 450 Z" fill="#7A5436" fillOpacity="0.5" />
        {/* Right of centre, so the transcript column stays clear. */}
        <Landmark code={code} x={880} baseline={530} />
        <g fill="#7A4A26">
          <path d="M0 486 L120 452 L246 486 L246 570 L0 570 Z" />
          <path d="M300 500 L420 466 L544 500 L544 578 L300 578 Z" />
          <path d="M580 512 L700 480 L820 512 L820 584 L580 584 Z" />
          <path d="M1036 508 L1120 482 L1206 508 L1206 580 L1036 580 Z" />
        </g>
        <rect y="540" width="1280" height="70" fill="#5C3519" />
        <g fill="#C98F45">
          {[[70, 512], [150, 512], [368, 526], [452, 526], [652, 540], [736, 540], [1090, 536]].map(([x, y]) => (
            <rect key={x} x={x} y={y} width="11" height="20" rx="5" />
          ))}
        </g>
        <path d="M0 586 C 96 548 190 580 280 554 C 372 578 448 600 528 584 C 616 566 706 592 796 572 C 890 552 986 584 1080 566 C 1160 550 1224 578 1280 566 L 1280 760 L 0 760 Z" fill="#313318" />
        <path d="M0 646 C 140 616 272 640 400 624 C 536 606 656 634 792 622 C 928 610 1060 638 1280 616 L 1280 820 L 0 820 Z" fill="#23240F" />
        <rect y="470" width="1280" height="330" fill="url(#cdFloor)" />
        <rect width="1280" height="800" fill="url(#cdReadScrim)" />
        <rect width="1280" height="200" fill="url(#cdTopScrim)" />
      </svg>

      <svg viewBox="0 0 390 844" preserveAspectRatio="xMidYMax slice" fill="none" className="absolute inset-0 size-full md:hidden">
        <defs>
          <linearGradient id="cmSky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#454449" />
            <stop offset="0.10" stopColor="#55504F" />
            <stop offset="0.22" stopColor="#6E5D57" />
            <stop offset="0.34" stopColor="#93705C" />
            <stop offset="0.46" stopColor="#B4805E" />
            <stop offset="0.57" stopColor="#C28C63" />
            <stop offset="0.68" stopColor="#B07A54" />
            <stop offset="0.82" stopColor="#7E5232" />
            <stop offset="1" stopColor="#4A2F19" />
          </linearGradient>
          <linearGradient id="cmFloor" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#3A2A14" stopOpacity="0" />
            <stop offset="0.45" stopColor="#241B0E" stopOpacity="0.85" />
            <stop offset="1" stopColor="#13110A" stopOpacity="1" />
          </linearGradient>
          <linearGradient id="cmTopScrim" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#1B1A20" stopOpacity="0.55" />
            <stop offset="1" stopColor="#1B1A20" stopOpacity="0" />
          </linearGradient>
        </defs>
        <rect width="390" height="620" fill="url(#cmSky)" />
        <g fill="#C79A7C" fillOpacity="0.30">
          <ellipse cx="120" cy="150" rx="150" ry="16" />
          <ellipse cx="300" cy="206" rx="120" ry="13" />
          <ellipse cx="80" cy="258" rx="130" ry="14" />
          <ellipse cx="320" cy="300" rx="110" ry="12" />
        </g>
        <g fill="#6E5A56" fillOpacity="0.34">
          <ellipse cx="250" cy="120" rx="140" ry="14" />
          <ellipse cx="90" cy="196" rx="110" ry="11" />
          <ellipse cx="270" cy="262" rx="120" ry="12" />
        </g>
        <path d="M0 392 C 70 376 130 386 190 380 C 250 374 320 384 390 372 L 390 430 L 0 430 Z" fill="#7A5436" fillOpacity="0.55" />
        <Landmark code={code} x={24} baseline={488} scale={0.6} />
        <g fill="#7A4A26">
          <path d="M0 470 L44 442 L92 470 L92 540 L0 540 Z" />
          <path d="M130 486 L180 458 L232 486 L232 548 L130 548 Z" />
          <path d="M236 500 L286 474 L336 500 L336 556 L236 556 Z" />
          <path d="M340 492 L390 468 L390 556 L340 556 Z" />
        </g>
        <rect y="512" width="390" height="56" fill="#5C3519" />
        <g fill="#C98F45">
          {[[22, 492], [54, 492], [152, 506], [196, 506], [264, 520], [300, 520]].map(([x, y]) => (
            <rect key={x} x={x} y={y} width="8" height="16" rx="4" />
          ))}
        </g>
        <path d="M0 556 C 30 520 62 548 88 524 C 116 546 138 566 160 552 C 186 536 214 560 240 544 C 268 528 300 556 330 540 C 356 528 374 548 390 538 L 390 700 L 0 700 Z" fill="#313318" />
        <path d="M0 610 C 44 584 84 606 124 592 C 168 576 206 604 248 592 C 292 580 332 606 390 588 L 390 760 L 0 760 Z" fill="#23240F" />
        <rect y="470" width="390" height="374" fill="url(#cmFloor)" />
        <rect width="390" height="180" fill="url(#cmTopScrim)" />
        {/* The transcript runs over the whole narrow screen, so the scene is
            dimmed evenly to keep the bubbles readable. */}
        <rect width="390" height="844" fill="#120F0B" fillOpacity="0.25" />
      </svg>
    </div>
  );
}
