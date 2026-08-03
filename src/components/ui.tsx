import { ReactNode } from "react";

export function GradientTag({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs font-medium text-zinc-200">
      {children}
    </span>
  );
}

export function SectionTitle({ eyebrow, title, description }: { eyebrow?: string; title: string; description?: string }) {
  return (
    <div>
      {eyebrow ? <p className="text-xs uppercase tracking-[0.28em] text-[#f08a45]">{eyebrow}</p> : null}
      <h2 className="mt-1 text-2xl font-semibold tracking-tight text-white md:text-3xl">{title}</h2>
      {description ? <p className="mt-2 max-w-3xl text-sm leading-7 text-zinc-300 md:text-base">{description}</p> : null}
    </div>
  );
}

export function StatCard({ label, value, helper, tone = "green", icon, onClick, pulse = false }: { label: string; value: string; helper: string; tone?: "green" | "orange" | "blue" | "slate"; icon?: ReactNode; onClick?: () => void; pulse?: boolean }) {
  const tones = {
    green: "bg-[#53e880]/12 text-[#8af3a8] ring-[#53e880]/20",
    orange: "bg-[#f08a45]/12 text-[#f9b37f] ring-[#f08a45]/20",
    blue: "bg-sky-500/12 text-sky-200 ring-sky-500/20",
    slate: "bg-white/[0.05] text-zinc-200 ring-white/10",
  } as const;

  return (
    <article
      onClick={onClick}
      className={`cm-card rounded-[24px] p-4 md:p-5 transition ${onClick ? "cm-clickable" : ""} ${pulse ? "pulse-card-amber" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-zinc-200">{label}</p>
          <strong className="mt-3 block text-3xl font-semibold tracking-tight text-white">{value}</strong>
        </div>
        <span className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ring-1 ${tones[tone]}`}>{icon ?? "i"}</span>
      </div>
      <p className="mt-3 text-sm leading-6 text-zinc-400">{helper}</p>
    </article>
  );
}

export function InfoBox({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="cm-card rounded-[24px] p-4">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sky-500/12 text-sm font-semibold text-sky-200 ring-1 ring-sky-500/20">
          i
        </span>
        <div className="min-w-0">
          <p className="font-semibold text-white">{title}</p>
          <div className="mt-1 text-sm leading-6 text-zinc-300">{children}</div>
        </div>
      </div>
    </div>
  );
}

export function StatusBadge({ tone, children }: { tone: "green" | "orange" | "red" | "slate" | "blue"; children: ReactNode }) {
  const styles = {
    green: "bg-[#53e880]/12 text-[#8af3a8] ring-[#53e880]/20",
    orange: "bg-[#f08a45]/12 text-[#ffc69e] ring-[#f08a45]/20",
    red: "bg-rose-500/12 text-rose-200 ring-rose-500/20",
    slate: "bg-white/[0.05] text-zinc-200 ring-white/10",
    blue: "bg-sky-500/12 text-sky-200 ring-sky-500/20",
  } as const;

  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${styles[tone]}`}>{children}</span>;
}

export function ActionButton({ children, tone = "neutral" }: { children: ReactNode; tone?: "primary" | "neutral" | "warning" | "danger" | "success" }) {
  const styles = {
    primary: "bg-white text-[#11131b] hover:bg-zinc-100",
    neutral: "border border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.08]",
    warning: "border border-[#f08a45]/30 bg-[#f08a45]/10 text-[#ffd1b3] hover:bg-[#f08a45]/16",
    danger: "border border-rose-500/30 bg-rose-500/10 text-rose-200 hover:bg-rose-500/15",
    success: "border border-[#53e880]/30 bg-[#53e880]/10 text-[#8af3a8] hover:bg-[#53e880]/15",
  } as const;

  return (
    <span className={`inline-flex min-h-10 w-full cursor-pointer items-center justify-center rounded-2xl px-4 py-2.5 text-center text-sm font-medium leading-5 transition ${styles[tone]}`}>
      {children}
    </span>
  );
}

export function DetailCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="cm-card rounded-2xl p-3">
      <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">{label}</p>
      <p className="mt-1 break-words text-sm font-medium leading-6 text-white">{value}</p>
    </div>
  );
}
