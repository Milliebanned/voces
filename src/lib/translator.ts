// Chrome's built-in on-device translator (Chrome 138+). Not yet in the DOM
// typings, so only the surface used here is declared.
type Availability = "unavailable" | "downloadable" | "downloading" | "available";

type ChromeTranslator = { translate(text: string): Promise<string> };

type TranslatorStatic = {
  availability(options: {
    sourceLanguage: string;
    targetLanguage: string;
  }): Promise<Availability>;
  create(options: {
    sourceLanguage: string;
    targetLanguage: string;
    monitor?: (monitor: EventTarget) => void;
  }): Promise<ChromeTranslator>;
};

declare global {
  var Translator: TranslatorStatic | undefined;
}

export type TranslatorStatus = "loading" | "ready" | "unsupported";

/**
 * Prepares on-device translation between two languages.
 *
 * Runs in the browser rather than through a hosted model because live captions
 * fire every few seconds, and a per-line network call is both slower and, on
 * AssemblyAI's gateway tier, rate-limited to a couple of requests a minute.
 *
 * Must be called synchronously inside a user gesture: the first use downloads
 * a language model, which Chrome only allows with user activation.
 */
export async function prepareTranslator(
  sourceLanguage: string,
  targetLanguage: string,
): Promise<ChromeTranslator | null> {
  if (sourceLanguage === targetLanguage) return null;
  if (typeof globalThis.Translator === "undefined") return null;

  // Started before any await so it still runs inside the gesture's activation.
  const creating = globalThis.Translator.create({
    sourceLanguage,
    targetLanguage,
  }).catch(() => null);

  const availability = await globalThis.Translator.availability({
    sourceLanguage,
    targetLanguage,
  }).catch(() => "unavailable" as const);
  if (availability === "unavailable") return null;

  return creating;
}
