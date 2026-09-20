# VOCES

**Practice the language by actually speaking it.**

VOCES is a voice-first language immersion platform. Instead of drilling flashcards and hoping the words show up in real life, you hold real spoken conversations with an AI partner — and the vocabulary you struggle with comes back to you in later conversations until it sticks.

Built for the [AssemblyAI Voice Agent Hackathon](https://lablab.ai/ai-hackathons/assemblyai-voice-agent-hackathon).

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

## Architecture

| Layer | Technology |
| --- | --- |
| Real-time voice | [AssemblyAI Voice Agent API](https://www.assemblyai.com/docs/voice-agents/voice-agent-api) — speech-to-text, LLM and text-to-speech over a single WebSocket |
| Session analysis | [AssemblyAI LLM Gateway](https://www.assemblyai.com/docs/llm-gateway/api-reference/create-chat-completion) — structured grammar/vocabulary review of the full transcript |
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

The app runs at `http://localhost:3000`.

## Status

Early development, built during the hackathon window. See the commit history for progress.

## Licence

MIT
