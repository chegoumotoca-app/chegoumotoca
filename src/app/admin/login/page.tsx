"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { BrandHeader } from "@/components/brand-header";
import { IconImage } from "@/components/icon-image";
import { EyeIcon, EyeOffIcon } from "@/components/icons";
import { loginAppUser, routeForRole } from "@/lib/auth";

const cityOptions = [
  { label: "Taquaritinga/SP", value: "taquaritinga-sp" },
  { label: "Plataforma Geral", value: "plataforma-geral" },
];

export default function AdminLoginPage() {
  const router = useRouter();
  const [citySlug, setCitySlug] = useState(cityOptions[0].value);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const res = await loginAppUser(identifier, password, citySlug, "admin");
    setLoading(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    if (res.session.role !== "admin" && res.session.role !== "superadmin") {
      setError("Esta conta não tem permissão administrativa.");
      return;
    }
    router.push(routeForRole(res.session.role));
  }

  return (
    <main className="cm-page min-h-screen pb-10 text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 px-4 py-4 md:px-6 xl:px-8 xl:py-8">
        <BrandHeader publicView />
        <form onSubmit={submit} className="cm-card rounded-[34px] p-6 md:p-8">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-[#22c55e]/25 bg-[#22c55e]/12">
              <IconImage name="capacete" alt="" className="h-10 w-10" />
            </span>
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-[#f59e0b]">Painel administrativo</p>
              <h1 className="mt-2 text-3xl font-black text-white">Entrar no admin</h1>
            </div>
          </div>
          <p className="mt-4 text-sm leading-7 text-zinc-300">Escolha a cidade/operação e informe usuário e senha cadastrados. O superadmin pode entrar pela Plataforma Geral.</p>
          <div className="mt-6 grid gap-3">
            <label className="rounded-2xl border border-white/10 bg-white/[0.035] p-3 text-sm text-zinc-300">
              Cidade / operação
              <select value={citySlug} onChange={(event) => setCitySlug(event.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-black/25 px-3 py-3 text-white outline-none">
                {cityOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
            </label>
            <label className="rounded-2xl border border-white/10 bg-white/[0.035] p-3 text-sm text-zinc-300">
              Usuário administrador
              <input value={identifier} onChange={(event) => setIdentifier(event.target.value)} autoComplete="username" className="mt-2 w-full rounded-xl border border-white/10 bg-black/25 px-3 py-3 text-white outline-none" placeholder="admin ou superadmin" />
            </label>
            <label className="rounded-2xl border border-white/10 bg-white/[0.035] p-3 text-sm text-zinc-300">
              Senha
              <div className="mt-2 flex gap-2">
                <input value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" type={showPassword ? "text" : "password"} className="w-full rounded-xl border border-white/10 bg-black/25 px-3 py-3 text-white outline-none" />
                <button type="button" onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"} title={showPassword ? "Ocultar senha" : "Mostrar senha"} className="shrink-0 rounded-xl border border-white/10 bg-white/[0.05] px-3 text-zinc-200 hover:bg-white/[0.1]">
                  {showPassword ? <EyeOffIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                </button>
              </div>
            </label>
            {error ? <p className="rounded-2xl border border-rose-500/25 bg-rose-500/12 px-4 py-3 text-sm text-rose-100">{error}</p> : null}
            <button disabled={loading} className="cm-primary min-h-12 rounded-2xl px-5 text-sm font-black disabled:opacity-60">
              {loading ? "Conferindo acesso..." : "Entrar no painel"}
            </button>
          </div>
          <Link href="/" className="mt-5 inline-flex text-sm text-zinc-400 hover:text-white">Voltar para o site</Link>
        </form>
      </div>
    </main>
  );
}
