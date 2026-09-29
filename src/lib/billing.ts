import { cache } from "react";

// Free accounts get FREE_SECONDS of conversation in total; Premium, sold
// through RevenueCat Web Billing, has no cap. The RevenueCat app user id is
// the Supabase user id, so a purchase is tied to the account, not the browser.
export const FREE_SECONDS = 5 * 60;

// AssemblyAI won't cap a session below 60 seconds, so a few seconds left is
// still worth a conversation: the page cuts it off at the real remainder.
const MIN_SESSION_CAP = 60;
// Anything shorter isn't worth connecting for.
export const MIN_SECONDS_TO_START = 10;

// Usage is kept on the server's side, as one small JSON file per learner in a
// private Supabase Storage bucket, like the taster's records in lib/trial:
// learners can update their own profile and sessions rows, so neither could
// hold a count they shouldn't be able to reset.
const BUCKET = "free-usage";

type Usage = {
  secondsUsed: number;
  // The session a token was last minted for, charged when it's saved, or on
  // the next start if the tab was closed before it could be.
  live: { sessionId: string; startedAt: string } | null;
};

function storage() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) return null;
  return { url, key };
}

async function readUsage(userId: string): Promise<Usage> {
  const empty: Usage = { secondsUsed: 0, live: null };
  const config = storage();
  if (!config) return empty;
  const response = await fetch(
    `${config.url}/storage/v1/object/authenticated/${BUCKET}/${userId}.json`,
    {
      headers: { apikey: config.key, Authorization: `Bearer ${config.key}` },
      cache: "no-store",
    },
  ).catch(() => null);
  if (!response?.ok) return empty;
  const usage = (await response.json().catch(() => null)) as Usage | null;
  return usage ?? empty;
}

async function writeUsage(userId: string, usage: Usage) {
  const config = storage();
  if (!config) return;
  await fetch(
    `${config.url}/storage/v1/object/${BUCKET}/${userId}.json`,
    {
      method: "POST",
      headers: {
        apikey: config.key,
        Authorization: `Bearer ${config.key}`,
        "Content-Type": "application/json",
        "x-upsert": "true",
      },
      body: JSON.stringify(usage),
    },
  ).catch(() => {});
}

// The live session's time, counted from when its token was minted and never
// past the allowance.
function settle(usage: Usage): Usage {
  if (!usage.live) return usage;
  const spent = Math.ceil(
    (Date.now() - new Date(usage.live.startedAt).getTime()) / 1000,
  );
  const remaining = Math.max(0, FREE_SECONDS - usage.secondsUsed);
  return {
    secondsUsed: usage.secondsUsed + Math.min(Math.max(spent, 0), remaining),
    live: null,
  };
}

/** Whether the learner has an active Premium entitlement in RevenueCat. */
export const isPremium = cache(async (userId: string) => {
  // The same Web Billing key and endpoint the RevenueCat web SDK reads a
  // customer's entitlements with, asked from the server so the page can't
  // answer for itself.
  const key = process.env.NEXT_PUBLIC_REVENUECAT_WEB_KEY;
  if (!key) return false;
  const response = await fetch(
    `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(userId)}`,
    { headers: { Authorization: `Bearer ${key}` }, cache: "no-store" },
  ).catch(() => null);
  if (!response?.ok) return false;
  const body = await response.json().catch(() => null);
  // VOCES sells a single paid tier, so any active entitlement is Premium,
  // whatever the RevenueCat project happens to have named it.
  const entitlements: { expires_date: string | null }[] = Object.values(
    body?.subscriber?.entitlements ?? {},
  );
  // A lifetime purchase has no expiry.
  return entitlements.some(
    (entitlement) =>
      entitlement.expires_date === null ||
      new Date(entitlement.expires_date).getTime() > Date.now(),
  );
});

/** Free seconds left, counting a session that's still running as spent so far. */
export async function freeSecondsLeft(userId: string) {
  const usage = settle(await readUsage(userId));
  return Math.max(0, FREE_SECONDS - usage.secondsUsed);
}

/**
 * The cap to ask AssemblyAI for on a free learner's next session, or null when
 * they're out of time.
 */
export function freeSessionCap(secondsLeft: number) {
  if (secondsLeft < MIN_SECONDS_TO_START) return null;
  return Math.max(MIN_SESSION_CAP, secondsLeft);
}

/**
 * Starts the clock on a free learner's session, once its token is in hand. A
 * session left running by a closed tab is charged here first.
 */
export async function beginFreeSession(userId: string, sessionId: string) {
  const usage = settle(await readUsage(userId));
  await writeUsage(userId, {
    ...usage,
    live: { sessionId, startedAt: new Date().toISOString() },
  });
}

/** Charges a finished session against the free allowance. */
export async function endFreeSession(userId: string, sessionId: string) {
  const usage = await readUsage(userId);
  if (usage.live?.sessionId !== sessionId) return;
  await writeUsage(userId, settle(usage));
}
