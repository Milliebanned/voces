import Link from "next/link";
import { redirect } from "next/navigation";
import { NewConversationLink } from "@/components/new-conversation-link";
import { Flashcards } from "@/components/flashcards";
import { PronounceButton } from "@/components/pronounce-button";
import { Wordmark } from "@/components/wordmark";
import { languageName, textDirection } from "@/lib/languages";
import { createClient, currentUser } from "@/lib/supabase/server";
import { addVocabularyItem, deleteVocabularyItem } from "./actions";

export default async function VocabularyPage() {
  const supabase = await createClient();
  const user = await currentUser(supabase);

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("target_language, onboarded_at")
    .eq("id", user.id)
    .single();

  if (!profile?.onboarded_at) redirect("/onboarding");

  const { data: items } = await supabase
    .from("vocabulary_items")
    .select(
      "id, text, translation, example, source, session_id, confidence_score, created_at",
    )
    .eq("target_language", profile.target_language ?? "")
    .order("created_at", { ascending: false });

  return (
    <main className="flex flex-1 flex-col">
      <header className="mx-auto flex w-full max-w-3xl items-center justify-between px-6 py-6">
        <Link href="/dashboard">
          <Wordmark />
        </Link>
        <div className="flex items-center gap-5">
          <Link
            href="/dashboard"
            className="text-sm font-medium text-muted transition-colors hover:text-foreground"
          >
            Dashboard
          </Link>
          <NewConversationLink />
        </div>
      </header>

      <div className="mx-auto w-full max-w-3xl px-6 pb-24">
        <h1 className="text-[32px] leading-tight font-bold tracking-[-0.02em]">
          Your {languageName(profile.target_language)} vocabulary
        </h1>
        <p className="mt-3 max-w-[540px] text-[15px] leading-relaxed text-muted">
          Anything saved here can resurface mid-conversation, so your partner
          creates openings to use it without turning into a quiz.
        </p>

        {items && items.length > 0 && (
          <section id="review" className="mt-8 scroll-mt-6 rounded-2xl border border-border bg-surface p-5">
            <h2 className="text-[17px] font-semibold tracking-[-0.01em]">
              Review
            </h2>
            <p className="mt-1 text-[13px] text-muted">
              Weakest first. Tap a card to see what it means.
            </p>
            <Flashcards
              cards={[...items]
                .sort((a, b) => a.confidence_score - b.confidence_score)
                .slice(0, 20)}
              direction={textDirection(profile.target_language)}
              languageCode={profile.target_language ?? ""}
            />
          </section>
        )}

        <form
          action={addVocabularyItem}
          className="mt-8 flex flex-col gap-3 rounded-2xl border border-border bg-surface p-5 sm:flex-row"
        >
          <input
            type="text"
            name="text"
            required
            placeholder="Word or phrase"
            className="flex-1 rounded-xl border border-border bg-background px-4 py-3 text-[15px] outline-none placeholder:text-muted/60 focus:border-accent"
          />
          <input
            type="text"
            name="translation"
            placeholder="What it means"
            className="flex-1 rounded-xl border border-border bg-background px-4 py-3 text-[15px] outline-none placeholder:text-muted/60 focus:border-accent"
          />
          <button
            type="submit"
            className="rounded-full bg-accent px-6 py-3 text-[15px] font-semibold text-white transition-colors hover:bg-accent-hover"
          >
            Save
          </button>
        </form>

        {items && items.length > 0 ? (
          <ul className="mt-8 flex flex-col">
            {items.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between gap-4 border-b border-border py-4"
              >
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[16px] font-medium">{item.text}</span>
                    <PronounceButton
                      text={item.text}
                      languageCode={profile.target_language ?? ""}
                    />
                  </div>
                  {item.translation && (
                    <span className="text-[14px] text-muted">
                      {item.translation}
                    </span>
                  )}
                  {item.example && (
                    <span className="text-[13px] text-muted/80 italic">
                      &ldquo;{item.example}&rdquo;
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-4">
                  {item.source === "session" &&
                    (item.session_id ? (
                      <Link
                        href={`/conversation/${item.session_id}/analysis`}
                        className="rounded-full bg-accent-soft px-3 py-1 text-[11px] font-semibold tracking-wide text-accent hover:underline"
                      >
                        FROM A SESSION
                      </Link>
                    ) : (
                      <span className="rounded-full bg-accent-soft px-3 py-1 text-[11px] font-semibold tracking-wide text-accent">
                        FROM A SESSION
                      </span>
                    ))}
                  <form action={deleteVocabularyItem}>
                    <input type="hidden" name="id" value={item.id} />
                    <button
                      type="submit"
                      className="text-[13px] font-medium text-muted transition-colors hover:text-accent"
                    >
                      Remove
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-10 text-sm leading-relaxed text-muted">
            Nothing saved yet. Add a word above, or let a conversation surface
            the ones you reach for and can&apos;t find.
          </p>
        )}
      </div>
    </main>
  );
}
