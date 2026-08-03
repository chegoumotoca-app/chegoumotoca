"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { BrandHeader } from "@/components/brand-header";
import {
  DetailCell,
  SectionTitle,
  StatCard,
  StatusBadge,
} from "@/components/ui";
import { DashboardIcon, UserIcon } from "@/components/icons";
import { IconImage } from "@/components/icon-image";
import {
  addAdminUser,
  addRegisteredEstablishment,
  addRegisteredRider,
  approveCreditRequest,
  approveRegistrationApplication,
  findRegistrationConflict,
  formatCurrencyBR,
  markMissionPaid,
  missionDisplayCode,
  missionPlatformFee,
  missionRiderPayout,
  rejectRegistrationApplication,
  removeRegisteredEstablishment,
  removeRegisteredRider,
  setRegisteredEstablishmentStatus,
  setRegisteredRiderStatus,
  resetAdminPassword,
  setAdminActive,
  removeAdminAccess,
  resetEntityPassword,
  updateOperationalSettings,
  updateAppFeedbackStatus,
  updateRegisteredEstablishmentRouteSettings,
  useRuntimeStore,
  validateCpfCnpj,
} from "@/lib/runtime-store";
import { clearAppSession, useAppSession } from "@/lib/auth";

type Tab =
  | "dashboard"
  | "financeiro"
  | "cadastros"
  | "creditos"
  | "bags"
  | "conferencia"
  | "motoboys"
  | "estabelecimentos"
  | "administradores"
  | "feedback"
  | "configuracoes";
const cx = (...a: (string | false | undefined | null)[]) =>
  a.filter(Boolean).join(" ");

function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

function isValidPhone(value: string) {
  const digits = digitsOnly(value);
  return digits.length >= 10 && digits.length <= 13;
}

function copyText(value: string) {
  if (typeof navigator !== "undefined" && navigator.clipboard && value) {
    void navigator.clipboard.writeText(value);
  }
}

const tone = (s: string): "green" | "orange" | "red" | "blue" | "slate" =>
  s.includes("divergencia")
    ? "red"
    : s.includes("finalizada") || s.includes("pago")
      ? "green"
      : s.includes("aguardando") ||
          s.includes("pendente") ||
          s.includes("aceita")
        ? "orange"
        : s.includes("disponivel") || s.includes("entrega")
          ? "blue"
          : "slate";

function playAdminSound(kind: "cadastro" | "credito" | "divergencia") {
  if (typeof window === "undefined") return;
  const file =
    kind === "divergencia"
      ? "/sounds/erro.mp3"
      : kind === "credito"
        ? "/sounds/coin.mp3"
        : "/sounds/buzina_moto.mp3";
  const audio = new Audio(file);
  audio.volume = kind === "divergencia" ? 0.55 : 0.38;
  void audio.play().catch(() => undefined);
}

