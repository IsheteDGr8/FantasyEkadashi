/**
 * Decorative, non-interactive galaxy layer: soft nebula orbs drifting in the
 * background plus the occasional shooting star. Pure CSS — sits behind all
 * content and is hidden from assistive tech.
 */
export function Starscape() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      {/* Nebula orbs */}
      <div
        className="fe-orb fe-float"
        style={{
          top: "-6rem",
          left: "-4rem",
          width: "22rem",
          height: "22rem",
          background:
            "radial-gradient(circle, color-mix(in srgb, var(--accent) 55%, transparent), transparent 70%)",
          animationDuration: "11s",
        }}
      />
      <div
        className="fe-orb fe-float"
        style={{
          top: "20%",
          right: "-6rem",
          width: "26rem",
          height: "26rem",
          background:
            "radial-gradient(circle, color-mix(in srgb, var(--accent-2) 45%, transparent), transparent 70%)",
          animationDuration: "14s",
          animationDelay: "1.5s",
        }}
      />
      <div
        className="fe-orb fe-float"
        style={{
          bottom: "-8rem",
          left: "30%",
          width: "30rem",
          height: "30rem",
          background:
            "radial-gradient(circle, color-mix(in srgb, var(--accent-3) 45%, transparent), transparent 70%)",
          animationDuration: "16s",
          animationDelay: "0.8s",
        }}
      />

      {/* Shooting stars */}
      <span className="fe-shooting-star" style={{ top: "12%", left: "8%", animationDelay: "2s" }} />
      <span className="fe-shooting-star" style={{ top: "30%", left: "55%", animationDelay: "6s" }} />
      <span className="fe-shooting-star" style={{ top: "65%", left: "20%", animationDelay: "10s" }} />
    </div>
  );
}
