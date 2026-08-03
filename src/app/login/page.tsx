"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { BrandHeader } from "@/components/brand-header";
import { AppFooter } from "@/components/app-footer";
import { PublicMobileNav } from "@/components/public-mobile-nav";
import { IconImage } from "@/components/icon-image";
import { EyeIcon, EyeOffIcon } from "@/components/icons";
import { loginAppUser, routeForRole } from "@/lib/auth";

const cityOptions = [{ label: "Taquaritinga/SP", value: "taquaritinga-sp" }];
type LoginKind = "estabelecimento" | "motoboy";

export default function LoginPage() {
  const router = useRouter();
  const [citySlug, setCitySlug] = useState(cityOptions[0].value);
  const [loginKind, setLoginKind] = useState<LoginKind>("estabelecimento");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submitLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const res = await loginAppUser(identifier, password, citySlug, loginKind);
    setLoading(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    router.push(routeForRole(res.session.role));
  }

  return (
    <main className="cm-page pb-24 text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-4 py-4 md:px-6 xl:px-8 xl:py-6">
        <BrandHeader publicView />

        <section className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
          <article className="cm-card order-2 rounded-[34px] p-6 md:p-8 lg:order-1">
            <p className="text-xs uppercase tracking-[0.35em] text-[#f59e0b]">
              Acesse ou cadastre-se
            </p>
            <h1 className="mt-4 text-4xl font-black leading-tight tracking-tight text-white md:text-5xl">
              Entre no Chegou Motoca.
            </h1>
            <p className="mt-4 text-base leading-8 text-zinc-300">
              Entre com sua conta aprovada ou envie seu cadastro. A equipe
              confere os dados antes de liberar Bags, créditos e solicitações.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <Link
                href="/cadastro?tipo=estabelecimento"
                className="cm-clickable rounded-[24px] border border-[#f59e0b]/25 bg-[#f59e0b]/10 p-4 transition hover:bg-[#f59e0b]/16"
              >
                <IconImage
                  name="estabelecimento-colorido"
                  alt=""
                  className="h-12 w-12"
                />
                <p className="mt-3 text-lg font-black text-white">
                  Cadastrar estabelecimento
                </p>
                <p className="mt-2 text-sm leading-6 text-zinc-300">
                  Solicite acesso para abrir Bags e acompanhar entregas.
                </p>
              </Link>
              <Link
                href="/cadastro?tipo=motoboy"
                className="cm-clickable rounded-[24px] border border-[#22c55e]/25 bg-[#22c55e]/10 p-4 transition hover:bg-[#22c55e]/16"
              >
                <IconImage name="capacete" alt="" className="h-12 w-12" />
                <p className="mt-3 text-lg font-black text-white">
                  Cadastrar entregador
                </p>
                <p className="mt-2 text-sm leading-6 text-zinc-300">
                  Envie seus dados e aguarde aprovação para receber Bags.
                </p>
              </Link>
            </div>
          </article>

          <form
            onSubmit={submitLogin}
            className="cm-card order-1 rounded-[34px] p-6 md:p-8 lg:order-2"
          >
            <p className="text-xs uppercase tracking-[0.35em] text-[#22c55e]">
              Login seguro
            </p>
            <h2 className="mt-4 text-3xl font-black text-white">
              Acessar painel
            </h2>
            <p className="mt-2 text-sm leading-7 text-zinc-300">
              Escolha seu perfil, informe seu acesso e entre no painel certo.
              Administradores usam o acesso administrativo.
            </p>

            <div className="mt-5 grid gap-3">
              <div className="grid grid-cols-2 gap-2 rounded-2xl border border-white/10 bg-white/[0.035] p-2">
                <button
                  type="button"
                  onClick={() => setLoginKind("estabelecimento")}
                  className={
                    loginKind === "estabelecimento"
                      ? "rounded-xl bg-[#22c55e] px-3 py-3 text-sm font-black text-[#052e16]"
                      : "rounded-xl bg-white/[0.04] px-3 py-3 text-sm font-bold text-zinc-200 hover:bg-white/[0.08]"
                  }
                >
                  Estabelecimento
                </button>
                <button
                  type="button"
                  onClick={() => setLoginKind("motoboy")}
                  className={
                    loginKind === "motoboy"
                      ? "rounded-xl bg-[#22c55e] px-3 py-3 text-sm font-black text-[#052e16]"
                      : "rounded-xl bg-white/[0.04] px-3 py-3 text-sm font-bold text-zinc-200 hover:bg-white/[0.08]"
                  }
                >
                  Entregador
                </button>
              </div>
              <label className="rounded-2xl border border-white/10 bg-white/[0.035] p-3 text-sm text-zinc-300">
                Cidade / operação
                <select
                  value={citySlug}
                  onChange={(event) => setCitySlug(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-black/25 px-3 py-3 text-white outline-none"
                >
                  {cityOptions.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="rounded-2xl border border-white/10 bg-white/[0.035] p-3 text-sm text-zinc-300">
                {loginKind === "motoboy" ? "Usuário, e-mail ou CPF" : "Usuário, e-mail ou CNPJ"}
                <input
                  value={identifier}
                  onChange={(event) => setIdentifier(event.target.value)}
                  autoComplete="username"
                  className="mt-2 w-full rounded-xl border border-white/10 bg-black/25 px-3 py-3 text-white outline-none"
                  placeholder={
                    loginKind === "estabelecimento"
                      ? "ex: restaurante@email.com ou CNPJ"
                      : "ex: entregador@email.com ou CPF"
                  }
                />
              </label>
              <label className="rounded-2xl border border-white/10 bg-white/[0.035] p-3 text-sm text-zinc-300">
                Senha
                <div className="mt-2 flex gap-2">
                  <input
                    value={password}
                    onChange={(event) =>
                      setPassword(
                        event.target.value.replace(/\D/g, "").slice(0, 6),
                      )
                    }
                    autoComplete="current-password"
                    inputMode="numeric"
                    type={showPassword ? "text" : "password"}
                    className="w-full rounded-xl border border-white/10 bg-black/25 px-3 py-3 text-white outline-none"
                    placeholder="4 a 6 números"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={
                      showPassword ? "Ocultar senha" : "Mostrar senha"
                    }
                    title={showPassword ? "Ocultar senha" : "Mostrar senha"}
                    className="shrink-0 rounded-xl border border-white/10 bg-white/[0.05] px-3 text-zinc-200 hover:bg-white/[0.1]"
                  >
                    {showPassword ? (
                      <EyeOffIcon className="h-5 w-5" />
                    ) : (
                      <EyeIcon className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </label>
              {error ? (
                <p className="rounded-2xl border border-rose-500/25 bg-rose-500/12 px-4 py-3 text-sm text-rose-100">
                  {error}
                </p>
              ) : null}
              <button
                disabled={loading}
                className="cm-primary mt-1 min-h-12 rounded-2xl px-5 text-sm font-black disabled:opacity-60"
              >
                {loading ? "Conferindo acesso..." : "Entrar no Chegou Motoca"}
              </button>
            </div>

            <div className="mt-5 flex flex-wrap gap-3 text-sm">
              <Link
                href="/recuperar-acesso"
                className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-zinc-200 transition hover:bg-white/[0.08]"
              >
                Esqueci meu acesso
              </Link>
              <Link
                href="/termos"
                className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-zinc-200 transition hover:bg-white/[0.08]"
              >
                Termos de uso
              </Link>
            </div>
          </form>
        </section>
        <AppFooter compact />
      </div>
      <PublicMobileNav />
    </main>
  );
}
