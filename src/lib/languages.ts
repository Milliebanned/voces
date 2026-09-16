// Codes match the language identifiers AssemblyAI accepts for streaming.
export const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "es", label: "Spanish" },
  { code: "fr", label: "French" },
  { code: "de", label: "German" },
  { code: "it", label: "Italian" },
  { code: "pt", label: "Portuguese" },
  { code: "nl", label: "Dutch" },
  { code: "ja", label: "Japanese" },
  { code: "ko", label: "Korean" },
  { code: "zh", label: "Chinese (Mandarin)" },
  { code: "ar", label: "Arabic" },
  { code: "hi", label: "Hindi" },
  { code: "ru", label: "Russian" },
  { code: "tr", label: "Turkish" },
  { code: "pl", label: "Polish" },
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
  return LANGUAGES.find((language) => language.code === code)?.label ?? code;
}
