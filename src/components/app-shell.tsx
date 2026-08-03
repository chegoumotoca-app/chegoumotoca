import Link from "next/link";
import { ReactNode } from "react";
import { DashboardIcon } from "@/components/icons";

export function Shell({
  sidebar,
  header,
  children,
}: {
  sidebar: ReactNode;
  header: ReactNode;
  children: ReactNode;
}) {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(83,232,128,0.12),_transparent_24%),radial-gradient(circle_at_bottom_left,_rgba(240,120,51,0.16),_transparent_24%),linear-gradient(180deg,#12151d_0%,#0c0e13_100%)] text-white">
      <div className="mx-auto grid min-h-screen w-full max-w-[1500px] gap-4 px-3 py-3 md:px-4 xl:grid-cols-[300px_minmax(0,1fr)] xl:px-6 xl:py-5">
        {sidebar}
        <section className="min-w-0 space-y-4 pb-8">{header}{children}</section>
      </div>
    </main>
  );
}

export function SidebarCard({ title, subtitle, children }: { title: string; subtitle: string; children?: ReactNode }) {
  return (
    <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] p-5 shadow-[0_25px_90px_rgba(0,0,0,0.25)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-[#f08a45]">{subtitle}</p>
          <h1 className="mt-2 text-[1.65rem] font-semibold leading-tight tracking-tight text-white">{title}</h1>
        </div>
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#53e880]/14 text-[#53e880] ring-1 ring-[#53e880]/20">
          <DashboardIcon className="h-5 w-5" />
        </div>
      </div>
      {children}
    </div>
  );
}

export function NavLink({ href, active, icon, children }: { href: string; active?: boolean; icon: ReactNode; children: ReactNode }) {
  return (
    <Link
      href={href}
      className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm transition ${
        active
          ? "border border-[#53e880]/25 bg-[#53e880]/10 text-white shadow-[0_12px_30px_rgba(83,232,128,0.08)]"
          : "border border-transparent text-zinc-300 hover:border-white/10 hover:bg-white/[0.05] hover:text-white"
      }`}
    >
      <span className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${active ? "bg-[#53e880]/16 text-[#9ef5b4]" : "bg-white/[0.04] text-zinc-300"}`}>
        {icon}
      </span>
      <span className="min-w-0 truncate">{children}</span>
    </Link>
  );
}
