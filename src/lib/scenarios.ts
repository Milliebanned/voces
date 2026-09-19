// The scenario is only an opening move — the prompt tells the agent to follow
// the learner if the conversation drifts somewhere better.
export const SCENARIOS = [
  {
    id: "daily_life",
    label: "Everyday life",
    prompt: "catching up about how their day and week have been going",
  },
  {
    id: "restaurant",
    label: "At a restaurant",
    prompt:
      "you are a waiter greeting them at a busy neighbourhood restaurant and taking their order",
  },
  {
    id: "travel",
    label: "Travelling",
    prompt:
      "they have just arrived in your city and are asking you how to get around and what is worth seeing",
  },
  {
    id: "shopping",
    label: "Shopping",
    prompt:
      "you work in a clothes shop and they are looking for something specific",
  },
  {
    id: "doctor",
    label: "At the doctor",
    prompt:
      "you are a doctor at a clinic and they have come in feeling unwell",
  },
  {
    id: "work",
    label: "At work",
    prompt: "you are a colleague chatting with them before a meeting starts",
  },
  {
    id: "interview",
    label: "Job interview",
    prompt:
      "you are interviewing them for a job and want to know about their experience",
  },
  {
    id: "friends",
    label: "With a friend",
    prompt:
      "you are an old friend who has not seen them in a while and wants all their news",
  },
] as const;

export function scenarioPrompt(id: string | null) {
  if (!id) return null;
  return SCENARIOS.find((scenario) => scenario.id === id)?.prompt ?? null;
}

export function scenarioLabel(id: string | null) {
  if (!id) return null;
  return SCENARIOS.find((scenario) => scenario.id === id)?.label ?? null;
}

// What each scenario offers, written for the learner rather than the agent.
const BLURBS: Record<string, string> = {
  daily_life: "Talk about your day, your plans and what's been going on.",
  restaurant: "Order food, ask about the menu and chat with the waiter.",
  travel: "Ask for directions and find out what's worth seeing.",
  shopping: "Describe what you're after, ask about sizes and prices.",
  doctor: "Explain how you feel and understand what you're told.",
  work: "Small talk with a colleague before a meeting starts.",
  interview: "Talk about your experience and answer common questions.",
  friends: "Catch up with an old friend and share your news.",
};

export function scenarioBlurb(id: string) {
  return BLURBS[id] ?? "";
}
