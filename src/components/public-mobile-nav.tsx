"use client";

import Link from "next/link";
import { DashboardIcon, HomeIcon, SearchIcon, UserIcon } from "@/components/icons";
import { routeForRole, useAppSession } from "@/lib/auth";

const cx = (...items: (string | false | null | undefined)[]) => items.filter(Boolean).join(" ");

type PublicMobileNavProps = {
  onNavigate?: (href: string) => void;
  className?: string;
};

const items = [
  { href: "/", label: "Início", icon: <HomeIcon className="h-5 w-5" /> },
  { href: "/sobre", label: "O que é", icon: <SearchIcon className="h-5 w-5" /> },
  { href: "/instalar", label: "App", icon: <DashboardIcon className="h-5 w-5" /> },
  { href: "/login", label: "Acessar", icon: <UserIcon className="h-5 w-5" /> },
];

export function PublicMobileNav({ onNavigate, className }: PublicMobileNavProps) {
  const session = useAppSession();
  const dashboardHref = session ? routeForRole(session.role) : "/login";

  return (
    <nav className={cx("cm-bottom-nav grid grid-cols-4 gap-1 px-2 py-2 xl:hidden", className)} aria-label="Navegação principal">
      {items.map((item) => {
        const href = item.href === "/login" ? dashboardHref : item.href;
        const label = item.href === "/login" && session ? "Painel" : item.label;
        const common = "flex min-w-0 flex-col items-center gap-1 rounded-2xl px-1 py-2 text-[11px] font-bold transition hover:bg-white/10";
        if (onNavigate) {
          return (
            <button key={item.href} type="button" onClick={() => onNavigate(href)} className={common}>
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-[#22c55e]/20 bg-[#22c55e]/10 text-[#22c55e]">{item.icon}</span>
              <span>{label}</span>
            </button>
          );
        }
        return (
          <Link key={item.href} href={href} className={common}>
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-[#22c55e]/20 bg-[#22c55e]/10 text-[#22c55e]">{item.icon}</span>
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
