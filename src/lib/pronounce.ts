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

// Chrome commonly returns a first, synchronous getVoices() call that already
// has some voices in it — often just the local OS ones — before voiceschanged
// fires with the rest (network voices in particular). A bare "is the list
// non-empty yet" check was satisfied by that first partial list and never
// waited for French to actually show up, which is why binding a voice made
// no difference. This instead checks whether a matching voice specifically
// is in the list yet, and only waits if it isn't.
async function findVoice(locale: string): Promise<SpeechSynthesisVoice | null> {
  if (!canPronounce()) return null;
  const synth = window.speechSynthesis;

  const tryMatch = () => bestVoice(synth.getVoices(), locale);

  const first = tryMatch();
  if (first) return first;

  await new Promise<void>((resolve) => {
    const finish = () => resolve();
    synth.addEventListener("voiceschanged", finish, { once: true });
    setTimeout(finish, 500);
  });

  return tryMatch();
}

// Web Speech API's synthesis voices, not AssemblyAI: this reads a single
// saved word aloud on demand, which doesn't need a live agent session or a
// network round trip, and every major browser ships it built in.
export async function pronounce(text: string, languageCode: string) {
  if (!canPronounce()) return null;
  const trimmed = text.trim();
  if (!trimmed) return null;

  const locale = LOCALES[languageCode] ?? languageCode;
  const voice = await findVoice(locale);

  // Left in permanently, not just for this bug: the only way to tell "no
  // matching voice exists on this device" apart from "one was found and
  // bound" is to look, and that distinction is invisible without this line.
  console.info(
    `[voces] pronounce "${trimmed}" as ${locale}: ${
      voice ? `using "${voice.name}" (${voice.lang}, ${voice.localService ? "local" : "network"})` : "no matching voice found on this device — falling back to the default voice"
    }`,
  );

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
