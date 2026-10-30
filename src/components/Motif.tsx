import type { CategoryTheme } from "@/lib/repo/catalog";

/**
 * Drawn background pattern for each category. Uses currentColor, so the
 * parent sets the color via `color: var(--accent)`. Add new motifs here and
 * pick them in Admin › Categories.
 */
export function Motif({ kind, className = "" }: { kind: CategoryTheme["motif"]; className?: string }) {
  const common = {
    className,
    viewBox: "0 0 400 600",
    preserveAspectRatio: "xMidYMid slice",
    "aria-hidden": true,
    fill: "none",
    stroke: "currentColor",
  } as const;

  if (kind === "music") {
    // Five-line staff bending into a sound wave
    const lines = [0, 1, 2, 3, 4];
    return (
      <svg {...common}>
        {lines.map((i) => {
          const y = 150 + i * 22;
          const amp = 6 + i * 9;
          return (
            <path
              key={i}
              strokeWidth={1.4}
              opacity={0.35 + i * 0.12}
              d={`M-20 ${y} C 60 ${y}, 90 ${y - amp}, 140 ${y - amp} S 220 ${y + amp}, 270 ${y + amp} S 360 ${y - amp / 2}, 420 ${y}`}
            />
          );
        })}
        {[60, 130, 205, 280, 345].map((x, i) => (
          <g key={x} opacity={0.5}>
            <ellipse cx={x} cy={360 + (i % 3) * 26} rx={11} ry={8} transform={`rotate(-20 ${x} ${360 + (i % 3) * 26})`} fill="currentColor" stroke="none" />
            <line x1={x + 10} y1={356 + (i % 3) * 26} x2={x + 10} y2={300 + (i % 3) * 26} strokeWidth={2} />
          </g>
        ))}
      </svg>
    );
  }

  if (kind === "watch") {
    // Watch dial: minute ticks, hour markers and two hands
    const cx = 230,
      cy = 230,
      r = 170;
    return (
      <svg {...common}>
        <circle cx={cx} cy={cy} r={r + 22} strokeWidth={1} opacity={0.35} />
        <circle cx={cx} cy={cy} r={r - 34} strokeWidth={0.75} opacity={0.25} />
        {Array.from({ length: 60 }, (_, i) => {
          const a = (i / 60) * Math.PI * 2;
          const hour = i % 5 === 0;
          const r1 = hour ? r - 26 : r - 10;
          return (
            <line
              key={i}
              x1={cx + Math.sin(a) * r1}
              y1={cy - Math.cos(a) * r1}
              x2={cx + Math.sin(a) * r}
              y2={cy - Math.cos(a) * r}
              strokeWidth={hour ? 4 : 1.2}
              opacity={hour ? 0.8 : 0.45}
            />
          );
        })}
        <line x1={cx} y1={cy} x2={cx + 70} y2={cy - 92} strokeWidth={6} strokeLinecap="round" opacity={0.8} />
        <line x1={cx} y1={cy} x2={cx - 118} y2={cy - 40} strokeWidth={3} strokeLinecap="round" opacity={0.7} />
        <circle cx={cx} cy={cy} r={7} fill="currentColor" stroke="none" />
      </svg>
    );
  }

  if (kind === "circuit") {
    // PCB traces with vias and a chip
    const traces = [
      "M-10 90 H120 L150 120 H260 L290 90 H420",
      "M-10 150 H60 L90 180 V260 L120 290 H200",
      "M420 200 H330 L300 230 V300 L270 330 H200",
      "M60 420 V360 L90 330 H140",
      "M340 440 V370 L310 340 H260",
      "M-10 480 H100 L130 450 H280 L310 480 H420",
    ];
    const vias: [number, number][] = [[120, 90], [290, 90], [90, 180], [330, 200], [60, 420], [340, 440], [130, 450], [280, 450]];
    return (
      <svg {...common}>
        {traces.map((d) => (
          <path key={d} d={d} strokeWidth={2} opacity={0.5} strokeLinejoin="round" />
        ))}
        {vias.map(([x, y]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r={6} strokeWidth={2} opacity={0.75} />
        ))}
        <rect x={140} y={250} width={120} height={120} rx={10} strokeWidth={2.5} opacity={0.8} />
        {Array.from({ length: 5 }, (_, i) => (
          <g key={i} opacity={0.6} strokeWidth={2}>
            <line x1={160 + i * 20} y1={250} x2={160 + i * 20} y2={236} />
            <line x1={160 + i * 20} y1={370} x2={160 + i * 20} y2={384} />
            <line x1={140} y1={270 + i * 20} x2={126} y2={270 + i * 20} />
            <line x1={260} y1={270 + i * 20} x2={274} y2={270 + i * 20} />
          </g>
        ))}
      </svg>
    );
  }

  // plain: soft diagonal lines
  return (
    <svg {...common}>
      {Array.from({ length: 14 }, (_, i) => (
        <line key={i} x1={-100 + i * 40} y1={600} x2={200 + i * 40} y2={0} strokeWidth={1} opacity={0.25} />
      ))}
    </svg>
  );
}

export function themeStyle(theme: CategoryTheme) {
  return {
    "--accent": theme.accent,
    "--surface": theme.surface,
    "--ink": theme.ink,
  } as React.CSSProperties;
}
