const tokens = (text: string) =>
  text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .match(/[\p{L}\p{N}]+/gu) ?? [];

function longestSharedRun(a: string[], b: string[]) {
  let best = 0;
  const lengths = new Array(b.length + 1).fill(0);
  for (let i = 1; i <= a.length; i++) {
    for (let j = b.length; j >= 1; j--) {
      lengths[j] = a[i - 1] === b[j - 1] ? lengths[j - 1] + 1 : 0;
      best = Math.max(best, lengths[j]);
    }
  }
  return best;
}

// A run this long, word for word, doesn't happen by answering a question.
const MIN_ECHO_RUN = 4;

/**
 * Whether a line attributed to the learner is really the agent's own voice
 * coming back through the speakers and into the microphone.
 *
 * Learners reuse the agent's words all the time ("¿Te gusta leer?" → "Sí, me
 * gusta leer"), so shared vocabulary proves nothing. Echo is a long verbatim
 * run that makes up most of what was "heard".
 *
 * Text alone still can't separate echo from a learner answering in the
 * question's own words ("Me gusta la historia de Roma"), so callers must also
 * require that the speech began while the agent was audibly talking.
 */
export function isEchoOf(heard: string, agentSpeech: string) {
  const heardWords = tokens(heard);
  if (heardWords.length < MIN_ECHO_RUN) return false;
  const run = longestSharedRun(heardWords, tokens(agentSpeech));
  return run >= MIN_ECHO_RUN && run / heardWords.length >= 0.6;
}
