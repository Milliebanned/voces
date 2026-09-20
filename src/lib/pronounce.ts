"use client";

// The conversation partners are all specific Europeans (Lola from Spain,
// Rafael from Portugal, Alba from England), so pronunciation uses the same
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

// Web Speech API's synthesis voices, not AssemblyAI: this reads a single
// saved word aloud on demand, which doesn't need a live agent session or a
// network round trip, and every major browser ships it built in.
export function pronounce(text: string, languageCode: string) {
  if (!canPronounce()) return null;
  const trimmed = text.trim();
  if (!trimmed) return null;

  // Cancels whatever the last click queued, so a fast double-tap doesn't
  // stack two readings on top of each other.
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(trimmed);
  utterance.lang = LOCALES[languageCode] ?? languageCode;
  utterance.rate = 0.85;
  window.speechSynthesis.speak(utterance);
  return utterance;
}
