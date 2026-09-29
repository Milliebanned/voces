"use client";

import {
  ErrorCode,
  type Package,
  Purchases,
  PurchasesError,
} from "@revenuecat/purchases-js";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const ACCENT = "#DA5C1B";

const FREE_FEATURES = [
  "5 minutes of conversation with the VOCES AI, in total",
  "A review of every conversation",
  "Your vocabulary, saved as flashcards",
];

const PREMIUM_FEATURES = [
  "Unlimited conversations with the VOCES AI",
  "Every scenario, in every language",
  "A review and recording of every conversation",
  "Weak words brought back until they stick",
];

// RevenueCat reports subscription lengths as ISO 8601 durations.
function perPeriod(duration: string | null) {
  switch (duration) {
    case "P1W":
      return "/ week";
    case "P1M":
      return "/ month";
    case "P3M":
      return "/ 3 months";
    case "P6M":
      return "/ 6 months";
    case "P1Y":
      return "/ year";
    default:
      return "";
  }
}

// Configured once per page load, for the signed-in learner: the RevenueCat app
// user id is their account id, so the purchase follows them to any device.
function purchases(apiKey: string, appUserId: string) {
  if (!Purchases.isConfigured()) {
    return Purchases.configure({ apiKey, appUserId });
  }
  const shared = Purchases.getSharedInstance();
  if (shared.getAppUserId() !== appUserId) {
    void shared.changeUser(appUserId);
  }
  return shared;
}

export function PremiumCheckout({
  appUserId,
  apiKey,
  premium,
  initialCode,
  email,
}: {
  appUserId: string;
  apiKey: string | null;
  premium: boolean;
  // A promo code from the link that brought them here (?code=...).
  initialCode: string;
  email: string | null;
}) {
  const router = useRouter();
  const [pkg, setPkg] = useState<Package | null>(null);
  const [manageUrl, setManageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(Boolean(apiKey));
  const [buying, setBuying] = useState(false);
  const [code, setCode] = useState(initialCode);
  const [error, setError] = useState<string | null>(
    apiKey ? null : "Premium checkout isn't set up on this server yet.",
  );

  useEffect(() => {
    if (!apiKey) return;
    let cancelled = false;
    const rc = purchases(apiKey, appUserId);
    (async () => {
      try {
        if (premium) {
          const info = await rc.getCustomerInfo();
          if (!cancelled) setManageUrl(info.managementURL);
        } else {
          const offerings = await rc.getOfferings();
          const first = offerings.current?.availablePackages[0] ?? null;
          if (cancelled) return;
          setPkg(first);
          if (!first) setError("Premium isn't available right now. Please try again later.");
        }
      } catch {
        if (!cancelled) setError("Couldn't load Premium. Check your connection and try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [apiKey, appUserId, premium]);

  async function buy() {
    if (!apiKey || !pkg) return;
    setBuying(true);
    setError(null);
    try {
      // Promo codes are RevenueCat discount codes, from a percentage off up to
      // 100%. One typed here is applied up front, and the checkout also offers
      // its own field for anyone who didn't.
      await purchases(apiKey, appUserId).purchase({
        rcPackage: pkg,
        showDiscountCodeField: true,
        discountCode: code.trim() || undefined,
        customerEmail: email ?? undefined,
      });
      router.push("/dashboard");
      router.refresh();
    } catch (cause) {
      if (
        cause instanceof PurchasesError &&
        cause.errorCode === ErrorCode.UserCancelledError
      ) {
        setBuying(false);
        return;
      }
      setError(
        cause instanceof Error ? cause.message : "The purchase didn't go through.",
      );
      setBuying(false);
    }
  }

  const price = pkg?.webBillingProduct.price.formattedPrice;
  const period = perPeriod(pkg?.webBillingProduct.normalPeriodDuration ?? null);

  return (
    <div className="mt-8 grid gap-4 md:grid-cols-2">
      <section className="flex flex-col rounded-[20px] border border-line bg-card p-6">
        <span className="text-[13px] font-semibold tracking-[0.08em] text-mute uppercase">Free</span>
        <p className="mt-2 text-[30px] font-bold tracking-[-0.02em]">$0</p>
        <FeatureList items={FREE_FEATURES} />
        <p className="mt-auto pt-6 text-[13px] text-mute">
          {premium ? "Where you started." : "Your current plan."}
        </p>
      </section>

      <section
        className="relative flex flex-col overflow-hidden rounded-[20px] border-2 bg-card p-6"
        style={{ borderColor: ACCENT }}
      >
        <span className="text-[13px] font-semibold tracking-[0.08em] uppercase" style={{ color: ACCENT }}>
          Premium
        </span>
        <p className="mt-2 text-[30px] font-bold tracking-[-0.02em]">
          {premium ? (
            "Active"
          ) : loading ? (
            <span className="inline-block h-9 w-28 animate-pulse rounded-lg bg-card-2 align-middle" />
          ) : price ? (
            <>
              {price} <span className="text-[16px] font-medium text-mute">{period}</span>
            </>
          ) : (
            "—"
          )}
        </p>
        <FeatureList items={PREMIUM_FEATURES} />

        <div className="mt-auto pt-6">
          {premium ? (
            manageUrl && (
              <a
                href={manageUrl}
                target="_blank"
                rel="noreferrer"
                className="flex h-[52px] w-full items-center justify-center rounded-full border border-line text-[15px] font-semibold transition-colors hover:bg-card-2"
              >
                Manage subscription
              </a>
            )
          ) : (
            <>
              <label className="mb-3 flex flex-col gap-1.5">
                <span className="text-[13px] font-semibold">
                  Promo code <span className="font-normal text-mute">(optional)</span>
                </span>
                <input
                  type="text"
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  autoCapitalize="characters"
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="Enter a code"
                  className="h-12 rounded-2xl border border-line bg-card-2 px-4 text-[15px] tracking-[0.04em] uppercase outline-none placeholder:tracking-normal placeholder:normal-case placeholder:text-mute focus:border-[#DA5C1B]"
                />
              </label>
              <button
                type="button"
                onClick={buy}
                disabled={!pkg || buying}
                className="flex h-[52px] w-full items-center justify-center rounded-full text-[16px] font-semibold text-white transition-colors hover:bg-[#B94A13] disabled:opacity-60"
                style={{ background: ACCENT }}
              >
                {buying ? "Opening checkout…" : "Go Premium"}
              </button>
            </>
          )}
          {error && (
            <p role="alert" className="mt-3 text-[13px] leading-relaxed text-[#C2410C] dark:text-[#F7B98E]">
              {error}
            </p>
          )}
          {!premium && (
            <p className="mt-3 text-center text-[12px] text-mute">
              Secure checkout by RevenueCat. Cancel anytime.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

function FeatureList({ items }: { items: string[] }) {
  return (
    <ul className="mt-4 flex flex-col gap-2.5">
      {items.map((item) => (
        <li key={item} className="flex items-start gap-2.5 text-[14.5px] leading-snug">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={ACCENT} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="mt-px shrink-0">
            <path d="M5 12.5 L10 17.5 L19 7" />
          </svg>
          {item}
        </li>
      ))}
    </ul>
  );
}
