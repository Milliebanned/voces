import type { Turn } from "@/app/conversation/[id]/actions";

// Server-side only: reads ASSEMBLYAI_API_KEY.

// Which gateway models an account may call depends on its plan, so the model
// is configurable. A strict-schema model such as claude-sonnet-4-6 gives the
// most trustworthy corrections; the default is the one every plan includes.
// It runs once per session, so the per-minute rate limit is never close.
export const ANALYSIS_MODEL =
  process.env.ANALYSIS_MODEL || "qwen3.5-4b-32k-fast";

// Gateway models that reject response_format. For these the schema goes in
// the prompt instead and the reply is parsed defensively.
const NO_STRUCTURED_OUTPUT = new Set([
  "qwen3.5-4b-32k-fast",
  "gpt-oss-20b",
  "gpt-4.1",
  "claude-opus-4-7",
  "claude-opus-4-8",
  "claude-opus-5",
  "claude-sonnet-5",
]);

const GATEWAY_URL = "https://llm-gateway.assemblyai.com/v1/chat/completions";

export type Correction = {
  original: string;
  corrected: string;
  explanation: string;
  category: string;
  recurring: boolean;
};

export type ReachedFor = { text: string; translation: string; context: string };

export type Suggestion = { text: string; translation: string; example: string };

export type SavedWordOutcome = { text: string; outcome: "used" | "struggled" };

export type Analysis = {
  summary: string;
  strengths: string;
  next_steps: string;
  corrections: Correction[];
  reached_for: ReachedFor[];
  suggestions: Suggestion[];
  saved_words: SavedWordOutcome[];
  fluency_notes: string[];
  topics: string[];
  grammar_patterns: string[];
};

const string = { type: "string" } as const;
const strings = { type: "array", items: string } as const;

function object(properties: Record<string, unknown>) {
  return {
    type: "object",
    properties,
    required: Object.keys(properties),
    additionalProperties: false,
  };
}

const SCHEMA = object({
  summary: string,
  strengths: string,
  next_steps: string,
  corrections: {
    type: "array",
    items: object({
      original: string,
      corrected: string,
      explanation: string,
      category: string,
      recurring: { type: "boolean" },
    }),
  },
  reached_for: {
    type: "array",
    items: object({ text: string, translation: string, context: string }),
  },
  suggestions: {
    type: "array",
    items: object({ text: string, translation: string, example: string }),
  },
  saved_words: {
    type: "array",
    items: object({
      text: string,
      outcome: { type: "string", enum: ["used", "struggled"] },
    }),
  },
  fluency_notes: strings,
  topics: strings,
  grammar_patterns: strings,
});

type AnalysisInput = {
  transcript: Turn[];
  targetLanguage: string;
  nativeLanguage: string;
  skillLevel: string;
  savedWords: string[];
  knownPatterns: string[];
};

function instructions({
  targetLanguage,
  nativeLanguage,
  skillLevel,
  savedWords,
  knownPatterns,
}: AnalysisInput) {
  return [
    `You review a spoken ${targetLanguage} conversation between a ${skillLevel} learner (LEARNER) and a native-speaking conversation partner (PARTNER). The learner's native language is ${nativeLanguage}. Write every explanation, summary and translation in ${nativeLanguage}, speaking to the learner directly as "you"; keep quoted ${targetLanguage} exactly as spoken.`,
    "",
    "The learner's lines come from live speech recognition. Ignore punctuation, capitalisation, missing accents and anything that is plausibly a mis-hearing rather than a mistake the learner made out loud.",
    "",
    "Fields:",
    "- summary: two or three warm, specific sentences on how the conversation went.",
    "- strengths: one or two sentences on what they did well, citing what they actually said.",
    "- next_steps: one or two concrete things to practise next time.",
    `- corrections: check every LEARNER line, word by word, for verb conjugation and tense, ser/estar-style verb choice, noun gender and articles, adjective and subject-verb agreement, prepositions and word order. List at most 8 real mistakes, most important first, and none at all if they made none. original is the learner's words, trimmed to the phrase with the mistake; corrected is how a native speaker would say it; explanation is one short sentence on the rule, pitched at a ${skillLevel}; category is a two-to-four-word label such as "verb agreement" or "gender of nouns", written in ${nativeLanguage}. Set recurring to true when the mistake matches one of the known patterns below or happens more than once in this conversation. Skip anything that is merely less idiomatic but correct.`,
    `- reached_for: only ${targetLanguage} words or phrases the learner needed but didn't have — where they said it in ${nativeLanguage}, trailed off, or asked how to say it. Never include a word the learner did say in ${targetLanguage}, and never take entries from PARTNER lines. text is the ${targetLanguage} word in dictionary form, translation is the ${nativeLanguage} meaning, context is the learner's line where it came up.`,
    `- suggestions: up to 5 useful ${targetLanguage} words or expressions from the partner's lines, or that would have made the learner sound more natural, and that suit a ${skillLevel}. Leave out anything already in reached_for or the saved words, and very basic words like "but" or "very". example is a short, grammatically correct ${targetLanguage} sentence using it.`,
    "- saved_words: for each saved word below that came up, whether the learner used it correctly (used) or tried and got it wrong or avoided it when the partner set it up (struggled). Copy text exactly from the list. Leave out saved words that never came up.",
    "- fluency_notes: up to 3 short observations on flow — hesitation, very short answers, falling back on the native language — only if clearly visible in the transcript.",
    `- topics: up to 4 short ${nativeLanguage} labels for what was talked about, such as "their job in marketing".`,
    `- grammar_patterns: short ${nativeLanguage} labels for the learner's recurring grammar weaknesses, merging the known patterns below with this conversation. Drop a known pattern only if they clearly got it right several times. At most 6.`,
    "",
    `Saved words: ${savedWords.length > 0 ? savedWords.join(" | ") : "(none)"}`,
    `Known patterns: ${knownPatterns.length > 0 ? knownPatterns.join(" | ") : "(none)"}`,
  ].join("\n");
}

