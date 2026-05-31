"use client";

import { useEffect, useState } from "react";

interface Props {
  target: string; // ISO timestamp
}

function diff(target: Date) {
  const ms = target.getTime() - Date.now();
  if (ms <= 0) return null;
  const totalMinutes = Math.floor(ms / 60_000);
  const days = Math.floor(totalMinutes / 60 / 24);
  const hours = Math.floor((totalMinutes / 60) % 24);
  const minutes = totalMinutes % 60;
  const seconds = Math.floor((ms / 1000) % 60);
  return { days, hours, minutes, seconds };
}

export function CountdownToEkadashi({ target }: Props) {
  const targetDate = new Date(target);
  const [parts, setParts] = useState(() => diff(targetDate));

  useEffect(() => {
    const id = setInterval(() => setParts(diff(targetDate)), 1000);
    return () => clearInterval(id);
  }, [target]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!parts) {
    return (
      <div className="inline-flex flex-col items-end">
        <span className="text-3xl font-semibold text-accent">It&apos;s today.</span>
        <span className="text-sm text-muted">Submit your screen time after midnight.</span>
      </div>
    );
  }

  const cell = (n: number, label: string) => (
    <div className="flex flex-col items-center">
      <span className="text-3xl sm:text-4xl font-semibold font-mono tabular-nums">
        {n.toString().padStart(2, "0")}
      </span>
      <span className="text-[10px] uppercase tracking-wider text-muted">
        {label}
      </span>
    </div>
  );

  return (
    <div className="inline-flex gap-3 sm:gap-5 justify-end">
      {cell(parts.days, "days")}
      {cell(parts.hours, "hrs")}
      {cell(parts.minutes, "min")}
      {cell(parts.seconds, "sec")}
    </div>
  );
}
