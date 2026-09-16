export type VocabularyItem = {
  id: string;
  text: string;
  translation: string | null;
  usage_count: number;
  success_count: number;
  struggle_count: number;
  confidence_score: number;
  last_used_at: string | null;
};

const MS_PER_DAY = 86_400_000;

// Number of successful uses after which a word counts as fully exercised.
const EXPOSURE_TARGET = 5;

// Confidence halves roughly every two weeks without use, so a word drilled
// once months ago ranks as weaker than one used twice last week.
const DECAY_HALF_LIFE_DAYS = 14;

/**
 * Confidence that the learner can reach for a word unprompted, from 0 to 1.
 *
 * Three signals combine: how reliably they have used it, how often they have
 * used it at all, and how long ago that was.
 */
export function computeConfidence(
  item: Pick<
    VocabularyItem,
    "usage_count" | "success_count" | "struggle_count" | "last_used_at"
  >,
  now = Date.now(),
): number {
  // Laplace smoothing keeps a single lucky use from reading as mastery.
  const reliability =
    (item.success_count + 1) / (item.success_count + item.struggle_count + 2);

  const exposure = Math.min(item.usage_count / EXPOSURE_TARGET, 1);

  const recency = item.last_used_at
    ? 2 **
      (-(now - new Date(item.last_used_at).getTime()) /
        MS_PER_DAY /
        DECAY_HALF_LIFE_DAYS)
    : 0;

  return Number((reliability * exposure * recency).toFixed(4));
}

/**
 * The words worth steering the next conversation towards: weakest first, with
 * anything never used at all treated as maximally weak.
 */
export function selectReinforcementCandidates<T extends VocabularyItem>(
  items: T[],
  limit = 8,
): T[] {
  return [...items]
    .sort((a, b) => a.confidence_score - b.confidence_score)
    .slice(0, limit);
}
