/**
 * A circular map of one lunar month (30 tithis), highlighting the two Ekadashis.
 * Pure inline SVG so it renders on the server with no client JS.
 */
export function LunarDial({ size = 340 }: { size?: number }) {
  const cx = 180;
  const cy = 180;
  const R = 140;
  const N = 30;

  // index 0 = new moon (top), index 15 = full moon (bottom), clockwise.
  const SHUKLA_EKADASHI = 11;
  const KRISHNA_EKADASHI = 26;

  const pointAt = (i: number, radius: number) => {
    const angle = (-90 + i * (360 / N)) * (Math.PI / 180);
    return { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) };
  };

  const dots = Array.from({ length: N }, (_, i) => i);

  return (
    <svg
      viewBox="0 0 360 360"
      width={size}
      height={size}
      className="max-w-full"
      role="img"
      aria-label="Diagram of one lunar month with its two Ekadashis"
    >
      {/* faint guide ring */}
      <circle
        cx={cx}
        cy={cy}
        r={R}
        fill="none"
        style={{ stroke: "var(--border)" }}
        strokeWidth={1.5}
      />

      {/* the 30 tithi dots */}
      {dots.map((i) => {
        const isEkadashi = i === SHUKLA_EKADASHI || i === KRISHNA_EKADASHI;
        const { x, y } = pointAt(i, R);
        if (isEkadashi) {
          return (
            <g key={i}>
              <circle cx={x} cy={y} r={11} style={{ fill: "var(--accent)" }} />
              <circle
                cx={x}
                cy={y}
                r={17}
                fill="none"
                style={{ stroke: "var(--accent)" }}
                strokeWidth={1.5}
                opacity={0.5}
              />
            </g>
          );
        }
        const isMarker = i === 0 || i === 15; // new / full
        return (
          <circle
            key={i}
            cx={x}
            cy={y}
            r={isMarker ? 6 : 3.5}
            style={{ fill: isMarker ? "var(--foreground)" : "var(--muted)" }}
            opacity={isMarker ? 0.9 : 0.5}
          />
        );
      })}

      {/* new / full moon labels */}
      <text
        x={cx}
        y={cy - R - 14}
        textAnchor="middle"
        style={{ fill: "var(--muted)" }}
        fontSize={12}
      >
        New moon · Amavasya
      </text>
      <text
        x={cx}
        y={cy + R + 24}
        textAnchor="middle"
        style={{ fill: "var(--muted)" }}
        fontSize={12}
      >
        Full moon · Purnima
      </text>

      {/* Ekadashi callouts */}
      <text
        x={pointAt(SHUKLA_EKADASHI, R).x + 22}
        y={pointAt(SHUKLA_EKADASHI, R).y + 4}
        textAnchor="start"
        style={{ fill: "var(--accent)" }}
        fontSize={12}
        fontWeight={600}
      >
        Shukla Ekadashi
      </text>
      <text
        x={pointAt(KRISHNA_EKADASHI, R).x - 22}
        y={pointAt(KRISHNA_EKADASHI, R).y + 4}
        textAnchor="end"
        style={{ fill: "var(--accent)" }}
        fontSize={12}
        fontWeight={600}
      >
        Krishna Ekadashi
      </text>

      {/* waxing / waning arc hints */}
      <text
        x={cx + R - 6}
        y={cy - 2}
        textAnchor="middle"
        style={{ fill: "var(--muted)" }}
        fontSize={10}
        opacity={0.7}
        transform={`rotate(90 ${cx + R - 6} ${cy})`}
      >
        waxing →
      </text>
      <text
        x={cx - R + 6}
        y={cy - 2}
        textAnchor="middle"
        style={{ fill: "var(--muted)" }}
        fontSize={10}
        opacity={0.7}
        transform={`rotate(-90 ${cx - R + 6} ${cy})`}
      >
        waning →
      </text>

      {/* center label */}
      <text
        x={cx}
        y={cy - 8}
        textAnchor="middle"
        style={{ fill: "var(--foreground)" }}
        fontSize={20}
        fontWeight={700}
      >
        30 tithis
      </text>
      <text
        x={cx}
        y={cy + 14}
        textAnchor="middle"
        style={{ fill: "var(--muted)" }}
        fontSize={12}
      >
        one lunar month
      </text>
      <text
        x={cx}
        y={cy + 34}
        textAnchor="middle"
        style={{ fill: "var(--accent)" }}
        fontSize={12}
        fontWeight={600}
      >
        2 Ekadashis
      </text>
    </svg>
  );
}