function formatTranscript(transcript: Turn[]) {
  return transcript
    .map((turn) => `${turn.role === "user" ? "LEARNER" : "PARTNER"}: ${turn.text}`)
    .join("\n");
}

export async function analyzeConversation(
  input: AnalysisInput,
): Promise<Analysis> {
  const apiKey = process.env.ASSEMBLYAI_API_KEY;
  if (!apiKey) throw new Error("ASSEMBLYAI_API_KEY is not configured.");

  const structured = !NO_STRUCTURED_OUTPUT.has(ANALYSIS_MODEL);

  const system = structured
    ? instructions(input)
    : `${instructions(input)}\n\nReply with a single JSON object and nothing else, matching this JSON Schema:\n${JSON.stringify(SCHEMA)}`;

  const response = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: { Authorization: apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: ANALYSIS_MODEL,
      max_tokens: 4000,
      temperature: 0.2,
      messages: [
        { role: "system", content: system },
        { role: "user", content: formatTranscript(input.transcript) },
      ],
      ...(structured && {
        response_format: {
          type: "json_schema",
          json_schema: { name: "session_review", schema: SCHEMA, strict: true },
        },
      }),
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Review failed (${response.status}): ${(await response.text()).slice(0, 200)}`,
    );
  }

  const body = await response.json();
  const content = body.choices?.[0]?.message?.content;
  if (typeof content !== "string") throw new Error("Review came back empty.");

  return normalize(parseJson(content));
}

// Unconstrained models wrap JSON in prose or a code fence often enough that
// the outermost braces are the only reliable boundary.
function parseJson(content: string): unknown {
  const start = content.indexOf("{");
  const end = content.lastIndexOf("}");
  if (start === -1 || end <= start) throw new Error("Review was not JSON.");
  return JSON.parse(content.slice(start, end + 1));
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function list<T>(value: unknown, map: (item: Record<string, unknown>) => T | null) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is Record<string, unknown> => !!item && typeof item === "object")
    .map(map)
    .filter((item): item is T => item !== null);
}

function texts(value: unknown, limit: number) {
  return Array.isArray(value) ? value.map(text).filter(Boolean).slice(0, limit) : [];
}

// Without a strict schema, fields go missing or arrive as the wrong type. Every
// field is coerced and entries missing their key text are dropped, so the rest
// of the app can trust the shape either way.
function normalize(raw: unknown): Analysis {
  const data = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;

  return {
    summary: text(data.summary),
    strengths: text(data.strengths),
    next_steps: text(data.next_steps),
    corrections: list(data.corrections, (item) => {
      const original = text(item.original);
      const corrected = text(item.corrected);
      // A "correction" identical to what was said is noise, not feedback.
      if (!original || !corrected || original.toLowerCase() === corrected.toLowerCase()) {
        return null;
      }
      return {
        original,
        corrected,
        explanation: text(item.explanation),
        category: text(item.category),
        recurring: item.recurring === true,
      };
    }).slice(0, 8),
    reached_for: list(data.reached_for, (item) =>
      text(item.text)
        ? {
            text: text(item.text),
            translation: text(item.translation),
            context: text(item.context),
          }
        : null,
    ).slice(0, 12),
    suggestions: list(data.suggestions, (item) =>
      text(item.text)
        ? {
            text: text(item.text),
            translation: text(item.translation),
            example: text(item.example),
          }
        : null,
    ).slice(0, 5),
    saved_words: list(data.saved_words, (item) =>
      text(item.text) && (item.outcome === "used" || item.outcome === "struggled")
        ? { text: text(item.text), outcome: item.outcome }
        : null,
    ),
    fluency_notes: texts(data.fluency_notes, 3),
    topics: texts(data.topics, 4),
    grammar_patterns: texts(data.grammar_patterns, 6),
  };
}
