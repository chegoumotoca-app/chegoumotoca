"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { CheckIcon, DashboardIcon, HomeIcon, MoonIcon, SearchIcon, SunIcon, UserIcon } from "@/components/icons";
import { IconImage, AppIconName } from "@/components/icon-image";
import { AppFooter } from "@/components/app-footer";
import { routeForRole, useAppSession } from "@/lib/auth";

const cx = (...items: (string | false | undefined | null)[]) => items.filter(Boolean).join(" ");

const benefits: { title: string; text: string; icon: AppIconName }[] = [
  {
    title: "Bag Express ou Detalhada",
    text: "Use Bag Express para chamar rápido ou Bag Detalhada quando quiser informar cliente, endereço e observações.",
    icon: "entrega",
  },
  {
    title: "Mapa em um toque",
    text: "Após aceitar, o motoboy abre o bairro ou endereço no mapa e segue a rota com mais agilidade.",
    icon: "mapa",
  },
  {
    title: "Contato certo na hora certa",
    text: "Fale com estabelecimento, entregador ou cliente com poucos toques depois que a Bag for aceita.",
    icon: "whatsapp",
  },
  {
    title: "Pagamento pelo Chegou Motoca",
    text: "Recebimento e repasse ficam organizados pela plataforma, com histórico para conferência.",
    icon: "caixa-de-entrega",
  },
];

