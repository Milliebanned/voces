import Link from "next/link";
import { redirect } from "next/navigation";
import { ACCENT, AppShell, Card } from "@/components/app-shell";
import { SessionRow } from "@/components/session-row";
import { languageName } from "@/lib/languages";
import { loadSessions } from "@/lib/progress";
import { createClient, currentUser } from "@/lib/supabase/server";

export default async function ConversationsPage() {
  const supabase = await createClient();
  const user = await currentUser(supabase);

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, target_language, skill_level, onboarded_at")
    .eq("id", user.id)
    .single();

  if (!profile?.onboarded_at) redirect("/onboarding");

  const target = profile.target_language ?? "fr";
  const language = languageName(target) ?? target;
  const sessions = await loadSessions(supabase, target);

  return (
    <AppShell
      active="conversations"
      name={profile.display_name}
      targetLanguage={target}
      level={profile.skill_level}
    >
      <div className="px-5 pt-8 lg:px-0 lg:pt-0">
        <Card className="lg:p-7">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1">
              <h1 className="text-[26px] font-bold tracking-[-0.02em]">Conversations</h1>
              <p className="mt-1 text-sm text-mute">
                Every {language} conversation you&apos;ve had, with its recording
                and review.
              </p>
            </div>
            <Link
              href="/conversation/new"
              className="rounded-full px-5 py-3 text-sm font-semibold text-white"
              style={{ background: ACCENT }}
            >
              New conversation
            </Link>
          </div>

          {sessions.length > 0 ? (
            <ul className="mt-6 flex flex-col gap-2">
              {sessions.map((session) => (
                <SessionRow key={session.id} session={session} languageLabel={language} />
              ))}
            </ul>
          ) : (
            <p className="mt-6 text-sm text-mute">
              No conversations yet. Start one and it will show up here.
            </p>
          )}
        </Card>
      </div>
    </AppShell>
  );
}
