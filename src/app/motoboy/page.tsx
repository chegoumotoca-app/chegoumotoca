"use client";

import Link from "next/link";
import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { BrandHeader } from "@/components/brand-header";
import { AppFooter } from "@/components/app-footer";
import { HelpHint } from "@/components/help-hint";
import {
  DetailCell,
  SectionTitle,
  StatCard,
  StatusBadge,
} from "@/components/ui";
import { UserIcon } from "@/components/icons";
import { IconImage } from "@/components/icon-image";
import { establishments, riders } from "@/lib/mock-data";
import {
  acceptMission,
  hideMissionForRider,
  Mission,
  missionCountdownLabel,
  missionCountdownTone,
  missionDisplayCode,
  formatCurrencyBR,
  missionRiderPayout,
  parseFinishCategory,
  riderAddProof,
  riderMarkFinished,
  riderRequestCancel,
  riderWithdrawAcceptance,
  setRiderAvailability,
  useRuntimeStore,
} from "@/lib/runtime-store";
import { clearAppSession, useAppSession } from "@/lib/auth";

const riderFallback = riders[0];

type SectionKey =
  | "inicio"
  | "solicitacoes"
  | "andamento"
  | "provas"
  | "pagamentos"
  | "avaliacoes"
  | "historico"
  | "perfil";

type ProfileFocus = "dados" | "moto" | "documentos";

const menu = [
  [
    "inicio",
    "Início",
    <IconImage key="inicio" name="capacete" alt="" className="h-6 w-6" />,
  ],
  [
    "solicitacoes",
    "Solicitações",
    <IconImage
      key="solicitacoes"
      name="entregador-caixa-de-entrega-BAG-icone-localizacao-colorido"
      alt=""
      className="h-6 w-6"
    />,
  ],
  [
    "andamento",
    "Entregas em andamento",
    <IconImage
      key="andamento"
      name="entrega-em-andamento"
      alt=""
      className="h-6 w-6"
    />,
  ],
  [
    "provas",
    "Anexar pedido / comanda",
    <IconImage key="provas" name="anexar" alt="" className="h-6 w-6" />,
  ],
  [
    "pagamentos",
    "Pagamentos",
    <IconImage key="pagamentos" name="creditos" alt="" className="h-6 w-6" />,
  ],
  [
    "avaliacoes",
    "Avaliações",
    <IconImage
      key="avaliacoes"
      name="entregador-caixa-de-entrega-BAG-icone-localizacao-colorido"
      alt=""
      className="h-6 w-6"
    />,
  ],
  [
    "historico",
    "Histórico",
    <IconImage key="historico" name="historico" alt="" className="h-6 w-6" />,
  ],
] as const;

const mobileMenu = menu.filter(([key]) =>
  ["inicio", "solicitacoes", "andamento", "historico"].includes(key),
);

const help: Record<SectionKey, string> = {
  inicio:
    "Veja primeiro o que exige ação: disponibilidade, Bags abertas e repasses pendentes.",
  solicitacoes:
    "Aceite uma Bag por vez. Depois do primeiro aceite, você não recebe outra até o estabelecimento encerrar a atual.",
  andamento:
    "Acompanhe retirada, rota e finalização. Quando terminar, peça a finalização ao estabelecimento.",
  provas:
    "Guarde cópia das comandas ou comprovantes até receber seu pagamento. O anexo é opcional, mas pode proteger você em caso de divergência.",
  pagamentos:
    "O repasse só aparece como pago quando o administrador registrar o pagamento no painel.",
  avaliacoes:
    "Veja sua reputação agregada, sem expor nota individual de cada estabelecimento.",
  historico:
    "Revise Bags finalizadas, divergências registradas e os anexos que você enviou.",
  perfil:
    "Atualize seus dados de contato, PIX, moto, placa, foto e documentos em uma tela própria.",
};

const cx = (...a: (string | false | undefined | null)[]) =>
  a.filter(Boolean).join(" ");

function deliveryDestinationText(item: Mission["deliveries"][number]) {
  const main = [item.rua?.trim(), item.numero?.trim()]
    .filter(Boolean)
    .join(", ");
  if (item.bairro?.trim() && main) return `${item.bairro} • ${main}`;
  if (item.bairro?.trim()) return item.bairro;
  if (main) return main;
  return item.referencia?.trim() || "Destino não informado";
}

function missionDestinations(mission: Mission) {
  return mission.deliveries.map(deliveryDestinationText);
}