function PhonePreview() {
  return (
    <div className="relative mx-auto w-full max-w-[360px] rounded-[38px] border border-white/12 bg-[#071018] p-3 shadow-[0_25px_70px_rgba(0,0,0,0.4)] xl:max-w-[390px]">
      <div className="rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,#0c191f,#071018)] p-4 text-white">
        <div className="flex items-center justify-between gap-3">
          <div className="relative h-12 w-[178px]">
            <Image src="/brand/logo-chegoumotoca-cutout.png" alt="Chegou Motoca" fill className="object-contain object-left" priority />
          </div>
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[#22c55e]/25 bg-[#22c55e]/12 text-[#8af3a8]"><UserIcon className="h-5 w-5" /></span>
        </div>

        <div className="mt-4 rounded-[26px] border border-[#22c55e]/25 bg-[#22c55e]/12 p-4">
          <p className="text-[10px] font-black uppercase tracking-[0.35em] text-[#8af3a8]">Motoboy online</p>
          <div className="mt-3 flex items-center justify-between gap-3">
            <div>
              <strong className="block text-xl">Entregador online</strong>
              <span className="mt-2 inline-flex rounded-full bg-[#22c55e]/18 px-3 py-1 text-xs font-semibold text-[#9ff6bd]">Disponível</span>
            </div>
            <span className="inline-flex rounded-2xl bg-[#f59e0b]/18 px-4 py-3 text-sm font-black text-[#ffd8a8]">2 novas</span>
          </div>
        </div>

        <div className="mt-4 rounded-[26px] border border-[#f59e0b]/45 bg-[#f59e0b]/15 p-4 shadow-[0_0_35px_rgba(245,158,11,0.12)]">
          <p className="text-sm font-semibold text-[#ffd8a8]">Nova entrega disponível</p>
          <strong className="mt-2 block text-3xl">R$ 21,60</strong>
          <p className="mt-2 text-sm text-zinc-300">3 entregas • Centro, Buscardi, Maria Luiza</p>
          <button className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#22c55e] px-4 py-3 text-sm font-black text-[#052e16]">
            <IconImage name="capacete" alt="Motoboy" className="h-5 w-5" /> Aceitar agora
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 text-[11px] text-zinc-200">
          <span className="rounded-2xl bg-white/[0.06] px-3 py-3"><b>Mapa</b><br />abrir rota</span>
          <span className="rounded-2xl bg-white/[0.06] px-3 py-3"><b>WhatsApp</b><br />em um toque</span>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const [lightMode, setLightMode] = useState(false);
  const session = useAppSession();
  const dashboardHref = session ? routeForRole(session.role) : "/login";
  const accessLabel = session ? "Meu painel" : "Acesse ou cadastre-se";

  useEffect(() => {
    document.documentElement.dataset.theme = lightMode ? "light" : "dark";
    localStorage.setItem("chegou-theme", lightMode ? "light" : "dark");
  }, [lightMode]);

  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("chegou-theme") : null;
    if (saved === "light") setLightMode(true);
  }, []);

  const theme = lightMode ? "bg-[#fff7ed] text-[#111827]" : "bg-[#070f16] text-white";
  const muted = lightMode ? "text-slate-700" : "text-zinc-300";
  const panel = lightMode
    ? "border-slate-900/10 bg-white/86 text-[#111827] shadow-[0_22px_60px_rgba(91,55,20,0.12)]"
    : "border-white/10 bg-white/[0.055] text-white shadow-[0_22px_60px_rgba(0,0,0,0.24)]";
  const card = lightMode ? "border-slate-900/10 bg-white/86" : "border-white/10 bg-[#0b141c]/80";

  return (
    <main className={cx("min-h-screen overflow-x-hidden transition-colors duration-300", theme)}>
      <div className={cx("pointer-events-none fixed inset-0", lightMode ? "bg-[radial-gradient(circle_at_15%_10%,rgba(245,158,11,0.18),transparent_25%),radial-gradient(circle_at_85%_2%,rgba(34,197,94,0.16),transparent_28%),linear-gradient(180deg,#fff7ed,#effdf5)]" : "bg-[radial-gradient(circle_at_15%_10%,rgba(245,158,11,0.16),transparent_30%),radial-gradient(circle_at_84%_2%,rgba(34,197,94,0.16),transparent_30%),linear-gradient(180deg,#0a1218,#071018)]")} />

      <div className="relative mx-auto flex min-h-screen w-full max-w-[1480px] flex-col px-4 pb-24 pt-4 sm:px-6 lg:px-8 lg:pb-8">
        <header className={cx("sticky top-3 z-40 rounded-[28px] border px-4 py-3 backdrop-blur-xl", panel)}>
          <div className="flex items-center justify-between gap-3">
            <Link href={session ? dashboardHref : "/"} className="brand-logo-fused relative block h-16 w-[230px] rounded-2xl sm:h-[78px] sm:w-[330px]" title={session ? "Voltar para meu painel" : "Início"}>
              <Image src="/brand/logo-chegoumotoca-cutout.png" alt="Chegou Motoca" fill className="object-contain object-left" priority />
            </Link>
            <nav className="hidden items-center gap-2 md:flex">
              <a href="#quem-somos" className={cx("rounded-full px-4 py-2 text-sm font-bold transition hover:bg-white/10", muted)}>O que é</a>
              <a href="#beneficios" className={cx("rounded-full px-4 py-2 text-sm font-bold transition hover:bg-white/10", muted)}>Benefícios</a>
              <Link href="/instalar" className={cx("rounded-full px-4 py-2 text-sm font-bold transition hover:bg-white/10", muted)}>Instalar app</Link>
              <Link href={dashboardHref} className="rounded-full bg-[#22c55e] px-4 py-2 text-sm font-black text-[#052e16] transition hover:scale-[1.02]">{accessLabel}</Link>
            </nav>
            <div className="flex items-center gap-2 md:hidden">
              <Link href="/instalar" className="rounded-full border border-[#f59e0b]/30 bg-[#f59e0b]/12 px-3 py-2 text-xs font-black text-[#f59e0b]">App</Link>
              <Link href={dashboardHref} className="rounded-full bg-[#22c55e] px-3 py-2 text-xs font-black text-[#052e16]">{session ? "Painel" : "Acessar"}</Link>
            </div>
            <button type="button" onClick={() => setLightMode((v) => !v)} className="theme-toggle-btn inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.055] px-3 text-sm font-bold transition hover:bg-white/[0.1] sm:px-4">
              {lightMode ? <MoonIcon className="h-4 w-4" /> : <SunIcon className="h-4 w-4" />}
              <span className="sr-only">{lightMode ? "Modo escuro" : "Modo claro"}</span>
            </button>
          </div>
        </header>

        <section className="grid flex-1 items-center gap-8 py-5 xl:grid-cols-[1.02fr_0.98fr] xl:py-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#f59e0b]/25 bg-[#f59e0b]/12 px-4 py-2 text-[11px] font-black uppercase tracking-[0.22em] text-[#f59e0b]">
              Entregas locais para Taquaritinga e região
            </div>
            <h1 className="mt-5 max-w-4xl text-[40px] font-black leading-[0.98] tracking-tight sm:text-6xl xl:text-[72px] 2xl:text-[80px]">
              Motoboys disponíveis para entregas rápidas na sua cidade.
            </h1>
            <p className={cx("mt-5 max-w-2xl text-lg leading-8", muted)}>
              Mais controle para o estabelecimento. Mais oportunidades para o entregador. Solicite, aceite, acompanhe no mapa e finalize com histórico.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <Link href="/cadastro?tipo=estabelecimento" className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-[#22c55e] px-5 text-base font-black text-[#052e16] shadow-[0_18px_45px_rgba(34,197,94,0.28)] transition hover:-translate-y-0.5 hover:scale-[1.01]">
                <IconImage name="estabelecimento-colorido" alt="Estabelecimento" className="h-7 w-7" /> Cadastrar estabelecimento
              </Link>
              <Link href="/cadastro?tipo=motoboy" className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl border border-[#f59e0b]/30 bg-[#f59e0b]/12 px-5 text-base font-black text-[#f59e0b] transition hover:-translate-y-0.5 hover:scale-[1.01]">
                <IconImage name="capacete" alt="Motoboy" className="h-7 w-7" /> Cadastrar entregador
              </Link>
              <Link href={dashboardHref} className={cx("inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl border px-5 text-base font-black transition hover:-translate-y-0.5 hover:scale-[1.01]", lightMode ? "border-slate-900/10 bg-white text-slate-900" : "border-white/10 bg-white/[0.055] text-white")}>
                <UserIcon className="h-5 w-5" /> {session ? "Voltar ao painel" : "Entrar"}
              </Link>
            </div>
            <Link href="/instalar" className={cx("mt-4 inline-flex rounded-2xl border px-4 py-3 text-sm font-black transition hover:-translate-y-0.5", lightMode ? "border-slate-900/10 bg-white/80 text-slate-900" : "border-[#f59e0b]/30 bg-[#f59e0b]/10 text-[#ffd8a8]")}>
              Instalar o app / ativar notificações
            </Link>
          </div>

          <div className="relative mx-auto mt-2 block w-full max-w-[360px] xl:mt-0 xl:max-w-none">
            <div className="absolute -right-8 top-8 h-52 w-52 rounded-full bg-[#22c55e]/22 blur-3xl" />
            <PhonePreview />
          </div>
        </section>

        <section id="quem-somos" className={cx("mb-4 grid gap-4 rounded-[34px] border p-5 md:grid-cols-[0.92fr_1.08fr]", panel)}>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.26em] text-[#22c55e]">O que é Chegou Motoca</p>
            <h2 className="mt-2 text-2xl font-black tracking-tight md:text-3xl">Uma ponte local entre quem precisa entregar e quem quer trabalhar.</h2>
          </div>
          <div className={cx("grid gap-3 sm:grid-cols-2", muted)}>
            <p className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm leading-6"><b className="text-inherit">Para o estabelecimento:</b> menos ligação, menos negociação no improviso e mais controle sobre aceite, retirada, mapa e finalização.</p>
            <p className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm leading-6"><b className="text-inherit">Para o motoboy:</b> veja locais, valor líquido e detalhes antes de aceitar, com histórico de repasses e avaliações.</p>
          </div>
        </section>

        <section id="beneficios" className={cx("mb-2 rounded-[34px] border p-4 md:p-5", panel)}>
          <div className="mb-4 flex flex-col justify-between gap-3 md:flex-row md:items-center">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.26em] text-[#22c55e]">Como ajuda na prática</p>
              <h2 className="mt-2 text-2xl font-black tracking-tight md:text-3xl">Menos ligação, menos bagunça, mais controle.</h2>
            </div>
            <a href="https://wa.me/5517997001020" target="_blank" rel="noreferrer" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-[#25D366]/30 bg-[#25D366]/12 px-5 text-sm font-black text-[#8ef5b4] transition hover:scale-[1.02]">
              <IconImage name="whatsapp" alt="WhatsApp" className="h-5 w-5" /> Falar com a equipe
            </a>
          </div>

          <div className="grid gap-3 md:grid-cols-4">
            {benefits.map((item) => (
              <article key={item.title} className={cx("rounded-[24px] border p-4 transition hover:-translate-y-1 hover:border-[#22c55e]/35", card)}>
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#22c55e]/12 ring-1 ring-[#22c55e]/22">
                  <IconImage name={item.icon} alt="" className="h-8 w-8" />
                </span>
                <h3 className="mt-4 text-lg font-black">{item.title}</h3>
                <p className={cx("mt-2 text-sm leading-6", muted)}>{item.text}</p>
              </article>
            ))}
          </div>
        </section>
      </div>

      <AppFooter />

      <nav className={cx("fixed inset-x-3 bottom-[calc(1rem+max(env(safe-area-inset-bottom),0px))] z-50 grid grid-cols-4 gap-1 rounded-[26px] border px-2 py-2 shadow-[0_18px_55px_rgba(0,0,0,0.36)] backdrop-blur-xl xl:hidden", lightMode ? "border-slate-900/10 bg-white/92" : "border-white/10 bg-[#0a1118]/94")}>
        {[
          ["/", "Início", <HomeIcon key="i" className="h-5 w-5" />],
          ["/#quem-somos", "O que é", <SearchIcon key="c" className="h-5 w-5" />],
          ["/instalar", "App", <DashboardIcon key="a" className="h-5 w-5" />],
          [dashboardHref, session ? "Painel" : "Acessar", <UserIcon key="e" className="h-5 w-5" />],
        ].map(([href, label, icon]) => (
          <Link key={String(label)} href={String(href)} className="flex flex-col items-center gap-1 rounded-2xl px-1 py-2 text-[11px] font-bold text-inherit transition hover:bg-white/10">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-[#22c55e]/20 bg-[#22c55e]/10 text-[#22c55e]">{icon}</span>
            <span>{label}</span>
          </Link>
        ))}
      </nav>
    </main>
  );
}
