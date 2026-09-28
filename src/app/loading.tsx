import { LogoLoader } from "@/components/logo-loader";

// Shown straight away on every navigation while the next page renders on the
// server, instead of the old page sitting still.
export default function Loading() {
  return (
    <div className="grid min-h-dvh flex-1 place-items-center bg-canvas">
      <LogoLoader />
    </div>
  );
}
