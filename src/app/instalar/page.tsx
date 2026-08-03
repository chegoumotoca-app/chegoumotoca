"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AppFooter } from "@/components/app-footer";
import { BellIcon, HomeIcon, LocationIcon, UserIcon } from "@/components/icons";
import { PwaInstallPanel } from "@/components/pwa-install-panel";
import { routeForRole, useAppSession } from "@/lib/auth";

const cx = (...items: (string | false | null | undefined)[]) => items.filter(Boolean).join(" ");

export default function InstalarPage() {
  const [lightMode, setLightMode] = useState(false);
  const session = useAppSession();
  const dashboardHref = session ? routeForRole(session.role) : "/login";

  useEffect(() => {
    document.documentElement.dataset.theme = lightMode ? "light" : "dark";
    localStorage.setItem("chegou-theme", lightMode ? "light" : "dark");
  }, [lightMode]);

  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("chegou-theme") : null;
    if (saved === "light") setLightMode(true);
  }, []);

  const theme = lightMode ? "bg-[#fff7ed] text-[#111827]" : "bg-[#070f16] text-white";
  const panel = lightMode
    ? "border-slate-900/10 bg-white/86 text-[#111827] shadow-[0_22px_60px_rgba(91,55,20,0.12)]"
    : "border-white/10 bg-white/[0.055] text-white shadow-[0_22px_60px_rgba(0,0,0,0.24)]";
  const muted = lightMode ? "text-slate-700" : "text-zinc-300";

  return (
    <main className={cx("min-h-screen overflow-x-hidden transition-colors duration-300", theme)}>
      <div className={cx("pointer-events-none fixed inset-0", lightMode ? "bg-[radial-gradient(circle_at_15%_10%,rgba(245,158,11,0.18),transparent_25%),radial-gradient(circle_at_85%_2%,rgba(34,197,94,0.16),transparent_28%),linear-gradient(180deg,#fff7ed,#effdf5)]" : "bg-[radial-gradient(circle_at_15%_10%,rgba(245,158,11,0.16),transparent_30%),radial-gradient(circle_at_84%_2%,rgba(34,197,94,0.16),transparent_30%),linear-gradient(180deg,#0a1218,#071018)]")} />
      <div className="relative mx-auto flex min-h-screen w-full max-w-[1480px] flex-col px-4 pb-24 pt-4 sm:px-6 lg:px-8 lg:pb-8">
        <header className={cx("sticky top-3 z-40 rounded-[28px] border px-4 py-3 backdrop-blur-xl", panel)}>
          <div className="flex items-center justify-between gap-3">
            <Link href="/" className="brand-logo-fused relative block h-16 w-[230px] rounded-2xl sm:h-[78px] sm:w-[330px]" title="Início">
              <Image src="/brand/logo-chegoumotoca-cutout.png" alt="Chegou Motoca" fill className="object-contain object-left" priority />
            </Link>
            <div className="flex items-center gap-2">
              <Link href={dashboardHref} className="rounded-full bg-[#22c55e] px-4 py-2 text-sm font-black text-[#052e16]">{session ? "Painel" : "Entrar"}</Link>
              <button type="button" onClick={() => setLightMode((v) => !v)} className="theme-toggle-btn inline-flex h-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.055] px-3 text-sm font-bold transition hover:bg-white/[0.1]">
                {lightMode ? "Escuro" : "Claro"}
              </button>
            </div>
          </div>
        </header>

        <section className="grid flex-1 items-center gap-6 py-6 lg:grid-cols-[0.95fr_1.05fr]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#22c55e]/25 bg-[#22c55e]/12 px-4 py-2 text-[11px] font-black uppercase tracking-[0.22em] text-[#8af3a8]">
              Instalação do aplicativo
            </div>
            <h1 className="mt-5 max-w-4xl text-[40px] font-black leading-[0.98] tracking-tight sm:text-6xl xl:text-[76px]">
              Chegou Motoca direto na tela inicial.
            </h1>
            <p className={cx("mt-5 max-w-2xl text-lg leading-8", muted)}>
              Instale o Chegou Motoca no celular pelo Android, Safari ou Chrome no iPhone. Ative avisos importantes e permita localização para melhorar rota, distância e classificação de entregas.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.055] px-5 text-sm font-black transition hover:bg-white/[0.1]"><HomeIcon className="h-5 w-5" /> Início</Link>
              <Link href={dashboardHref} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[#22c55e] px-5 text-sm font-black text-[#052e16]"><UserIcon className="h-5 w-5" /> {session ? "Meu painel" : "Entrar"}</Link>
            </div>
          </div>

          <div className="mx-auto w-full max-w-[560px] rounded-[38px] border border-white/12 bg-[#071018] p-4 shadow-[0_25px_70px_rgba(0,0,0,0.4)]">
            <div className="rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,#0c191f,#071018)] p-5 text-white">
              <div className="flex items-center gap-4">
                <span className="relative h-20 w-20 overflow-hidden rounded-[26px] border border-white/10 bg-[#050b0f] shadow-[0_18px_40px_rgba(0,0,0,.34)]">
                  <Image src="/icons/pwa-icon-v45-192.png" alt="Ícone Chegou Motoca" fill className="object-cover" priority />
                </span>
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.25em] text-[#8af3a8]">Aplicativo oficial</p>
                  <strong className="mt-2 block text-2xl">Chegou Motoca</strong>
                  <span className="text-sm text-zinc-300">Acesso rápido, avisos e rota no celular</span>
                </div>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-[24px] border border-[#f59e0b]/25 bg-[#f59e0b]/12 p-4">
                  <BellIcon className="h-5 w-5 text-[#f59e0b]" />
                  <p className="mt-2 text-sm font-semibold text-[#ffe0b6]">Avisos de novas entregas</p>
                  <p className="mt-1 text-sm leading-6 text-zinc-300">Receba alertas para não perder oportunidades e atualizações.</p>
                </div>
                <div className="rounded-[24px] border border-sky-400/25 bg-sky-400/12 p-4">
                  <LocationIcon className="h-5 w-5 text-sky-300" />
                  <p className="mt-2 text-sm font-semibold text-sky-100">Localização e distância</p>
                  <p className="mt-1 text-sm leading-6 text-zinc-300">Ajuda no cálculo de rota, raio normal e entrega distante.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <PwaInstallPanel />
      </div>
      <AppFooter />
    </main>
  );
}
