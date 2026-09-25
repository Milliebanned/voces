"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ThemeToggle } from "@/components/theme-toggle";

const LINKS = [
  { href: "#top", label: "Home" },
  { href: "#features", label: "Features" },
  { href: "#languages", label: "Languages" },
  { href: "/doc.pdf", label: "Guide", external: true },
];

/**
 * The landing nav below lg, where the inline links don't fit: a menu button
 * that opens the same links as a panel under the header.
 */
export function MobileMenu() {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: Event) => {
      if (event instanceof KeyboardEvent ? event.key === "Escape" : !root.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("keydown", close);
    document.addEventListener("pointerdown", close);
    return () => {
      document.removeEventListener("keydown", close);
      document.removeEventListener("pointerdown", close);
    };
  }, [open]);

  return (
    <div ref={root} className="lg:hidden">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="mobile-menu"
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={() => setOpen((value) => !value)}
        className="grid size-11 place-items-center rounded-full border border-line bg-card/80 text-ink"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
          {open ? (
            <path d="M4 4l10 10M14 4L4 14" />
          ) : (
            <path d="M2.5 5h13M2.5 9h13M2.5 13h13" />
          )}
        </svg>
      </button>

      {open && (
        <nav
          id="mobile-menu"
          aria-label="Main"
          className="absolute inset-x-4 top-full z-30 mt-1 rounded-[26px] border border-line bg-card p-2 shadow-[0_24px_48px_rgba(62,34,12,0.16)]"
        >
          <ul className="flex flex-col">
            {LINKS.map((link) => (
              <li key={link.label}>
                <a
                  href={link.href}
                  {...(link.external ? { target: "_blank", rel: "noopener" } : {})}
                  onClick={() => setOpen(false)}
                  className="flex h-14 items-center justify-between rounded-2xl px-5 text-[17px] font-semibold text-ink active:bg-tint"
                >
                  {link.label}
                  <svg width="8" height="14" viewBox="0 0 8 14" fill="none" stroke="#ED6A28" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M1.5 1 L6.5 7 L1.5 13" />
                  </svg>
                </a>
              </li>
            ))}
          </ul>
          <Link
            href="/login"
            onClick={() => setOpen(false)}
            className="mt-1 flex h-14 items-center justify-center rounded-2xl border-t border-line text-[17px] font-semibold"
            style={{ color: "#D9601C" }}
          >
            Sign in
          </Link>
          {/* The header has no room for the switch at phone width. */}
          <div className="mt-1 flex h-14 items-center justify-between rounded-2xl border-t border-line pr-2 pl-5">
            <span className="text-[15px] font-semibold text-ink">Appearance</span>
            <ThemeToggle className="size-10" />
          </div>
        </nav>
      )}
    </div>
  );
}
