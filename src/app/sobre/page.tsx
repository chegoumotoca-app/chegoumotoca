"use client";

import Link from "next/link";
import { AppFooter } from "@/components/app-footer";
import { PublicMobileNav } from "@/components/public-mobile-nav";
import { BrandHeader } from "@/components/brand-header";
import { IconImage } from "@/components/icon-image";

export default function SobrePage() {
  return (
    <main className="cm-page min-h-screen pb-10 text-white">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col gap-5 px-4 py-5">
        <BrandHeader publicView />
        <section className="cm-card rounded-[32px] p-6 md:p-8">
          <p className="text-xs uppercase tracking-[0.34em] text-[#f59e0b]">
            O que é o Chegou Motoca
          </p>
          <h1 className="mt-4 text-4xl font-black leading-tight md:text-5xl">
            Uma ponte local entre estabelecimento e entregador.
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-8 text-zinc-300">
            O Chegou Motoca ajuda estabelecimentos a chamar entregadores com
            mais controle, menos ligação e mais registro. Cada solicitação vira
            uma Bag, com aceite, acompanhamento, histórico, pagamentos e
            conferência.
          </p>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <article className="rounded-[26px] border border-white/10 bg-white/[0.04] p-5">
              <IconImage
                name="estabelecimento-colorido"
                alt=""
                className="h-12 w-12"
              />
              <h2 className="mt-4 text-2xl font-black">
                Para estabelecimentos
              </h2>
              <p className="mt-2 text-sm leading-7 text-zinc-300">
                Solicite Bags, acompanhe aceite, use mapa quando houver
                endereço, finalize entregas e mantenha crédito e histórico
                organizados.
              </p>
            </article>
            <article className="rounded-[26px] border border-white/10 bg-white/[0.04] p-5">
              <IconImage name="capacete" alt="" className="h-12 w-12" />
              <h2 className="mt-4 text-2xl font-black">Para entregadores</h2>
              <p className="mt-2 text-sm leading-7 text-zinc-300">
                Veja as Bags disponíveis, aceite com clareza, acompanhe suas
                entregas, anexos e repasses, e construa histórico de avaliações.
              </p>
            </article>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/login"
              className="cm-primary rounded-2xl px-5 py-3 text-sm font-black"
            >
              Acesse ou cadastre-se
            </Link>
            <Link
              href="/termos"
              className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-bold text-zinc-200"
            >
              Ver termos de uso
            </Link>
          </div>
        </section>
        <AppFooter compact />
      </div>
      <PublicMobileNav />
    </main>
  );
}
