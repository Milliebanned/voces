// The logo's five bars, as in the icon: short at the edges, tallest in the
// middle. While something loads they rise and fall like a voice speaking.
const BARS = [0.42, 0.66, 1, 0.66, 0.42];

/** The animated bars on their own, sized by `height` in pixels. */
export function LoadingBars({
  height = 16,
  className = "",
}: {
  height?: number;
  className?: string;
}) {
  const width = Math.max(2, Math.round(height / 6));
  return (
    <span
      aria-hidden
      className={`inline-flex shrink-0 items-center ${className}`}
      style={{ height, gap: width * 0.75 }}
    >
      {BARS.map((scale, i) => (
        <span
          key={i}
          className="logo-bar rounded-full bg-current"
          style={{
            width,
            height: height * scale,
            animationDelay: `${i * 0.12}s`,
          }}
        />
      ))}
    </span>
  );
}

/** The bars over the wordmark, for a whole screen that is on its way. */
export function LogoLoader({ label = "Loading" }: { label?: string }) {
  return (
    <div role="status" className="flex flex-col items-center gap-5 text-[#ED6A28]">
      <LoadingBars height={56} />
      <span className="text-[15px] font-extrabold tracking-[0.2em]">VOCES</span>
      <span className="sr-only">{label}</span>
    </div>
  );
}
