"use client";

import { type FormEvent, useState } from "react";
import { AppFooter } from "@/components/app-footer";
import { PublicMobileNav } from "@/components/public-mobile-nav";
import { BrandHeader } from "@/components/brand-header";
import { IconImage } from "@/components/icon-image";
import { submitAppFeedback } from "@/lib/runtime-store";

export default function AvaliacoesPage() {
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    whatsapp: "",
    kind: "sugestao" as const,
    message: "",
  });
  const [error, setError] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!form.name.trim() || !form.message.trim()) {
      setError("Informe seu nome e escreva a mensagem antes de enviar.");
      return;
    }
    submitAppFeedback({
      name: form.name.trim(),
      email: form.email.trim() || undefined,
      whatsapp: form.whatsapp.trim() || undefined,
      kind: form.kind,
      message: form.message.trim(),
    });
    setSent(true);
  }

  return (
    <main className="cm-page min-h-screen pb-10 text-white">
      <div className="mx-auto flex min-h-screen max-w-4xl flex-col gap-5 px-4 py-5">
        <BrandHeader publicView />
        <section className="cm-card rounded-[32px] p-6 md:p-8">
          <p className="text-xs uppercase tracking-[0.34em] text-[#f59e0b]">
            Avaliações e sugestões
          </p>
          <h1 className="mt-4 text-4xl font-black leading-tight">
            Ajude o Chegou Motoca a melhorar.
          </h1>
          <p className="mt-3 text-sm leading-7 text-zinc-300">
            Use este espaço para mandar sugestão, relatar problema, elogiar ou
            pedir contato. A mensagem aparece no painel administrativo para a
            equipe acompanhar e responder.
          </p>
          {sent ? (
            <div className="mt-5 rounded-2xl border border-[#22c55e]/20 bg-[#22c55e]/10 p-4 text-[#baf7cd]">
              Sugestão registrada. Obrigado pelo retorno.
            </div>
          ) : (
            <form className="mt-6 grid gap-3" onSubmit={submit}>
              <input
                value={form.name}
                onChange={(e) => setForm((c) => ({ ...c, name: e.target.value }))}
                className="cm-input rounded-2xl px-4 py-3"
                placeholder="Seu nome ou estabelecimento"
              />
              <input
                value={form.email}
                onChange={(e) => setForm((c) => ({ ...c, email: e.target.value }))}
                className="cm-input rounded-2xl px-4 py-3"
                type="email"
                placeholder="E-mail para retorno"
              />
              <input
                value={form.whatsapp}
                onChange={(e) => setForm((c) => ({ ...c, whatsapp: e.target.value }))}
                className="cm-input rounded-2xl px-4 py-3"
                placeholder="WhatsApp opcional"
              />
              <select
                value={form.kind}
                onChange={(e) => setForm((c) => ({ ...c, kind: e.target.value as typeof form.kind }))}
                className="cm-input rounded-2xl px-4 py-3 [color-scheme:dark]"
              >
                <option className="bg-[#11131b] text-white" value="sugestao">Sugestão</option>
                <option className="bg-[#11131b] text-white" value="problema">Problema no uso</option>
                <option className="bg-[#11131b] text-white" value="elogio">Elogio</option>
                <option className="bg-[#11131b] text-white" value="contato">Pedido de contato</option>
              </select>
              <textarea
                value={form.message}
                onChange={(e) => setForm((c) => ({ ...c, message: e.target.value }))}
                className="cm-input min-h-32 rounded-2xl px-4 py-3"
                placeholder="Digite sua mensagem"
              />
              {error ? (
                <p className="rounded-2xl border border-rose-500/25 bg-rose-500/12 px-4 py-3 text-sm text-rose-100">
                  {error}
                </p>
              ) : null}
              <button className="cm-primary inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-black">
                <IconImage name="whatsapp" alt="" className="h-5 w-5" /> Enviar
                avaliação
              </button>
            </form>
          )}
        </section>
        <AppFooter compact />
      </div>
      <PublicMobileNav />
    </main>
  );
}
