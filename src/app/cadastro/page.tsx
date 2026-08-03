"use client";

import Link from "next/link";
import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { BrandHeader } from "@/components/brand-header";
import { AppFooter } from "@/components/app-footer";
import {
  ActionButton,
  DetailCell,
  InfoBox,
  SectionTitle,
} from "@/components/ui";
import { IconImage } from "@/components/icon-image";
import { EyeIcon, EyeOffIcon } from "@/components/icons";
import { PublicMobileNav } from "@/components/public-mobile-nav";
import {
  findRegistrationConflict,
  submitRegistrationApplication,
  validateCpfCnpj,
} from "@/lib/runtime-store";
import { clearAppSession, routeForRole, useAppSession } from "@/lib/auth";

type Role = "motoboy" | "estabelecimento";

type FormState = {
  role: Role;
  nome: string;
  username: string;
  email: string;
  whatsapp: string;
  password: string;
  confirmPassword: string;
  cpf: string;
  placa: string;
  pix: string;
  source: string;
  documento: string;
  responsavel: string;
  endereco: string;
  cep: string;
  rua: string;
  numero: string;
  bairro: string;
  complemento: string;
  cidade: string;
  raioNormalKm: string;
  profilePhotoName: string;
  profilePhotoDataUrl: string;
};

const initialForm: FormState = {
  role: "motoboy",
  nome: "",
  username: "",
  email: "",
  whatsapp: "",
  password: "",
  confirmPassword: "",
  cpf: "",
  placa: "",
  pix: "",
  source: "",
  documento: "",
  responsavel: "",
  endereco: "",
  cep: "",
  rua: "",
  numero: "",
  bairro: "",
  complemento: "",
  cidade: "Taquaritinga/SP",
  raioNormalKm: "3",
  profilePhotoName: "",
  profilePhotoDataUrl: "",
};

const cx = (...items: (string | false | null | undefined)[]) =>
  items.filter(Boolean).join(" ");
