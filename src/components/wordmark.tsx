// Mark proportions taken from the brand artwork: five rounded bars inside a
// square, heights relative to the tallest centre bar.
const BAR_RATIOS = [0.29, 0.62, 1, 0.62, 0.27];
const BAR_WIDTH = 0.125; // of the mark height
const BAR_GAP = 0.094;

export function Wordmark({
  size = 20,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <div
      className={`flex items-center ${className}`}
      style={{ gap: size * 0.208 }}
    >
      <div
        className="flex items-center"
        style={{ height: size, gap: size * BAR_GAP }}
      >
        {BAR_RATIOS.map((ratio, i) => (
          <span
            key={i}
            className="rounded-full bg-accent"
            style={{ width: size * BAR_WIDTH, height: size * ratio }}
          />
        ))}
      </div>
      <span
        className="font-extrabold text-accent"
        style={{ fontSize: size * 0.6875, letterSpacing: "0.04em" }}
      >
        VOCES
      </span>
    </div>
  );
}