export default function AdminPage() {
  const session = useAppSession();
  const store = useRuntimeStore();
  const [tab, setTab] = useState<Tab>("dashboard");
  const [valorNormal, setValorNormal] = useState(
    String(store.settings.valorNormal),
  );
  const [valorDistante, setValorDistante] = useState(
    String(store.settings.valorDistante),
  );
  const [taxaPlataforma, setTaxaPlataforma] = useState(
    String(store.settings.taxaPlataformaPercentual),
  );
  const [pixKey, setPixKey] = useState(store.settings.pixKey || "");
  const [pixReceiverName, setPixReceiverName] = useState(
    store.settings.pixReceiverName || "Chegou Motoca",
  );
  const [supportWhatsapp, setSupportWhatsapp] = useState(
    store.settings.supportWhatsapp || "",
  );
  const [supportEmail, setSupportEmail] = useState(
    store.settings.supportEmail || "",
  );
  const [supportPhone, setSupportPhone] = useState(
    store.settings.supportPhone || "",
  );
  const [simNormais, setSimNormais] = useState("10");
  const [simDistantes, setSimDistantes] = useState("3");
  const [novoMotoboy, setNovoMotoboy] = useState({
    nome: "",
    whatsapp: "",
    pix: "",
    cidade: "Taquaritinga/SP",
    status: "offline" as const,
    avatar: "",
    email: "",
    username: "",
    cpf: "",
    placa: "",
    accessPassword: "",
  });
  const [novoEstabelecimento, setNovoEstabelecimento] = useState({
    nome: "",
    documento: "",
    whatsapp: "",
    cidade: "Taquaritinga/SP",
    status: "ativo" as const,
    email: "",
    username: "",
    responsavel: "",
    endereco: "",
    raioNormalKm: "3",
    accessPassword: "",
  });
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [expandedRiders, setExpandedRiders] = useState<Record<string, boolean>>(
    {},
  );
  const [confirmBox, setConfirmBox] = useState<{
    title: string;
    message: string;
    confirmLabel?: string;
    danger?: boolean;
    onConfirm: () => void;
  } | null>(null);
  const [adminNotice, setAdminNotice] = useState<string | null>(null);
  const [financePeriod, setFinancePeriod] = useState("30d");
  const [novoAdmin, setNovoAdmin] = useState({
    name: "",
    username: "",
    email: "",
    phone: "",
    password: "",
    citySlug: "taquaritinga-sp",
    cityLabel: "Taquaritinga/SP",
  });
  const previousCounts = useRef({ cadastros: 0, creditos: 0, divergencias: 0 });

  const pendingCredits = store.pendingCreditRequests.filter(
    (item) => item.status === "pendente",
  );
  const pendingRegistrations = (store.pendingRegistrations ?? []).filter(
    (item) => item.status === "pendente",
  );
  const periodCutoff = useMemo(() => {
    if (financePeriod === "today") {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      return d.getTime();
    }
    if (financePeriod === "7d") return Date.now() - 7 * 24 * 60 * 60 * 1000;
    if (financePeriod === "30d") return Date.now() - 30 * 24 * 60 * 60 * 1000;
    return 0;
  }, [financePeriod]);
  const historyInPeriod = store.missionHistory.filter((item) =>
    periodCutoff ? new Date(item.establishmentFinishedAt || item.createdAt).getTime() >= periodCutoff : true,
  );
  const finalizadas = historyInPeriod.filter(
    (item) => item.status === "finalizada_estabelecimento",
  );
  const divergencias = historyInPeriod.filter(
    (item) => item.status === "divergencia_estabelecimento",
  );
  const primaryEstablishment = store.registeredEstablishments[0];
  const ridersOnlineCount = Object.values(store.riderStatus).filter(
    (value) => value === "online",
  ).length;
  const grossValue = finalizadas.reduce(
    (sum, mission) => sum + mission.total,
    0,
  );
  const platformRevenue = finalizadas.reduce(
    (sum, mission) => sum + missionPlatformFee(mission, store.settings),
    0,
  );
  const riderPayout = finalizadas.reduce(
    (sum, mission) => sum + missionRiderPayout(mission, store.settings),
    0,
  );
  const riderConference = useMemo(
    () =>
      store.registeredRiders
        .map((r) => {
          const missions = finalizadas.filter((m) => m.riderId === r.id);
          const ratings = missions.filter((m) => m.rating);
          const avgRating = ratings.length
            ? ratings.reduce((sum, m) => sum + (m.rating?.score || 0), 0) /
              ratings.length
            : 0;
          const tags: Record<string, number> = {};
          ratings.forEach((m) =>
            (m.rating?.tags || []).forEach((tag) => {
              tags[tag] = (tags[tag] || 0) + 1;
            }),
          );
          return {
            ...r,
            missions,
            divergencias: divergencias.filter((m) => m.riderId === r.id),
            avgRating,
            ratingsCount: ratings.length,
            topTags: Object.entries(tags)
              .map(
                ([tag, count]) =>
                  `${tag} ${Math.round((count / Math.max(ratings.length, 1)) * 100)}%`,
              )
              .slice(0, 4),
          };
        })
        .filter((r) => r.missions.length || r.divergencias.length),
    [finalizadas, divergencias, store.registeredRiders],
  );

  const adminAllowed =
    session?.role === "admin" || session?.role === "superadmin";

  useEffect(() => {
    if (!adminAllowed) return;
    const next = {
      cadastros: pendingRegistrations.length,
      creditos: pendingCredits.length,
      divergencias: divergencias.length,
    };
    const prev = previousCounts.current;
    if (prev.cadastros && next.cadastros > prev.cadastros)
      playAdminSound("cadastro");
    if (prev.creditos && next.creditos > prev.creditos)
      playAdminSound("credito");
    if (prev.divergencias && next.divergencias > prev.divergencias)
      playAdminSound("divergencia");
    previousCounts.current = next;
  }, [
    adminAllowed,
    pendingRegistrations.length,
    pendingCredits.length,
    divergencias.length,
  ]);

  if (!adminAllowed) {
    return (
      <main className="cm-page min-h-screen text-white">
        <div className="mx-auto flex min-h-screen max-w-3xl flex-col gap-5 px-4 py-5">
          <BrandHeader publicView />
          <section className="cm-card rounded-[32px] p-6 md:p-8">
            <p className="text-xs uppercase tracking-[0.34em] text-[#f59e0b]">
              Acesso administrativo
            </p>
            <h1 className="mt-4 text-3xl font-black text-white">
              Entre para acessar o painel admin.
            </h1>
            <p className="mt-3 text-sm leading-7 text-zinc-300">
              O painel administrativo exige usuário, senha e cidade de operação
              cadastrados no Supabase.
            </p>
            <Link
              href="/admin/login"
              className="cm-primary mt-6 inline-flex rounded-2xl px-5 py-3 text-sm font-black"
            >
              Ir para login admin
            </Link>
          </section>
        </div>
      </main>
    );
  }

  function askConfirm(box: {
    title: string;
    message: string;
    confirmLabel?: string;
    danger?: boolean;
    onConfirm: () => void;
  }) {
    setConfirmBox(box);
  }

  function showAdminNotice(message: string) {
    setAdminNotice(message);
    window.setTimeout(() => setAdminNotice(null), 4500);
  }

  function markAllRiderPendingPaid(
    riderId: string,
    method: "pix" | "dinheiro",
  ) {
    const rider = riderConference.find((item) => item.id === riderId);
    if (!rider) return;
    const pending = rider.missions.filter(
      (mission) => mission.payoutStatus !== "pago",
    );
    pending.forEach((mission) => markMissionPaid(mission.id, method));
    showAdminNotice(
      `${pending.length} Bag(s) de ${rider.nome} marcadas como pagas.`,
    );
  }

  function saveSettings() {
    updateOperationalSettings({
      valorNormal:
        Number(valorNormal.replace(",", ".")) || store.settings.valorNormal,
      valorDistante:
        Number(valorDistante.replace(",", ".")) || store.settings.valorDistante,
      taxaPlataformaPercentual:
        Number(taxaPlataforma.replace(",", ".")) ||
        store.settings.taxaPlataformaPercentual,
      pixKey,
      pixReceiverName,
      supportWhatsapp,
      supportEmail,
      supportPhone,
    });
  }

  return (
    <main className="cm-page text-white">
      <div className="mx-auto flex min-h-screen max-w-[1520px] flex-col gap-5 px-4 py-4 lg:px-6">
        <BrandHeader
          profileLabel={session?.name || "Administrador"}
          profileRole={session?.role === "superadmin" ? "Superadmin" : "Admin"}
        />
        {adminNotice ? (
          <div className="rounded-[24px] border border-[#22c55e]/25 bg-[#22c55e]/12 px-4 py-3 text-sm font-bold text-[#baf7cd]">
            {adminNotice}
          </div>
        ) : null}
        <div className="grid gap-5 xl:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="cm-sidebar rounded-[32px] p-5">
            <p className="text-xs uppercase tracking-[0.34em] text-[#f59e0b]">
              Administrador
            </p>
            <h1 className="mt-3 text-[2rem] font-semibold tracking-tight text-white">
              Chegou Motoca
            </h1>
            <p className="mt-4 text-sm leading-7 text-zinc-300">
              Aprove cadastros, libere créditos, acompanhe Bags, confira
              divergências e pague os motocas com segurança.
            </p>
            <div className="mt-6 space-y-2">
              {[
                [
                  "dashboard",
                  "Visão geral",
                  <DashboardIcon key="dashboard" className="h-4 w-4" />,
                ],
                [
                  "cadastros",
                  `Cadastros (${pendingRegistrations.length})`,
                  <IconImage
                    key="cadastros"
                    name="anexar"
                    alt=""
                    className="h-6 w-6"
                  />,
                ],
                [
                  "creditos",
                  "Créditos",
                  <IconImage
                    key="creditos"
                    name="creditos"
                    alt=""
                    className="h-6 w-6"
                  />,
                ],
                [
                  "financeiro",
                  "Financeiro",
                  <IconImage
                    key="financeiro"
                    name="creditos"
                    alt=""
                    className="h-6 w-6"
                  />,
                ],
                [
                  "bags",
                  "Bags",
                  <IconImage
                    key="bags"
                    name="bag-enviada(1)"
                    alt=""
                    className="h-6 w-6"
                  />,
                ],
                [
                  "conferencia",
                  "Conferência do motoboy",
                  <IconImage
                    key="conferencia"
                    name="camera-para-tirar-fotos"
                    alt=""
                    className="h-6 w-6"
                  />,
                ],
                [
                  "motoboys",
                  "Motoboys",
                  <IconImage
                    key="motoboys"
                    name="capacete"
                    alt=""
                    className="h-6 w-6"
                  />,
                ],
                [
                  "estabelecimentos",
                  "Estabelecimentos",
                  <IconImage
                    key="estabelecimentos"
                    name="estabelecimento-colorido"
                    alt=""
                    className="h-6 w-6"
                  />,
                ],
                [
                  "feedback",
                  `Avaliações e sugestões (${(store.feedbacks ?? []).filter((f) => f.status !== "resolvido").length})`,
                  <UserIcon key="feedback" className="h-4 w-4" />,
                ],
                ...(session?.role === "superadmin"
                  ? ([
                      [
                        "administradores",
                        "Administradores",
                        <UserIcon key="administradores" className="h-4 w-4" />,
                      ],
                    ] as const)
                  : []),
                [
                  "configuracoes",
                  "Configurações",
                  <UserIcon key="configuracoes" className="h-4 w-4" />,
                ],
              ].map(([key, label, icon]) => (
                <button
                  key={String(key)}
                  type="button"
                  onClick={() => setTab(key as Tab)}
                  className={cx(
                    "cm-clickable flex w-full items-center justify-between rounded-2xl px-4 py-3 text-sm transition",
                    tab === key
                      ? "bg-white text-[#11131b]"
                      : "bg-white/[0.03] text-zinc-200 hover:bg-white/[0.07]",
                  )}
                >
                  <span className="inline-flex items-center gap-3">
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.04]">
                      {icon}
                    </span>
                    <span>{label}</span>
                  </span>
                  <span>→</span>
                </button>
              ))}
            </div>
            <div className="mt-6 rounded-[24px] border border-white/10 bg-black/20 p-4">
              <p className="text-[11px] uppercase tracking-[0.32em] text-zinc-500">
                Resumo rápido
              </p>
              <p className="mt-3 text-sm leading-7 text-zinc-300">
                Se o estabelecimento finalizou, o repasse entra como pendente.
                Divergência fica registrada para mediação.
              </p>
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    clearAppSession();
                    window.location.href = "/admin/login";
                  }}
                  className="cm-danger rounded-xl border px-3 py-2 text-xs font-semibold"
                >
                  Sair
                </button>
              </div>
            </div>
          </aside>

          <section className="space-y-5">
            {tab === "dashboard" ? (
              <>
                <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <StatCard
                    label="Cadastros pendentes"
                    value={`${pendingRegistrations.length}`}
                    helper="Motoboys e estabelecimentos aguardando aprovação."
                    tone="orange"
                    icon={
                      <IconImage
                        name="anexar"
                        alt="Cadastros"
                        className="h-7 w-7"
                      />
                    }
                    onClick={() => setTab("cadastros")}
                    pulse={pendingRegistrations.length > 0}
                  />
                  <StatCard
                    label="Estabelecimentos"
                    value={`${store.registeredEstablishments.length}`}
                    helper="Perfis ativos ou pendentes cadastrados na plataforma."
                    tone="orange"
                    icon={
                      <IconImage
                        name="estabelecimento-colorido"
                        alt="Estabelecimentos"
                        className="h-7 w-7"
                      />
                    }
                    onClick={() => setTab("estabelecimentos")}
                  />
                  <StatCard
                    label="Motoboys cadastrados"
                    value={`${store.registeredRiders.length}`}
                    helper={`${ridersOnlineCount} online agora para receber Bags.`}
                    tone="green"
                    icon={
                      <IconImage
                        name="capacete"
                        alt="Motoboys"
                        className="h-7 w-7"
                      />
                    }
                    onClick={() => setTab("motoboys")}
                  />
                  <StatCard
                    label="Créditos pendentes"
                    value={`${pendingCredits.length}`}
                    helper="Pedidos aguardando conferência manual do PIX."
                    tone="orange"
                    icon={
                      <IconImage
                        name="creditos"
                        alt="Créditos"
                        className="h-7 w-7"
                      />
                    }
                    onClick={() => setTab("creditos")}
                  />
                  <StatCard
                    label="Feedbacks abertos"
                    value={`${(store.feedbacks ?? []).filter((f) => f.status !== "resolvido").length}`}
                    helper="Sugestões, problemas e pedidos de contato."
                    tone="blue"
                    icon={<UserIcon className="h-7 w-7" />}
                    onClick={() => setTab("feedback")}
                  />
                  <StatCard
                    label="Bags em entrega"
                    value={`${store.activeMissions.length}`}
                    helper="Solicitações já aceitas e ainda não encerradas pelo estabelecimento."
                    tone="blue"
                    icon={
                      <IconImage
                        name="entrega-em-andamento"
                        alt="Bags em entrega"
                        className="h-7 w-7"
                      />
                    }
                    onClick={() => setTab("bags")}
                  />
                  <StatCard
                    label="Finalizadas"
                    value={`${finalizadas.length}`}
                    helper="Bags que viraram base para repasse do motoboy."
                    tone="green"
                    icon={
                      <IconImage
                        name="entrega-finalizada"
                        alt="Finalizadas"
                        className="h-7 w-7"
                      />
                    }
                    onClick={() => setTab("conferencia")}
                  />
                  <StatCard
                    label="Divergências"
                    value={`${divergencias.length}`}
                    helper="Bags que o estabelecimento não confirmou como concluídas."
                    tone="slate"
                    icon={
                      <IconImage
                        name="entrega-nao-finalizada"
                        alt="Divergências"
                        className="h-7 w-7"
                      />
                    }
                  />
                  <StatCard
                    label="Motoboys online"
                    value={`${ridersOnlineCount}`}
                    helper="Entregadores ativos agora na plataforma."
                    tone="green"
                    icon={
                      <IconImage
                        name="capacete"
                        alt="Motoboys"
                        className="h-7 w-7"
                      />
                    }
                  />
                  <StatCard
                    label="Taxa da plataforma"
                    value={formatCurrencyBR(platformRevenue)}
                    helper="Valor previsto da plataforma nas Bags finalizadas."
                    tone="green"
                    icon={
                      <IconImage
                        name="creditos"
                        alt="Financeiro"
                        className="h-7 w-7"
                      />
                    }
                    onClick={() => setTab("financeiro")}
                  />
                </section>
                <section className="cm-card rounded-[28px] p-5">
                  <SectionTitle
                    eyebrow="Controle administrativo"
                    title="Acompanhe cadastros, créditos, entregas e repasses em um só painel."
                    description="Créditos só entram após aprovação. O repasse do motoboy considera o que o estabelecimento finalizou e já aplica a taxa configurada no painel."
                  />
                </section>
              </>
            ) : null}

            {tab === "financeiro" ? (
              <section className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
                <SectionTitle
                  eyebrow="Financeiro"
                  title="Veja bruto, taxa da plataforma e repasse dos motoboys."
                  description="Os valores abaixo são calculados sobre Bags finalizadas. Use os filtros por período em uma próxima etapa para fechar dias, semanas ou mês."
                />
                <div className="mt-4 flex flex-wrap gap-2">
                  {[
                    ["today", "Hoje"],
                    ["7d", "7 dias"],
                    ["30d", "30 dias"],
                    ["all", "Tudo"],
                  ].map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setFinancePeriod(key)}
                      className={cx(
                        "rounded-full border px-4 py-2 text-xs font-bold",
                        financePeriod === key
                          ? "border-[#22c55e]/30 bg-[#22c55e]/20 text-[#baf7cd]"
                          : "border-white/10 bg-white/[0.04] text-zinc-300",
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <DetailCell
                    label="Bags finalizadas"
                    value={`${finalizadas.length}`}
                  />
                  <DetailCell
                    label="Valor bruto movimentado"
                    value={formatCurrencyBR(grossValue)}
                  />
                  <DetailCell
                    label="Plataforma recebeu"
                    value={formatCurrencyBR(platformRevenue)}
                  />
                  <DetailCell
                    label="Repasse aos motoboys"
                    value={formatCurrencyBR(riderPayout)}
                  />
                </div>
                <div className="mt-5 overflow-hidden rounded-[24px] border border-white/10">
                  <div className="grid grid-cols-[1.1fr_1fr_1fr_1fr] gap-2 bg-white/[0.05] px-4 py-3 text-xs uppercase tracking-[0.18em] text-zinc-400">
                    <span>Bag</span>
                    <span>Bruto</span>
                    <span>Taxa</span>
                    <span>Repasse</span>
                  </div>
                  {finalizadas.length ? (
                    finalizadas.map((mission) => (
                      <div
                        key={mission.id}
                        className="grid grid-cols-[1.1fr_1fr_1fr_1fr] gap-2 border-t border-white/10 px-4 py-3 text-sm text-zinc-200"
                      >
                        <span>{missionDisplayCode(mission.id)}</span>
                        <span>{formatCurrencyBR(mission.total)}</span>
                        <span>
                          {formatCurrencyBR(
                            missionPlatformFee(mission, store.settings),
                          )}
                        </span>
                        <span>
                          {formatCurrencyBR(
                            missionRiderPayout(mission, store.settings),
                          )}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="border-t border-white/10 px-4 py-5 text-sm text-zinc-400">
                      Nenhuma Bag finalizada ainda.
                    </p>
                  )}
                </div>
              </section>
            ) : null}

            {tab === "creditos" ? (
              <section className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
                <SectionTitle
                  eyebrow="Créditos"
                  title="Libere o saldo do estabelecimento só depois de conferir o pagamento."
                />
                <div className="mt-5 space-y-3">
                  {pendingCredits.length ? (
                    pendingCredits.map((item) => (
                      <article
                        key={item.id}
                        className="rounded-[24px] border border-white/10 bg-black/20 p-4"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="font-semibold text-white">
                              R$ {item.amount.toFixed(2).replace(".", ",")}
                            </p>
                            <p className="mt-1 text-sm text-zinc-300">
                              {new Date(item.requestedAt).toLocaleString(
                                "pt-BR",
                              )}
                            </p>
                          </div>
                          <StatusBadge tone="orange">Pendente</StatusBadge>
                        </div>
                        <p className="mt-3 text-sm leading-6 text-zinc-300">
                          {item.message}
                        </p>
                        <div className="mt-4 flex flex-wrap gap-3">
                          <button
                            type="button"
                            onClick={() =>
                              askConfirm({
                                title: "Liberar créditos",
                                message: `Tem certeza que conferiu o pagamento de ${formatCurrencyBR(item.amount)} e deseja liberar este saldo para o estabelecimento?`,
                                confirmLabel: "Sim, liberar créditos",
                                onConfirm: () => {
                                  approveCreditRequest(item.id);
                                  showAdminNotice(
                                    "Créditos liberados com sucesso.",
                                  );
                                },
                              })
                            }
                            className="rounded-2xl bg-white px-4 py-3 text-sm font-medium text-[#11131b] hover:bg-zinc-100"
                          >
                            Aprovar créditos
                          </button>
                          <a
                            href={`https://wa.me/55${digitsOnly(primaryEstablishment?.whatsapp || "")}?text=${encodeURIComponent(`Olá, ${primaryEstablishment?.nome || "estabelecimento"}. Precisamos do comprovante da solicitação de R$ ${item.amount.toFixed(2).replace(".", ",")}.`)}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 rounded-2xl border border-[#25D366]/30 bg-[#25D366]/12 px-4 py-3 text-sm font-medium text-[#8ef5b4]"
                          >
                            <IconImage
                              name="whatsapp"
                              alt="WhatsApp"
                              className="h-5 w-5"
                            />{" "}
                            Pedir comprovante
                          </a>
                        </div>
                      </article>
                    ))
                  ) : (
                    <p className="rounded-2xl border border-dashed border-white/10 px-4 py-6 text-sm text-zinc-400">
                      Nenhum crédito pendente no momento.
                    </p>
                  )}
                </div>
              </section>
            ) : null}

            {tab === "cadastros" ? (
              <section className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
                <SectionTitle
                  eyebrow="Aprovação de cadastro"
                  title="Confira os dados antes de liberar acesso."
                  description="Motoboys precisam ter foto, CPF, placa, e-mail e WhatsApp conferidos. Estabelecimentos precisam ter documento e responsável validados."
                />
                <div className="mt-5 grid gap-4 xl:grid-cols-2">
                  {pendingRegistrations.length ? (
                    pendingRegistrations.map((item) => (
                      <article
                        key={item.id}
                        className="rounded-[26px] border border-[#f59e0b]/25 bg-[#f59e0b]/10 p-4"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-lg font-semibold text-white">
                                {item.nome}
                              </h3>
                              <StatusBadge
                                tone={
                                  item.role === "motoboy" ? "green" : "orange"
                                }
                              >
                                {item.role === "motoboy"
                                  ? "Motoboy"
                                  : "Estabelecimento"}
                              </StatusBadge>
                              <StatusBadge tone="orange">Pendente</StatusBadge>
                            </div>
                            <p className="mt-1 text-sm text-zinc-300">
                              Enviado em{" "}
                              {new Date(item.createdAt).toLocaleString("pt-BR")}
                            </p>
                          </div>
                          {item.profilePhotoDataUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={item.profilePhotoDataUrl}
                              alt={`Foto de ${item.nome}`}
                              className="h-20 w-20 rounded-2xl object-cover ring-1 ring-white/15"
                            />
                          ) : null}
                        </div>

                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                          <DetailCell
                            label="Usuário"
                            value={item.username || "Não informado"}
                          />
                          <DetailCell
                            label="E-mail"
                            value={item.email || "Não informado"}
                          />
                          <DetailCell
                            label="WhatsApp"
                            value={item.whatsapp || "Não informado"}
                          />
                          <DetailCell
                            label="Cidade"
                            value={item.cidade || "Taquaritinga/SP"}
                          />
                          {item.role === "motoboy" ? (
                            <>
                              <DetailCell
                                label="CPF"
                                value={item.cpf || "Não informado"}
                              />
                              <DetailCell
                                label="Placa"
                                value={item.placa || "Não informado"}
                              />
                              <DetailCell
                                label="PIX"
                                value={item.pix || "Não informado"}
                              />
                              <DetailCell
                                label="Como conheceu"
                                value={item.source || "Não informado"}
                              />
                              <DetailCell
                                label="Foto enviada"
                                value={item.profilePhotoName || "Sem arquivo"}
                              />
                            </>
                          ) : (
                            <>
                              <DetailCell
                                label="Documento"
                                value={item.documento || "Não informado"}
                              />
                              <DetailCell
                                label="Responsável"
                                value={item.responsavel || "Não informado"}
                              />
                              <DetailCell
                                label="Endereço"
                                value={item.endereco || "Não informado"}
                              />
                            </>
                          )}
                          <DetailCell
                            label="Senha de teste"
                            value={
                              item.password
                                ? `${item.password.length} dígitos`
                                : "Não informada"
                            }
                          />
                        </div>

                        <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-3">
                          <label className="text-sm text-zinc-300">
                            Observação de análise
                            <textarea
                              value={reviewNotes[item.id] ?? ""}
                              onChange={(e) =>
                                setReviewNotes((cur) => ({
                                  ...cur,
                                  [item.id]: e.target.value,
                                }))
                              }
                              rows={2}
                              className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
                              placeholder="Ex: foto ilegível, CPF não bate com nome, placa pendente..."
                            />
                          </label>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-3">
                          <button
                            type="button"
                            onClick={() =>
                              askConfirm({
                                title: "Aprovar cadastro",
                                message: `Aprovar o cadastro de ${item.nome}? Confira documento, WhatsApp e dados antes de liberar acesso.`,
                                confirmLabel: "Sim, aprovar cadastro",
                                onConfirm: () => {
                                  approveRegistrationApplication(item.id);
                                  showAdminNotice(
                                    "Cadastro aprovado com sucesso.",
                                  );
                                },
                              })
                            }
                            className="rounded-2xl border border-[#22c55e]/30 bg-[#22c55e]/12 px-4 py-3 text-sm font-medium text-[#8af3a8] transition hover:bg-[#22c55e]/20"
                          >
                            Aprovar cadastro
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              askConfirm({
                                title: "Recusar cadastro",
                                message: `Recusar o cadastro de ${item.nome}? Informe observação se houver motivo específico.`,
                                confirmLabel: "Sim, recusar",
                                danger: true,
                                onConfirm: () => {
                                  rejectRegistrationApplication(
                                    item.id,
                                    reviewNotes[item.id] ||
                                      "Cadastro recusado pelo administrador.",
                                  );
                                  showAdminNotice("Cadastro recusado.");
                                },
                              })
                            }
                            className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm font-medium text-rose-200 transition hover:bg-rose-500/15"
                          >
                            Recusar cadastro
                          </button>
                          <a
                            href={`https://wa.me/55${digitsOnly(item.whatsapp)}?text=${encodeURIComponent(`Olá, ${item.nome}. Estamos analisando seu cadastro no Chegou Motoca e precisamos confirmar alguns dados.`)}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 rounded-2xl border border-[#25D366]/30 bg-[#25D366]/12 px-4 py-3 text-sm font-medium text-[#8ef5b4] transition hover:bg-[#25D366]/20"
                          >
                            <IconImage
                              name="whatsapp"
                              alt="WhatsApp"
                              className="h-5 w-5"
                            />{" "}
                            Falar no WhatsApp
                          </a>
                        </div>
                      </article>
                    ))
                  ) : (
                    <p className="rounded-2xl border border-dashed border-white/10 px-4 py-8 text-sm text-zinc-400 xl:col-span-2">
                      Nenhum cadastro pendente agora. Quando alguém se cadastrar
                      em /cadastro, aparecerá aqui para aprovação.
                    </p>
                  )}
                </div>
              </section>
            ) : null}

            {tab === "bags" ? (
              <section className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
                <SectionTitle
                  eyebrow="Bags"
                  title="Acompanhe o que foi enviado, aceito, está em entrega ou já foi encerrado."
                />
                <div className="mt-5 space-y-3">
                  {[
                    ...store.availableMissions,
                    ...store.activeMissions,
                    ...store.missionHistory,
                  ].map((m) => (
                    <article
                      key={missionDisplayCode(m.id)}
                      className="rounded-[24px] border border-white/10 bg-black/20 p-4"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-white">
                          {missionDisplayCode(m.id)}
                        </h3>
                        <StatusBadge tone={tone(m.status)}>
                          {m.status.replaceAll("_", " ")}
                        </StatusBadge>
                      </div>
                      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        <DetailCell
                          label="Estabelecimento"
                          value={m.estabelecimentoNome}
                        />
                        <DetailCell
                          label="Entregador"
                          value={m.riderName || "Sem aceite"}
                        />
                        <DetailCell
                          label="Entregas"
                          value={`${m.deliveries.length}`}
                        />
                        <DetailCell
                          label="Valor"
                          value={`R$ ${m.total.toFixed(2).replace(".", ",")}`}
                        />
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ) : null}

            {tab === "conferencia" ? (
              <section className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
                <SectionTitle
                  eyebrow="Conferência do motoboy"
                  title="Feche o repasse por entregador, com total primeiro e detalhes recolhidos."
                  description="Confira bruto, taxa da plataforma e repasse pendente. Abra as Bags só quando precisar conferir anexos, divergências ou pagar individualmente."
                />
                <div className="mt-5 grid gap-3 md:grid-cols-4">
                  <StatCard
                    label="Bruto finalizado"
                    value={formatCurrencyBR(grossValue)}
                    helper="Total de Bags finalizadas."
                    tone="blue"
                    icon={
                      <IconImage
                        name="bag-enviada(1)"
                        alt=""
                        className="h-7 w-7"
                      />
                    }
                  />
                  <StatCard
                    label="Taxa da plataforma"
                    value={formatCurrencyBR(platformRevenue)}
                    helper="Receita prevista da operação."
                    tone="green"
                    icon={
                      <IconImage name="creditos" alt="" className="h-7 w-7" />
                    }
                  />
                  <StatCard
                    label="Repasse líquido"
                    value={formatCurrencyBR(riderPayout)}
                    helper="Valor total para motoboys."
                    tone="orange"
                    icon={
                      <IconImage
                        name="entrega-finalizada"
                        alt=""
                        className="h-7 w-7"
                      />
                    }
                  />
                  <StatCard
                    label="Pendentes de pagamento"
                    value={formatCurrencyBR(
                      finalizadas
                        .filter((mission) => mission.payoutStatus !== "pago")
                        .reduce(
                          (sum, mission) =>
                            sum + missionRiderPayout(mission, store.settings),
                          0,
                        ),
                    )}
                    helper="Ainda não marcado como pago."
                    tone="orange"
                    icon={
                      <IconImage
                        name="entrega-nao-finalizada"
                        alt=""
                        className="h-7 w-7"
                      />
                    }
                  />
                </div>
                <div className="mt-5 space-y-4">
                  {riderConference.length ? (
                    riderConference.map((r) => {
                      const riderGross = r.missions.reduce(
                        (sum, mission) => sum + mission.total,
                        0,
                      );
                      const riderFee = r.missions.reduce(
                        (sum, mission) =>
                          sum + missionPlatformFee(mission, store.settings),
                        0,
                      );
                      const riderNet = r.missions.reduce(
                        (sum, mission) =>
                          sum + missionRiderPayout(mission, store.settings),
                        0,
                      );
                      const pending = r.missions.filter(
                        (mission) => mission.payoutStatus !== "pago",
                      );
                      const pendingValue = pending.reduce(
                        (sum, mission) =>
                          sum + missionRiderPayout(mission, store.settings),
                        0,
                      );
                      const isExpanded = !!expandedRiders[r.id];
                      return (
                        <article
                          key={r.id}
                          className="rounded-[24px] border border-white/10 bg-black/20 p-4"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex min-w-0 items-center gap-3">
                              <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-white/[0.06] text-lg font-semibold text-white">
                                {r.profilePhotoDataUrl ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={r.profilePhotoDataUrl}
                                    alt={`Foto de ${r.nome}`}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  r.avatar || r.nome.slice(0, 2).toUpperCase()
                                )}
                              </div>
                              <div className="min-w-0">
                                <h3 className="text-lg font-semibold text-white">
                                  {r.nome}
                                </h3>
                                <p className="mt-1 break-words text-sm text-zinc-300">
                                  WhatsApp {r.whatsapp} • PIX{" "}
                                  {r.pix || "não informado"}
                                </p>
                                {r.email ? (
                                  <p className="mt-1 text-sm text-zinc-400">
                                    {r.email}
                                  </p>
                                ) : null}
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <StatusBadge tone="green">
                                {r.missions.length} Bags finalizadas
                              </StatusBadge>
                              {r.divergencias.length ? (
                                <StatusBadge tone="red">
                                  {r.divergencias.length} divergências
                                </StatusBadge>
                              ) : null}
                              {r.ratingsCount ? (
                                <StatusBadge tone="green">
                                  {r.avgRating.toFixed(1).replace(".", ",")} ★ •{" "}
                                  {r.ratingsCount} avaliações
                                </StatusBadge>
                              ) : null}
                            </div>
                          </div>
                          {r.topTags.length ? (
                            <p className="mt-3 rounded-2xl border border-[#22c55e]/20 bg-[#22c55e]/10 px-3 py-2 text-sm text-[#baf7cd]">
                              Tags principais: {r.topTags.join(" • ")}
                            </p>
                          ) : null}
                          <div className="mt-4 grid gap-3 md:grid-cols-4">
                            <DetailCell
                              label="Valor bruto"
                              value={formatCurrencyBR(riderGross)}
                            />
                            <DetailCell
                              label={`Taxa plataforma (${store.settings.taxaPlataformaPercentual}%)`}
                              value={formatCurrencyBR(riderFee)}
                            />
                            <DetailCell
                              label="Valor a receber"
                              value={formatCurrencyBR(riderNet)}
                            />
                            <DetailCell
                              label="Repasse pendente"
                              value={formatCurrencyBR(pendingValue)}
                            />
                          </div>
                          <div className="mt-4 flex flex-wrap gap-2">
                            <a
                              href={`https://wa.me/${r.whatsapp}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-2 rounded-xl border border-[#25D366]/30 bg-[#25D366]/12 px-3 py-2 text-xs text-[#8ef5b4]"
                            >
                              <IconImage
                                name="whatsapp"
                                alt="WhatsApp"
                                className="h-4 w-4"
                              />{" "}
                              WhatsApp
                            </a>
                            <button
                              type="button"
                              onClick={() => copyText(r.pix || "")}
                              className="rounded-xl border border-sky-500/25 bg-sky-500/10 px-3 py-2 text-xs text-sky-100"
                            >
                              Copiar PIX
                            </button>
                            {pending.length ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() =>
                                    askConfirm({
                                      title: "Marcar repasse total",
                                      message: `Marcar ${pending.length} Bag(s) de ${r.nome} como pagas via PIX? Total: ${formatCurrencyBR(pendingValue)}.`,
                                      confirmLabel: "Sim, marcar total pago",
                                      onConfirm: () =>
                                        markAllRiderPendingPaid(r.id, "pix"),
                                    })
                                  }
                                  className="rounded-xl border border-[#22c55e]/30 bg-[#22c55e]/12 px-3 py-2 text-xs font-bold text-[#8af3a8]"
                                >
                                  Marcar total pago via PIX
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    askConfirm({
                                      title: "Marcar repasse em dinheiro",
                                      message: `Marcar ${pending.length} Bag(s) de ${r.nome} como pagas em dinheiro? Total: ${formatCurrencyBR(pendingValue)}.`,
                                      confirmLabel: "Sim, marcar em dinheiro",
                                      onConfirm: () =>
                                        markAllRiderPendingPaid(
                                          r.id,
                                          "dinheiro",
                                        ),
                                    })
                                  }
                                  className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-bold text-white"
                                >
                                  Marcar total em dinheiro
                                </button>
                              </>
                            ) : (
                              <StatusBadge tone="green">Tudo pago</StatusBadge>
                            )}
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedRiders((current) => ({
                                  ...current,
                                  [r.id]: !current[r.id],
                                }))
                              }
                              className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-bold text-white hover:bg-white/[0.08]"
                            >
                              {isExpanded
                                ? "Ocultar Bags"
                                : `Ver Bags (${r.missions.length + r.divergencias.length})`}{" "}
                              {isExpanded ? "⌃" : "⌄"}
                            </button>
                          </div>
                          {isExpanded ? (
                            <div className="mt-4 space-y-3">
                              {r.missions.map((m) => (
                                <div
                                  key={missionDisplayCode(m.id)}
                                  className="rounded-2xl border border-white/10 bg-white/[0.03] p-3"
                                >
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <p className="font-medium text-white">
                                        {missionDisplayCode(m.id)}
                                      </p>
                                      <StatusBadge
                                        tone={
                                          m.payoutStatus === "pago"
                                            ? "green"
                                            : "orange"
                                        }
                                      >
                                        {m.payoutStatus === "pago"
                                          ? "Pago"
                                          : "Pendente"}
                                      </StatusBadge>
                                    </div>
                                    <p className="text-sm text-zinc-300">
                                      {formatCurrencyBR(
                                        missionRiderPayout(m, store.settings),
                                      )}{" "}
                                      líquido
                                    </p>
                                  </div>
                                  <p className="mt-2 text-sm text-zinc-400">
                                    {m.deliveries.length} entregas •{" "}
                                    {m.proofs.length} anexo(s) opcional(is).
                                  </p>
                                  <div className="mt-3 flex flex-wrap gap-2">
                                    <a
                                      href={`https://wa.me/${r.whatsapp}`}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="inline-flex items-center gap-2 rounded-xl border border-[#25D366]/30 bg-[#25D366]/12 px-3 py-2 text-xs text-[#8ef5b4]"
                                    >
                                      <IconImage
                                        name="whatsapp"
                                        alt="WhatsApp"
                                        className="h-4 w-4"
                                      />{" "}
                                      WhatsApp
                                    </a>
                                    <button
                                      type="button"
                                      onClick={() => copyText(r.pix || "")}
                                      className="rounded-xl border border-sky-500/25 bg-sky-500/10 px-3 py-2 text-xs text-sky-100"
                                    >
                                      Copiar PIX
                                    </button>
                                    {r.email ? (
                                      <a
                                        href={`mailto:${r.email}`}
                                        className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white"
                                      >
                                        E-mail
                                      </a>
                                    ) : null}
                                    {m.payoutStatus !== "pago" ? (
                                      <>
                                        <button
                                          type="button"
                                          onClick={() =>
                                            askConfirm({
                                              title: "Marcar Bag paga",
                                              message: `Marcar ${missionDisplayCode(m.id)} como paga via PIX?`,
                                              confirmLabel: "Marcar paga",
                                              onConfirm: () =>
                                                markMissionPaid(m.id, "pix"),
                                            })
                                          }
                                          className="rounded-xl border border-[#22c55e]/30 bg-[#22c55e]/12 px-3 py-2 text-xs text-[#8af3a8]"
                                        >
                                          Marcar pago via PIX
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() =>
                                            askConfirm({
                                              title: "Marcar Bag em dinheiro",
                                              message: `Marcar ${missionDisplayCode(m.id)} como paga em dinheiro?`,
                                              confirmLabel:
                                                "Marcar em dinheiro",
                                              onConfirm: () =>
                                                markMissionPaid(
                                                  m.id,
                                                  "dinheiro",
                                                ),
                                            })
                                          }
                                          className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white"
                                        >
                                          Marcar pago em dinheiro
                                        </button>
                                      </>
                                    ) : null}
                                  </div>
                                </div>
                              ))}
                              {r.divergencias.map((m) => (
                                <div
                                  key={missionDisplayCode(m.id)}
                                  className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-3"
                                >
                                  <div className="flex flex-wrap items-center gap-2">
                                    <p className="font-medium text-white">
                                      {missionDisplayCode(m.id)}
                                    </p>
                                    <StatusBadge tone="red">
                                      Divergência
                                    </StatusBadge>
                                  </div>
                                  <p className="mt-2 text-sm text-rose-100">
                                    {m.finishReason ||
                                      "O estabelecimento não confirmou a finalização."}
                                  </p>
                                </div>
                              ))}
                            </div>
                          ) : null}
                        </article>
                      );
                    })
                  ) : (
                    <p className="rounded-2xl border border-dashed border-white/10 px-4 py-6 text-sm text-zinc-400">
                      Nenhum entregador entrou em conferência ainda.
                    </p>
                  )}
                </div>
              </section>
            ) : null}

            {tab === "motoboys" ? (
              <section className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
                <SectionTitle
                  eyebrow="Cadastro manual"
                  title="Cadastre motoboys quando eles tiverem dificuldade no primeiro acesso."
                />
                <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <input
                    value={novoMotoboy.nome}
                    onChange={(e) =>
                      setNovoMotoboy((c) => ({ ...c, nome: e.target.value }))
                    }
                    placeholder="Nome do motoboy"
                    className="cm-input rounded-2xl px-4 py-3 text-sm"
                  />
                  <input
                    value={novoMotoboy.username}
                    onChange={(e) =>
                      setNovoMotoboy((c) => ({
                        ...c,
                        username: e.target.value
                          .toLowerCase()
                          .replace(/\s/g, ""),
                      }))
                    }
                    placeholder="Usuário inicial"
                    className="cm-input rounded-2xl px-4 py-3 text-sm"
                  />
                  <input
                    value={novoMotoboy.email}
                    onChange={(e) =>
                      setNovoMotoboy((c) => ({ ...c, email: e.target.value }))
                    }
                    placeholder="E-mail"
                    className="cm-input rounded-2xl px-4 py-3 text-sm"
                  />
                  <input
                    value={novoMotoboy.whatsapp}
                    onChange={(e) =>
                      setNovoMotoboy((c) => ({
                        ...c,
                        whatsapp: e.target.value,
                      }))
                    }
                    placeholder="WhatsApp"
                    className="cm-input rounded-2xl px-4 py-3 text-sm"
                  />
                  <input
                    value={novoMotoboy.cpf}
                    onChange={(e) =>
                      setNovoMotoboy((c) => ({ ...c, cpf: e.target.value }))
                    }
                    placeholder="CPF"
                    className="cm-input rounded-2xl px-4 py-3 text-sm"
                  />
                  <input
                    value={novoMotoboy.placa}
                    onChange={(e) =>
                      setNovoMotoboy((c) => ({
                        ...c,
                        placa: e.target.value.toUpperCase(),
                      }))
                    }
                    placeholder="Placa"
                    className="cm-input rounded-2xl px-4 py-3 text-sm"
                  />
                  <input
                    value={novoMotoboy.pix}
                    onChange={(e) =>
                      setNovoMotoboy((c) => ({ ...c, pix: e.target.value }))
                    }
                    placeholder="PIX"
                    className="cm-input rounded-2xl px-4 py-3 text-sm"
                  />
                  <input
                    value={novoMotoboy.accessPassword}
                    onChange={(e) =>
                      setNovoMotoboy((c) => ({
                        ...c,
                        accessPassword: e.target.value
                          .replace(/\D/g, "")
                          .slice(0, 6),
                      }))
                    }
                    placeholder="Senha inicial (4 a 6 dígitos)"
                    inputMode="numeric"
                    className="cm-input rounded-2xl px-4 py-3 text-sm"
                  />
                  <input
                    value={novoMotoboy.avatar}
                    onChange={(e) =>
                      setNovoMotoboy((c) => ({ ...c, avatar: e.target.value }))
                    }
                    placeholder="Iniciais ou foto depois"
                    className="cm-input rounded-2xl px-4 py-3 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (
                        !novoMotoboy.nome.trim() ||
                        !novoMotoboy.username.trim() ||
                        !isValidPhone(novoMotoboy.whatsapp) ||
                        novoMotoboy.accessPassword.length < 4
                      ) {
                        window.alert(
                          "Preencha nome, usuário, WhatsApp válido e senha inicial de 4 a 6 dígitos.",
                        );
                        return;
                      }
                      const conflict = findRegistrationConflict({
                        role: "motoboy",
                        username: novoMotoboy.username,
                        email: novoMotoboy.email,
                        whatsapp: novoMotoboy.whatsapp,
                        cpf: novoMotoboy.cpf,
                        placa: novoMotoboy.placa,
                      });
                      if (conflict) {
                        window.alert(conflict.message);
                        return;
                      }
                      addRegisteredRider(novoMotoboy);
                      setNovoMotoboy({
                        nome: "",
                        whatsapp: "",
                        pix: "",
                        cidade: "Taquaritinga/SP",
                        status: "offline",
                        avatar: "",
                        email: "",
                        username: "",
                        cpf: "",
                        placa: "",
                        accessPassword: "",
                      });
                    }}
                    className="cm-primary rounded-2xl px-4 py-3 text-sm font-black xl:col-span-4"
                  >
                    Adicionar motoboy com acesso inicial
                  </button>
                </div>
                <div className="mt-5 space-y-3">
                  {store.registeredRiders.map((item) => (
                    <article
                      key={item.id}
                      className="rounded-[24px] border border-white/10 bg-black/20 p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="font-semibold text-white">
                            {item.nome}
                          </p>
                          <p className="mt-1 text-sm text-zinc-300">
                            Usuário: {item.username || "não informado"} •
                            WhatsApp: {item.whatsapp} • CPF:{" "}
                            {item.cpf || "não informado"} • PIX:{" "}
                            {item.pix || "não informado"}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <StatusBadge
                            tone={
                              item.status === "bloqueado"
                                ? "red"
                                : item.status === "online"
                                  ? "green"
                                  : "slate"
                            }
                          >
                            {item.status}
                          </StatusBadge>
                          <button
                            type="button"
                            onClick={() => {
                              const senha =
                                window.prompt(
                                  `Nova senha temporária para ${item.nome} (4 a 6 números):`,
                                  "123456",
                                ) || "";
                              if (senha)
                                resetEntityPassword(
                                  "motoboy",
                                  item.id,
                                  senha.replace(/\D/g, "").slice(0, 6),
                                );
                            }}
                            className="rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-xs font-semibold text-zinc-200 hover:bg-white/[0.1]"
                          >
                            Resetar senha
                          </button>
                          {item.status === "online" ? (
                            <button
                              type="button"
                              onClick={() =>
                                askConfirm({
                                  title: "Pausar motoboy",
                                  message: `Colocar ${item.nome} como offline? Ele deixa de receber Bags até ficar online novamente.`,
                                  confirmLabel: "Pausar",
                                  onConfirm: () =>
                                    setRegisteredRiderStatus(
                                      item.id,
                                      "offline",
                                    ),
                                })
                              }
                              className="rounded-xl border border-[#f59e0b]/30 bg-[#f59e0b]/12 px-3 py-2 text-xs font-semibold text-[#fde68a]"
                            >
                              Pausar
                            </button>
                          ) : null}
                          {item.status === "bloqueado" ? (
                            <button
                              type="button"
                              onClick={() =>
                                askConfirm({
                                  title: "Reativar motoboy",
                                  message: `Reativar o acesso de ${item.nome}?`,
                                  confirmLabel: "Reativar",
                                  onConfirm: () =>
                                    setRegisteredRiderStatus(
                                      item.id,
                                      "offline",
                                    ),
                                })
                              }
                              className="rounded-xl border border-[#22c55e]/30 bg-[#22c55e]/12 px-3 py-2 text-xs font-semibold text-[#8af3a8]"
                            >
                              Reativar
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() =>
                                askConfirm({
                                  title: "Bloquear motoboy",
                                  message: `Bloquear o acesso de ${item.nome}? O histórico, repasses e Bags serão preservados.`,
                                  confirmLabel: "Bloquear acesso",
                                  danger: true,
                                  onConfirm: () =>
                                    removeRegisteredRider(item.id),
                                })
                              }
                              className="cm-danger rounded-xl border px-3 py-2 text-xs font-semibold"
                            >
                              Bloquear
                            </button>
                          )}
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ) : null}

            {tab === "estabelecimentos" ? (
              <section className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
                <SectionTitle
                  eyebrow="Cadastro manual"
                  title="Cadastre estabelecimentos e gere um acesso inicial quando precisar."
                />
                <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <input
                    value={novoEstabelecimento.nome}
                    onChange={(e) =>
                      setNovoEstabelecimento((c) => ({
                        ...c,
                        nome: e.target.value,
                      }))
                    }
                    placeholder="Nome do estabelecimento"
                    className="cm-input rounded-2xl px-4 py-3 text-sm"
                  />
                  <input
                    value={novoEstabelecimento.username}
                    onChange={(e) =>
                      setNovoEstabelecimento((c) => ({
                        ...c,
                        username: e.target.value
                          .toLowerCase()
                          .replace(/\s/g, ""),
                      }))
                    }
                    placeholder="Usuário inicial"
                    className="cm-input rounded-2xl px-4 py-3 text-sm"
                  />
                  <input
                    value={novoEstabelecimento.email}
                    onChange={(e) =>
                      setNovoEstabelecimento((c) => ({
                        ...c,
                        email: e.target.value,
                      }))
                    }
                    placeholder="E-mail"
                    className="cm-input rounded-2xl px-4 py-3 text-sm"
                  />
                  <input
                    value={novoEstabelecimento.responsavel}
                    onChange={(e) =>
                      setNovoEstabelecimento((c) => ({
                        ...c,
                        responsavel: e.target.value,
                      }))
                    }
                    placeholder="Responsável"
                    className="cm-input rounded-2xl px-4 py-3 text-sm"
                  />
                  <input
                    value={novoEstabelecimento.documento}
                    onChange={(e) =>
                      setNovoEstabelecimento((c) => ({
                        ...c,
                        documento: e.target.value,
                      }))
                    }
                    placeholder="CNPJ/CPF"
                    className="cm-input rounded-2xl px-4 py-3 text-sm"
                  />
                  <input
                    value={novoEstabelecimento.whatsapp}
                    onChange={(e) =>
                      setNovoEstabelecimento((c) => ({
                        ...c,
                        whatsapp: e.target.value,
                      }))
                    }
                    placeholder="WhatsApp"
                    className="cm-input rounded-2xl px-4 py-3 text-sm"
                  />
                  <input
                    value={novoEstabelecimento.endereco}
                    onChange={(e) =>
                      setNovoEstabelecimento((c) => ({
                        ...c,
                        endereco: e.target.value,
                      }))
                    }
                    placeholder="Endereço"
                    className="cm-input rounded-2xl px-4 py-3 text-sm"
                  />
                  <input
                    value={novoEstabelecimento.raioNormalKm}
                    onChange={(e) =>
                      setNovoEstabelecimento((c) => ({
                        ...c,
                        raioNormalKm: e.target.value.replace(/[^0-9,.]/g, ""),
                      }))
                    }
                    placeholder="Raio normal em km"
                    inputMode="decimal"
                    className="cm-input rounded-2xl px-4 py-3 text-sm"
                  />
                  <input
                    value={novoEstabelecimento.cidade}
                    onChange={(e) =>
                      setNovoEstabelecimento((c) => ({
                        ...c,
                        cidade: e.target.value,
                      }))
                    }
                    placeholder="Cidade/UF"
                    className="cm-input rounded-2xl px-4 py-3 text-sm"
                  />
                  <input
                    value={novoEstabelecimento.accessPassword}
                    onChange={(e) =>
                      setNovoEstabelecimento((c) => ({
                        ...c,
                        accessPassword: e.target.value
                          .replace(/\D/g, "")
                          .slice(0, 6),
                      }))
                    }
                    placeholder="Senha inicial (4 a 6 dígitos)"
                    inputMode="numeric"
                    className="cm-input rounded-2xl px-4 py-3 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (
                        !novoEstabelecimento.nome.trim() ||
                        !novoEstabelecimento.username.trim() ||
                        !validateCpfCnpj(novoEstabelecimento.documento) ||
                        !isValidPhone(novoEstabelecimento.whatsapp) ||
                        novoEstabelecimento.accessPassword.length < 4
                      ) {
                        window.alert(
                          "Preencha nome, usuário, documento válido, WhatsApp válido e senha inicial de 4 a 6 dígitos.",
                        );
                        return;
                      }
                      const conflict = findRegistrationConflict({
                        role: "estabelecimento",
                        username: novoEstabelecimento.username,
                        email: novoEstabelecimento.email,
                        whatsapp: novoEstabelecimento.whatsapp,
                        documento: novoEstabelecimento.documento,
                      });
                      if (conflict) {
                        window.alert(conflict.message);
                        return;
                      }
                      addRegisteredEstablishment({
                        ...novoEstabelecimento,
                        raioNormalKm: Number(novoEstabelecimento.raioNormalKm.replace(",", ".")) || 3,
                      });
                      setNovoEstabelecimento({
                        nome: "",
                        documento: "",
                        whatsapp: "",
                        cidade: "Taquaritinga/SP",
                        status: "ativo",
                        email: "",
                        username: "",
                        responsavel: "",
                        endereco: "",
                        raioNormalKm: "3",
                        accessPassword: "",
                      });
                    }}
                    className="cm-primary rounded-2xl px-4 py-3 text-sm font-black xl:col-span-4"
                  >
                    Adicionar estabelecimento com acesso inicial
                  </button>
                </div>
                <div className="mt-5 space-y-3">
                  {store.registeredEstablishments.map((item) => (
                    <article
                      key={item.id}
                      className="rounded-[24px] border border-white/10 bg-black/20 p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="font-semibold text-white">
                            {item.nome}
                          </p>
                          <p className="mt-1 text-sm text-zinc-300">
                            Usuário: {item.username || "não informado"} •
                            Documento: {item.documento} • WhatsApp:{" "}
                            {item.whatsapp || "sem WhatsApp"}
                          </p>
                          <p className="mt-1 text-xs text-zinc-400">
                            Endereço base: {item.endereco || "não informado"} • Raio normal: {item.raioNormalKm || 3} km
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <StatusBadge
                            tone={
                              item.status === "bloqueado"
                                ? "red"
                                : item.status === "ativo"
                                  ? "green"
                                  : "orange"
                            }
                          >
                            {item.status}
                          </StatusBadge>
                          <button
                            type="button"
                            onClick={() => {
                              const senha =
                                window.prompt(
                                  `Nova senha temporária para ${item.nome} (4 a 6 números):`,
                                  "123456",
                                ) || "";
                              if (senha)
                                resetEntityPassword(
                                  "estabelecimento",
                                  item.id,
                                  senha.replace(/\D/g, "").slice(0, 6),
                                );
                            }}
                            className="rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-xs font-semibold text-zinc-200 hover:bg-white/[0.1]"
                          >
                            Resetar senha
                          </button>
                          {item.status === "ativo" ? (
                            <button
                              type="button"
                              onClick={() =>
                                askConfirm({
                                  title: "Pausar estabelecimento",
                                  message: `Pausar ${item.nome}? Ele sai da operação, mas histórico, créditos e Bags ficam preservados.`,
                                  confirmLabel: "Pausar",
                                  onConfirm: () =>
                                    setRegisteredEstablishmentStatus(
                                      item.id,
                                      "pendente",
                                    ),
                                })
                              }
                              className="rounded-xl border border-[#f59e0b]/30 bg-[#f59e0b]/12 px-3 py-2 text-xs font-semibold text-[#fde68a]"
                            >
                              Pausar
                            </button>
                          ) : null}
                          {item.status === "bloqueado" || item.status === "pendente" ? (
                            <button
                              type="button"
                              onClick={() =>
                                askConfirm({
                                  title: "Reativar estabelecimento",
                                  message: `Reativar o acesso de ${item.nome}?`,
                                  confirmLabel: "Reativar",
                                  onConfirm: () =>
                                    setRegisteredEstablishmentStatus(
                                      item.id,
                                      "ativo",
                                    ),
                                })
                              }
                              className="rounded-xl border border-[#22c55e]/30 bg-[#22c55e]/12 px-3 py-2 text-xs font-semibold text-[#8af3a8]"
                            >
                              Reativar
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() =>
                                askConfirm({
                                  title: "Bloquear estabelecimento",
                                  message: `Bloquear o acesso de ${item.nome}? O histórico, créditos, Bags e repasses serão preservados.`,
                                  confirmLabel: "Bloquear acesso",
                                  danger: true,
                                  onConfirm: () =>
                                    removeRegisteredEstablishment(item.id),
                                })
                              }
                              className="cm-danger rounded-xl border px-3 py-2 text-xs font-semibold"
                            >
                              Bloquear
                            </button>
                          )}
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ) : null}


            {tab === "feedback" ? (
              <section className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
                <SectionTitle
                  eyebrow="Avaliações e sugestões"
                  title="Acompanhe mensagens recebidas pelo formulário público e avaliações das Bags."
                  description="Use esta tela para ver novos retornos, problemas relatados, elogios e comentários das avaliações dos entregadores."
                />
                <div className="mt-5 grid gap-5 xl:grid-cols-2">
                  <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
                    <h3 className="text-lg font-black text-white">Mensagens recebidas</h3>
                    <div className="mt-4 space-y-3">
                      {(store.feedbacks ?? []).length ? (
                        (store.feedbacks ?? []).map((item) => (
                          <article key={item.id} className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <div>
                                <p className="font-bold text-white">{item.name}</p>
                                <p className="mt-1 text-xs text-zinc-400">
                                  {new Date(item.createdAt).toLocaleString("pt-BR")} • {item.kind}
                                </p>
                              </div>
                              <StatusBadge tone={item.status === "resolvido" ? "green" : item.status === "em_analise" ? "orange" : "blue"}>
                                {item.status === "em_analise" ? "em análise" : item.status}
                              </StatusBadge>
                            </div>
                            <p className="mt-3 text-sm leading-6 text-zinc-200">{item.message}</p>
                            <p className="mt-2 text-xs text-zinc-400">
                              {item.email || "sem e-mail"} • {item.whatsapp || "sem WhatsApp"}
                            </p>
                            <div className="mt-3 flex flex-wrap gap-2">
                              <button type="button" onClick={() => updateAppFeedbackStatus(item.id, "em_analise")} className="rounded-xl border border-[#f59e0b]/25 bg-[#f59e0b]/10 px-3 py-2 text-xs font-bold text-[#fde68a]">Em análise</button>
                              <button type="button" onClick={() => updateAppFeedbackStatus(item.id, "resolvido")} className="rounded-xl border border-[#22c55e]/25 bg-[#22c55e]/10 px-3 py-2 text-xs font-bold text-[#baf7cd]">Resolvido</button>
                              {item.whatsapp ? (
                                <a href={`https://wa.me/55${digitsOnly(item.whatsapp)}`} target="_blank" rel="noreferrer" className="rounded-xl border border-[#25D366]/30 bg-[#25D366]/12 px-3 py-2 text-xs font-bold text-[#8ef5b4]">Responder WhatsApp</a>
                              ) : null}
                            </div>
                          </article>
                        ))
                      ) : (
                        <p className="rounded-2xl border border-dashed border-white/10 px-4 py-6 text-sm text-zinc-400">Nenhuma mensagem recebida ainda.</p>
                      )}
                    </div>
                  </div>
                  <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
                    <h3 className="text-lg font-black text-white">Comentários das avaliações</h3>
                    <div className="mt-4 space-y-3">
                      {store.missionHistory.filter((m) => m.rating).length ? (
                        store.missionHistory.filter((m) => m.rating).map((mission) => (
                          <article key={mission.id} className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <p className="font-bold text-white">{missionDisplayCode(mission.id)}</p>
                              <StatusBadge tone="green">{mission.rating?.score} ★</StatusBadge>
                            </div>
                            <p className="mt-2 text-sm text-zinc-300">
                              Entregador: {mission.riderName || "não informado"} • Estabelecimento: {mission.estabelecimentoNome}
                            </p>
                            {mission.rating?.tags?.length ? (
                              <p className="mt-2 text-xs text-[#baf7cd]">Tags: {mission.rating.tags.join(" • ")}</p>
                            ) : null}
                            {mission.rating?.comment ? (
                              <p className="mt-3 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-zinc-200">{mission.rating.comment}</p>
                            ) : null}
                          </article>
                        ))
                      ) : (
                        <p className="rounded-2xl border border-dashed border-white/10 px-4 py-6 text-sm text-zinc-400">Nenhuma avaliação registrada ainda.</p>
                      )}
                    </div>
                  </div>
                </div>
              </section>
            ) : null}

            {tab === "administradores" ? (
              <section className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
                <SectionTitle
                  eyebrow="Superadmin"
                  title="Cadastre administradores por cidade."
                  description="O superadmin cria usuários para cada operação. O admin local acessa apenas a cidade escolhida no login."
                />
                {session?.role !== "superadmin" ? (
                  <p className="mt-5 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-4 text-sm text-rose-100">
                    Somente o superadmin pode criar ou alterar administradores.
                  </p>
                ) : (
                  <>
                    <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
                      <select
                        value={novoAdmin.citySlug}
                        onChange={(e) =>
                          setNovoAdmin((c) => ({
                            ...c,
                            citySlug: e.target.value,
                            cityLabel:
                              e.target.value === "plataforma-geral"
                                ? "Plataforma Geral"
                                : "Taquaritinga/SP",
                          }))
                        }
                        className="cm-input rounded-2xl px-4 py-3 text-sm"
                      >
                        <option value="taquaritinga-sp">Taquaritinga/SP</option>
                        <option value="plataforma-geral">
                          Plataforma Geral
                        </option>
                      </select>
                      <input
                        value={novoAdmin.name}
                        onChange={(e) =>
                          setNovoAdmin((c) => ({ ...c, name: e.target.value }))
                        }
                        placeholder="Nome do admin"
                        className="cm-input rounded-2xl px-4 py-3 text-sm"
                      />
                      <input
                        value={novoAdmin.username}
                        onChange={(e) =>
                          setNovoAdmin((c) => ({
                            ...c,
                            username: e.target.value
                              .toLowerCase()
                              .replace(/\s/g, ""),
                          }))
                        }
                        placeholder="Usuário"
                        className="cm-input rounded-2xl px-4 py-3 text-sm"
                      />
                      <input
                        value={novoAdmin.email}
                        onChange={(e) =>
                          setNovoAdmin((c) => ({ ...c, email: e.target.value }))
                        }
                        placeholder="E-mail"
                        className="cm-input rounded-2xl px-4 py-3 text-sm"
                      />
                      <input
                        value={novoAdmin.phone}
                        onChange={(e) =>
                          setNovoAdmin((c) => ({ ...c, phone: e.target.value }))
                        }
                        placeholder="WhatsApp do admin"
                        className="cm-input rounded-2xl px-4 py-3 text-sm"
                      />
                      <input
                        value={novoAdmin.password}
                        onChange={(e) =>
                          setNovoAdmin((c) => ({
                            ...c,
                            password: e.target.value,
                          }))
                        }
                        placeholder="Senha forte inicial"
                        className="cm-input rounded-2xl px-4 py-3 text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (
                            !novoAdmin.name.trim() ||
                            !novoAdmin.username.trim() ||
                            novoAdmin.password.length < 8
                          ) {
                            window.alert(
                              "Informe nome, usuário e senha forte com pelo menos 8 caracteres.",
                            );
                            return;
                          }
                          addAdminUser({
                            ...novoAdmin,
                            role:
                              novoAdmin.citySlug === "plataforma-geral"
                                ? "superadmin"
                                : "admin",
                          });
                          setNovoAdmin({
                            name: "",
                            username: "",
                            email: "",
                            phone: "",
                            password: "",
                            citySlug: "taquaritinga-sp",
                            cityLabel: "Taquaritinga/SP",
                          });
                        }}
                        className="cm-primary rounded-2xl px-4 py-3 text-sm font-black xl:col-span-6"
                      >
                        Cadastrar administrador
                      </button>
                    </div>
                    <div className="mt-5 space-y-3">
                      {(store.adminUsers ?? []).length ? (
                        (store.adminUsers ?? []).map((admin) => (
                          <article
                            key={admin.id}
                            className="rounded-[24px] border border-white/10 bg-black/20 p-4"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div>
                                <p className="font-semibold text-white">
                                  {admin.name}
                                </p>
                                <p className="mt-1 text-sm text-zinc-300">
                                  Usuário: {admin.username} • {admin.cityLabel}{" "}
                                  • {admin.email || "sem e-mail"} • WhatsApp:{" "}
                                  {admin.phone || "não informado"}
                                </p>
                              </div>
                              <div className="flex flex-wrap items-center gap-2">
                                <StatusBadge
                                  tone={
                                    admin.role === "superadmin"
                                      ? "orange"
                                      : "blue"
                                  }
                                >
                                  {admin.role === "superadmin"
                                    ? "Superadmin"
                                    : "Admin local"}
                                </StatusBadge>
                                <StatusBadge
                                  tone={admin.isActive ? "green" : "red"}
                                >
                                  {admin.isActive ? "ativo" : "pausado"}
                                </StatusBadge>
                                {admin.phone ? (
                                  <a
                                    href={`https://wa.me/55${digitsOnly(admin.phone)}?text=${encodeURIComponent(`Olá, ${admin.name}. Aqui é o Chegou Motoca.`)}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 rounded-xl border border-[#25D366]/30 bg-[#25D366]/12 px-3 py-2 text-xs font-semibold text-[#8ef5b4] hover:bg-[#25D366]/20"
                                  >
                                    <IconImage
                                      name="whatsapp"
                                      alt="WhatsApp"
                                      className="h-5 w-5"
                                    />{" "}
                                    WhatsApp
                                  </a>
                                ) : null}
                                <button
                                  type="button"
                                  onClick={() => {
                                    const actor =
                                      window.prompt(
                                        "Confirme sua senha de superadmin para resetar a senha:",
                                      ) || "";
                                    if (!actor) return;
                                    const senha =
                                      window.prompt(
                                        `Nova senha forte para ${admin.name} (mínimo 8 caracteres):`,
                                        "Chegou@2026",
                                      ) || "";
                                    if (senha.length >= 8)
                                      resetAdminPassword(
                                        admin.id,
                                        senha,
                                        actor,
                                      );
                                  }}
                                  className="rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-xs font-semibold text-zinc-200 hover:bg-white/[0.1]"
                                >
                                  Resetar senha
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const actor =
                                      window.prompt(
                                        `Confirme sua senha de superadmin para ${admin.isActive ? "pausar" : "reativar"} ${admin.name}:`,
                                      ) || "";
                                    if (actor)
                                      setAdminActive(
                                        admin.id,
                                        !admin.isActive,
                                        actor,
                                      );
                                  }}
                                  className="rounded-xl border border-[#f59e0b]/30 bg-[#f59e0b]/10 px-3 py-2 text-xs font-semibold text-[#ffd1a8] hover:bg-[#f59e0b]/18"
                                >
                                  {admin.isActive ? "Pausar" : "Reativar"}
                                </button>
                                {admin.role !== "superadmin" ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const actor =
                                        window.prompt(
                                          `Confirme sua senha de superadmin para remover o acesso de ${admin.name}:`,
                                        ) || "";
                                      if (
                                        actor &&
                                        window.confirm(
                                          `Remover acesso de ${admin.name}? O histórico será mantido.`,
                                        )
                                      )
                                        removeAdminAccess(admin.id, actor);
                                    }}
                                    className="cm-danger rounded-xl border px-3 py-2 text-xs font-semibold"
                                  >
                                    Remover acesso
                                  </button>
                                ) : null}
                              </div>
                            </div>
                          </article>
                        ))
                      ) : (
                        <p className="rounded-2xl border border-dashed border-white/10 px-4 py-6 text-sm text-zinc-400">
                          Nenhum administrador listado ainda. Rode o SQL v34
                          para carregar superadmin e admin local.
                        </p>
                      )}
                    </div>
                  </>
                )}
              </section>
            ) : null}

            {tab === "configuracoes" ? (
              <section className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
                <SectionTitle
                  eyebrow="Configurações operacionais"
                  title="Defina valores e confira a simulação antes de salvar."
                  description="Valor normal, valor distante e taxa operacional passam a valer para novas Bags. A classificação por bairro deixa de ser regra global; cada estabelecimento poderá usar endereço, raio e referência de rota."
                />
                <div className="mt-5 grid gap-3 md:grid-cols-2">
                  <label className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-sm text-zinc-300">
                    Valor normal
                    <input
                      value={valorNormal}
                      onChange={(e) => setValorNormal(e.target.value)}
                      className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-white"
                    />
                  </label>
                  <label className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-sm text-zinc-300">
                    Valor distante
                    <input
                      value={valorDistante}
                      onChange={(e) => setValorDistante(e.target.value)}
                      className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-white"
                    />
                  </label>
                  <label className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-sm text-zinc-300">
                    Taxa operacional (%)
                    <input
                      value={taxaPlataforma}
                      onChange={(e) => setTaxaPlataforma(e.target.value)}
                      className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-white"
                    />
                    <span className="mt-2 block text-xs leading-5 text-zinc-500">
                      A taxa pode ser ajustada pela equipe e passa a valer para
                      novas Bags.
                    </span>
                  </label>
                  <label className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-sm text-zinc-300">
                    Simular entregas normais
                    <input
                      value={simNormais}
                      onChange={(e) => setSimNormais(e.target.value)}
                      className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-white"
                    />
                  </label>
                  <label className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-sm text-zinc-300">
                    Simular entregas distantes
                    <input
                      value={simDistantes}
                      onChange={(e) => setSimDistantes(e.target.value)}
                      className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-white"
                    />
                  </label>
                  <label className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-sm text-zinc-300">
                    Chave PIX da plataforma
                    <input
                      value={pixKey}
                      onChange={(e) => setPixKey(e.target.value)}
                      className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-white"
                      placeholder="E-mail, CPF/CNPJ, telefone ou chave aleatória"
                    />
                  </label>
                  <label className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-sm text-zinc-300">
                    Nome do recebedor PIX
                    <input
                      value={pixReceiverName}
                      onChange={(e) => setPixReceiverName(e.target.value)}
                      className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-white"
                      placeholder="Chegou Motoca"
                    />
                  </label>
                  <label className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-sm text-zinc-300">
                    WhatsApp de suporte
                    <input
                      value={supportWhatsapp}
                      onChange={(e) => setSupportWhatsapp(e.target.value)}
                      className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-white"
                      placeholder="5517999999999"
                    />
                  </label>
                  <label className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-sm text-zinc-300">
                    E-mail de suporte
                    <input
                      value={supportEmail}
                      onChange={(e) => setSupportEmail(e.target.value)}
                      className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-white"
                      placeholder="contato@chegoumotoca.com"
                    />
                  </label>
                  <label className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-sm text-zinc-300">
                    Telefone de suporte
                    <input
                      value={supportPhone}
                      onChange={(e) => setSupportPhone(e.target.value)}
                      className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-white"
                      placeholder="(17) 99999-9999"
                    />
                  </label>
                </div>
                <div className="mt-5 rounded-[24px] border border-[#22c55e]/20 bg-[#22c55e]/10 p-4">
                  {(() => {
                    const normalValue =
                      Number(valorNormal.replace(",", ".")) || 0;
                    const distantValue =
                      Number(valorDistante.replace(",", ".")) || 0;
                    const feePercent =
                      Number(taxaPlataforma.replace(",", ".")) || 0;
                    const normalCount =
                      Number(simNormais.replace(",", ".")) || 0;
                    const distantCount =
                      Number(simDistantes.replace(",", ".")) || 0;
                    const gross =
                      normalCount * normalValue + distantCount * distantValue;
                    const fee = gross * (feePercent / 100);
                    const riderNet = gross - fee;
                    return (
                      <div className="grid gap-3 md:grid-cols-4">
                        <DetailCell
                          label="Entregas simuladas"
                          value={`${normalCount + distantCount}`}
                        />
                        <DetailCell
                          label="Valor bruto"
                          value={formatCurrencyBR(gross)}
                        />
                        <DetailCell
                          label="Taxa prevista"
                          value={formatCurrencyBR(fee)}
                        />
                        <DetailCell
                          label="Repasse estimado"
                          value={formatCurrencyBR(riderNet)}
                        />
                      </div>
                    );
                  })()}
                  <p className="mt-3 text-xs leading-6 text-zinc-400">
                    Bairros distantes deixam de ser regra global. A próxima
                    etapa é aprovar endereço do estabelecimento e calcular
                    distância por raio, com Bag Express usando bairros apenas
                    como referência.
                  </p>
                </div>
                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={saveSettings}
                    className="cm-primary rounded-2xl px-4 py-3 text-sm font-black"
                  >
                    Salvar valores da plataforma
                  </button>
                </div>
              </section>
            ) : null}
          </section>
        </div>
      </div>
      {confirmBox ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-[28px] border border-white/10 bg-[#0b1119] p-5 text-white shadow-[0_24px_90px_rgba(0,0,0,.55)]">
            <p className="text-xs uppercase tracking-[0.3em] text-[#f59e0b]">
              Confirmação
            </p>
            <h2 className="mt-3 text-2xl font-black">{confirmBox.title}</h2>
            <p className="mt-3 text-sm leading-7 text-zinc-300">
              {confirmBox.message}
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => {
                  const action = confirmBox.onConfirm;
                  setConfirmBox(null);
                  action();
                }}
                className={
                  confirmBox.danger
                    ? "cm-danger rounded-2xl border px-4 py-3 text-sm font-bold"
                    : "cm-primary rounded-2xl px-4 py-3 text-sm font-black"
                }
              >
                {confirmBox.confirmLabel || "Confirmar"}
              </button>
              <button
                type="button"
                onClick={() => setConfirmBox(null)}
                className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-bold text-white hover:bg-white/[0.08]"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