const digitsOnly = (value: string) => value.replace(/\D/g, "");
const formatCep = (value: string) => {
  const d = digitsOnly(value).slice(0, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
};
const validPhone = (value: string) => {
  const digits = digitsOnly(value);
  return digits.length >= 10 && digits.length <= 13;
};
const formatPhone = (value: string) => {
  let d = digitsOnly(value).slice(0, 13);
  if (d.startsWith("55") && d.length > 11) d = d.slice(2);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7, 11)}`;
};
const formatCpfCnpj = (value: string) => {
  const d = digitsOnly(value).slice(0, 14);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  if (d.length <= 11) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
  if (d.length <= 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
};
const validPassword = (value: string) => /^\d{4,6}$/.test(value);
const validPlate = (value: string) =>
  /^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/i.test(value.replace(/[^a-z0-9]/gi, ""));

function Field({
  label,
  required,
  children,
  error,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  error?: string;
}) {
  return (
    <label className={cx("block rounded-2xl border bg-black/20 p-3 text-sm text-zinc-300", error ? "border-rose-400/45 bg-rose-500/8" : "border-white/10")}>
      <span className="flex items-center justify-between gap-2">
        <span>
          {label}
          {required ? <strong className="text-[#f59e0b]"> *</strong> : null}
        </span>
        {error ? <span className="max-w-[62%] text-right text-xs font-semibold text-rose-200">{error}</span> : null}
      </span>
      <div className="mt-2">{children}</div>
    </label>
  );
}

export default function CadastroPage() {
  const [form, setForm] = useState<FormState>(initialForm);
  const [submitted, setSubmitted] = useState(false);
  const [notice, setNotice] = useState("");
  const [dialog, setDialog] = useState<{
    title: string;
    message: string;
    action?: () => void;
  } | null>(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [reviewMode, setReviewMode] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const session = useAppSession();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tipo = params.get("tipo");
    if (tipo === "motoboy" || tipo === "estabelecimento") {
      setForm((cur) => ({ ...cur, role: tipo }));
    }
  }, []);

  const missing = useMemo(() => {
    const errors: Record<string, string> = {};
    if (!form.nome.trim()) errors.nome = "obrigatório";
    if (!form.username.trim()) errors.username = "obrigatório";
    if (!form.email.includes("@")) errors.email = "e-mail inválido";
    if (!validPhone(form.whatsapp)) errors.whatsapp = "WhatsApp inválido";
    if (!validPassword(form.password)) errors.password = "4 a 6 números";
    if (form.confirmPassword !== form.password)
      errors.confirmPassword = "senhas não conferem";
    if (form.role === "motoboy") {
      if (!validateCpfCnpj(form.cpf)) errors.cpf = "CPF inválido";
      if (!validPlate(form.placa)) errors.placa = "placa inválida";
      if (!form.profilePhotoDataUrl) errors.profilePhotoName = "envie foto";
    } else {
      if (!validateCpfCnpj(form.documento))
        errors.documento = "CPF/CNPJ inválido";
      if (!form.responsavel.trim()) errors.responsavel = "obrigatório";
      if (!form.rua.trim()) errors.rua = "rua obrigatória";
      if (!form.numero.trim()) errors.numero = "número obrigatório";
      if (!form.bairro.trim()) errors.bairro = "bairro obrigatório";
    }
    const conflict = findRegistrationConflict(form);
    if (conflict?.field) errors[conflict.field] = conflict.message;
    if (!acceptedTerms) errors.terms = "aceite os termos";
    return errors;
  }, [form, acceptedTerms]);

  const hasDirty = useMemo(() => {
    return Boolean(
      form.nome ||
      form.username ||
      form.email ||
      form.whatsapp ||
      form.password ||
      form.confirmPassword ||
      form.cpf ||
      form.placa ||
      form.documento ||
      form.responsavel ||
      form.rua ||
      form.numero ||
      form.bairro ||
      form.raioNormalKm ||
      form.profilePhotoDataUrl ||
      acceptedTerms,
    );
  }, [form, acceptedTerms]);


  function visibleError(field: keyof FormState | "terms") {
    const error = missing[field];
    if (!error) return undefined;
    if (submitted) return error;
    if (field === "password") return form.password ? error : undefined;
    if (field === "confirmPassword") return form.confirmPassword ? error : undefined;
    if (field === "terms") return undefined;
    const value = String(form[field] || "").trim();
    if (["username", "email", "whatsapp", "cpf", "documento", "placa"].includes(String(field))) {
      return value ? error : undefined;
    }
    return undefined;
  }

  function guardedNavigate(href: string) {
    if (hasDirty) {
      setDialog({
        title: "Sair do cadastro",
        message:
          "Você está saindo do cadastro. As informações preenchidas podem ser perdidas. Deseja continuar?",
        action: () => {
          window.location.href = href;
        },
      });
      return;
    }
    window.location.href = href;
  }

  function chooseRole(role: Role) {
    if (role === form.role) return;
    if (hasDirty) {
      setDialog({
        title: "Trocar tipo de cadastro",
        message:
          "Ao trocar entre entregador e estabelecimento, alguns dados preenchidos podem ser perdidos. Deseja trocar mesmo assim?",
        action: () => {
          setReviewMode(false);
          setSubmitted(false);
          setAcceptedTerms(false);
          setForm({ ...initialForm, role });
        },
      });
      return;
    }
    setForm((cur) => ({ ...cur, role }));
  }

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setReviewMode(false);
    setForm((cur) => ({ ...cur, [key]: value }));
  }

  function onPhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setNotice(
        "Envie uma imagem válida para o administrador conferir o cadastro.",
      );
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      update("profilePhotoName", file.name);
      update("profilePhotoDataUrl", String(reader.result || ""));
      setNotice(
        "Foto anexada. O administrador verá esta imagem antes de aprovar.",
      );
    };
    reader.readAsDataURL(file);
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    setSubmitted(true);
    if (Object.keys(missing).length) {
      setReviewMode(false);
      const lista = Object.values(missing).slice(0, 6).join("; ");
      const msg = `Revise o cadastro antes de enviar. Pendências: ${lista}.`;
      setNotice(msg);
      setDialog({ title: "Revise seu cadastro", message: msg });
      return;
    }
    setReviewMode(true);
    setNotice(
      "Confira os dados abaixo. Depois clique em confirmar e enviar cadastro.",
    );
  }

  function confirmSubmit() {
    const result = submitRegistrationApplication({
      role: form.role,
      nome: form.nome.trim(),
      username: form.username.trim(),
      email: form.email.trim(),
      whatsapp: form.whatsapp.trim(),
      password: form.password,
      cidade: form.cidade.trim() || "Taquaritinga/SP",
      cpf: form.role === "motoboy" ? form.cpf.trim() : undefined,
      placa:
        form.role === "motoboy" ? form.placa.trim().toUpperCase() : undefined,
      pix: form.role === "motoboy" ? form.pix.trim() : undefined,
      profilePhotoName: form.profilePhotoName || undefined,
      profilePhotoDataUrl: form.profilePhotoDataUrl || undefined,
      source: form.source.trim() || undefined,
      documento:
        form.role === "estabelecimento" ? form.documento.trim() : undefined,
      responsavel:
        form.role === "estabelecimento" ? form.responsavel.trim() : undefined,
      endereco:
        form.role === "estabelecimento"
          ? [
              form.rua.trim(),
              form.numero.trim(),
              form.bairro.trim(),
              form.complemento.trim(),
            ]
              .filter(Boolean)
              .join(", ")
          : undefined,
      raioNormalKm:
        form.role === "estabelecimento" ? Number(form.raioNormalKm.replace(",", ".")) || 3 : undefined,
    });

    if (!result.ok) {
      setNotice(result.error);
      setDialog({ title: "Cadastro não enviado", message: result.error });
      return;
    }

    const msg =
      "Cadastro enviado com sucesso. Seus dados passarão por aprovação e você receberá aviso por WhatsApp ou e-mail quando o acesso for liberado.";
    setNotice(msg);
    setDialog({
      title: "Cadastro enviado",
      message: msg,
      action: () => {
        setReviewMode(false);
        setSubmitted(false);
        setAcceptedTerms(false);
        setForm({ ...initialForm, role: form.role });
        window.location.href = "/";
      },
    });
  }

  function cancelCadastro() {
    if (form.nome || form.email || form.whatsapp || form.profilePhotoDataUrl) {
      setDialog({
        title: "Cancelar cadastro",
        message:
          "Ao cancelar, os dados preenchidos não serão enviados. Deseja cancelar mesmo assim?",
        action: () => {
          setReviewMode(false);
          setSubmitted(false);
          setAcceptedTerms(false);
          setForm({ ...initialForm, role: form.role });
        },
      });
      return;
    }
    setReviewMode(false);
    setSubmitted(false);
    setAcceptedTerms(false);
    setForm({ ...initialForm, role: form.role });
  }

  async function lookupCepCadastro() {
    const digits = digitsOnly(form.cep);
    if (digits.length !== 8) {
      setNotice(
        "Informe os 8 números do CEP ou preencha o endereço manualmente.",
      );
      return;
    }
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = await res.json();
      if (data.erro) {
        setNotice("CEP não encontrado. Preencha manualmente.");
        return;
      }
      setForm((cur) => ({
        ...cur,
        cep: formatCep(digits),
        rua: data.logradouro || cur.rua,
        bairro: data.bairro || cur.bairro,
        cidade: `${data.localidade || "Taquaritinga"}/${data.uf || "SP"}`,
        complemento: data.complemento || cur.complemento,
      }));
      setNotice(
        "Endereço encontrado. Confira número e bairro antes de enviar.",
      );
    } catch {
      setNotice("Não foi possível buscar o CEP agora. Preencha manualmente.");
    }
  }

  if (
    session?.role &&
    session.role !== "admin" &&
    session.role !== "superadmin"
  ) {
    return (
      <main className="cm-page min-h-screen text-white">
        <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 px-4 py-4 md:px-6 xl:px-8 xl:py-6">
          <BrandHeader publicView />
          <section className="cm-card rounded-[34px] p-6 md:p-8">
            <p className="text-xs uppercase tracking-[0.35em] text-[#f59e0b]">
              Conta conectada
            </p>
            <h1 className="mt-4 text-3xl font-black text-white">
              Você já está conectado como {session.name}.
            </h1>
            <p className="mt-3 text-sm leading-7 text-zinc-300">
              Para enviar outro cadastro, saia da conta atual primeiro. Isso
              evita misturar dados de estabelecimento e entregador no mesmo
              navegador.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href={routeForRole(session.role)}
                className="cm-primary rounded-2xl px-5 py-3 text-sm font-black"
              >
                Voltar ao meu painel
              </Link>
              <button
                type="button"
                onClick={() => {
                  clearAppSession();
                  window.location.href = "/cadastro";
                }}
                className="cm-danger rounded-2xl border px-5 py-3 text-sm font-bold"
              >
                Sair e iniciar cadastro
              </button>
            </div>
          </section>
        </div>
        <PublicMobileNav />
      </main>
    );
  }

  return (
    <main className="cm-page min-h-screen text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-[1280px] flex-col gap-6 px-4 py-4 md:px-6 xl:px-8 xl:py-6">
        <BrandHeader publicView />

        <section className="grid gap-5 lg:grid-cols-[0.86fr_1.14fr]">
          <div className="cm-card order-2 rounded-[34px] p-6 md:p-8 lg:order-1">
            <p className="text-xs uppercase tracking-[0.35em] text-[#f59e0b]">
              Cadastro rápido
            </p>
            <h1 className="mt-4 text-4xl font-semibold leading-tight tracking-tight md:text-5xl">
              Cadastro rápido, mas com aprovação do administrador.
            </h1>
            <p className="mt-4 text-base leading-8 text-zinc-300">
              O motoboy envia foto, CPF, placa e contato. O estabelecimento
              informa dados básicos e responsável. Nada entra em operação sem
              conferência.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => chooseRole("motoboy")}
                className={cx(
                  "rounded-[24px] border p-4 text-left transition hover:-translate-y-0.5",
                  form.role === "motoboy"
                    ? "border-[#22c55e]/40 bg-[#22c55e]/12"
                    : "border-white/10 bg-black/20 hover:bg-white/[0.06]",
                )}
              >
                <IconImage name="capacete" alt="Motoboy" className="h-9 w-9" />
                <strong className="mt-3 block text-xl text-white">
                  Cadastrar como entregador
                </strong>
                <span className="mt-2 block text-sm leading-6 text-zinc-300">
                  Cadastro em etapas simples para receber solicitações depois da
                  aprovação.
                </span>
              </button>
              <button
                type="button"
                onClick={() => chooseRole("estabelecimento")}
                className={cx(
                  "rounded-[24px] border p-4 text-left transition hover:-translate-y-0.5",
                  form.role === "estabelecimento"
                    ? "border-[#f59e0b]/40 bg-[#f59e0b]/12"
                    : "border-white/10 bg-black/20 hover:bg-white/[0.06]",
                )}
              >
                <IconImage
                  name="estabelecimento-colorido"
                  alt="Estabelecimento"
                  className="h-10 w-10"
                />
                <strong className="mt-3 block text-xl text-white">
                  Cadastrar como estabelecimento
                </strong>
                <span className="mt-2 block text-sm leading-6 text-zinc-300">
                  Envie seus dados para liberar crédito e despachar Bags com
                  segurança.
                </span>
              </button>
            </div>
            <div className="mt-6">
              <InfoBox title="Como funciona a aprovação">
                O cadastro fica pendente no painel do administrador. Depois de
                aprovado, ele aparece na lista de motoboys ou estabelecimentos
                ativos.
              </InfoBox>
            </div>
          </div>

          <form
            onSubmit={submit}
            className="cm-card order-1 rounded-[34px] p-5 md:p-6 lg:order-2"
          >
            <SectionTitle
              eyebrow={
                form.role === "motoboy"
                  ? "Dados do entregador"
                  : "Dados do estabelecimento"
              }
              title={
                form.role === "motoboy"
                  ? "Iniciar cadastro como entregador"
                  : "Iniciar cadastro do estabelecimento"
              }
              description="Preencha em poucos passos, confira a prévia e envie para análise do administrador."
            />
            <div className="mt-5 grid gap-2 lg:hidden">
              <p className="text-xs uppercase tracking-[0.26em] text-[#f59e0b]">
                Escolha o tipo de cadastro
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => chooseRole("motoboy")}
                  className={cx(
                    "rounded-2xl border p-3 text-left transition",
                    form.role === "motoboy"
                      ? "border-[#22c55e]/45 bg-[#22c55e]/14"
                      : "border-white/10 bg-black/20",
                  )}
                >
                  <IconImage
                    name="capacete"
                    alt="Entregador"
                    className="h-8 w-8"
                  />
                  <strong className="mt-2 block text-sm text-white">
                    Entregador
                  </strong>
                </button>
                <button
                  type="button"
                  onClick={() => chooseRole("estabelecimento")}
                  className={cx(
                    "rounded-2xl border p-3 text-left transition",
                    form.role === "estabelecimento"
                      ? "border-[#f59e0b]/45 bg-[#f59e0b]/14"
                      : "border-white/10 bg-black/20",
                  )}
                >
                  <IconImage
                    name="estabelecimento-colorido"
                    alt="Estabelecimento"
                    className="h-8 w-8"
                  />
                  <strong className="mt-2 block text-sm text-white">
                    Estabelecimento
                  </strong>
                </button>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => guardedNavigate("/")}
                className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-white hover:bg-white/[0.08]"
              >
                Voltar ao início
              </button>
              <button
                type="button"
                onClick={cancelCadastro}
                className="cm-danger rounded-2xl border px-4 py-2 text-sm font-semibold"
              >
                Cancelar cadastro
              </button>
              <button
                type="button"
                onClick={() => guardedNavigate("/termos")}
                className="rounded-2xl border border-[#f59e0b]/30 bg-[#f59e0b]/10 px-4 py-2 text-sm font-semibold text-[#ffd8a8] hover:bg-[#f59e0b]/16"
              >
                Ler termos
              </button>
            </div>

            {notice ? (
              <div className="mt-4 rounded-2xl border border-sky-500/20 bg-sky-500/10 px-4 py-3 text-sm text-sky-100">
                {notice}
              </div>
            ) : null}

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <Field
                label={
                  form.role === "motoboy"
                    ? "Nome completo"
                    : "Nome do estabelecimento"
                }
                required
                error={visibleError("nome")}
              >
                <input
                  value={form.nome}
                  onChange={(e) => update("nome", e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-white"
                  placeholder={
                    form.role === "motoboy"
                      ? "Ex: Gabriel Silva"
                      : "Ex: Speed Burger"
                  }
                />
              </Field>
              <Field
                label="Usuário"
                required
                error={visibleError("username")}
              >
                <input
                  value={form.username}
                  onChange={(e) =>
                    update(
                      "username",
                      e.target.value.toLowerCase().replace(/\s/g, ""),
                    )
                  }
                  className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-white"
                  placeholder="usuario ou nome curto"
                />
              </Field>
              <Field
                label="E-mail"
                required
                error={visibleError("email")}
              >
                <input
                  value={form.email}
                  onChange={(e) => update("email", e.target.value.trim().toLowerCase())}
                  type="email"
                  className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-white"
                  placeholder="email@exemplo.com"
                />
              </Field>
              <Field
                label="WhatsApp"
                required
                error={visibleError("whatsapp")}
              >
                <input
                  value={form.whatsapp}
                  onChange={(e) => update("whatsapp", formatPhone(e.target.value))}
                  className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-white"
                  placeholder="(17) 99999-9999"
                />
              </Field>
              <Field
                label="Senha numérica"
                required
                error={visibleError("password")}
              >
                <div className="relative">
                  <input
                    value={form.password}
                    onChange={(e) =>
                      update("password", digitsOnly(e.target.value).slice(0, 6))
                    }
                    inputMode="numeric"
                    type={showPassword ? "text" : "password"}
                    className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 pr-11 text-white"
                    placeholder="4 a 6 números"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-zinc-300 hover:bg-white/10"
                    aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  >
                    {showPassword ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                  </button>
                </div>
              </Field>
              <Field
                label="Confirmar senha"
                required
                error={visibleError("confirmPassword")}
              >
                <div className="relative">
                  <input
                    value={form.confirmPassword}
                    onChange={(e) =>
                      update(
                        "confirmPassword",
                        digitsOnly(e.target.value).slice(0, 6),
                      )
                    }
                    inputMode="numeric"
                    type={showConfirmPassword ? "text" : "password"}
                    className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 pr-11 text-white"
                    placeholder="digite a senha novamente"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((v) => !v)}
                    className="absolute right-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-zinc-300 hover:bg-white/10"
                    aria-label={showConfirmPassword ? "Ocultar confirmação" : "Mostrar confirmação"}
                  >
                    {showConfirmPassword ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                  </button>
                </div>
              </Field>
              <Field label="Cidade/UF">
                <input
                  value={form.cidade}
                  onChange={(e) => update("cidade", e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-white"
                />
              </Field>

              {form.role === "motoboy" ? (
                <>
                  <Field
                    label="CPF"
                    required
                    error={visibleError("cpf")}
                  >
                    <input
                      value={form.cpf}
                      onChange={(e) => update("cpf", formatCpfCnpj(e.target.value))}
                      className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-white"
                      placeholder="000.000.000-00"
                    />
                  </Field>
                  <Field
                    label="Placa da moto"
                    required
                    error={visibleError("placa")}
                  >
                    <input
                      value={form.placa}
                      onChange={(e) =>
                        update("placa", e.target.value.toUpperCase())
                      }
                      className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-white"
                      placeholder="ABC1D23"
                    />
                  </Field>
                  <Field label="Chave PIX">
                    <input
                      value={form.pix}
                      onChange={(e) => update("pix", e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-white"
                      placeholder="CPF, e-mail, telefone ou aleatória"
                    />
                  </Field>
                  <Field label="Onde conheceu o Chegou Motoca?">
                    <input
                      value={form.source}
                      onChange={(e) => update("source", e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-white"
                      placeholder="Instagram, indicação, estabelecimento..."
                    />
                  </Field>
                  <div className="md:col-span-2 rounded-2xl border border-white/10 bg-black/20 p-3">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm text-zinc-300">
                          Foto do rosto{" "}
                          <strong className="text-[#f59e0b]">*</strong>
                        </p>
                        <p className="mt-1 text-xs leading-5 text-zinc-500">
                          No celular, o botão pode abrir a câmera para tirar uma
                          foto nítida. O administrador compara imagem, CPF, nome
                          e placa antes de aprovar.
                        </p>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-[#22c55e]/30 bg-[#22c55e]/12 px-4 py-3 text-sm font-medium text-[#8af3a8] hover:bg-[#22c55e]/18">
                          <IconImage
                            name="camera-para-tirar-fotos"
                            alt="Câmera"
                            className="h-6 w-6"
                          />{" "}
                          Tirar foto
                          <input
                            type="file"
                            accept="image/*"
                            capture="user"
                            onChange={onPhotoChange}
                            className="hidden"
                          />
                        </label>
                        <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3 text-sm font-medium text-white hover:bg-white/[0.08]">
                          <IconImage
                            name="anexar"
                            alt="Anexar"
                            className="h-6 w-6"
                          />{" "}
                          Enviar imagem
                          <input
                            type="file"
                            accept="image/*"
                            onChange={onPhotoChange}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>
                    {submitted && missing.profilePhotoName ? (
                      <p className="mt-2 text-xs text-rose-200">
                        Envie uma foto válida.
                      </p>
                    ) : null}
                    {form.profilePhotoDataUrl ? (
                      <div className="mt-4 flex items-center gap-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={form.profilePhotoDataUrl}
                          alt="Prévia da foto"
                          className="h-20 w-20 rounded-2xl object-cover ring-1 ring-white/10"
                        />
                        <DetailCell
                          label="Arquivo"
                          value={form.profilePhotoName}
                        />
                      </div>
                    ) : null}
                  </div>
                </>
              ) : (
                <>
                  <Field
                    label="CNPJ ou CPF"
                    required
                    error={visibleError("documento")}
                  >
                    <input
                      value={form.documento}
                      onChange={(e) => update("documento", formatCpfCnpj(e.target.value))}
                      className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-white"
                      placeholder="CNPJ ou CPF válido"
                    />
                  </Field>
                  <Field
                    label="Responsável"
                    required
                    error={visibleError("responsavel")}
                  >
                    <input
                      value={form.responsavel}
                      onChange={(e) => update("responsavel", e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-white"
                      placeholder="Quem responde pela conta"
                    />
                  </Field>
                  <Field label="CEP (opcional)">
                    <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                      <input
                        value={form.cep}
                        onChange={(e) =>
                          update("cep", formatCep(e.target.value))
                        }
                        className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-white"
                        placeholder="15900-000"
                      />
                      <button
                        type="button"
                        onClick={lookupCepCadastro}
                        className="rounded-xl border border-[#22c55e]/25 bg-[#22c55e]/10 px-3 py-2 text-sm font-bold text-[#8af3a8] hover:bg-[#22c55e]/16"
                      >
                        Buscar CEP
                      </button>
                    </div>
                  </Field>
                  <Field
                    label="Rua"
                    required
                    error={visibleError("rua")}
                  >
                    <input
                      value={form.rua}
                      onChange={(e) => update("rua", e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-white"
                      placeholder="Rua do estabelecimento"
                    />
                  </Field>
                  <Field
                    label="Número"
                    required
                    error={visibleError("numero")}
                  >
                    <input
                      value={form.numero}
                      onChange={(e) => update("numero", e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-white"
                      placeholder="Número"
                    />
                    <span className="mt-2 block text-xs text-zinc-500">
                      Se o local não tiver número, escreva “sem número”.
                    </span>
                  </Field>
                  <Field
                    label="Bairro"
                    required
                    error={visibleError("bairro")}
                  >
                    <input
                      value={form.bairro}
                      onChange={(e) => update("bairro", e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-white"
                      placeholder="Centro, Jardim, Vila..."
                    />
                  </Field>
                  <Field label="Raio de entrega normal">
                    <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                      <input
                        value={form.raioNormalKm}
                        onChange={(e) => update("raioNormalKm", e.target.value.replace(/[^0-9,.]/g, ""))}
                        inputMode="decimal"
                        className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-white"
                        placeholder="Ex: 3"
                      />
                      <span className="inline-flex items-center rounded-xl border border-white/10 bg-white/[0.04] px-3 text-sm font-bold text-zinc-300">km</span>
                    </div>
                    <span className="mt-2 block text-xs leading-5 text-zinc-500">
                      Entregas fora desse raio podem ser tratadas como distantes quando a rota estiver configurada.
                    </span>
                  </Field>
                  <Field label="Complemento">
                    <input
                      value={form.complemento}
                      onChange={(e) => update("complemento", e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-white"
                      placeholder="Ponto de referência, sala, bloco..."
                    />
                  </Field>
                  <div className="rounded-2xl border border-[#f59e0b]/20 bg-[#f59e0b]/10 p-3 text-sm leading-6 text-[#ffd8a8]">
                    Após aprovação, o endereço base e o raio ajudam a diferenciar entrega normal e entrega distante.
                  </div>
                </>
              )}
            </div>

            <label className="mt-5 flex items-start gap-3 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm leading-6 text-zinc-300">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => {
                  setAcceptedTerms(e.target.checked);
                  setReviewMode(false);
                }}
                className="mt-1 h-4 w-4 accent-[#22c55e]"
              />
              <span>
                Li e aceito os{" "}
                <button
                  type="button"
                  onClick={() => guardedNavigate("/termos")}
                  className="font-semibold text-[#8af3a8] underline"
                >
                  termos e regras do Chegou Motoca
                </button>
                , incluindo conferência de cadastro, créditos, repasses e
                eventuais ajustes operacionais da plataforma.
              </span>
            </label>
            {submitted && missing.terms ? (
              <p className="mt-2 text-xs text-rose-200">
                Aceite os termos para continuar.
              </p>
            ) : null}

            {reviewMode ? (
              <section className="mt-5 rounded-[26px] border border-[#22c55e]/30 bg-[#22c55e]/10 p-4">
                <p className="text-xs uppercase tracking-[0.25em] text-[#8af3a8]">
                  Prévia do cadastro
                </p>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <DetailCell
                    label="Perfil"
                    value={
                      form.role === "motoboy"
                        ? "Entregador / motoboy"
                        : "Estabelecimento"
                    }
                  />
                  <DetailCell label="Nome" value={form.nome || "-"} />
                  <DetailCell label="Usuário" value={form.username || "-"} />
                  <DetailCell label="WhatsApp" value={form.whatsapp || "-"} />
                  <DetailCell label="E-mail" value={form.email || "-"} />
                  <DetailCell
                    label={
                      form.role === "motoboy"
                        ? "CPF / placa"
                        : "Documento / responsável"
                    }
                    value={
                      form.role === "motoboy"
                        ? `${form.cpf || "-"} • ${form.placa || "-"}`
                        : `${form.documento || "-"} • ${form.responsavel || "-"}`
                    }
                  />
                  {form.role === "estabelecimento" ? (
                    <DetailCell
                      label="Endereço"
                      value={
                        [form.rua, form.numero, form.bairro]
                          .filter(Boolean)
                          .join(", ") || "-"
                      }
                    />
                  ) : null}
                </div>
                {form.profilePhotoDataUrl ? (
                  <div className="mt-4 flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 p-3">
                    <img
                      src={form.profilePhotoDataUrl}
                      alt="Prévia da foto"
                      className="h-20 w-20 rounded-2xl object-cover ring-1 ring-white/10"
                    />
                    <p className="text-sm text-zinc-300">
                      Confira se a foto está nítida antes de enviar.
                    </p>
                  </div>
                ) : null}
                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                  <button
                    type="button"
                    onClick={confirmSubmit}
                    className="cm-primary inline-flex min-h-12 items-center justify-center rounded-2xl px-5 text-sm font-black"
                  >
                    Confirmar e enviar cadastro
                  </button>
                  <button
                    type="button"
                    onClick={() => setReviewMode(false)}
                    className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-semibold text-white hover:bg-white/[0.08]"
                  >
                    Editar dados
                  </button>
                  <button
                    type="button"
                    onClick={cancelCadastro}
                    className="cm-danger rounded-2xl border px-5 py-3 text-sm font-semibold"
                  >
                    Cancelar
                  </button>
                </div>
              </section>
            ) : null}

            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <button
                type="submit"
                className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-[#11131b] transition hover:-translate-y-0.5 hover:bg-zinc-100"
              >
                Revisar cadastro antes de enviar
              </button>
              <button
                type="button"
                onClick={() => guardedNavigate("/recuperar-acesso")}
              >
                <ActionButton tone="neutral">
                  Já tenho cadastro, recuperar acesso
                </ActionButton>
              </button>
            </div>
          </form>
        </section>

        <section className="rounded-[30px] border border-white/10 bg-black/20 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-white">
                Precisa de ajuda no cadastro?
              </p>
              <p className="mt-1 text-sm text-zinc-300">
                Fale com a equipe para confirmar documentos ou tirar dúvidas.
              </p>
            </div>
            <a
              href="https://wa.me/5517997001020"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-2xl border border-[#25D366]/30 bg-[#25D366]/12 px-4 py-3 text-sm font-medium text-[#8ef5b4] hover:bg-[#25D366]/20"
            >
              <IconImage name="whatsapp" alt="WhatsApp" className="h-5 w-5" />{" "}
              Falar com a equipe Chegou Motoca
            </a>
          </div>
        </section>
        <AppFooter compact />
      </div>
      <PublicMobileNav onNavigate={guardedNavigate} />
      {dialog ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-[28px] border border-white/10 bg-[#0b1119] p-5 text-white shadow-[0_24px_90px_rgba(0,0,0,.55)]">
            <p className="text-xs uppercase tracking-[0.3em] text-[#f59e0b]">
              Chegou Motoca
            </p>
            <h2 className="mt-3 text-2xl font-black">{dialog.title}</h2>
            <p className="mt-3 text-sm leading-7 text-zinc-300">
              {dialog.message}
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => {
                  const action = dialog.action;
                  setDialog(null);
                  action?.();
                }}
                className="cm-primary rounded-2xl px-4 py-3 text-sm font-black"
              >
                OK
              </button>
              {dialog.action ? (
                <button
                  type="button"
                  onClick={() => setDialog(null)}
                  className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-bold text-white hover:bg-white/[0.08]"
                >
                  Voltar
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
