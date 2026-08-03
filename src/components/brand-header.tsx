"use client";

import Image from "next/image";
import Link from "next/link";
import { ChangeEvent, ReactNode, useEffect, useMemo, useState } from "react";
import { MoonIcon, SunIcon, UserIcon } from "@/components/icons";
import { IconImage } from "@/components/icon-image";
import { clearAppSession, routeForRole, useAppSession } from "@/lib/auth";

const cx = (...items: (string | false | null | undefined)[]) =>
  items.filter(Boolean).join(" ");

type ProfileAction =
  | "dados"
  | "responsavel"
  | "endereco"
  | "entregas"
  | "foto"
  | "senha"
  | "documentos"
  | "suporte"
  | null;
type HeaderShortcut = {
  label: string;
  href?: string;
  onClick?: () => void;
  icon?: ReactNode;
};

function supportLink(label?: string) {
  return `https://wa.me/5517997001020?text=${encodeURIComponent(`Olá, equipe Chegou Motoca. Preciso de ajuda com ${label || "minha conta"}.`)}`;
}

export function BrandHeader({
  publicView = false,
  compact = false,
  profileLabel = "Perfil",
  profileRole,
  status,
  onToggleStatus,
  profileImageUrl,
  shortcuts = [],
  onProfileAction,
  onLogoClick,
}: {
  publicView?: boolean;
  compact?: boolean;
  profileLabel?: string;
  profileRole?: string;
  status?: "online" | "offline" | "ativo" | "pendente" | "bloqueado";
  onToggleStatus?: () => void;
  profileImageUrl?: string;
  shortcuts?: HeaderShortcut[];
  onProfileAction?: (action: Exclude<ProfileAction, null>) => void;
  onLogoClick?: () => void;
}) {
  const session = useAppSession();
  const [lightMode, setLightMode] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [action, setAction] = useState<ProfileAction>(null);
  const [savedMsg, setSavedMsg] = useState("");
  const [profileImageName, setProfileImageName] = useState("");
  const [profileImagePreview, setProfileImagePreview] = useState(
    profileImageUrl || "",
  );
  const [draftName, setDraftName] = useState(profileLabel);
  const [draftContact, setDraftContact] = useState("");
  const [draftAddress, setDraftAddress] = useState("");
  const effectiveRole =
    profileRole ||
    (session?.role === "superadmin"
      ? "Superadmin"
      : session?.role === "admin"
        ? "Admin"
        : session?.role === "estabelecimento"
          ? "Estabelecimento"
          : session?.role === "motoboy"
            ? "Motoboy"
            : undefined);
  const effectiveLabel = profileLabel || session?.name || "Perfil";
  const loggedRoute = session ? routeForRole(session.role) : "/";

  useEffect(() => {
    const saved =
      typeof window !== "undefined"
        ? localStorage.getItem("chegou-theme")
        : null;
    if (saved === "light") {
      setLightMode(true);
      document.documentElement.dataset.theme = "light";
    }
  }, []);

  useEffect(() => {
    setDraftName(effectiveLabel);
  }, [effectiveLabel]);

  useEffect(() => {
    if (typeof window === "undefined" || !session?.userId) return;
    const localImage =
      localStorage.getItem(`chegoumotoca:profile-image:${session.userId}`) ||
      "";
    setProfileImagePreview(localImage || profileImageUrl || "");
    setProfileImageName(
      localStorage.getItem(
        `chegoumotoca:profile-image-name:${session.userId}`,
      ) || "",
    );
    setDraftContact(
      localStorage.getItem(`chegoumotoca:profile-contact:${session.userId}`) ||
        "",
    );
    setDraftAddress(
      localStorage.getItem(`chegoumotoca:profile-address:${session.userId}`) ||
        "",
    );
  }, [session?.userId, profileImageUrl]);

  function toggleTheme() {
    setLightMode((current) => {
      const next = !current;
      document.documentElement.dataset.theme = next ? "light" : "dark";
      localStorage.setItem("chegou-theme", next ? "light" : "dark");
      return next;
    });
  }

  function logout() {
    clearAppSession();
    window.location.href = (effectiveRole || "").toLowerCase().includes("admin")
      ? "/admin/login"
      : "/login";
  }

  function saveLocalProfile(extra?: Record<string, string>) {
    if (!session?.userId) return;
    if (extra?.contact !== undefined)
      localStorage.setItem(
        `chegoumotoca:profile-contact:${session.userId}`,
        extra.contact,
      );
    if (extra?.address !== undefined)
      localStorage.setItem(
        `chegoumotoca:profile-address:${session.userId}`,
        extra.address,
      );
    if (extra?.image !== undefined)
      localStorage.setItem(
        `chegoumotoca:profile-image:${session.userId}`,
        extra.image,
      );
    if (extra?.imageName !== undefined)
      localStorage.setItem(
        `chegoumotoca:profile-image-name:${session.userId}`,
        extra.imageName,
      );
    setSavedMsg(
      "Dados salvos neste acesso. Alterações sensíveis devem ser conferidas pelo administrador.",
    );
    window.setTimeout(() => setSavedMsg(""), 3500);
  }

  function handleProfileImage(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || "");
      setProfileImageName(file.name);
      setProfileImagePreview(dataUrl);
      saveLocalProfile({ image: dataUrl, imageName: file.name });
    };
    reader.readAsDataURL(file);
  }

  const isOnline = status === "online" || status === "ativo";
  const roleText = (effectiveRole || "Conta").toLowerCase();
  const dashboardLabel = session
    ? effectiveLabel || session.name || "Meu painel"
    : "Acesse ou cadastre-se";

  const menuItems = useMemo(() => {
    if (roleText.includes("superadmin")) {
      return [
        ["dados", "Meu perfil"],
        ["senha", "Alterar senha"],
        ["dados", "Administradores e cidades"],
      ] as const;
    }
    if (roleText.includes("admin")) {
      return [
        ["dados", "Meu perfil administrativo"],
        ["senha", "Alterar senha"],
        ["dados", "Configurações da cidade"],
      ] as const;
    }
    if (roleText.includes("estabelecimento")) {
      return [
        ["dados", "Dados do estabelecimento"],
        ["responsavel", "Responsável e WhatsApp"],
        ["endereco", "Endereço base"],
        ["entregas", "Raio de entregas"],
        ["foto", "Logo ou foto do estabelecimento"],
      ] as const;
    }
    return [
      ["dados", "Meu perfil / dados"],
    ] as const;
  }, [roleText]);

  function chooseProfileAction(nextAction: Exclude<ProfileAction, null>) {
    if (onProfileAction) {
      setAction(null);
      setProfileOpen(false);
      onProfileAction(nextAction);
      return;
    }
    setAction(nextAction);
  }

  function closeAndRun(callback?: () => void) {
    setProfileOpen(false);
    setAction(null);
    callback?.();
  }

  return (
    <div className="app-panel cm-sticky-header relative overflow-visible rounded-[30px] border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.07),rgba(34,197,94,0.06),rgba(255,255,255,0.025))] px-4 py-3 shadow-[0_25px_90px_rgba(0,0,0,0.25)] backdrop-blur-xl sm:px-6">
      <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-[#f59e0b]/55 to-transparent" />
      <div className="absolute -left-12 top-0 h-28 w-28 rounded-full bg-[#f97316]/14 blur-3xl" />
      <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-[#22c55e]/14 blur-3xl" />
      <div className="relative flex items-center justify-between gap-2">
        <Link
          href={loggedRoute}
          onClick={(event) => {
            if (!onLogoClick) return;
            event.preventDefault();
            setProfileOpen(false);
            setAction(null);
            onLogoClick();
          }}
          className="brand-logo-fused relative block h-14 w-[min(172px,43vw)] min-w-0 shrink rounded-2xl sm:h-20 sm:w-[330px]"
          title={session ? "Voltar para meu painel" : "Ir para início"}
        >
          <Image
            src="/brand/logo-chegoumotoca-cutout.png"
            alt="Chegou Motoca"
            fill
            className="object-contain object-left drop-shadow-[0_8px_24px_rgba(0,0,0,0.30)]"
            priority
          />
        </Link>

        <div className="flex min-w-0 shrink-0 items-center justify-end gap-1.5 text-sm text-zinc-200 sm:gap-2">
          {publicView ? (
            <>
              <Link
                className="hidden rounded-full border border-white/10 bg-white/[0.035] px-4 py-2 font-semibold transition hover:bg-white/[0.08] md:inline-flex"
                href="/sobre"
              >
                O que é
              </Link>
              <Link
                className="inline-flex max-w-[154px] items-center justify-center gap-1.5 rounded-full border border-[#22c55e]/30 bg-[#22c55e] px-3 py-2 text-xs font-black leading-tight text-[#052e16] transition hover:brightness-105 sm:max-w-none sm:px-4 sm:text-sm"
                href={session ? loggedRoute : "/login"}
              >
                <UserIcon className="hidden h-4 w-4 sm:inline" />
                <span>{session ? "Meu painel" : "Acesse ou cadastre-se"}</span>
              </Link>
            </>
          ) : session ? (
            <Link
              href={loggedRoute}
              className="hidden max-w-[210px] truncate rounded-full border border-[#22c55e]/25 bg-[#22c55e]/12 px-4 py-2 text-sm font-black text-[#a8f7bf] transition hover:bg-[#22c55e]/18 md:inline-flex"
              title="Voltar para meu painel"
            >
              {dashboardLabel}
            </Link>
          ) : null}

          {onToggleStatus && !publicView ? (
            <button
              type="button"
              onClick={onToggleStatus}
              className={cx(
                "status-toggle-btn inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-black transition",
                isOnline
                  ? "border-[#22c55e]/35 bg-[#22c55e]/14 text-[#9ef5b4]"
                  : "border-rose-400/28 bg-rose-500/12 text-rose-100",
              )}
              title={isOnline ? "Você está online" : "Você está offline"}
            >
              <span
                className={cx(
                  "h-2.5 w-2.5 rounded-full",
                  isOnline
                    ? "bg-[#22c55e] shadow-[0_0_16px_rgba(34,197,94,.7)]"
                    : "bg-rose-300",
                )}
              />
              {isOnline ? "Online" : "Offline"}
            </button>
          ) : null}

          <button
            type="button"
            onClick={toggleTheme}
            className="theme-toggle-btn inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.055] text-white transition hover:bg-white/[0.1]"
            aria-label={lightMode ? "Ativar modo escuro" : "Ativar modo claro"}
            title={lightMode ? "Modo escuro" : "Modo claro"}
          >
            {lightMode ? (
              <MoonIcon className="h-4 w-4" />
            ) : (
              <SunIcon className="h-4 w-4" />
            )}
          </button>

          {!publicView && !compact ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setProfileOpen((value) => !value)}
                className="profile-avatar-btn inline-flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-white/[0.055] text-white transition hover:bg-white/[0.1]"
                title="Perfil"
              >
                {profileImagePreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profileImagePreview}
                    alt="Foto do perfil"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <UserIcon className="h-4 w-4" />
                )}
              </button>
              {profileOpen ? (
                <div className="absolute right-0 top-[3.35rem] z-50 max-h-[calc(100vh-7rem)] w-[min(21rem,calc(100vw-2rem))] overflow-y-auto overscroll-contain rounded-[24px] border border-white/10 bg-[#0b1119] p-4 text-white shadow-[0_20px_70px_rgba(0,0,0,0.42)]">
                  <div className="flex items-start gap-3">
                    <span className="inline-flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-white/[0.06]">
                      {profileImagePreview ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={profileImagePreview}
                          alt="Foto do perfil"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <UserIcon className="h-5 w-5" />
                      )}
                    </span>
                    <span className="min-w-0">
                      <p className="text-xs uppercase tracking-[0.24em] text-[#f59e0b]">
                        {effectiveRole || "Conta"}
                      </p>
                      <p className="mt-2 truncate text-lg font-black">
                        {effectiveLabel}
                      </p>
                      {profileImageName ? (
                        <p className="mt-1 truncate text-xs text-zinc-400">
                          Imagem: {profileImageName}
                        </p>
                      ) : null}
                    </span>
                  </div>
                  {status ? (
                    <div className="mt-3 flex items-center justify-between gap-2 rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                      <span className="text-sm text-zinc-300">Status</span>
                      <span
                        className={
                          isOnline
                            ? "text-sm font-bold text-[#8af3a8]"
                            : "text-sm font-bold text-rose-200"
                        }
                      >
                        {isOnline ? "Online" : "Offline"}
                      </span>
                    </div>
                  ) : null}
                  {onToggleStatus ? (
                    <button
                      type="button"
                      onClick={onToggleStatus}
                      className={
                        isOnline
                          ? "cm-danger mt-3 w-full rounded-2xl border px-4 py-3 text-sm font-bold"
                          : "cm-primary mt-3 w-full rounded-2xl px-4 py-3 text-sm font-black"
                      }
                    >
                      {isOnline ? "Ficar offline" : "Ficar online"}
                    </button>
                  ) : null}

                  <div className="mt-3 grid gap-2 text-sm">
                    {menuItems.map(([key, label]) => (
                      <button
                        key={label}
                        type="button"
                        onClick={() =>
                          chooseProfileAction(
                            key as Exclude<ProfileAction, null>,
                          )
                        }
                        className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-left hover:bg-white/[0.08]"
                      >
                        {label}
                      </button>
                    ))}
                    {shortcuts.map((item) =>
                      item.href ? (
                        <a
                          key={item.label}
                          href={item.href}
                          onClick={() => closeAndRun()}
                          className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-left hover:bg-white/[0.08]"
                        >
                          {item.icon ? (
                            <span className="inline-flex h-5 w-5 items-center justify-center">
                              {item.icon}
                            </span>
                          ) : null}
                          {item.label}
                        </a>
                      ) : (
                        <button
                          key={item.label}
                          type="button"
                          onClick={() => closeAndRun(item.onClick)}
                          className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-left hover:bg-white/[0.08]"
                        >
                          {item.icon ? (
                            <span className="inline-flex h-5 w-5 items-center justify-center">
                              {item.icon}
                            </span>
                          ) : null}
                          {item.label}
                        </button>
                      ),
                    )}
                    <a
                      href={supportLink(effectiveLabel)}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => closeAndRun()}
                      className="inline-flex items-center gap-2 rounded-2xl border border-[#25D366]/20 bg-[#25D366]/10 px-4 py-3 text-left hover:bg-[#25D366]/16"
                    >
                      <IconImage
                        name="whatsapp"
                        alt="WhatsApp"
                        className="h-5 w-5"
                      />{" "}
                      Suporte Chegou Motoca
                    </a>
                    <button
                      type="button"
                      onClick={logout}
                      className="cm-danger rounded-2xl border px-4 py-3 text-left font-bold"
                    >
                      Sair
                    </button>
                  </div>

                  {action && !onProfileAction ? (
                    <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-3">
                      {action === "foto" || action === "documentos" ? (
                        <div>
                          <p className="text-sm font-bold">
                            {action === "documentos"
                              ? "Cadastro e documentos"
                              : "Enviar imagem"}
                          </p>
                          <p className="mt-1 text-xs leading-5 text-zinc-400">
                            Atualize sua foto, dados de cadastro e documentos.
                            Alterações sensíveis podem ser conferidas pelo
                            administrador.
                          </p>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleProfileImage}
                            className="mt-3 w-full rounded-xl border border-white/10 bg-white/[0.04] p-2 text-xs"
                          />
                          {profileImagePreview ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={profileImagePreview}
                              alt="Prévia"
                              className="mt-3 h-20 w-20 rounded-2xl object-cover ring-1 ring-white/10"
                            />
                          ) : null}
                        </div>
                      ) : action === "senha" ? (
                        <div>
                          <p className="text-sm font-bold">Alterar senha</p>
                          <p className="mt-1 text-xs leading-5 text-zinc-400">
                            Por segurança, a troca definitiva de senha será
                            confirmada pelo painel administrativo.
                          </p>
                          <Link
                            href="/recuperar-acesso"
                            className="mt-3 inline-flex rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-xs font-bold hover:bg-white/[0.1]"
                          >
                            Solicitar alteração
                          </Link>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <p className="text-sm font-bold">Editar dados</p>
                          <input
                            value={draftName}
                            onChange={(e) => setDraftName(e.target.value)}
                            className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm"
                            placeholder="Nome"
                          />
                          {action === "responsavel" || action === "dados" ? (
                            <input
                              value={draftContact}
                              onChange={(e) => setDraftContact(e.target.value)}
                              className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm"
                              placeholder="WhatsApp / contato"
                            />
                          ) : null}
                          {action === "endereco" || action === "dados" ? (
                            <input
                              value={draftAddress}
                              onChange={(e) => setDraftAddress(e.target.value)}
                              className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm"
                              placeholder="Endereço / dados complementares"
                            />
                          ) : null}
                          <button
                            type="button"
                            onClick={() =>
                              saveLocalProfile({
                                contact: draftContact,
                                address: draftAddress,
                              })
                            }
                            className="cm-primary w-full rounded-xl px-3 py-2 text-sm font-black"
                          >
                            Salvar solicitação
                          </button>
                        </div>
                      )}
                      {savedMsg ? (
                        <p className="mt-2 rounded-xl border border-[#22c55e]/20 bg-[#22c55e]/10 px-3 py-2 text-xs text-[#baf7cd]">
                          {savedMsg}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
