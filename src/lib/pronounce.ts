"use client";

// The conversation partners are all specific Europeans (Lola from Spain,
// Rafael from Portugal, Alba from England), so pronunciation prefers the same
// accent rather than the generic or most common regional variant.
const LOCALES: Record<string, string> = {
  es: "es-ES",
  fr: "fr-FR",
  de: "de-DE",
  it: "it-IT",
  pt: "pt-PT",
  en: "en-GB",
};

export function canPronounce() {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

// getVoices() returns an empty list until the browser has finished loading
// them, which on the very first call is often after this function has
// already returned — that race, not a missing voice, is why a fresh page
// load would fall back to whatever the default voice is (typically English)
// instead of actually finding the French one. voiceschanged fires once
// they're ready, but some engines never fire it, so this also gives up and
// uses whatever is available after a short wait rather than hanging forever.
let voicesReady: Promise<SpeechSynthesisVoice[]> | null = null;
function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  if (!canPronounce()) return Promise.resolve([]);
  const synth = window.speechSynthesis;
  const existing = synth.getVoices();
  if (existing.length > 0) return Promise.resolve(existing);

  if (!voicesReady) {
    voicesReady = new Promise((resolve) => {
      const finish = () => resolve(synth.getVoices());
      synth.addEventListener("voiceschanged", finish, { once: true });
      setTimeout(finish, 300);
    });
  }
  return voicesReady;
}

// Setting utterance.lang alone doesn't reliably select a matching voice —
// several browser/OS combinations silently keep the default voice and just
// read the foreign text with its phonetics, which is exactly what "French"
// coming out with an English accent looks like. Picking and binding the
// voice explicitly is what actually changes the accent, not the language tag.
function bestVoice(voices: SpeechSynthesisVoice[], locale: string) {
  const base = locale.split("-")[0];
  return (
    voices.find((voice) => voice.lang.toLowerCase() === locale.toLowerCase()) ??
    voices.find((voice) => voice.lang.toLowerCase().startsWith(base)) ??
    null
  );
}

// Web Speech API's synthesis voices, not AssemblyAI: this reads a single
// saved word aloud on demand, which doesn't need a live agent session or a
// network round trip, and every major browser ships it built in.
export async function pronounce(text: string, languageCode: string) {
  if (!canPronounce()) return null;
  const trimmed = text.trim();
  if (!trimmed) return null;

  const locale = LOCALES[languageCode] ?? languageCode;
  const voices = await loadVoices();
  const voice = bestVoice(voices, locale);

  // Cancels whatever the last click queued, so a fast double-tap doesn't
  // stack two readings on top of each other.
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(trimmed);
  utterance.lang = voice?.lang ?? locale;
  if (voice) utterance.voice = voice;
  utterance.rate = 0.85;
  window.speechSynthesis.speak(utterance);
  return utterance;
}
