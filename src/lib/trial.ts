import { createHmac } from "node:crypto";

// The landing page's taster is one 30-second conversation per visitor, ever.
// Two records say a visitor has had it, both kept on the server's side:
// - an httpOnly cookie, so reloading or opening a new tab doesn't bring it back;
// - their network address, so a private window or cleared cookies doesn't
//   either. It is stored only as a keyed hash, as an empty file in a private
//   Supabase Storage bucket, which needs no table or migration.
export const TRIAL_COOKIE = "voces_trial";
export const TRIAL_COOKIE_MAX_AGE = 60 * 60 * 24 * 365 * 5;
const BUCKET = "trial-visitors";

export function visitorAddress(headers: Headers) {
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    null
  );
}

function storage() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) return null;
  return { url, key };
}

function visitorFile(address: string, key: string) {
  const id = createHmac("sha256", key).update(address).digest("hex");
  return `${BUCKET}/${id}`;
}

export async function addressHasTried(address: string | null) {
  const config = storage();
  if (!address || !config) return false;
  const response = await fetch(
    `${config.url}/storage/v1/object/info/authenticated/${visitorFile(address, config.key)}`,
    {
      headers: { apikey: config.key, Authorization: `Bearer ${config.key}` },
      cache: "no-store",
    },
  ).catch(() => null);
  return response?.ok ?? false;
}

export async function recordAddress(address: string | null) {
  const config = storage();
  if (!address || !config) return;
  await fetch(
    `${config.url}/storage/v1/object/${visitorFile(address, config.key)}`,
    {
      method: "POST",
      headers: {
        apikey: config.key,
        Authorization: `Bearer ${config.key}`,
        "Content-Type": "text/plain",
        "x-upsert": "true",
      },
      body: new Date().toISOString(),
    },
  ).catch(() => {});
}
