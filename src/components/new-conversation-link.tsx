import Link from "next/link";

// Sits in page headers so a new conversation is one tap away from anywhere,
// rather than at the bottom of a long transcript.
export function NewConversationLink() {
  return (
    <Link
      href="/conversation/new"
      className="rounded-full bg-accent px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-accent-hover"
    >
      New conversation
    </Link>
  );
}
