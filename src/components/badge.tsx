import { ReactNode } from "react";

type BadgeTone = "green" | "yellow" | "red" | "blue" | "slate";

const toneMap: Record<BadgeTone, string> = {
  green: "bg-emerald-500/12 text-emerald-300 ring-1 ring-emerald-500/25",
  yellow: "bg-amber-500/12 text-amber-200 ring-1 ring-amber-500/25",
  red: "bg-rose-500/12 text-rose-200 ring-1 ring-rose-500/25",
  blue: "bg-sky-500/12 text-sky-200 ring-1 ring-sky-500/25",
  slate: "bg-white/8 text-zinc-300 ring-1 ring-white/10",
};

export function Badge({ children, tone = "slate" }: { children: ReactNode; tone?: BadgeTone }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${toneMap[tone]}`}>
      {children}
    </span>
  );
}
