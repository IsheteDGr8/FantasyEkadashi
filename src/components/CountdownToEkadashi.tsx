"use client";

import { useEffect, useState } from "react";

function diff(target: Date) {
  const ms = target.getTime() - Date.now();
  if (ms <= 0) return null;
  const totalMinutes = Math.floor(ms / 60_000);
  return {
    days: Math.floor(totalMinutes / 60 / 24),
    hours: Math.floor((totalMinutes / 60) % 24),
    minutes: totalMinutes % 60,
    seconds: Math.floor((ms / 1000) % 60),
  };
}

export function CountdownToEkadashi({ target }: { target: string }) {
  const [state, setState] = useState<{
    mounted: boolean;
    parts: ReturnType<typeof diff> | null;
  }>({ mounted: false, parts: null });
  const { mounted, parts } = state;

  useEffect(() => {
    const targetDate = new Date(target);
    const tick = () => setState({ mounted: true, parts: diff(targetDate) });
    // Defer the first update out of the effect body to avoid cascading renders.
    const initial = setTimeout(tick, 0);
    const id = setInterval(tick, 1000);
    return () => {
      clearTimeout(initial);
      clearInterval(id);
    };
  }, [target]);

  if (mounted && parts === null) {
    return (
      <div className="inline-flex flex-col items-end">
        <span className="text-3xl font-semibold text-accent">It&apos;s today.</span>
        <span className="text-sm text-muted">Submit your screen time after midnight.</span>
      </div>
    );
  }

  const cell = (value: string, label: string) => (
    <div className="flex flex-col items-center">
      <span className="text-3xl sm:text-4xl font-semibold font-mono tabular-nums">{value}</span>
      <span className="text-[10px] uppercase tracking-wider text-muted">{label}</span>
    </div>
  );

  const pad = (n: number) => n.toString().padStart(2, "0");
  const ph = "—";

  return (
    <div className="inline-flex gap-3 sm:gap-5 justify-end" suppressHydrationWarning>
      {cell(parts ? pad(parts.days) : ph, "days")}
      {cell(parts ? pad(parts.hours) : ph, "hrs")}
      {cell(parts ? pad(parts.minutes) : ph, "min")}
      {cell(parts ? pad(parts.seconds) : ph, "sec")}
    </div>
  );
}
