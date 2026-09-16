const BAR_HEIGHTS = [6, 12, 16, 10, 6];

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <div className="flex h-4 items-center gap-[2.5px]">
        {BAR_HEIGHTS.map((height, i) => (
          <span
            key={i}
            className="w-[3px] rounded-full bg-accent"
            style={{ height }}
          />
        ))}
      </div>
      <span className="text-[15px] font-bold tracking-[0.16em]">VOCES</span>
    </div>
  );
}
