"use client";

import Link from "next/link";
import { useEffect } from "react";
import { BrandHeader } from "@/components/brand-header";
import { clearAppSession } from "@/lib/auth";

export default function EstablishmentError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[estabelecimento] erro ao carregar painel", error);
  }, [error]);

  return (
    <main className="cm-page min-h-screen pb-10 text-white">
      <div className="mx-auto flex min-h-screen max-w-3xl flex-col gap-5 px-4 py-5">
        <BrandHeader publicView />
        <section className="cm-card rounded-[32px] p-6 md:p-8">
          <p className="text-xs uppercase tracking-[0.34em] text-[#f59e0b]">Painel do estabelecimento</p>
          <h1 className="mt-4 text-3xl font-black text-white">Não conseguimos abrir o painel agora.</h1>
          <p className="mt-3 text-sm leading-7 text-zinc-300">
            O acesso foi reconhecido, mas algum dado do estabelecimento não carregou corretamente. Tente recarregar; se continuar, saia e entre novamente.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button type="button" onClick={reset} className="cm-primary rounded-2xl px-5 py-3 text-sm font-black">Tentar novamente</button>
            <button type="button" onClick={() => { clearAppSession(); window.location.href = "/login"; }} className="cm-danger rounded-2xl border px-5 py-3 text-sm font-bold">Sair e entrar de novo</button>
            <Link href="/recuperar-acesso" className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-bold text-zinc-200">Falar com a equipe</Link>
          </div>
        </section>
      </div>
    </main>
  );
}
