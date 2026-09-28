"use client";

import { useFormStatus } from "react-dom";
import { LogoLoader } from "@/components/logo-loader";

/**
 * Put inside a <form>: while its action runs, the page dims behind the
 * animated logo so a slow server call reads as waiting, not frozen. It fades
 * in after a beat, so quick actions don't flash it.
 */
export function PendingOverlay({ label }: { label?: string }) {
  const { pending } = useFormStatus();
  if (!pending) return null;
  return (
    <div className="pending-overlay fixed inset-0 z-50 grid place-items-center bg-canvas/80 backdrop-blur-sm">
      <LogoLoader label={label} />
    </div>
  );
}
