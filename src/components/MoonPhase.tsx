import { cn } from "@/lib/utils";

/**
 * A decorative moon at a given point in the lunar cycle.
 *
 * `pos` runs 0 → 1 across one synodic month:
 *   0    = new moon (Amavasya, fully dark)
 *   0.25 = waxing first quarter
 *   0.5  = full moon (Purnima)
 *   0.75 = waning last quarter
 *
 * The lit shape is produced by sliding a "shadow" disc across a bright disc —
 * geometrically approximate but instantly readable, and robust across browsers.
 */
export function MoonPhase({
  pos,
  size = 64,
  className,
  glow = false,
}: {
  pos: number;
  size?: number;
  className?: string;
  glow?: boolean;
}) {
  const p = ((pos % 1) + 1) % 1;
  const illum = 1 - 2 * Math.abs(0.5 - p); // 0 at new, 1 at full
  const dir = p < 0.5 ? -1 : 1; // waxing lights the right, waning the left
  const offset = illum * 100 * dir;

  return (
    <span
      className={cn(
        "relative inline-block shrink-0 rounded-full overflow-hidden",
        glow && "fe-glow",
        className,
      )}
      style={{
        width: size,
        height: size,
        background:
          "radial-gradient(circle at 36% 30%, #fffdf5 0%, #e7e3d4 45%, #c8c4d6 75%, #a9a6c0 100%)",
        boxShadow: glow
          ? "0 0 30px 6px color-mix(in srgb, var(--accent) 30%, transparent), inset 0 0 14px rgba(0,0,0,0.25)"
          : "inset 0 0 10px rgba(0,0,0,0.28)",
      }}
      aria-hidden
    >
      <span
        className="absolute inset-0 rounded-full"
        style={{ background: "var(--background)", transform: `translateX(${offset}%)` }}
      />
      <span className="absolute inset-0 rounded-full ring-1 ring-white/10" />
    </span>
  );
}
