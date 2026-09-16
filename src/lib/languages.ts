/**
 * Languages the agent can actually hold a conversation in.
 *
 * Speech recognition covers far more languages than speech synthesis, and a
 * partner that understands you but cannot answer is not a conversation — so
 * this list is capped by the available voices, not by the recogniser.
 */
export const TARGET_LANGUAGES = [
  { code: "fr", label: "French", voice: "estelle" },
  { code: "es", label: "Spanish", voice: "lola" },
  { code: "de", label: "German", voice: "juergen" },
  { code: "it", label: "Italian", voice: "giovanni" },
  { code: "pt", label: "Portuguese", voice: "rafael" },
  { code: "en", label: "English", voice: "alba" },
] as const;

/**
 * Languages a learner can fall back into mid-sentence. Only used for speech
 * recognition, so this is the wider Universal-3.5 Pro streaming set.
 */
export const NATIVE_LANGUAGES = [
  { code: "en", label: "English" },
  { code: "es", label: "Spanish" },
  { code: "fr", label: "French" },
  { code: "de", label: "German" },
  { code: "it", label: "Italian" },
  { code: "pt", label: "Portuguese" },
  { code: "nl", label: "Dutch" },
  { code: "sv", label: "Swedish" },
  { code: "da", label: "Danish" },
  { code: "fi", label: "Finnish" },
  { code: "no", label: "Norwegian" },
  { code: "tr", label: "Turkish" },
  { code: "hi", label: "Hindi" },
  { code: "vi", label: "Vietnamese" },
  { code: "ar", label: "Arabic" },
  { code: "he", label: "Hebrew" },
  { code: "ja", label: "Japanese" },
  { code: "zh", label: "Mandarin" },
] as const;

export const SKILL_LEVELS = [
  {
    value: "beginner",
    label: "Beginner",
    hint: "I know some words, but conversations are hard.",
  },
  {
    value: "intermediate",
    label: "Intermediate",
    hint: "I can hold a conversation, with gaps and hesitation.",
  },
  {
    value: "advanced",
    label: "Advanced",
    hint: "I am fluent and want to sound more natural.",
  },
] as const;

export function languageName(code: string | null | undefined) {
  if (!code) return null;
  const all = [...TARGET_LANGUAGES, ...NATIVE_LANGUAGES];
  return all.find((language) => language.code === code)?.label ?? code;
}

export function voiceFor(code: string | null | undefined) {
  return (
    TARGET_LANGUAGES.find((language) => language.code === code)?.voice ?? "alba"
  );
}

export function isSupportedTarget(code: string | null | undefined) {
  return TARGET_LANGUAGES.some((language) => language.code === code);
}

const RTL_LANGUAGES = new Set(["ar", "he", "fa", "ur"]);

export function textDirection(code: string | null | undefined) {
  return code && RTL_LANGUAGES.has(code) ? "rtl" : "ltr";
}
