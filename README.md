# VOCES

**Practice the language by actually speaking it.**

VOCES is a voice-first language immersion platform. Instead of drilling flashcards and hoping the words show up in real life, you hold real spoken conversations with an AI — and the vocabulary you struggle with comes back to you in later conversations until it sticks.

## The problem

Millions of learners know how to say "hospital" and can conjugate a verb on a worksheet, but freeze in an actual conversation. Most apps optimise for memorisation; almost none optimise for communication.

People acquire their first language by hearing it, speaking it imperfectly, being understood anyway, and being exposed to the same words again and again. VOCES recreates that loop.

## How it works

```
Save vocabulary → Speak → Get stuck → Keep speaking → Session analysis
      ↑                                                       ↓
      └──────────── weak words resurface naturally ───────────┘
```

Three things make it different from a chatbot with a microphone:

**Never break immersion.** Forget a word mid-sentence? Say it in your native language. VOCES understands you, keeps the conversation going in your target language, and supplies the word you were missing — without stopping to correct you.

**Corrections come afterwards.** Grammar, vocabulary and fluency feedback arrive in a post-session review, so the conversation itself is never interrupted.

**It remembers.** Every session updates a learner profile — which words you use confidently, which you avoid, which mistakes repeat. Later conversations are steered to create natural openings for the vocabulary you are weakest on.

## Plans

| | Free | Premium |
| --- | --- | --- |
| Conversation with the VOCES AI | 5 minutes in total | Unlimited |
| Post-session review, flashcards, vocabulary memory | ✓ | ✓ |

New accounts choose a plan as the last step of sign-up, and the dashboard always shows how many free minutes are left, with an **Upgrade to Premium** button. When the free minutes run out mid-conversation, the conversation is saved and VOCES offers Premium before the review.

Premium is a subscription sold through [RevenueCat Web Billing](https://www.revenuecat.com/docs/web/web-billing/overview):

- The `/premium` page uses the RevenueCat web SDK (`@revenuecat/purchases-js`) to load the current offering and run the checkout. The RevenueCat app user ID is the learner's Supabase user ID, so Premium belongs to the account, not the browser.
- The server checks the `premium` entitlement through the RevenueCat REST API before minting every voice token, so the limit can't be bypassed from the page.
- Promo codes are RevenueCat Billing discount codes, from a percentage off up to 100%. They can be typed on `/premium`, entered in the checkout itself, or shared as a link such as `/premium?code=WELCOME100`.
- Free usage is counted on the server when each session's token is minted and when it ends. It is kept where learners can't write to it, and the voice token itself is capped at the time that's left.

**Trying Premium:** the demo deployment runs RevenueCat Billing in sandbox mode, so no real payment is taken. On `/premium`, enter the promo code `JUDGE` (100% off), choose **Go Premium**, and pay with Stripe's test card `4242 4242 4242 4242`, any future expiry date and any CVC. Sandbox subscriptions renew on an accelerated schedule.

## Architecture

| Layer | Technology |
| --- | --- |
| Real-time voice | [AssemblyAI Voice Agent API](https://www.assemblyai.com/docs/voice-agents/voice-agent-api) — speech-to-text, LLM and text-to-speech over a single WebSocket |
| Session analysis | [AssemblyAI LLM Gateway](https://www.assemblyai.com/docs/llm-gateway/api-reference/create-chat-completion) — structured grammar/vocabulary review of the full transcript |
| Subscriptions | [RevenueCat Web Billing](https://www.revenuecat.com/docs/web/web-billing/overview) — Premium checkout and entitlements |
| App | Next.js (App Router, TypeScript), Tailwind CSS |
| Data & auth | Supabase (Postgres + Auth, row-level security) |
| Hosting | Vercel |

The browser never sees an API key. The server mints a short-lived token and builds the session's system prompt — including the learner's weak vocabulary — then the browser streams PCM audio straight to AssemblyAI over a WebSocket.

## Running locally

Requires Node 20+ and a Supabase project.

```bash
npm install
cp .env.example .env.local   # then fill in the values below
npm run dev
```

| Variable | Where to get it |
| --- | --- |
| `ASSEMBLYAI_API_KEY` | [assemblyai.com](https://www.assemblyai.com/) dashboard — server-side only |
| `ANALYSIS_MODEL` | Optional. [LLM Gateway model](https://www.assemblyai.com/docs/llm-gateway/available-models) for the post-session review; defaults to `qwen3.5-4b-32k-fast` |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project settings → API |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase project settings → API Keys → publishable key |
| `SUPABASE_SECRET_KEY` | Supabase project settings → API Keys → secret key — server-side only, never expose |
| `NEXT_PUBLIC_REVENUECAT_WEB_KEY` | RevenueCat → your RevenueCat Billing web app → public API key (the `rcb_sb_` sandbox key takes Stripe test cards) |

In Supabase, create two private Storage buckets, `trial-visitors` and `free-usage`, and apply the SQL in `supabase/migrations`. In RevenueCat, attach the Premium product to an entitlement (any name) and put it in the current offering.

The app runs at `http://localhost:3000`.

## Status

Actively developed. See the commit history for progress.

## Licence

MIT