function mapsUrl(value: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(value)}`;
}

function canonicalNeighborhoodQuery(value: string, city: string, uf: string) {
  const raw = value.trim();
  const normalized = raw.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const aliases: Record<string, string> = {
    centro: "Centro",
    buscardi: "Jardim Buscardi",
    micali: "Jardim Micali",
    "maria luiza": "Jardim Maria Luiza",
    "sao sebastiao": "Jardim São Sebastião",
    ignez: "Jardim Ignez",
    contendas: "Jardim Contenda",
    contenda: "Jardim Contenda",
    "portal da serra": "Portal da Serra",
    inocop: "Inocop",
    paraiso: "Paraíso",
    "paraiso 2": "Paraíso 2",
    talavasso: "Talavasso",
    laranjeiras: "Laranjeiras",
  };
  const canonical =
    aliases[normalized] ||
    (normalized.startsWith("jardim ") ||
    normalized.startsWith("vila ") ||
    normalized.startsWith("portal ") ||
    normalized == "centro"
      ? raw
      : `Bairro ${raw}`);
  return `${canonical}, ${city}/${uf}`;
}

function destinationQuery(
  item: Mission["deliveries"][number],
  mission: Mission,
) {
  if (mission.mode === "express" || !item.rua?.trim()) {
    return canonicalNeighborhoodQuery(
      item.bairro || item.referencia || item.cidade,
      item.cidade || "Taquaritinga",
      item.uf || "SP",
    );
  }
  return `${item.rua}, ${item.numero || ""}, ${item.bairro}, ${item.cidade}/${item.uf}`;
}

const soundPath = {
  buzina: "/sounds/buzina_moto.mp3",
  coin: "/sounds/coin.mp3",
  erro: "/sounds/erro.mp3",
} as const;

function playAlertTone(kind: "buzina" | "coin" | "erro") {
  if (typeof window === "undefined") return;
  const audio = new Audio(soundPath[kind]);
  audio.volume = kind === "buzina" ? 0.65 : 0.42;
  void audio.play().catch(() => undefined);
}

function DetailList({ mission }: { mission: Mission }) {
  const establishmentContact = establishments.find(
    (item) => item.id === mission.estabelecimentoId,
  );
  const showClientContact =
    mission.status === "em_entrega" ||
    mission.status === "motoboy_marcou_finalizada";
  const showEstablishmentContact = mission.status !== "disponivel";

  return (
    <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <p className="text-sm font-medium text-white">Destinos desta Bag</p>
      <div className="mt-3 space-y-2">
        {mission.deliveries.map((item, index) => (
          <div
            key={item.id}
            className="rounded-xl border border-white/8 bg-black/20 px-3 py-2 text-sm text-zinc-300"
          >
            <span className="font-medium text-white">Entrega {index + 1}</span>
            <span className="mx-2 text-zinc-500">•</span>
            {item.clienteNome}
            <span className="mx-2 text-zinc-500">•</span>
            {deliveryDestinationText(item)}
            {item.referencia || item.observacao ? (
              <p className="mt-2 text-xs text-zinc-400">
                {item.referencia || item.observacao}
              </p>
            ) : null}
            <div className="mt-2 flex flex-wrap gap-2">
              {item.rua || item.bairro ? (
                <a
                  href={mapsUrl(destinationQuery(item, mission))}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex rounded-lg border border-sky-500/20 bg-sky-500/10 px-2.5 py-1 text-xs text-sky-100 transition hover:bg-sky-500/18"
                >
                  {mission.mode === "express"
                    ? "Abrir bairro no Maps"
                    : "Abrir no Maps"}
                </a>
              ) : null}
              {showEstablishmentContact && establishmentContact?.whatsapp ? (
                <a
                  href={`https://wa.me/${establishmentContact.whatsapp.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#25D366]/20 bg-[#25D366]/10 px-2.5 py-1 text-xs text-[#8ef5b4] transition hover:bg-[#25D366]/18"
                >
                  <IconImage
                    name="whatsapp"
                    alt="WhatsApp"
                    className="h-4 w-4"
                  />{" "}
                  WhatsApp do estabelecimento
                </a>
              ) : null}
              {showClientContact && item.clienteTelefone ? (
                <a
                  href={`https://wa.me/55${item.clienteTelefone.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#25D366]/20 bg-[#25D366]/10 px-2.5 py-1 text-xs text-[#8ef5b4] transition hover:bg-[#25D366]/18"
                >
                  <IconImage
                    name="whatsapp"
                    alt="WhatsApp"
                    className="h-4 w-4"
                  />{" "}
                  WhatsApp do cliente
                </a>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function MotoboyPage() {
  const session = useAppSession();
  const store = useRuntimeStore();
  const sessionRider =
    session?.role === "motoboy" && session.entityId
      ? store.registeredRiders.find((item) => item.id === session.entityId)
      : undefined;
  const rider = sessionRider ?? {
    id: "conta-sem-vinculo",
    nome: "Entregador em conferência",
    whatsapp: "",
    pix: "",
    cidade: session?.cityName || "Taquaritinga/SP",
    status: "offline" as const,
    avatar: "",
  };
  const [section, setSection] = useState<SectionKey>("inicio");
  const [menuOpen, setMenuOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [noticeSilenceMissionId, setNoticeSilenceMissionId] = useState<string | null>(null);
  const [expandedMissionId, setExpandedMissionId] = useState<string | null>(
    null,
  );
  const [proofMissionId, setProofMissionId] = useState<string | null>(null);
  const [acceptingMissionId, setAcceptingMissionId] = useState<string | null>(
    null,
  );
  const [acceptMessage, setAcceptMessage] = useState("");
  const [nowTick, setNowTick] = useState(() => Date.now());
  const proofRef = useRef<HTMLInputElement | null>(null);
  const profilePhotoRef = useRef<HTMLInputElement | null>(null);
  const cnhCameraRef = useRef<HTMLInputElement | null>(null);
  const cnhFileRef = useRef<HTMLInputElement | null>(null);
  const profileStorageKey = session?.userId || rider.id;
  const [profileFocus, setProfileFocus] = useState<ProfileFocus>("dados");
  const [profileDraft, setProfileDraft] = useState({
    nome: rider.nome || "",
    whatsapp: rider.whatsapp || "",
    email: rider.email || "",
    pix: rider.pix || "",
    placa: rider.placa || "",
    cidade: rider.cidade || "",
  });
  const [profilePhotoPreview, setProfilePhotoPreview] = useState(
    rider.profilePhotoDataUrl ||
      (rider.avatar?.startsWith("data:") ? rider.avatar : ""),
  );
  const [profilePhotoName, setProfilePhotoName] = useState(
    rider.profilePhotoName || "",
  );
  const [cnhPreview, setCnhPreview] = useState("");
  const [cnhName, setCnhName] = useState("");

  const availability = store.riderStatus[rider.id] ?? "online";
  const hiddenForRider = store.riderHiddenMissionIds?.[rider.id] ?? [];
  const available =
    availability === "online"
      ? store.availableMissions.filter(
          (m) =>
            m.status === "disponivel" &&
            !m.blockedRiderIds?.includes(rider.id) &&
            !hiddenForRider.includes(m.id) &&
            Date.now() - new Date(m.createdAt).getTime() < 10 * 60_000,
        )
      : [];
  const pendingApproval = store.activeMissions.filter(
    (m) =>
      m.riderId === rider.id &&
      m.status === "aguardando_confirmacao_estabelecimento",
  );
  const active = store.activeMissions.filter((m) => m.riderId === rider.id);
  const history = store.missionHistory.filter((m) => m.riderId === rider.id);
  const pendingPayout = history.filter(
    (m) =>
      m.status === "finalizada_estabelecimento" && m.payoutStatus !== "pago",
  );
  const paid = history.filter((m) => m.payoutStatus === "pago");
  const historyVisible = history;
  const expectedBalance = pendingPayout.reduce(
    (sum, mission) => sum + missionRiderPayout(mission, store.settings),
    0,
  );
  const paidBalance = paid.reduce(
    (sum, mission) => sum + missionRiderPayout(mission, store.settings),
    0,
  );
  const ratedMissions = history.filter((mission) => mission.rating);
  const averageRating = ratedMissions.length
    ? ratedMissions.reduce(
        (sum, mission) => sum + (mission.rating?.score || 0),
        0,
      ) / ratedMissions.length
    : 0;
  const tagStats = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const mission of ratedMissions) {
      for (const tag of mission.rating?.tags || [])
        counts[tag] = (counts[tag] || 0) + 1;
    }
    return Object.entries(counts)
      .map(([tag, count]) => ({
        tag,
        count,
        percent: Math.round((count / Math.max(ratedMissions.length, 1)) * 100),
      }))
      .sort((a, b) => b.percent - a.percent)
      .slice(0, 6);
  }, [ratedMissions]);

  const busy = useMemo(
    () => active.length > 0 || pendingApproval.length > 0,
    [active.length, pendingApproval.length],
  );

  useEffect(() => {
    if (availability !== "online" || available.length === 0) return;
    const timer = window.setInterval(() => {
      if (!document.hidden) playAlertTone("buzina");
    }, 2000);
    return () => window.clearInterval(timer);
  }, [availability, available.length]);

  useEffect(() => {
    if (!active.some((m) => m.status === "motoboy_marcou_finalizada")) return;
    const timer = window.setInterval(() => {
      if (!document.hidden) playAlertTone("coin");
    }, 2000);
    return () => window.clearInterval(timer);
  }, [active]);

  useEffect(() => {
    const timer = window.setInterval(() => setNowTick(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const prefix = `chegoumotoca:rider-profile:${profileStorageKey}`;
    setProfileDraft({
      nome: localStorage.getItem(`${prefix}:nome`) || rider.nome || "",
      whatsapp:
        localStorage.getItem(`${prefix}:whatsapp`) || rider.whatsapp || "",
      email: localStorage.getItem(`${prefix}:email`) || rider.email || "",
      pix: localStorage.getItem(`${prefix}:pix`) || rider.pix || "",
      placa: localStorage.getItem(`${prefix}:placa`) || rider.placa || "",
      cidade: localStorage.getItem(`${prefix}:cidade`) || rider.cidade || "",
    });
    setProfilePhotoPreview(
      localStorage.getItem(`chegoumotoca:profile-image:${profileStorageKey}`) ||
        localStorage.getItem(`${prefix}:foto`) ||
        rider.profilePhotoDataUrl ||
        (rider.avatar?.startsWith("data:") ? rider.avatar : ""),
    );
    setProfilePhotoName(
      localStorage.getItem(
        `chegoumotoca:profile-image-name:${profileStorageKey}`,
      ) ||
        localStorage.getItem(`${prefix}:fotoNome`) ||
        rider.profilePhotoName ||
        "",
    );
    setCnhPreview(localStorage.getItem(`${prefix}:cnh`) || "");
    setCnhName(localStorage.getItem(`${prefix}:cnhNome`) || "");
  }, [
    profileStorageKey,
    rider.avatar,
    rider.cidade,
    rider.email,
    rider.nome,
    rider.pix,
    rider.placa,
    rider.profilePhotoDataUrl,
    rider.profilePhotoName,
    rider.whatsapp,
  ]);

  function setProfileField(field: keyof typeof profileDraft, value: string) {
    setProfileDraft((current) => ({ ...current, [field]: value }));
  }

  function saveProfileDraft() {
    if (typeof window !== "undefined") {
      const prefix = `chegoumotoca:rider-profile:${profileStorageKey}`;
      for (const [key, value] of Object.entries(profileDraft)) {
        localStorage.setItem(`${prefix}:${key}`, String(value || ""));
      }
      if (profilePhotoPreview) {
        localStorage.setItem(
          `chegoumotoca:profile-image:${profileStorageKey}`,
          profilePhotoPreview,
        );
        localStorage.setItem(`${prefix}:foto`, profilePhotoPreview);
      }
      if (profilePhotoName) {
        localStorage.setItem(
          `chegoumotoca:profile-image-name:${profileStorageKey}`,
          profilePhotoName,
        );
        localStorage.setItem(`${prefix}:fotoNome`, profilePhotoName);
      }
      if (cnhPreview) localStorage.setItem(`${prefix}:cnh`, cnhPreview);
      if (cnhName) localStorage.setItem(`${prefix}:cnhNome`, cnhName);
    }
    setNotice(
      "Solicitação de atualização salva. Alterações sensíveis podem ser conferidas pelo administrador.",
    );
    setSection("inicio");
    window.setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 0);
  }

  function readImageFile(
    event: ChangeEvent<HTMLInputElement>,
    onReady: (dataUrl: string, name: string) => void,
  ) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onReady(String(reader.result || ""), file.name);
    reader.readAsDataURL(file);
  }

  function openProfileFromHeader(
    action:
      | "dados"
      | "responsavel"
      | "endereco"
      | "entregas"
      | "foto"
      | "senha"
      | "documentos"
      | "suporte",
  ) {
    if (action === "responsavel") setProfileFocus("moto");
    else if (action === "documentos" || action === "foto")
      setProfileFocus("documentos");
    else setProfileFocus("dados");
    setSection("perfil");
    setMenuOpen(false);
    window.setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 0);
  }

  function warnBusyMission(id: string) {
    setNotice(
      "Você já tem uma entrega em andamento ou aguardando confirmação. Finalize a entrega atual antes de aceitar outra Bag. Se não quiser ver este aviso para esta solicitação, toque em Silenciar esta Bag.",
    );
    setNoticeSilenceMissionId(id);
  }

  function silenceMission(id: string) {
    hideMissionForRider(id, rider.id);
    setAcceptingMissionId(null);
    setNoticeSilenceMissionId(null);
    setNotice("Esta Bag foi silenciada para você. Novas solicitações continuarão aparecendo normalmente.");
  }

  function onAccept(id: string, message?: string) {
    if (availability !== "online") {
      setNotice(
        "Você está offline. Fique online para poder aceitar Bags novas.",
      );
      return;
    }
    if (busy) {
      warnBusyMission(id);
      return;
    }
    acceptMission(id, rider.id, rider.nome, message);
    setAcceptingMissionId(null);
    setAcceptMessage("");
    playAlertTone("coin");
    setNotice(
      "Aceite registrado. Agora o estabelecimento decide se confirma você nesta Bag.",
    );
    setNoticeSilenceMissionId(null);
    setSection("andamento");
  }

  function uploadProof(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !proofMissionId) return;
    riderAddProof(proofMissionId, file.name, "comprovante");
    setNotice(`Anexo salvo para ${proofMissionId}: ${file.name}`);
    setProofMissionId(null);
    if (e.target) e.target.value = "";
  }

  const renderHome = () => (
    <div className="space-y-5">
      {notice ? (
        <div className="rounded-[24px] border border-sky-500/20 bg-sky-500/10 px-4 py-3 text-sm text-sky-100">
          <p>{notice}</p>
          {noticeSilenceMissionId ? (
            <button
              type="button"
              onClick={() => silenceMission(noticeSilenceMissionId)}
              className="mt-3 rounded-2xl border border-white/10 bg-white px-4 py-2 text-xs font-black text-[#11131b] hover:bg-zinc-100"
            >
              Silenciar esta Bag
            </button>
          ) : null}
        </div>
      ) : null}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Disponíveis agora"
          value={`${available.length}`}
          helper="Toque aqui para abrir a fila de Bags disponíveis."
          tone="green"
          icon={
            <IconImage
              name="entregador-caixa-de-entrega-BAG-icone-localizacao-colorido"
              alt="Disponíveis"
              className="h-7 w-7"
            />
          }
          onClick={() => setSection("solicitacoes")}
          pulse={available.length > 0}
        />
        <StatCard
          label="Entregas em andamento"
          value={`${active.length + pendingApproval.length}`}
          helper="Toque aqui para abrir Bags aguardando confirmação, retirada ou finalização."
          tone="orange"
          icon={
            <IconImage
              name="entrega-em-andamento"
              alt="Andamento"
              className="h-7 w-7"
            />
          }
          onClick={() => setSection("andamento")}
          pulse={active.length + pendingApproval.length > 0}
        />
        <StatCard
          label="Anexos opcionais"
          value={`${[...active, ...history].filter((m) => m.proofs.length === 0).length}`}
          helper="Bags sem imagem extra anexada."
          tone="blue"
          icon={
            <IconImage
              name="camera-para-tirar-fotos"
              alt="Anexos"
              className="h-7 w-7"
            />
          }
        />
        <StatCard
          label="Repasse previsto"
          value={formatCurrencyBR(expectedBalance)}
          helper="Valor finalizado pelo estabelecimento e ainda não marcado como pago pelo admin."
          tone="slate"
          icon={
            <IconImage name="creditos" alt="Pagamentos" className="h-7 w-7" />
          }
        />
      </section>
      <section className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
        <SectionTitle
          eyebrow="Avaliações"
          title={
            ratedMissions.length
              ? `Sua média atual é ${averageRating.toFixed(1).replace(".", ",")} ★`
              : "Suas avaliações aparecerão aqui."
          }
          description={
            ratedMissions.length
              ? `${ratedMissions.length} entrega(s) avaliadas. As tags ajudam você a entender seus pontos fortes.`
              : "Quando um estabelecimento finalizar e avaliar uma Bag, sua reputação começa a ser construída."
          }
        />
        {ratedMissions.length ? (
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <DetailCell
              label="Nota média"
              value={`${averageRating.toFixed(1).replace(".", ",")} de 5`}
            />
            <DetailCell
              label="Total avaliado"
              value={`${ratedMissions.length}`}
            />
            <DetailCell
              label="Última avaliação"
              value={
                ratedMissions[0]?.rating?.createdAt
                  ? new Date(ratedMissions[0].rating.createdAt).toLocaleString(
                      "pt-BR",
                    )
                  : "Sem data"
              }
            />
            {tagStats.map((item) => (
              <DetailCell
                key={item.tag}
                label={item.tag}
                value={`${item.percent}%`}
              />
            ))}
          </div>
        ) : null}
      </section>

      <section className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
        <SectionTitle
          eyebrow="Painel do motoboy"
          title="Veja primeiro o que precisa da sua ação imediata."
          description="Disponibilidade, solicitação nova, Bag em andamento e anexo opcional ficam na frente."
        />
        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() =>
              setRiderAvailability(
                rider.id,
                availability === "online" ? "offline" : "online",
              )
            }
            className={cx(
              "rounded-2xl px-4 py-3 text-sm font-medium transition",
              availability === "online"
                ? "cm-danger border border-rose-500/40 bg-rose-500/14 text-rose-100 hover:bg-rose-500/18"
                : "border border-[#22c55e]/30 bg-[#22c55e]/12 text-[#8af3a8] hover:bg-[#22c55e]/18",
            )}
          >
            {availability === "online" ? "Ficar offline" : "Ficar online"}
          </button>
          <button
            type="button"
            onClick={() => setSection("solicitacoes")}
            className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white hover:bg-white/[0.08]"
          >
            Abrir solicitações
          </button>
        </div>
      </section>
    </div>
  );

  const renderSolic = () => (
    <section className="space-y-5">
      {notice ? (
        <div className="rounded-[24px] border border-sky-500/20 bg-sky-500/10 px-4 py-3 text-sm text-sky-100">
          <p>{notice}</p>
          {noticeSilenceMissionId ? (
            <button
              type="button"
              onClick={() => silenceMission(noticeSilenceMissionId)}
              className="mt-3 rounded-2xl border border-white/10 bg-white px-4 py-2 text-xs font-black text-[#11131b] hover:bg-zinc-100"
            >
              Silenciar esta Bag
            </button>
          ) : null}
        </div>
      ) : null}
      <section className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
        <SectionTitle
          eyebrow="Solicitações disponíveis"
          title="Aceite simples. O primeiro aceite ganha prioridade até o estabelecimento confirmar ou devolver para a fila."
        />
        <div className="mt-5 space-y-4">
          {available.length ? (
            available.map((m) => {
              const open = expandedMissionId === m.id;
              const destinations = missionDestinations(m);
              return (
                <article
                  key={missionDisplayCode(m.id)}
                  className="rounded-[24px] border border-white/10 bg-black/20 p-4 transition pulse-card-blue"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-semibold text-white">
                      {missionDisplayCode(m.id)}
                    </h3>
                    <StatusBadge tone={m.priority ? "orange" : "green"}>
                      {m.priority ? "Prioritária" : "Disponível"}
                    </StatusBadge>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <DetailCell
                      label="Estabelecimento"
                      value={m.estabelecimentoNome}
                    />
                    <DetailCell
                      label="Quantidade"
                      value={`${m.deliveries.length} entregas`}
                    />
                    <DetailCell
                      label="Destinos"
                      value={destinations.join(" • ")}
                    />
                    <DetailCell
                      label="Valor líquido"
                      value={formatCurrencyBR(
                        missionRiderPayout(m, store.settings),
                      )}
                    />
                  </div>
                  <div className="mt-4 flex gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        if (busy) {
                          warnBusyMission(m.id);
                          return;
                        }
                        setNoticeSilenceMissionId(null);
                        setAcceptingMissionId((current) =>
                          current === m.id ? null : m.id,
                        );
                        setAcceptMessage("");
                      }}
                      className="rounded-2xl bg-white px-4 py-3 text-sm font-medium text-[#11131b] transition hover:bg-zinc-100 hover:scale-[1.02] hover:shadow-[0_0_0_1px_rgba(255,255,255,0.2)]"
                    >
                      Aceitar Bag
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedMissionId((current) =>
                          current === m.id ? null : m.id,
                        )
                      }
                      className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white transition hover:bg-white/[0.08] hover:scale-[1.02]"
                    >
                      {open ? "Ocultar detalhes" : "Ver detalhes"}
                    </button>
                  </div>
                  {m.priority ? (
                    <div className="mt-3 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-sm text-[#ffd8a8]">
                      Entrega prioritária • aceite rápido e fortaleça sua
                      reputação com os estabelecimentos.
                    </div>
                  ) : null}
                  {acceptingMissionId === m.id ? (
                    <div className="mt-4 rounded-2xl border border-sky-500/20 bg-sky-500/10 p-4">
                      <p className="text-sm text-sky-100">
                        Mensagem opcional para o estabelecimento. Ex.: já estou
                        indo, atraso 5 min.
                      </p>
                      <input
                        value={acceptMessage}
                        onChange={(e) => setAcceptMessage(e.target.value)}
                        className="mt-3 w-full rounded-xl border border-sky-500/20 bg-[#0b1220] px-3 py-2 text-white outline-none"
                        placeholder="Mensagem opcional"
                      />
                      <div className="mt-3 flex flex-wrap gap-3">
                        <button
                          type="button"
                          onClick={() => onAccept(m.id, acceptMessage)}
                          className="rounded-2xl bg-white px-4 py-3 text-sm font-medium text-[#11131b] transition hover:bg-zinc-100 hover:scale-[1.02]"
                        >
                          Confirmar aceite
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setAcceptingMissionId(null);
                            setAcceptMessage("");
                          }}
                          className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white hover:bg-white/[0.08]"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : null}
                  {open ? <DetailList mission={m} /> : null}
                </article>
              );
            })
          ) : (
            <p className="rounded-2xl border border-dashed border-white/10 px-4 py-6 text-sm text-zinc-400">
              Nenhuma Bag nova está disponível para aceite agora.
            </p>
          )}
        </div>
      </section>
    </section>
  );

  const renderOpen = () => (
    <div className="space-y-5">
      {notice ? (
        <div className="rounded-[24px] border border-sky-500/20 bg-sky-500/10 px-4 py-3 text-sm text-sky-100">
          <p>{notice}</p>
          {noticeSilenceMissionId ? (
            <button
              type="button"
              onClick={() => silenceMission(noticeSilenceMissionId)}
              className="mt-3 rounded-2xl border border-white/10 bg-white px-4 py-2 text-xs font-black text-[#11131b] hover:bg-zinc-100"
            >
              Silenciar esta Bag
            </button>
          ) : null}
        </div>
      ) : null}
      <section className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
        <SectionTitle
          eyebrow="Entregas em andamento"
          title="Acompanhe confirmação, retirada, rota e finalização sem se perder na tela."
        />
        <div className="mt-5 space-y-4">
          {pendingApproval.map((m) => {
            const cancelWindow = m.acceptedAt
              ? (() => {
                  const diff =
                    new Date(m.acceptedAt).getTime() + 60_000 - nowTick;
                  if (diff <= 0) return null;
                  const min = Math.floor(diff / 60000);
                  const sec = Math.floor((diff % 60000) / 1000);
                  return `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
                })()
              : null;
            return (
              <article
                key={missionDisplayCode(m.id)}
                className="rounded-[24px] border border-[#f59e0b]/20 bg-[#f59e0b]/10 p-4 shadow-[0_0_0_1px_rgba(245,158,11,0.15)] pulse-card-amber"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-lg font-semibold text-white">
                    {missionDisplayCode(m.id)}
                  </h3>
                  <StatusBadge tone="orange">Aceite enviado</StatusBadge>
                  <span className="inline-flex h-2.5 w-2.5 pulse-dot rounded-full bg-[#f59e0b]" />
                </div>
                <p className="mt-3 text-sm text-zinc-200">
                  Você foi o primeiro a aceitar. Agora aguarde o estabelecimento
                  confirmar você nesta Bag.
                </p>
                {m.riderAcceptanceMessage ? (
                  <p className="mt-3 rounded-xl border border-sky-500/20 bg-sky-500/10 px-3 py-2 text-sm text-sky-100">
                    Sua mensagem: {m.riderAcceptanceMessage}
                  </p>
                ) : null}
                {cancelWindow ? (
                  <div className="mt-4 flex flex-wrap gap-3">
                    <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-zinc-300">
                      Você ainda pode cancelar este aceite em {cancelWindow}.
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        riderWithdrawAcceptance(m.id, rider.id);
                        playAlertTone("erro");
                        setNotice(
                          `Seu aceite foi cancelado na ${missionDisplayCode(m.id)}.`,
                        );
                        setSection("solicitacoes");
                      }}
                      className="rounded-2xl border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-200 transition hover:bg-rose-500/18"
                    >
                      Cancelar aceite
                    </button>
                  </div>
                ) : null}
              </article>
            );
          })}

          {active.length
            ? active.map((m) => (
                <article
                  key={missionDisplayCode(m.id)}
                  className={cx(
                    "rounded-[24px] border bg-black/20 p-4 transition",
                    m.status === "aguardando_retirada" &&
                      "border-[#f59e0b]/20 shadow-[0_0_0_1px_rgba(245,158,11,0.14)] pulse-card-amber",
                    m.status === "em_entrega" &&
                      "border-sky-500/20 shadow-[0_0_0_1px_rgba(14,165,233,0.14)] pulse-card-cyan",
                    m.status === "motoboy_marcou_finalizada" &&
                      "border-violet-500/20 shadow-[0_0_0_1px_rgba(168,85,247,0.18)] pulse-card-violet",
                  )}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-semibold text-white">
                      {missionDisplayCode(m.id)}
                    </h3>
                    <StatusBadge
                      tone={
                        m.status === "aguardando_retirada"
                          ? "orange"
                          : m.status === "em_entrega"
                            ? missionCountdownTone(m)
                            : "orange"
                      }
                    >
                      {m.status === "aguardando_retirada"
                        ? "Aguardando retirada"
                        : m.status === "em_entrega"
                          ? "Em entrega"
                          : "Finalização solicitada"}
                    </StatusBadge>
                    {m.status !== "aguardando_retirada" ? (
                      <span className="inline-flex h-2.5 w-2.5 pulse-dot rounded-full bg-[#f59e0b]" />
                    ) : null}
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <DetailCell
                      label="Estabelecimento"
                      value={m.estabelecimentoNome}
                    />
                    <DetailCell
                      label="Destinos"
                      value={missionDestinations(m).join(" • ")}
                    />
                    <DetailCell
                      label="Quantidade"
                      value={`${m.deliveries.length} entregas`}
                    />
                    <DetailCell
                      label="Valor líquido"
                      value={formatCurrencyBR(
                        missionRiderPayout(m, store.settings),
                      )}
                    />
                  </div>
                  {missionCountdownLabel(m) ? (
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <StatusBadge tone={missionCountdownTone(m)}>
                        {m.status === "aguardando_retirada"
                          ? "Tempo para retirada"
                          : "Tempo da rota"}
                      </StatusBadge>
                      <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-zinc-200">
                        {missionCountdownLabel(m)}
                      </span>
                    </div>
                  ) : null}
                  <div className="mt-4 flex flex-wrap gap-3">
                    {m.status === "aguardando_retirada" &&
                    m.riderCancelUntil &&
                    new Date(m.riderCancelUntil).getTime() > nowTick ? (
                      <button
                        type="button"
                        onClick={() => {
                          riderWithdrawAcceptance(
                            m.id,
                            rider.id,
                            "Entregador cancelou após confirmação inicial.",
                          );
                          playAlertTone("erro");
                          setNotice(
                            `Seu aceite foi cancelado e a ${missionDisplayCode(m.id)} voltou para a fila.`,
                          );
                          setSection("solicitacoes");
                        }}
                        className="rounded-2xl border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-200 transition hover:bg-rose-500/18"
                      >
                        Cancelar aceite (
                        {(() => {
                          const diff =
                            new Date(m.riderCancelUntil!).getTime() - nowTick;
                          const min = Math.floor(diff / 60000);
                          const sec = Math.floor((diff % 60000) / 1000);
                          return `${String(Math.max(min, 0)).padStart(2, "0")}:${String(Math.max(sec, 0)).padStart(2, "0")}`;
                        })()}
                        )
                      </button>
                    ) : null}
                    {m.status === "em_entrega" ? (
                      <button
                        type="button"
                        onClick={() => {
                          riderMarkFinished(m.id);
                          setNotice(
                            `Pedido de finalização enviado para o estabelecimento na ${missionDisplayCode(m.id)}.`,
                          );
                        }}
                        className="rounded-2xl border border-[#22c55e]/30 bg-[#22c55e]/10 px-4 py-3 text-sm font-medium text-[#8af3a8] transition hover:bg-[#22c55e]/18 hover:shadow-[0_0_0_1px_rgba(34,197,94,0.25)]"
                      >
                        Solicitar finalização ao estabelecimento
                      </button>
                    ) : null}
                    {m.status === "aguardando_retirada" ? (
                      <button
                        type="button"
                        onClick={() => {
                          const reason =
                            "Solicitação de cancelamento pelo entregador.";
                          riderRequestCancel(m.id, rider.id, reason);
                          setNotice(
                            `Pedido de cancelamento enviado para o estabelecimento na ${missionDisplayCode(m.id)}.`,
                          );
                        }}
                        className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white transition hover:bg-white/[0.08]"
                      >
                        Solicitar cancelamento
                      </button>
                    ) : null}
                    {m.status === "aguardando_retirada" ||
                    m.status === "em_entrega" ||
                    m.status === "motoboy_marcou_finalizada" ? (
                      <a
                        href={`https://wa.me/${(establishments.find((item) => item.id === m.estabelecimentoId)?.whatsapp || "").replace(/\D/g, "")}?text=${encodeURIComponent(`Olá, preciso relatar um problema na ${missionDisplayCode(m.id)}. Descrevo a situação:`)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-[#ffd8a8] transition hover:bg-amber-500/18 hover:scale-[1.02]"
                      >
                        Relatar problema
                      </a>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => {
                        setSection("provas");
                        setProofMissionId(m.id);
                      }}
                      className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white transition hover:bg-white/[0.08] hover:scale-[1.02]"
                    >
                      Anexar pedido / comanda / protocolo
                    </button>
                  </div>
                  <DetailList mission={m} />
                </article>
              ))
            : null}

          {!active.length && !pendingApproval.length ? (
            <p className="rounded-2xl border border-dashed border-white/10 px-4 py-6 text-sm text-zinc-400">
              Nenhuma Bag está em andamento para você agora.
            </p>
          ) : null}
        </div>
      </section>
    </div>
  );

  const renderProofs = () => (
    <div className="space-y-5">
      {notice ? (
        <div className="rounded-[24px] border border-sky-500/20 bg-sky-500/10 px-4 py-3 text-sm text-sky-100">
          <p>{notice}</p>
          {noticeSilenceMissionId ? (
            <button
              type="button"
              onClick={() => silenceMission(noticeSilenceMissionId)}
              className="mt-3 rounded-2xl border border-white/10 bg-white px-4 py-2 text-xs font-black text-[#11131b] hover:bg-zinc-100"
            >
              Silenciar esta Bag
            </button>
          ) : null}
        </div>
      ) : null}
      <section className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <SectionTitle
            eyebrow="Anexos opcionais"
            title="Guarde imagem de pedido, comanda ou comprovante como segurança extra."
            description="Segure suas cópias até o recebimento do repasse. Anexar é opcional, mas ajuda em divergências."
          />
          <HelpHint title="Dúvida rápida">{help.provas}</HelpHint>
        </div>
        <input
          ref={proofRef}
          type="file"
          accept="image/*,.pdf"
          className="hidden"
          onChange={uploadProof}
        />
        <div className="mt-5 space-y-4">
          {[...active, ...history].length ? (
            [...active, ...history].map((m) => (
              <article
                key={missionDisplayCode(m.id)}
                className="rounded-[24px] border border-white/10 bg-black/20 p-4"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-lg font-semibold text-white">
                    {missionDisplayCode(m.id)}
                  </h3>
                  <StatusBadge
                    tone={
                      m.payoutStatus === "pago"
                        ? "green"
                        : m.status === "divergencia_estabelecimento"
                          ? "red"
                          : "blue"
                    }
                  >
                    {m.payoutStatus === "pago"
                      ? "Pago"
                      : m.status === "divergencia_estabelecimento"
                        ? "Divergência"
                        : "Disponível para anexo"}
                  </StatusBadge>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <DetailCell
                    label="Estabelecimento"
                    value={m.estabelecimentoNome}
                  />
                  <DetailCell
                    label="Comandas esperadas"
                    value={`${m.commandasEsperadas}`}
                  />
                  <DetailCell
                    label="Anexos enviados"
                    value={`${m.proofs.length}`}
                  />
                  <DetailCell
                    label="Status"
                    value={
                      m.finishReason ||
                      (m.payoutStatus === "pago"
                        ? "Repasse encerrado"
                        : "Anexo opcional disponível")
                    }
                  />
                </div>
                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setProofMissionId(m.id);
                      proofRef.current?.click();
                    }}
                    className="rounded-2xl bg-white px-4 py-3 text-sm font-medium text-[#11131b] transition hover:bg-zinc-100 hover:scale-[1.02]"
                  >
                    Anexar pedido / comanda / protocolo
                  </button>
                </div>
                {m.proofs.length ? (
                  <div className="mt-4 space-y-2">
                    {m.proofs.map((proof) => (
                      <div
                        key={proof.id}
                        className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-zinc-300"
                      >
                        {proof.name} •{" "}
                        {new Date(proof.uploadedAt).toLocaleString("pt-BR")}
                      </div>
                    ))}
                  </div>
                ) : null}
              </article>
            ))
          ) : (
            <p className="rounded-2xl border border-dashed border-white/10 px-4 py-6 text-sm text-zinc-400">
              Nenhuma Bag está disponível para anexo agora.
            </p>
          )}
        </div>
      </section>
    </div>
  );

  const renderPayments = () => (
    <div className="space-y-5">
      <section className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
        <SectionTitle
          eyebrow="Pagamentos"
          title="Veja o que ainda está a receber e o que já foi marcado como pago."
        />
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="A receber"
            value={formatCurrencyBR(expectedBalance)}
            helper="Bags finalizadas pelo estabelecimento e aguardando repasse do admin."
            tone="orange"
            icon={
              <IconImage name="creditos" alt="Pagamentos" className="h-7 w-7" />
            }
          />
          <StatCard
            label="Pago"
            value={formatCurrencyBR(paidBalance)}
            helper="Repasse já registrado no painel administrativo."
            tone="green"
            icon={
              <IconImage name="creditos" alt="Pagamentos" className="h-7 w-7" />
            }
          />
        </div>
        <div className="mt-5 space-y-3">
          {pendingPayout.length ? (
            pendingPayout.map((m) => (
              <article
                key={m.id}
                className="rounded-[24px] border border-white/10 bg-black/20 p-4"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-lg font-semibold text-white">
                    {missionDisplayCode(m.id)}
                  </h3>
                  <StatusBadge tone="orange">Pagamento pendente</StatusBadge>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <DetailCell
                    label="Estabelecimento"
                    value={m.estabelecimentoNome}
                  />
                  <DetailCell
                    label="Valor líquido"
                    value={formatCurrencyBR(
                      missionRiderPayout(m, store.settings),
                    )}
                  />
                  <DetailCell label="Anexos" value={`${m.proofs.length}`} />
                  <DetailCell
                    label="Finalização"
                    value={
                      m.establishmentFinishedAt
                        ? new Date(m.establishmentFinishedAt).toLocaleString(
                            "pt-BR",
                          )
                        : "Sem data"
                    }
                  />
                  <DetailCell
                    label="Avaliação"
                    value={
                      m.rating
                        ? m.rating.tags?.length
                          ? m.rating.tags.join(", ")
                          : "Avaliação registrada"
                        : "Ainda não avaliada"
                    }
                  />
                </div>
              </article>
            ))
          ) : (
            <p className="rounded-2xl border border-dashed border-white/10 px-4 py-6 text-sm text-zinc-400">
              Nenhuma Bag está aguardando repasse agora.
            </p>
          )}
        </div>
      </section>
    </div>
  );

  const renderHistory = () => (
    <div className="space-y-5">
      <section className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
        <SectionTitle
          eyebrow="Histórico"
          title="Veja Bags pagas e divergências que ainda precisam de atenção."
        />
        <div className="mt-5 space-y-4">
          {historyVisible.length ? (
            historyVisible.map((m) => (
              <article
                key={missionDisplayCode(m.id)}
                className="rounded-[24px] border border-white/10 bg-black/20 p-4"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-lg font-semibold text-white">
                    {missionDisplayCode(m.id)}
                  </h3>
                  <StatusBadge
                    tone={
                      m.status === "divergencia_estabelecimento"
                        ? "red"
                        : m.payoutStatus === "pago"
                          ? "green"
                          : "orange"
                    }
                  >
                    {m.status === "divergencia_estabelecimento"
                      ? "Divergência"
                      : m.payoutStatus === "pago"
                        ? "Pago"
                        : "Pendente de repasse"}
                  </StatusBadge>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <DetailCell
                    label="Estabelecimento"
                    value={m.estabelecimentoNome}
                  />
                  <DetailCell
                    label="Valor líquido"
                    value={formatCurrencyBR(
                      missionRiderPayout(m, store.settings),
                    )}
                  />
                  <DetailCell label="Anexos" value={`${m.proofs.length}`} />
                  <DetailCell
                    label="Finalização"
                    value={
                      m.establishmentFinishedAt
                        ? new Date(m.establishmentFinishedAt).toLocaleString(
                            "pt-BR",
                          )
                        : "Sem data"
                    }
                  />
                  <DetailCell
                    label="Avaliação"
                    value={
                      m.rating
                        ? m.rating.tags?.length
                          ? m.rating.tags.join(", ")
                          : "Avaliação registrada"
                        : "Ainda não avaliada"
                    }
                  />
                </div>
                {m.rating?.comment ? (
                  <p className="mt-3 rounded-2xl border border-[#22c55e]/20 bg-[#22c55e]/10 px-3 py-2 text-sm text-[#baf7cd]">
                    Comentário do estabelecimento: {m.rating.comment}
                  </p>
                ) : null}
                {m.finishReason ? (
                  <p className="mt-3 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-100">
                    {m.finishReason}
                  </p>
                ) : null}
                {m.status === "divergencia_estabelecimento" &&
                parseFinishCategory(m.finishReason) === "entregador" ? (
                  <div className="mt-3 flex flex-wrap gap-3">
                    <a
                      href={`https://wa.me/55${rider.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(`Quero contestar a ${missionDisplayCode(m.id)}. Motivo registrado: ${m.finishReason || "não informado"}.`)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-2xl border border-[#25D366]/30 bg-[#25D366]/12 px-4 py-3 text-sm font-medium text-[#8ef5b4] hover:bg-[#25D366]/18"
                    >
                      <IconImage
                        name="whatsapp"
                        alt="WhatsApp"
                        className="h-5 w-5"
                      />{" "}
                      Contestar no WhatsApp
                    </a>
                  </div>
                ) : null}
              </article>
            ))
          ) : (
            <p className="rounded-2xl border border-dashed border-white/10 px-4 py-6 text-sm text-zinc-400">
              Nenhuma Bag foi para o histórico ainda.
            </p>
          )}
        </div>
      </section>
    </div>
  );

  if (!session || session.role !== "motoboy") {
    return (
      <main className="cm-page min-h-screen pb-10 text-white">
        <div className="mx-auto flex min-h-screen max-w-3xl flex-col gap-5 px-4 py-5">
          <BrandHeader publicView />
          <section className="cm-card rounded-[32px] p-6 md:p-8">
            <p className="text-xs uppercase tracking-[0.34em] text-[#f59e0b]">
              Acesso do entregador
            </p>
            <h1 className="mt-4 text-3xl font-black text-white">
              Entre com uma conta aprovada para receber Bags.
            </h1>
            <p className="mt-3 text-sm leading-7 text-zinc-300">
              O PWA do motoboy só libera solicitações após login aprovado. Use a
              tela de acesso para entrar ou envie seu cadastro.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/login"
                className="cm-primary rounded-2xl px-5 py-3 text-sm font-black"
              >
                Ir para login
              </Link>
              <Link
                href="/cadastro?tipo=motoboy"
                className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-bold text-zinc-200"
              >
                Cadastrar entregador
              </Link>
            </div>
          </section>
        </div>
      </main>
    );
  }

  if (session?.role === "motoboy" && !sessionRider) {
    return (
      <main className="cm-page min-h-screen pb-10 text-white">
        <div className="mx-auto flex min-h-screen max-w-3xl flex-col gap-5 px-4 py-5">
          <BrandHeader publicView />
          <section className="cm-card rounded-[32px] p-6 md:p-8">
            <p className="text-xs uppercase tracking-[0.34em] text-[#f59e0b]">
              Conta em conferência
            </p>
            <h1 className="mt-4 text-3xl font-black text-white">
              Seu acesso entrou, mas o entregador ainda não está vinculado.
            </h1>
            <p className="mt-3 text-sm leading-7 text-zinc-300">
              Peça para o administrador conferir seu cadastro e vincular seu
              usuário ao motoboy correto. Depois disso, as Bags aparecem
              normalmente.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/login"
                className="cm-primary rounded-2xl px-5 py-3 text-sm font-black"
              >
                Voltar ao acesso
              </Link>
              <Link
                href="/recuperar-acesso"
                className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-bold text-zinc-200"
              >
                Falar com a equipe
              </Link>
            </div>
          </section>
        </div>
      </main>
    );
  }

  const renderRatings = () => (
    <div className="space-y-5">
      <section className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
        <SectionTitle
          eyebrow="Minhas avaliações"
          title={
            ratedMissions.length
              ? `Sua média atual é ${averageRating.toFixed(1).replace(".", ",")} ★`
              : "Suas avaliações aparecerão aqui."
          }
          description={
            ratedMissions.length
              ? `${ratedMissions.length} entrega(s) avaliadas. A nota é agregada para evitar conflito por uma avaliação isolada.`
              : "Quando um estabelecimento finalizar e avaliar uma Bag, sua reputação começa a ser construída."
          }
        />
        {ratedMissions.length ? (
          <div className="mt-5 grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
            <div className="rounded-[24px] border border-[#22c55e]/25 bg-[#22c55e]/10 p-5">
              <p className="text-sm text-zinc-300">Média geral</p>
              <p className="mt-2 text-5xl font-black text-white">
                {averageRating.toFixed(1).replace(".", ",")} ★
              </p>
              <p className="mt-2 text-sm text-[#baf7cd]">
                {ratedMissions.length} avaliação(ões)
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {[5, 4, 3, 2, 1].map((star) => {
                const count = ratedMissions.filter(
                  (mission) => mission.rating?.score === star,
                ).length;
                const percent = Math.round(
                  (count / Math.max(ratedMissions.length, 1)) * 100,
                );
                return (
                  <DetailCell
                    key={star}
                    label={`${star} estrelas`}
                    value={`${percent}% • ${count}`}
                  />
                );
              })}
              {tagStats.map((item) => (
                <DetailCell
                  key={item.tag}
                  label={item.tag}
                  value={`${item.percent}%`}
                />
              ))}
            </div>
          </div>
        ) : null}
        {ratedMissions.some((m) => m.rating?.comment) ? (
          <div className="mt-5 space-y-2">
            <p className="text-sm font-bold text-white">Comentários recentes</p>
            {ratedMissions
              .filter((m) => m.rating?.comment)
              .slice(0, 5)
              .map((m) => (
                <p
                  key={m.id}
                  className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-zinc-300"
                >
                  {m.rating?.comment}
                </p>
              ))}
          </div>
        ) : null}
      </section>
    </div>
  );

  const renderProfile = () => (
    <section className="space-y-5 rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
      <SectionTitle
        eyebrow="Meu perfil"
        title="Edite seus dados em uma tela própria, sem esconder o painel atrás do menu."
        description="Foto, PIX, moto, placa e documentos ficam juntos para facilitar a conferência do administrador."
      />
      <div className="grid gap-2 sm:grid-cols-3">
        {[
          ["dados", "Dados pessoais"],
          ["moto", "Moto, placa e PIX"],
          ["documentos", "Cadastro e documentos"],
        ].map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setProfileFocus(key as ProfileFocus)}
            className={cx(
              "rounded-2xl border px-4 py-3 text-sm font-bold transition",
              profileFocus === key
                ? "border-[#22c55e]/35 bg-[#22c55e]/14 text-[#9ef5b4]"
                : "border-white/10 bg-white/[0.04] text-zinc-200 hover:bg-white/[0.08]",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[260px_minmax(0,1fr)]">
        <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
          <p className="text-sm font-bold text-white">Foto do entregador</p>
          <div className="mt-4 flex items-center gap-4">
            <span className="inline-flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-3xl border border-white/10 bg-white/[0.05]">
              {profilePhotoPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profilePhotoPreview}
                  alt="Foto do perfil"
                  className="h-full w-full object-cover"
                />
              ) : (
                <UserIcon className="h-7 w-7 text-zinc-400" />
              )}
            </span>
            <div className="min-w-0 text-sm text-zinc-300">
              <p className="truncate">
                {profilePhotoName || "Sem foto enviada"}
              </p>
              <button
                type="button"
                onClick={() => profilePhotoRef.current?.click()}
                className="mt-3 rounded-2xl border border-[#22c55e]/25 bg-[#22c55e]/10 px-4 py-2 text-xs font-bold text-[#9ef5b4] hover:bg-[#22c55e]/16"
              >
                {profilePhotoPreview ? "Modificar foto" : "Enviar foto"}
              </button>
              <input
                ref={profilePhotoRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) =>
                  readImageFile(event, (dataUrl, name) => {
                    setProfilePhotoPreview(dataUrl);
                    setProfilePhotoName(name);
                  })
                }
              />
            </div>
          </div>
        </div>

        <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
          {profileFocus === "dados" ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm text-zinc-300">
                Nome
                <input
                  value={profileDraft.nome}
                  onChange={(e) => setProfileField("nome", e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-[#0b1119] px-4 py-3 text-white outline-none focus:border-[#22c55e]/50"
                />
              </label>
              <label className="text-sm text-zinc-300">
                WhatsApp
                <input
                  value={profileDraft.whatsapp}
                  onChange={(e) => setProfileField("whatsapp", e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-[#0b1119] px-4 py-3 text-white outline-none focus:border-[#22c55e]/50"
                />
              </label>
              <label className="text-sm text-zinc-300">
                E-mail
                <input
                  value={profileDraft.email}
                  onChange={(e) => setProfileField("email", e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-[#0b1119] px-4 py-3 text-white outline-none focus:border-[#22c55e]/50"
                />
              </label>
              <label className="text-sm text-zinc-300">
                Cidade / operação
                <input
                  value={profileDraft.cidade}
                  onChange={(e) => setProfileField("cidade", e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-[#0b1119] px-4 py-3 text-white outline-none focus:border-[#22c55e]/50"
                />
              </label>
            </div>
          ) : null}

          {profileFocus === "moto" ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm text-zinc-300">
                Chave PIX
                <input
                  value={profileDraft.pix}
                  onChange={(e) => setProfileField("pix", e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-[#0b1119] px-4 py-3 text-white outline-none focus:border-[#22c55e]/50"
                />
              </label>
              <label className="text-sm text-zinc-300">
                Placa
                <input
                  value={profileDraft.placa}
                  onChange={(e) => setProfileField("placa", e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-[#0b1119] px-4 py-3 text-white outline-none focus:border-[#22c55e]/50"
                />
              </label>
              <p className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-[#ffd8a8] sm:col-span-2">
                Alterações de PIX, placa e dados da moto podem ser conferidas
                pelo administrador antes de valerem na operação.
              </p>
            </div>
          ) : null}

          {profileFocus === "documentos" ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-sm font-bold text-white">CNH ou documento</p>
                <p className="mt-1 text-xs leading-5 text-zinc-400">
                  Envie uma imagem nítida para o administrador conferir
                  cadastro, foto, CPF e placa.
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => cnhCameraRef.current?.click()}
                    className="rounded-2xl border border-[#22c55e]/25 bg-[#22c55e]/10 px-4 py-3 text-sm font-bold text-[#9ef5b4] hover:bg-[#22c55e]/16"
                  >
                    Tirar foto da CNH
                  </button>
                  <button
                    type="button"
                    onClick={() => cnhFileRef.current?.click()}
                    className="rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm font-bold text-white hover:bg-white/[0.09]"
                  >
                    {cnhPreview ? "Substituir imagem" : "Enviar imagem da CNH"}
                  </button>
                  <span className="w-full text-xs text-zinc-400 sm:w-auto">
                    {cnhName || "Nenhum documento anexado"}
                  </span>
                  <input
                    ref={cnhCameraRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(event) =>
                      readImageFile(event, (dataUrl, name) => {
                        setCnhPreview(dataUrl);
                        setCnhName(name);
                      })
                    }
                  />
                  <input
                    ref={cnhFileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(event) =>
                      readImageFile(event, (dataUrl, name) => {
                        setCnhPreview(dataUrl);
                        setCnhName(name);
                      })
                    }
                  />
                </div>
                {cnhPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={cnhPreview}
                    alt="Prévia da CNH"
                    className="mt-4 h-28 w-40 rounded-2xl object-cover ring-1 ring-white/10"
                  />
                ) : null}
              </div>
              <p className="rounded-2xl border border-sky-500/20 bg-sky-500/10 px-4 py-3 text-sm text-sky-100">
                Seus documentos ficam vinculados ao cadastro e ajudam o
                administrador a aprovar ou revisar seu acesso.
              </p>
            </div>
          ) : null}

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={saveProfileDraft}
              className="cm-primary rounded-2xl px-5 py-3 text-sm font-black"
            >
              Salvar alterações
            </button>
            <button
              type="button"
              onClick={() => setSection("inicio")}
              className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-bold text-white hover:bg-white/[0.08]"
            >
              Voltar ao painel
            </button>
          </div>
        </div>
      </div>
    </section>
  );

  const renderSection = () => {
    if (section === "inicio") return renderHome();
    if (section === "solicitacoes") return renderSolic();
    if (section === "andamento") return renderOpen();
    if (section === "provas") return renderProofs();
    if (section === "pagamentos") return renderPayments();
    if (section === "avaliacoes") return renderRatings();
    if (section === "perfil") return renderProfile();
    return renderHistory();
  };

  return (
    <main className="cm-page pb-24 text-white">
      <div className="mx-auto flex min-h-screen max-w-[1580px] flex-col gap-5 px-4 py-4 lg:px-6">
        <BrandHeader
          profileLabel={rider.nome}
          profileRole="Motoboy"
          status={availability}
          onToggleStatus={() =>
            setRiderAvailability(
              rider.id,
              availability === "online" ? "offline" : "online",
            )
          }
          profileImageUrl={
            profilePhotoPreview ||
            rider.profilePhotoDataUrl ||
            (rider.avatar?.startsWith("data:") ? rider.avatar : undefined)
          }
          onLogoClick={() => {
            setSection("inicio");
            setMenuOpen(false);
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          onProfileAction={openProfileFromHeader}
          shortcuts={[
            {
              label: "Pagamentos",
              onClick: () => {
                setSection("pagamentos");
                window.scrollTo({ top: 0, behavior: "smooth" });
              },
              icon: <IconImage name="creditos" alt="" className="h-5 w-5" />,
            },
            {
              label: "Anexos",
              onClick: () => {
                setSection("provas");
                window.scrollTo({ top: 0, behavior: "smooth" });
              },
              icon: <IconImage name="anexar" alt="" className="h-5 w-5" />,
            },
            {
              label: "Minhas avaliações",
              onClick: () => {
                setSection("avaliacoes");
                window.scrollTo({ top: 0, behavior: "smooth" });
              },
              icon: (
                <IconImage
                  name="entregador-caixa-de-entrega-BAG-icone-localizacao-colorido"
                  alt=""
                  className="h-5 w-5"
                />
              ),
            },
          ]}
        />
        <div className="grid gap-5 xl:grid-cols-[300px_minmax(0,1fr)]">
          <aside className="cm-sidebar hidden rounded-[32px] p-5 xl:block">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.34em] text-[#f59e0b]">
                  Motoboy
                </p>
                <h1 className="mt-3 text-[2.1rem] font-semibold leading-[1.05] tracking-tight text-white">
                  {rider.nome}
                </h1>
                <p className="mt-4 max-w-[22ch] text-base leading-8 text-zinc-300">
                  Abra o painel e veja primeiro o que precisa da sua ação
                  imediata.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setMenuOpen((current) => !current)}
                className="inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-[#22c55e]/20 bg-[#22c55e]/10 text-[#8af3a8] xl:hidden"
              >
                <UserIcon className="h-5 w-5" />
              </button>
            </div>
            <nav
              className={`mt-6 space-y-2 ${menuOpen ? "block" : "hidden xl:block"}`}
            >
              {menu.map(([key, label, icon]) => {
                const activeMenu = section === key;
                return (
                  <button
                    type="button"
                    key={key}
                    onClick={() => {
                      setSection(key as SectionKey);
                      setMenuOpen(false);
                    }}
                    className={cx(
                      "flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm transition",
                      activeMenu
                        ? "bg-white text-[#11131b]"
                        : "bg-white/[0.03] text-zinc-200 hover:bg-white/[0.07]",
                    )}
                  >
                    <span
                      className={cx(
                        "inline-flex h-10 w-10 items-center justify-center rounded-2xl",
                        activeMenu
                          ? "bg-black/10 text-[#11131b]"
                          : "bg-white/[0.04] text-zinc-300",
                      )}
                    >
                      {icon}
                    </span>
                    <span className="font-medium">{label}</span>
                  </button>
                );
              })}
            </nav>
            <div className="mt-6 rounded-[24px] border border-white/10 bg-black/20 p-4">
              <p className="text-[11px] uppercase tracking-[0.32em] text-zinc-500">
                Disponibilidade
              </p>
              <p className="mt-3 text-sm leading-6 text-zinc-300">
                Se você estiver online, pode receber Bags novas. Se estiver
                offline, some da fila de aceite.
              </p>
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setRiderAvailability(
                      rider.id,
                      availability === "online" ? "offline" : "online",
                    )
                  }
                  className={cx(
                    "rounded-xl px-3 py-2 text-xs font-medium transition",
                    availability === "online"
                      ? "border border-[#22c55e]/30 bg-[#22c55e]/10 text-[#8af3a8]"
                      : "border border-white/10 bg-white/[0.04] text-white",
                  )}
                >
                  {availability === "online" ? "Ficar offline" : "Ficar online"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    clearAppSession();
                    window.location.href = "/login";
                  }}
                  className="cm-danger rounded-xl border px-3 py-2 text-xs font-bold"
                >
                  Sair
                </button>
              </div>
            </div>
          </aside>
          <section className="space-y-5">
            <div className="hidden sm:block">
              <HelpHint title="Dúvida rápida">{help[section]}</HelpHint>
            </div>
            {renderSection()}
          </section>
          <div className="xl:col-span-2">
            <AppFooter compact />
          </div>
        </div>
        <nav className="cm-bottom-nav grid grid-cols-4 gap-1 px-1.5 py-2 xl:hidden">
          {mobileMenu.map(([key, label, icon]) => (
            <button
              key={key}
              type="button"
              onClick={() => setSection(key as SectionKey)}
              aria-current={section === key ? "page" : undefined}
              className={cx(
                "flex min-w-0 flex-col items-center gap-1 rounded-2xl px-1 py-2 text-[10px] transition",
                section === key ? "cm-nav-active" : "",
                key === "solicitacoes" && available.length > 0
                  ? "cm-nav-alert"
                  : "",
              )}
            >
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03]">
                {icon}
              </span>
              <span className="truncate">
                {label
                  .replace("Entregas em andamento", "Rota")
                  .replace("Solicitações", "Bags")}
              </span>
            </button>
          ))}
        </nav>
      </div>
    </main>
  );
}
