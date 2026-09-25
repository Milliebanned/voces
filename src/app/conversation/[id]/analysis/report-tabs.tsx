"use client";

import { type ReactNode, useState } from "react";

export type ReportTab = { id: string; label: string; content: ReactNode };

// The panels are rendered on the server and handed in whole; this only
// decides which one is showing.
export function ReportTabs({ tabs }: { tabs: ReportTab[] }) {
  const [active, setActive] = useState(tabs[0]?.id);

  return (
    <div id="report" className="scroll-mt-6">
      <div role="tablist" aria-label="Session report" className="flex gap-7 overflow-x-auto border-b border-line sm:gap-11">
        {tabs.map((tab) => {
          const selected = tab.id === active;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`tab-${tab.id}`}
              aria-selected={selected}
              aria-controls={`panel-${tab.id}`}
              onClick={() => setActive(tab.id)}
              className={`relative shrink-0 pb-3.5 text-[14px] transition-colors sm:text-[15.5px] ${
                selected
                  ? "font-semibold text-tint-ink"
                  : "font-medium text-mute hover:text-ink"
              }`}
            >
              {tab.label}
              {selected && (
                <span className="absolute inset-x-0 -bottom-px h-[3px] rounded-full bg-[#E86A28]" />
              )}
            </button>
          );
        })}
      </div>

      {tabs.map((tab) => (
        <div
          key={tab.id}
          role="tabpanel"
          id={`panel-${tab.id}`}
          aria-labelledby={`tab-${tab.id}`}
          hidden={tab.id !== active}
          className="pt-7"
        >
          {tab.content}
        </div>
      ))}
    </div>
  );
}
