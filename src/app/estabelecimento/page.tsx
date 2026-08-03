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
import {
  BikeIcon,
  ClockIcon,
  FileIcon,
  MoneyIcon,
  SearchIcon,
  StoreIcon,
  WarningIcon,
  LocationIcon,
} from "@/components/icons";
import { IconImage } from "@/components/icon-image";
import { establishments, platformConfig, riders } from "@/lib/mock-data";
import {
  CreditRequest,
  DeliveryItem,
  Mission,
  MissionStatus,
  cancelAvailableMissionByEstablishment,
  cancelMissionByEstablishment,
  confirmMissionByEstablishment,
  countsForNormalCredits,
  establishmentFinishMission,
  establishmentMarkInDelivery,
  inferDeliveryPricing,
  missionCountdownLabel,
  missionCountdownTone,
  missionDisplayCode,
  normalize,
  publishBagMission,
  publishQuickMission,
  rateMission,
  rejectMissionByEstablishment,
  requestCredits,
  requeueMissionFromHistory,
  requeueAvailableMission,
  requestMissionCreditReview,
  archiveExpiredAvailableMission,
  updateRegisteredEstablishmentRouteSettings,
  useRuntimeStore,
} from "@/lib/runtime-store";
import { clearAppSession, useAppSession } from "@/lib/auth";

const establishmentFallback = establishments[0];

type SectionKey =
  | "visao-geral"
  | "nova-solicitacao"
  | "creditos"
  | "em-andamento"
  | "nao-finalizadas"
  | "historico"
  | "perfil";

type EstProfileFocus = "dados" | "responsavel" | "endereco" | "entregas" | "logo";
type PaymentMethod = DeliveryItem["pagamentoCliente"];
type Draft = {
  clienteNome: string;
  clienteTelefone: string;
  descricaoPedido: string;
  numeroComanda: string;
  cep: string;
  rua: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
  referencia: string;
  observacao: string;
  pagamentoCliente: PaymentMethod;
  latitude?: number;
  longitude?: number;
};

type AddressSuggestion = {
  rua: string;
  bairro: string;
  cep: string;
  cidade: string;
  uf: string;
  display: string;
  lat?: string;
  lon?: string;
};

type QuickDispatchDraft = {
  normais: string;
  distantes: string;
  bairros: string;
};
type BagMode = "detalhada" | "express" | null;

const initialDraft: Draft = {
  clienteNome: "",
  clienteTelefone: "",
  descricaoPedido: "",
  numeroComanda: "",
  cep: "",
  rua: "",
  numero: "",
  complemento: "",
  bairro: "",
  cidade: "Taquaritinga",
  uf: "SP",
  referencia: "",
  observacao: "",
  pagamentoCliente: "PIX do cliente",
  latitude: undefined,
  longitude: undefined,
};

const menu = [
  [
    "visao-geral",
    "Visão geral",
    <IconImage
      key="visao"
      name="estabelecimento-colorido"
      alt=""
      className="h-6 w-6"
    />,
  ],
  [
    "nova-solicitacao",
    "Nova solicitação",
    <IconImage
      key="nova"
      name="entregador-na-moto-preto-cinza"
      alt=""
      className="h-6 w-6"
    />,
  ],
  [
    "creditos",
    "Créditos",
    <IconImage key="creditos" name="creditos" alt="" className="h-6 w-6" />,
  ],
  [
    "em-andamento",
    "Bags em andamento",
    <IconImage
      key="andamento"
      name="entrega-em-andamento"
      alt=""
      className="h-6 w-6"
    />,
  ],
  [
    "nao-finalizadas",
    "Não finalizadas",
    <IconImage
      key="naofinalizadas"
      name="entrega-nao-finalizada"
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

const help: Record<SectionKey, string> = {
  "visao-geral":
    "Veja saldo, Bags abertas e o que ainda depende da sua confirmação.",
  "nova-solicitacao":
    "Escolha Bag detalhada para preencher entrega por entrega ou Bag express para despacho rápido. Depois de enviada, a Bag não pode mais ser editada.",
  creditos:
    "Crédito aprovado antes do pico evita atraso na hora de liberar Bags.",
  "em-andamento":
    "Depois de enviada, a Bag vira registro fechado. Você só acompanha, confirma, finaliza ou aponta divergência.",
  "nao-finalizadas":
    "Veja Bags contestadas ou não confirmadas e use este espaço para contestar ou reenviar a operação.",
  historico:
    "Aqui ficam finalizações, divergências e o que já gerou registro de fechamento na operação.",
  perfil:
    "Atualize dados, responsável, endereço base e logo do estabelecimento em uma tela própria.",
};

const cx = (...a: (string | false | undefined | null)[]) =>
  a.filter(Boolean).join(" ");
const formatCep = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
};
const formatMoneyInput = (v: string) => {
  const digits = v.replace(/\D/g, "");
  if (!digits) return "";
  const value = (Number(digits) / 100).toFixed(2);
  return value.replace(".", ",");
};

const expandStreetQuery = (value: string) => {
  return value
    .replace(/\bjd\b/gi, "jardim")
    .replace(/\bav\b/gi, "avenida")
    .replace(/\br\b/gi, "rua")
    .replace(/\bst\.?\b/gi, "santo")
    .replace(/\bs\.?\b/gi, "sao")
    .trim();
};

const tokensFromQuery = (value: string) =>
  normalize(expandStreetQuery(value))
    .split(/\s+/)
    .map((item) => item.trim())
    .filter((item) => item.length >= 2);

const formatPhone = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
};
const wa = (text: string, phone = platformConfig.telefoneAdminWhatsApp) =>
  `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;

function copyToClipboard(value: string) {
  if (typeof navigator !== "undefined" && navigator.clipboard && value) {
    void navigator.clipboard.writeText(value);
  }
}

function toNumber(value: string | number | undefined | null, fallback = 0) {
  if (typeof value === "number") return Number.isFinite(value) ? value : fallback;
  const parsed = Number(String(value ?? "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function distanceKmBetween(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const toRad = (n: number) => (n * Math.PI) / 180;
  const earth = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return earth * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

async function geocodeAddressText(query: string) {
  if (!query.trim()) return null;
  const params = new URLSearchParams({
    q: `${query}, Brasil`,
    format: "jsonv2",
    limit: "1",
    countrycodes: "br",
    addressdetails: "1",
    "accept-language": "pt-BR",
  });
  const res = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`);
  if (!res.ok) return null;
  const data = await res.json();
  const first = Array.isArray(data) ? data[0] : null;
  const lat = Number(first?.lat);
  const lon = Number(first?.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  return { lat, lon };
}

const soundPath = {
  buzina: "/sounds/buzina_moto.mp3",
  coin: "/sounds/coin.mp3",
  partida: "/sounds/partida_moto.mp3",
  erro: "/sounds/erro.mp3",
} as const;

function playAlertTone(kind: "buzina" | "coin" | "partida" | "erro") {
  if (typeof window === "undefined") return;
  const audio = new Audio(soundPath[kind]);
  audio.volume = kind === "buzina" ? 0.65 : 0.42;
  void audio.play().catch(() => undefined);
}

function SafeAvatar({ value, fallback }: { value?: string; fallback: string }) {
  const text = String(value || "").trim();
  const looksLikeImage =
    text.startsWith("data:image") || text.startsWith("http");
  if (looksLikeImage)
    return (
      <img
        src={text}
        alt="Perfil"
        className="h-10 w-10 rounded-xl object-cover"
      />
    );
  const label = text && text.length <= 4 ? text : fallback;
  return <span>{label}</span>;
}

const toneFor = (s: MissionStatus) =>
  s === "disponivel"
    ? "blue"
    : s === "aguardando_confirmacao_estabelecimento" ||
        s === "aguardando_retirada" ||
        s === "motoboy_marcou_finalizada"
      ? "orange"
      : s === "divergencia_estabelecimento"
        ? "red"
        : s === "finalizada_estabelecimento"
          ? "green"
          : "blue";

const labelFor = (s: MissionStatus) =>
  s === "disponivel"
    ? "Enviada para a fila"
    : s === "aguardando_confirmacao_estabelecimento"
      ? "Aceita pelo entregador"
      : s === "aguardando_retirada"
        ? "Aguardando retirada"
        : s === "em_entrega"
          ? "Em entrega"
          : s === "motoboy_marcou_finalizada"
            ? "Entregador pediu finalização"
            : s === "divergencia_estabelecimento"
              ? "Divergência registrada"
              : "Finalizada";

function Input({
  label,
  value,
  onChange,
  required,
  error,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  error?: string;
  placeholder?: string;
}) {
  return (
    <label className="flex flex-col rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-sm text-zinc-300">
      <span className="mb-2 inline-flex items-center gap-1">
        {label}
        {required ? <span className="text-[#f59e0b]">*</span> : null}
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cx(
          "w-full rounded-xl border px-3 py-2 text-white outline-none transition",
          error
            ? "border-rose-500/40 bg-rose-500/5"
            : "border-white/10 bg-black/20 hover:border-white/20",
        )}
      />
      {error ? <p className="mt-2 text-xs text-rose-200">{error}</p> : null}
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <label className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-sm text-zinc-200">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 w-full rounded-xl border border-white/10 bg-[#111827] px-3 py-2 text-white outline-none hover:border-white/20"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}

function deliveryDestinationText(item: DeliveryItem) {
  const main = [item.rua.trim(), item.numero.trim()].filter(Boolean).join(", ");
  if (item.bairro.trim() && main) return `${item.bairro} • ${main}`;
  if (item.bairro.trim()) return item.bairro;
  if (main) return main;
  return item.referencia?.trim() || "Destino não informado";
}

function missionDestinationsSummary(mission: Mission) {
  const deliveries = Array.isArray(mission.deliveries)
    ? mission.deliveries
    : [];
  if (mission.mode === "express") {
    return Array.from(
      new Set(
        deliveries
          .map((item) => item.bairro?.trim())
          .filter(Boolean) as string[],
      ),
    );
  }
  return Array.from(new Set(deliveries.map(deliveryDestinationText)));
}

function MissionCard({
  mission,
  compact = false,
}: {
  mission: Mission;
  compact?: boolean;
}) {
  const uniqueDestinations = missionDestinationsSummary(mission);
  const attentionClass =
    mission.status === "disponivel"
      ? "pulse-card-blue"
      : mission.status === "aguardando_confirmacao_estabelecimento"
        ? "pulse-card-amber"
        : mission.status === "aguardando_retirada"
          ? "pulse-card-amber"
          : mission.status === "em_entrega"
            ? "pulse-card-orange"
            : mission.status === "motoboy_marcou_finalizada"
              ? "pulse-card-green"
              : "";

  return (
    <article
      className={cx(
        "rounded-[24px] border border-white/10 bg-black/20 p-4 transition",
        compact && "border-white/5",
        attentionClass,
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-lg font-semibold text-white">
          {missionDisplayCode(mission.id)}
        </h3>
        <StatusBadge tone={toneFor(mission.status)}>
          {labelFor(mission.status)}
        </StatusBadge>
        {(mission.status === "aguardando_confirmacao_estabelecimento" ||
          mission.status === "em_entrega") && (
          <span className="inline-flex h-2.5 w-2.5 pulse-dot rounded-full bg-[#f59e0b]" />
        )}
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <DetailCell
          label="Entregador"
          value={mission.riderName || "Aguardando aceite"}
        />
        <DetailCell
          label="Quantidade"
          value={`${(mission.deliveries ?? []).length} entregas`}
        />
        <DetailCell label="Destinos" value={uniqueDestinations.join(" • ")} />
        <DetailCell
          label="Valor"
          value={`R$ ${mission.total.toFixed(2).replace(".", ",")}`}
        />
      </div>
      {!compact && (
        <div className="mt-3 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <DetailCell
              label="Criada em"
              value={new Date(mission.createdAt).toLocaleString("pt-BR")}
            />
            <DetailCell
              label="Aceite"
              value={
                mission.acceptedAt
                  ? new Date(mission.acceptedAt).toLocaleString("pt-BR")
                  : "Sem aceite"
              }
            />
            <DetailCell
              label="Saída"
              value={
                mission.startedAt
                  ? new Date(mission.startedAt).toLocaleString("pt-BR")
                  : "Aguardando retirada"
              }
            />
            <DetailCell
              label="Finalização"
              value={
                mission.establishmentFinishedAt
                  ? new Date(mission.establishmentFinishedAt).toLocaleString(
                      "pt-BR",
                    )
                  : "Ainda aberta"
              }
            />
          </div>
          {missionCountdownLabel(mission) ? (
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge tone={missionCountdownTone(mission)}>
                {mission.status === "aguardando_retirada"
                  ? "Tempo para retirada"
                  : "Tempo em rota"}
              </StatusBadge>
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-zinc-200">
                {missionCountdownLabel(mission)}
              </span>
            </div>
          ) : null}
        </div>
      )}
      {mission.finishReason ? (
        <p className="mt-3 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-100">
          {mission.finishReason}
        </p>
      ) : null}
    </article>
  );
}

export default function EstablishmentPage() {
  const session = useAppSession();
  const store = useRuntimeStore();
  const linkedEstablishment =
    session?.role === "estabelecimento" && session.entityId
      ? store.registeredEstablishments.find(
          (item) => item.id === session.entityId,
        )
      : undefined;
  const sessionEstablishment = linkedEstablishment;
  const establishment = sessionEstablishment ?? {
    id: "conta-sem-vinculo",
    nome: "Estabelecimento em conferência",
    documento: "",
    whatsapp: "",
    cidade: session?.cityName || "Taquaritinga/SP",
    status: "pendente" as const,
  };
  const riderWhats = (id?: string) =>
    store.registeredRiders.find((r) => r.id === id)?.whatsapp;
  const riderById = (id?: string) =>
    store.registeredRiders.find((r) => r.id === id) ??
    riders.find((r) => r.id === id);
  const [section, setSection] = useState<SectionKey>("nova-solicitacao");
  const [menuOpen, setMenuOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(initialDraft);
  const [bag, setBag] = useState<DeliveryItem[]>([]);
  const [bagClosed, setBagClosed] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [cepFeedback, setCepFeedback] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [creditInput, setCreditInput] = useState("80,00");
  const [creditAttachment, setCreditAttachment] = useState("");
  const [finishReason, setFinishReason] = useState("");
  const [finishMissionId, setFinishMissionId] = useState<string | null>(null);
  const [finishCategory, setFinishCategory] = useState<
    "entregador" | "cliente" | "estabelecimento_outros"
  >("estabelecimento_outros");
  const [ratingMissionId, setRatingMissionId] = useState<string | null>(null);
  const [ratingScore, setRatingScore] = useState(5);
  const [ratingComment, setRatingComment] = useState("");
  const [ratingTags, setRatingTags] = useState<string[]>([]);
  const [ruaFocused, setRuaFocused] = useState(false);
  const [nowTick, setNowTick] = useState(() => Date.now());
  const [quickDispatch, setQuickDispatch] = useState<QuickDispatchDraft>({
    normais: "",
    distantes: "",
    bairros: "",
  });
  const [baseAddress, setBaseAddress] = useState(
    establishment.endereco || "Rua do estabelecimento, Centro, Taquaritinga/SP",
  );
  const [distanceRadiusKm, setDistanceRadiusKm] = useState(String(establishment.raioNormalKm || 3));
  const [baseLatitude, setBaseLatitude] = useState<number | undefined>(establishment.baseLatitude);
  const [baseLongitude, setBaseLongitude] = useState<number | undefined>(establishment.baseLongitude);
  const [bagMode, setBagMode] = useState<BagMode>(null);
  const [streetSuggestions, setStreetSuggestions] = useState<
    AddressSuggestion[]
  >([]);
  const [searchingAddress, setSearchingAddress] = useState(false);
  const prevAwaiting = useRef(0);
  const prevFinishRequest = useRef(0);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const finishBoxRef = useRef<HTMLElement | null>(null);
  const establishmentLogoRef = useRef<HTMLInputElement | null>(null);
  const profileStorageKey = session?.userId || establishment.id;
  const [profileFocus, setProfileFocus] = useState<EstProfileFocus>("dados");
  const [profileDraft, setProfileDraft] = useState({
    nome: establishment.nome || "",
    documento: establishment.documento || "",
    whatsapp: establishment.whatsapp || "",
    email: establishment.email || "",
    responsavel: establishment.responsavel || "",
    endereco: establishment.endereco || "",
    cidade: establishment.cidade || "",
  });
  const [profilePhotoPreview, setProfilePhotoPreview] = useState(
    establishment.profilePhotoDataUrl || "",
  );
  const [profilePhotoName, setProfilePhotoName] = useState(
    establishment.profilePhotoName || "",
  );

  const available = store.availableMissions.filter(
    (m) => m.estabelecimentoId === establishment.id,
  );
  const active = store.activeMissions.filter(
    (m) => m.estabelecimentoId === establishment.id,
  );
  const history = store.missionHistory.filter(
    (m) => m.estabelecimentoId === establishment.id,
  );

  const expiredAvailable = available.filter(
    (m) =>
      m.status === "disponivel" &&
      nowTick - new Date(m.createdAt).getTime() >= 10 * 60_000,
  );
  const sent = available.filter(
    (m) =>
      m.status === "disponivel" &&
      nowTick - new Date(m.createdAt).getTime() < 10 * 60_000,
  );
  const awaiting = active.filter(
    (m) => m.status === "aguardando_confirmacao_estabelecimento",
  );
  const pickup = active.filter((m) => m.status === "aguardando_retirada");
  const route = active.filter((m) => m.status === "em_entrega");
  const riderDone = active.filter(
    (m) => m.status === "motoboy_marcou_finalizada",
  );
  const finalized = history.filter(
    (m) => m.status === "finalizada_estabelecimento",
  );
  const divergences = history.filter(
    (m) => m.status === "divergencia_estabelecimento",
  );
  const pendingCredits = store.pendingCreditRequests.filter(
    (c) => c.status === "pendente",
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const prefix = `chegoumotoca:est-profile:${profileStorageKey}`;
    setProfileDraft({
      nome: localStorage.getItem(`${prefix}:nome`) || establishment.nome || "",
      documento:
        localStorage.getItem(`${prefix}:documento`) ||
        establishment.documento ||
        "",
      whatsapp:
        localStorage.getItem(`${prefix}:whatsapp`) ||
        establishment.whatsapp ||
        "",
      email:
        localStorage.getItem(`${prefix}:email`) || establishment.email || "",
      responsavel:
        localStorage.getItem(`${prefix}:responsavel`) ||
        establishment.responsavel ||
        "",
      endereco:
        localStorage.getItem(`${prefix}:endereco`) ||
        establishment.endereco ||
        "",
      cidade:
        localStorage.getItem(`${prefix}:cidade`) || establishment.cidade || "",
    });
    setProfilePhotoPreview(
      localStorage.getItem(`chegoumotoca:profile-image:${profileStorageKey}`) ||
        localStorage.getItem(`${prefix}:foto`) ||
        establishment.profilePhotoDataUrl ||
        "",
    );
    setProfilePhotoName(
      localStorage.getItem(
        `chegoumotoca:profile-image-name:${profileStorageKey}`,
      ) ||
        localStorage.getItem(`${prefix}:fotoNome`) ||
        establishment.profilePhotoName ||
        "",
    );
    setBaseAddress(localStorage.getItem(`${prefix}:baseAddress`) || establishment.endereco || "");
    setDistanceRadiusKm(localStorage.getItem(`${prefix}:raioNormalKm`) || String(establishment.raioNormalKm || 3));
    const storedLat = Number(localStorage.getItem(`${prefix}:baseLatitude`) || establishment.baseLatitude || "");
    const storedLon = Number(localStorage.getItem(`${prefix}:baseLongitude`) || establishment.baseLongitude || "");
    setBaseLatitude(Number.isFinite(storedLat) ? storedLat : undefined);
    setBaseLongitude(Number.isFinite(storedLon) ? storedLon : undefined);
  }, [
    establishment.cidade,
    establishment.documento,
    establishment.email,
    establishment.endereco,
    establishment.nome,
    establishment.profilePhotoDataUrl,
    establishment.profilePhotoName,
    establishment.raioNormalKm,
    establishment.baseLatitude,
    establishment.baseLongitude,
    establishment.responsavel,
    establishment.whatsapp,
    profileStorageKey,
  ]);

  function setProfileField(field: keyof typeof profileDraft, value: string) {
    setProfileDraft((current) => ({ ...current, [field]: value }));
  }

  function saveProfileDraft() {
    if (typeof window !== "undefined") {
      const prefix = `chegoumotoca:est-profile:${profileStorageKey}`;
      for (const [key, value] of Object.entries(profileDraft)) {
        localStorage.setItem(`${prefix}:${key}`, String(value || ""));
      }
      localStorage.setItem(`${prefix}:baseAddress`, baseAddress || profileDraft.endereco || "");
      localStorage.setItem(`${prefix}:raioNormalKm`, distanceRadiusKm || "3");
      if (baseLatitude !== undefined) localStorage.setItem(`${prefix}:baseLatitude`, String(baseLatitude));
      if (baseLongitude !== undefined) localStorage.setItem(`${prefix}:baseLongitude`, String(baseLongitude));
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
    }
    setNotice(
      "Solicitação de atualização salva. Alterações sensíveis podem ser conferidas pelo administrador.",
    );
    setSection("visao-geral");
    window.setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 0);
  }

  function readProfileImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setProfilePhotoPreview(String(reader.result || ""));
      setProfilePhotoName(file.name);
    };
    reader.readAsDataURL(file);
  }

  async function saveRouteSettingsFromAddress() {
    if (typeof window !== "undefined") {
      const prefix = `chegoumotoca:est-profile:${profileStorageKey}`;
      localStorage.setItem(`${prefix}:baseAddress`, baseAddress || profileDraft.endereco || "");
      localStorage.setItem(`${prefix}:raioNormalKm`, distanceRadiusKm || "3");
    }
    const base = await geocodeAddressText(baseAddress || profileDraft.endereco || "").catch(() => null);
    updateRegisteredEstablishmentRouteSettings(establishment.id, {
      endereco: baseAddress || profileDraft.endereco || establishment.endereco || "",
      raioNormalKm: toNumber(distanceRadiusKm, 3),
      baseLatitude: base?.lat,
      baseLongitude: base?.lon,
    });
    if (base) {
      setBaseLatitude(base.lat);
      setBaseLongitude(base.lon);
      if (typeof window !== "undefined") {
        const prefix = `chegoumotoca:est-profile:${profileStorageKey}`;
        localStorage.setItem(`${prefix}:baseLatitude`, String(base.lat));
        localStorage.setItem(`${prefix}:baseLongitude`, String(base.lon));
      }
      setNotice("Raio salvo. A partir de agora, entregas com endereço reconhecido podem ser classificadas por distância.");
    } else {
      setNotice("Raio salvo. Não consegui localizar o endereço base agora, então a classificação por distância será feita quando a localização for definida.");
    }
  }

  function useCurrentLocationForBase() {
    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      setNotice("Este aparelho não liberou localização para o navegador.");
      return;
    }
    setNotice("Quando o aparelho perguntar, permita a localização para usar este ponto como base do estabelecimento.");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        setBaseLatitude(lat);
        setBaseLongitude(lon);
        if (typeof window !== "undefined") {
          const prefix = `chegoumotoca:est-profile:${profileStorageKey}`;
          localStorage.setItem(`${prefix}:baseLatitude`, String(lat));
          localStorage.setItem(`${prefix}:baseLongitude`, String(lon));
          localStorage.setItem(`${prefix}:raioNormalKm`, distanceRadiusKm || "3");
          localStorage.setItem("chegoumotoca:location-permission-ok", "1");
        }
        updateRegisteredEstablishmentRouteSettings(establishment.id, {
          endereco: baseAddress || profileDraft.endereco || establishment.endereco || "",
          raioNormalKm: toNumber(distanceRadiusKm, 3),
          baseLatitude: lat,
          baseLongitude: lon,
        });
        setNotice("Localização base salva. Confira o endereço e o raio antes de abrir as próximas Bags.");
      },
      () => setNotice("Localização não liberada. Você pode informar o endereço base manualmente."),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
    );
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
    if (action === "responsavel") setProfileFocus("responsavel");
    else if (action === "endereco") setProfileFocus("endereco");
    else if (action === "entregas") setProfileFocus("entregas");
    else if (action === "foto" || action === "documentos")
      setProfileFocus("logo");
    else setProfileFocus("dados");
    setSection("perfil");
    setMenuOpen(false);
    window.setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 0);
  }

  useEffect(() => {
    const query = draft.rua.trim();
    const tokens = tokensFromQuery(query);
    if (!ruaFocused || tokens.length === 0 || query.length < 3) {
      setStreetSuggestions([]);
      setSearchingAddress(false);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        setSearchingAddress(true);
        const params = new URLSearchParams({
          q: `${expandStreetQuery(query)}, Taquaritinga, São Paulo, Brasil`,
          format: "jsonv2",
          addressdetails: "1",
          limit: "8",
          countrycodes: "br",
          dedupe: "1",
          "accept-language": "pt-BR",
        });
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?${params.toString()}`,
          {
            signal: controller.signal,
            headers: { "Accept-Language": "pt-BR" },
          },
        );
        const data = (await res.json()) as Array<Record<string, unknown>>;
        const parsed = data
          .map((item) => {
            const address = (item.address || {}) as Record<string, string>;
            const city =
              address.city || address.town || address.village || "Taquaritinga";
            if (!normalize(city).includes("taquaritinga")) return null;
            const road =
              address.road ||
              address.pedestrian ||
              address.footway ||
              address.cycleway ||
              String(item.name || "");
            if (!road) return null;
            const suburb =
              address.suburb ||
              address.neighbourhood ||
              address.city_district ||
              address.quarter ||
              "";
            const postcode = address.postcode || "";
            const haystack = normalize(`${road} ${suburb} ${postcode}`);
            if (!tokens.every((token) => haystack.includes(token))) return null;
            return {
              rua: road,
              bairro: suburb,
              cep: postcode,
              cidade: city,
              uf: "SP",
              display: `${road}${suburb ? ` • ${suburb}` : ""}${postcode ? ` • ${postcode}` : ""}`,
              lat: String(item.lat || ""),
              lon: String(item.lon || ""),
            };
          })
          .filter(Boolean)
          .slice(0, 6) as AddressSuggestion[];
        setStreetSuggestions(parsed);
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setStreetSuggestions([]);
        }
      } finally {
        setSearchingAddress(false);
      }
    }, 320);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [draft.rua, ruaFocused]);

  useEffect(() => {
    if (awaiting.length > prevAwaiting.current) {
      playAlertTone("buzina");
      setSection("em-andamento");
      setNotice(
        "Um entregador aceitou uma Bag e está aguardando sua confirmação.",
      );
    }
    prevAwaiting.current = awaiting.length;
  }, [awaiting.length]);

  useEffect(() => {
    if (riderDone.length > prevFinishRequest.current) {
      playAlertTone("buzina");
      setSection("em-andamento");
      setNotice(
        "Um entregador pediu finalização. Confirme ou registre divergência.",
      );
    }
    prevFinishRequest.current = riderDone.length;
  }, [riderDone.length]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const shouldPlayAccept = awaiting.length > 0;
    const shouldPlayFinish = riderDone.length > 0;
    if (!shouldPlayAccept && !shouldPlayFinish) return;
    const timer = window.setInterval(() => {
      if (document.hidden) return;
      playAlertTone("buzina");
    }, 2000);
    return () => window.clearInterval(timer);
  }, [awaiting.length, riderDone.length]);

  useEffect(() => {
    const timer = window.setInterval(() => setNowTick(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const bagTotal = bag.reduce((s, i) => s + i.valor, 0);
  const creditsEnough = store.creditApproved >= bagTotal && bagTotal > 0;
  const normalEstimate = countsForNormalCredits(
    store.creditApproved,
    store.settings.valorNormal,
  );
  const quickNormais = Number(quickDispatch.normais || "0");
  const quickDistantes = Number(quickDispatch.distantes || "0");
  const quickTotal =
    quickNormais * store.settings.valorNormal +
    quickDistantes * store.settings.valorDistante;

  // Hooks precisam ficar antes de qualquer return condicional.
  // Na v36 o painel de estabelecimento retornava uma tela de acesso antes deste useMemo
  // quando a sessão ainda estava carregando; ao reconhecer o login, o React via mais hooks
  // no render seguinte e quebrava com Minified React error #310.
  const errors = useMemo(() => {
    const e: Partial<Record<keyof Draft, string>> = {};
    if (!draft.clienteNome.trim()) e.clienteNome = "Informe o nome do cliente.";
    if (!draft.descricaoPedido.trim()) e.descricaoPedido = "Descreva o pedido.";
    if (!draft.rua.trim()) e.rua = "Informe a rua.";
    if (!draft.numero.trim()) e.numero = "Informe o número.";
    if (!draft.bairro.trim()) e.bairro = "Informe o bairro.";
    return e;
  }, [draft]);

  const missingFields = Object.values(errors);

  if (!session || session.role !== "estabelecimento") {
    return (
      <main className="cm-page min-h-screen pb-10 text-white">
        <div className="mx-auto flex min-h-screen max-w-3xl flex-col gap-5 px-4 py-5">
          <BrandHeader publicView />
          <section className="cm-card rounded-[32px] p-6 md:p-8">
            <p className="text-xs uppercase tracking-[0.34em] text-[#f59e0b]">
              Acesso do estabelecimento
            </p>
            <h1 className="mt-4 text-3xl font-black text-white">
              Entre com uma conta aprovada para abrir Bags.
            </h1>
            <p className="mt-3 text-sm leading-7 text-zinc-300">
              Use o login de estabelecimento liberado pelo admin. O acesso de
              teste é feito pela tela de login, não por entrada automática.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/login"
                className="cm-primary rounded-2xl px-5 py-3 text-sm font-black"
              >
                Ir para login
              </Link>
              <Link
                href="/cadastro?tipo=estabelecimento"
                className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-bold text-zinc-200"
              >
                Cadastrar estabelecimento
              </Link>
            </div>
          </section>
        </div>
      </main>
    );
  }

  if (session?.role === "estabelecimento" && !sessionEstablishment) {
    const hasSomeEstablishment = store.registeredEstablishments.length > 0;
    return (
      <main className="cm-page min-h-screen pb-10 text-white">
        <div className="mx-auto flex min-h-screen max-w-3xl flex-col gap-5 px-4 py-5">
          <BrandHeader publicView />
          <section className="cm-card rounded-[32px] p-6 md:p-8">
            <p className="text-xs uppercase tracking-[0.34em] text-[#f59e0b]">
              Conta em conferência
            </p>
            <h1 className="mt-4 text-3xl font-black text-white">
              Seu acesso entrou, mas o estabelecimento ainda não está liberado
              neste painel.
            </h1>
            <p className="mt-3 text-sm leading-7 text-zinc-300">
              {hasSomeEstablishment
                ? "Encontramos estabelecimentos cadastrados, mas nenhum está vinculado a este usuário. Peça para o administrador conferir o vínculo do acesso."
                : "A conta foi reconhecida, mas os dados do estabelecimento ainda não carregaram. Recarregue a página; se continuar, fale com a equipe."}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="cm-primary rounded-2xl px-5 py-3 text-sm font-black"
              >
                Tentar novamente
              </button>
              <button
                type="button"
                onClick={() => {
                  clearAppSession();
                  window.location.href = "/login";
                }}
                className="cm-danger rounded-2xl border px-5 py-3 text-sm font-bold"
              >
                Sair e entrar de novo
              </button>
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

  function minutesLeftSince(iso: string, minutes: number) {
    const end = new Date(iso).getTime() + minutes * 60000;
    const diff = end - nowTick;
    if (diff <= 0) return null;
    const min = Math.floor(diff / 60000);
    const sec = Math.floor((diff % 60000) / 1000);
    return `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  }

  function reopenMissionToEdit(mission: Mission) {
    if (!minutesLeftSince(mission.createdAt, 1)) {
      setNotice(
        `O prazo de edição rápida da ${missionDisplayCode(mission.id)} já expirou.`,
      );
      return;
    }
    cancelAvailableMissionByEstablishment(mission.id);
    if (mission.mode === "express") {
      setBagMode("express");
      const normais = (mission.deliveries ?? []).filter(
        (item) => item.tipo === "normal",
      ).length;
      const distantes = (mission.deliveries ?? []).filter(
        (item) => item.tipo === "distante",
      ).length;
      setQuickDispatch({
        normais: String(normais),
        distantes: String(distantes),
        bairros: (mission.deliveries ?? [])
          .map((item) => item.bairro)
          .filter(Boolean)
          .join(", "),
      });
      setNotice(
        `A ${missionDisplayCode(mission.id)} voltou para edição no modo Bag express.`,
      );
    } else {
      setBagMode("detalhada");
      setBag(mission.deliveries ?? []);
      setBagClosed(true);
      setNotice(
        `A ${missionDisplayCode(mission.id)} voltou para edição no modo Bag detalhada.`,
      );
    }
    setSection("nova-solicitacao");
  }

  async function lookupCep() {
    const digits = draft.cep.replace(/\D/g, "");
    if (digits.length !== 8) {
      setCepFeedback(
        "Se você não souber o CEP, continue manualmente. Mas, se tiver os 8 números, a busca fica mais rápida.",
      );
      return;
    }

    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = await res.json();
      if (data.erro) {
        setCepFeedback(
          "CEP não encontrado. Continue com o preenchimento manual.",
        );
        return;
      }
      setDraft((cur) => ({
        ...cur,
        cep: formatCep(digits),
        rua: data.logradouro || cur.rua,
        bairro: data.bairro || cur.bairro,
        cidade: data.localidade || cur.cidade,
        uf: data.uf || cur.uf,
        complemento: data.complemento || cur.complemento,
      }));
      setCepFeedback(
        "Endereço encontrado. Agora confira número, referência e observação antes de salvar.",
      );
    } catch {
      setCepFeedback(
        "Não foi possível consultar o CEP agora. Continue com o preenchimento manual.",
      );
    }
  }

  function applySuggestion(item: AddressSuggestion) {
    setDraft((cur) => ({
      ...cur,
      rua: item.rua,
      bairro: item.bairro || cur.bairro,
      cep: item.cep ? formatCep(item.cep) : cur.cep,
      cidade: item.cidade || cur.cidade,
      uf: item.uf || cur.uf,
      latitude: item.lat ? Number(item.lat) : cur.latitude,
      longitude: item.lon ? Number(item.lon) : cur.longitude,
    }));
    setRuaFocused(false);
    setCepFeedback(`Sugestão aplicada para ${item.rua}, ${item.bairro}.`);
  }

  function resetDraft() {
    setDraft(initialDraft);
    setEditingId(null);
    setSubmitAttempted(false);
    setCepFeedback("");
    setRuaFocused(false);
  }

  async function pricingForDraft() {
    const radius = Math.max(0.5, toNumber(distanceRadiusKm, 3));
    let base = baseLatitude !== undefined && baseLongitude !== undefined ? { lat: baseLatitude, lon: baseLongitude } : null;
    if (!base) {
      const baseQuery = baseAddress || profileDraft.endereco || establishment.endereco || "";
      base = await geocodeAddressText(baseQuery).catch(() => null);
      if (base) {
        setBaseLatitude(base.lat);
        setBaseLongitude(base.lon);
      }
    }

    let destination = draft.latitude !== undefined && draft.longitude !== undefined ? { lat: draft.latitude, lon: draft.longitude } : null;
    if (!destination) {
      const query = [draft.rua, draft.numero, draft.bairro, draft.cidade, draft.uf].filter(Boolean).join(", ");
      destination = await geocodeAddressText(query).catch(() => null);
    }

    if (base && destination) {
      const distance = distanceKmBetween(base, destination);
      const isDistante = distance > radius;
      return {
        tipo: isDistante ? "distante" as const : "normal" as const,
        valor: isDistante ? store.settings.valorDistante : store.settings.valorNormal,
        latitude: destination.lat,
        longitude: destination.lon,
        distanciaKm: Number(distance.toFixed(2)),
        message: `Distância aproximada: ${distance.toFixed(1).replace(".", ",")} km. Raio normal configurado: ${radius.toFixed(1).replace(".", ",")} km.`,
      };
    }

    const fallback = inferDeliveryPricing(draft.bairro, store.settings);
    return { ...fallback, latitude: undefined, longitude: undefined, distanciaKm: undefined, message: "Não consegui calcular a distância exata agora. Usei a regra de bairro cadastrada como apoio." };
  }

  async function saveDelivery() {
    setSubmitAttempted(true);
    if (missingFields.length) {
      setNotice(
        "Faltam dados obrigatórios. Revise os campos destacados antes de adicionar a entrega à Bag.",
      );
      return;
    }

    const pricing = await pricingForDraft();
    const item: DeliveryItem = {
      id: editingId ?? `ent-${Date.now()}`,
      clienteNome: draft.clienteNome.trim(),
      clienteTelefone: draft.clienteTelefone.trim(),
      descricaoPedido: draft.descricaoPedido.trim(),
      numeroComanda: draft.numeroComanda.trim(),
      cep: formatCep(draft.cep),
      rua: draft.rua.trim(),
      numero: draft.numero.trim(),
      complemento: draft.complemento.trim(),
      bairro: draft.bairro.trim(),
      cidade: draft.cidade.trim(),
      uf: draft.uf.trim().toUpperCase(),
      referencia: draft.referencia.trim(),
      observacao: draft.observacao.trim(),
      pagamentoCliente: draft.pagamentoCliente,
      tipo: pricing.tipo,
      valor: pricing.valor,
      latitude: pricing.latitude,
      longitude: pricing.longitude,
      distanciaKm: pricing.distanciaKm,
    };

    setBag((cur) =>
      editingId
        ? cur.map((i) => (i.id === editingId ? item : i))
        : [...cur, item],
    );
    setBagClosed(false);
    setNotice(
      `${editingId ? "Entrega atualizada na Bag." : "Entrega adicionada à Bag."} ${pricing.message}`,
    );
    resetDraft();
  }

  function editDelivery(item: DeliveryItem) {
    setDraft({
      clienteNome: item.clienteNome,
      clienteTelefone: item.clienteTelefone || "",
      descricaoPedido: item.descricaoPedido,
      numeroComanda: item.numeroComanda,
      cep: item.cep,
      rua: item.rua,
      numero: item.numero,
      complemento: item.complemento || "",
      bairro: item.bairro,
      cidade: item.cidade,
      uf: item.uf,
      referencia: item.referencia || "",
      observacao: item.observacao || "",
      pagamentoCliente: item.pagamentoCliente,
      latitude: item.latitude,
      longitude: item.longitude,
    });
    setEditingId(item.id);
    setSubmitAttempted(false);
    setNotice(
      "Editando a entrega selecionada. Salve novamente para atualizar a Bag.",
    );
    setSection("nova-solicitacao");
  }

  function removeDelivery(id: string) {
    setBag((cur) => cur.filter((i) => i.id !== id));
    if (editingId === id) {
      resetDraft();
    }
    setBagClosed(false);
    setNotice("Entrega removida da Bag.");
  }

  function closeBag() {
    if (!bag.length) {
      setNotice("Adicione pelo menos uma entrega antes de fechar a Bag.");
      return;
    }
    setBagClosed(true);
    setNotice(
      "Bag fechada para revisão. Revise os cards e, se estiver tudo certo, solicite o entregador.",
    );
  }

  function publishCurrentBag() {
    if (!bagClosed) {
      setNotice("Feche a Bag antes de solicitar entregador.");
      return;
    }
    if (!creditsEnough) {
      setNotice(
        "Seu saldo atual não cobre esta Bag. Vá em Créditos para solicitar aprovação antes de continuar.",
      );
      if (typeof window !== "undefined") {
        window.setTimeout(() => setSection("creditos"), 250);
      }
      return;
    }

    publishBagMission(bag);
    setBag([]);
    setBagClosed(false);
    resetDraft();
    setSection("em-andamento");
    setNotice(
      "Bag enviada para a fila. Agora acompanhe aceite, confirmação e andamento sem atualizar a página.",
    );
  }

  function askCredit(
    channel: "whatsapp" | "comprovante" | "plataforma",
    openWhats: boolean,
  ) {
    const amount = Number(creditInput.replace(/\./g, "").replace(",", "."));
    if (!amount || amount < store.settings.valorNormal) {
      setNotice(
        `O valor mínimo para pedir créditos é R$ ${store.settings.valorNormal.toFixed(2).replace(".", ",")}.`,
      );
      return;
    }

    requestCredits(amount, {
      attachmentName: creditAttachment || undefined,
      channel,
    });
    playAlertTone(channel === "whatsapp" ? "buzina" : "coin");
    setNotice(
      "Solicitação registrada. Nossa equipe vai conferir o pagamento e liberar os créditos em breve.",
    );

    if (openWhats && typeof window !== "undefined") {
      window.open(
        wa(
          `${establishment.nome} solicitou R$ ${amount.toFixed(2).replace(".", ",")} em créditos. Documento ${establishment.documento}. ${creditAttachment ? `Comprovante: ${creditAttachment}. ` : ""}Favor conferir o PIX e liberar o saldo.`,
          store.settings.supportWhatsapp ||
            platformConfig.telefoneAdminWhatsApp,
        ),
        "_blank",
        "noopener,noreferrer",
      );
    }
  }

  function sendQuickDispatch() {
    if (quickNormais + quickDistantes <= 0) {
      setNotice(
        "Escolha ao menos uma entrega normal ou distante no disparo rápido.",
      );
      return;
    }
    const bairros = quickDispatch.bairros
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    if (bairros.length === 0) {
      setNotice(
        "Informe pelo menos um bairro ou referência antes de enviar a Bag Express.",
      );
      return;
    }
    if (bairros.length < quickNormais + quickDistantes) {
      setNotice(
        `Informe ${quickNormais + quickDistantes} bairro(s) ou referência(s), separados por vírgula, para orientar o entregador.`,
      );
      return;
    }
    if (store.creditApproved < quickTotal) {
      setNotice(
        "Seu saldo atual não cobre este disparo rápido. Vá em Créditos e peça nova liberação antes de continuar.",
      );
      setSection("creditos");
      return;
    }
    publishQuickMission({
      normais: quickNormais,
      distantes: quickDistantes,
      bairros,
    });
    playAlertTone("partida");
    setQuickDispatch({ normais: "", distantes: "", bairros: "" });
    setSection("em-andamento");
    setNotice(
      "Disparo rápido enviado para a fila. Agora acompanhe a confirmação do entregador e o andamento da Bag.",
    );
  }

  function handleCreditFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCreditAttachment(file.name);
    setNotice(`Comprovante selecionado: ${file.name}`);
  }

  function renderOverview() {
    return (
      <div className="space-y-5">
        {notice ? (
          <div className="rounded-[24px] border border-sky-500/20 bg-sky-500/10 px-4 py-3 text-sm text-sky-100">
            {notice}
          </div>
        ) : null}
        <button
          type="button"
          onClick={() => setSection("nova-solicitacao")}
          className="w-full rounded-[28px] border border-[#f59e0b]/25 bg-[linear-gradient(135deg,rgba(245,158,11,0.16),rgba(34,197,94,0.08))] p-5 text-left shadow-[0_16px_40px_rgba(0,0,0,0.18)] transition hover:scale-[1.01] hover:border-[#f59e0b]/40"
        >
          <p className="text-xs uppercase tracking-[0.32em] text-[#f08a45]">
            Ação principal
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white">
            Clique aqui para abrir uma nova Bag.
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-200">
            Escolha entre Bag detalhada e Bag express. O objetivo é abrir a
            solicitação com poucos cliques e sem travar a cozinha.
          </p>
        </button>
        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <StatCard
            label="Créditos disponíveis"
            value={`R$ ${store.creditApproved.toFixed(2).replace(".", ",")}`}
            helper={`Isso cobre aproximadamente ${normalEstimate} entregas normais.`}
            tone="green"
            icon={
              <IconImage name="creditos" alt="Créditos" className="h-7 w-7" />
            }
          />
          <StatCard
            label="Bags enviadas"
            value={`${sent.length + awaiting.length}`}
            helper="Solicitações já disparadas e aguardando aceite ou sua confirmação."
            tone="blue"
            icon={
              <IconImage
                name="bag-enviada(1)"
                alt="Bag enviada"
                className="h-7 w-7"
              />
            }
            onClick={() => setSection("em-andamento")}
            pulse={sent.length + awaiting.length > 0}
          />
          <StatCard
            label="Em andamento"
            value={`${pickup.length + route.length + riderDone.length}`}
            helper="Bags aprovadas, em rota ou aguardando sua confirmação final."
            tone="orange"
            icon={
              <IconImage
                name="entrega-em-andamento"
                alt="Em andamento"
                className="h-7 w-7"
              />
            }
            onClick={() => setSection("em-andamento")}
            pulse={pickup.length + route.length + riderDone.length > 0}
          />
          <StatCard
            label="Finalizadas"
            value={`${finalized.length}`}
            helper="Bags encerradas pelo estabelecimento e disponíveis no histórico."
            tone="slate"
            icon={
              <IconImage
                name="entrega-finalizada"
                alt="Finalizada"
                className="h-7 w-7"
              />
            }
            onClick={() => setSection("historico")}
          />
          <StatCard
            label="Não finalizadas"
            value={`${divergences.length}`}
            helper="Bags com divergência ou contestação aberta."
            tone="orange"
            icon={
              <IconImage
                name="entrega-nao-finalizada"
                alt="Não finalizada"
                className="h-7 w-7"
              />
            }
            onClick={() => setSection("nao-finalizadas")}
            pulse={divergences.length > 0}
          />
          <StatCard
            label="Motoboys online"
            value={`${Object.values(store.riderStatus).filter((value) => value === "online").length}`}
            helper="Entregadores disponíveis agora para receber Bags."
            tone="green"
            icon={
              <IconImage
                name="capacete"
                alt="Motoboys online"
                className="h-7 w-7"
              />
            }
          />
        </section>
        {finalized.length ? (
          <section className="rounded-[28px] border border-[#22c55e]/15 bg-white/[0.04] p-5">
            <SectionTitle
              eyebrow="Últimas Bags finalizadas"
              title="Veja o que já foi confirmado hoje sem precisar sair da visão geral."
            />
            <div className="mt-4 space-y-3">
              {finalized.slice(0, 2).map((mission) => (
                <MissionCard key={mission.id} mission={mission} compact />
              ))}
            </div>
          </section>
        ) : null}

        <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
            <SectionTitle
              eyebrow="Resumo operacional"
              title="Use créditos para abrir Bags sem travar a cozinha no horário de pico."
              description="Cada Bag agrupa uma ou mais entregas. Quando o entregador é confirmado, a plataforma abate o valor do seu saldo operacional."
            />
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <DetailCell label="Empresa emissora" value={establishment.nome} />
              <DetailCell label="Documento" value={establishment.documento} />
              <DetailCell
                label="Entrega normal"
                value={`R$ ${store.settings.valorNormal.toFixed(2).replace(".", ",")}`}
              />
              <DetailCell
                label="Entrega distante"
                value={`R$ ${store.settings.valorDistante.toFixed(2).replace(".", ",")}`}
              />
            </div>
            <div className="mt-5 rounded-[24px] border border-[#22c55e]/18 bg-[#22c55e]/8 p-4">
              <p className="text-xs uppercase tracking-[0.26em] text-[#22c55e]">
                Raio de entrega normal
              </p>
              <p className="mt-2 text-sm leading-6 text-zinc-300">
                Configure o endereço base e quantos quilômetros entram como entrega normal. Fora desse raio, o app classifica como entrega distante quando conseguir reconhecer a rota.
              </p>
              <div className="mt-3 grid gap-3 md:grid-cols-[1fr_150px]">
                <input
                  value={baseAddress}
                  onChange={(e) => setBaseAddress(e.target.value)}
                  className="cm-input rounded-2xl px-4 py-3 text-sm"
                  placeholder="Endereço base do estabelecimento"
                />
                <input
                  value={distanceRadiusKm}
                  onChange={(e) => setDistanceRadiusKm(e.target.value.replace(/[^0-9,.]/g, ""))}
                  className="cm-input rounded-2xl px-4 py-3 text-sm"
                  placeholder="Raio em km"
                  inputMode="decimal"
                />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" onClick={saveRouteSettingsFromAddress} className="rounded-2xl border border-[#22c55e]/25 bg-[#22c55e]/10 px-4 py-2 text-xs font-bold text-[#9ef5b4] hover:bg-[#22c55e]/16">
                  Salvar raio
                </button>
                <button type="button" onClick={useCurrentLocationForBase} className="inline-flex items-center gap-2 rounded-2xl border border-sky-400/25 bg-sky-400/10 px-4 py-2 text-xs font-bold text-sky-100 hover:bg-sky-400/16">
                  <LocationIcon className="h-4 w-4" /> Usar localização atual
                </button>
              </div>
              <p className="mt-2 text-xs leading-5 text-zinc-400">
                Alterações sensíveis podem ser conferidas pelo administrador. Para cálculo mais preciso, preencha rua, número, bairro e cidade.
              </p>
            </div>
          </div>
          <div className="space-y-4">
            <HelpHint title="Dúvida rápida">{help["visao-geral"]}</HelpHint>
            <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
              <p className="text-xs uppercase tracking-[0.28em] text-[#f08a45]">
                Aviso operacional
              </p>
              <h3 className="mt-2 text-2xl font-semibold tracking-tight text-white">
                Mantenha créditos aprovados antes da abertura ou do horário de
                maior movimento.
              </h3>
              <p className="mt-3 text-sm leading-7 text-zinc-300">
                Assim o despacho das Bags fica mais rápido e a confirmação do
                entregador não trava sua operação.
              </p>
            </div>
          </div>
        </section>
      </div>
    );
  }

  function renderBag() {
    return (
      <div className="space-y-5">
        {notice ? (
          <div className="rounded-[24px] border border-sky-500/20 bg-sky-500/10 px-4 py-3 text-sm text-sky-100">
            {notice}
          </div>
        ) : null}
        <section className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <SectionTitle
              eyebrow="Nova solicitação"
              title="Escolha o modo da Bag e abra o preenchimento certo sem perder tempo."
              description="Use os botões abaixo: Bag detalhada para preencher entrega por entrega, ou Bag express para disparo rápido da cozinha."
            />
            <HelpHint title="Dúvida rápida">
              {help["nova-solicitacao"]}
            </HelpHint>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <button
              type="button"
              onClick={() => setBagMode("detalhada")}
              className={cx(
                "cm-bag-choice-alt group rounded-[28px] border px-5 py-5 text-left transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(0,0,0,0.24)]",
                bagMode === "detalhada"
                  ? "border-[#22c55e]/45 bg-[#22c55e]/16 text-white shadow-[0_0_0_1px_rgba(34,197,94,0.18)]"
                  : "text-zinc-200 hover:border-[#22c55e]/32",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.28em] text-[#f08a45]">
                    Clique aqui • Bag detalhada
                  </p>
                  <p className="mt-3 text-[1.35rem] font-semibold leading-tight">
                    Preencha cliente, destino e observações com mais precisão.
                  </p>
                  <p className="mt-3 text-sm leading-7">
                    Ideal quando o entregador vai abrir WhatsApp do cliente ou
                    Maps com endereço completo.
                  </p>
                </div>
                <span
                  className={cx(
                    "inline-flex min-w-[112px] justify-center rounded-2xl border px-3 py-2 text-xs font-medium transition",
                    bagMode === "detalhada"
                      ? "border-[#22c55e]/35 bg-[#22c55e]/18 text-[#baf6ca]"
                      : "border-white/10 bg-white/[0.04] text-zinc-200 group-hover:border-[#22c55e]/25",
                  )}
                >
                  Selecionar
                </span>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setBagMode("express")}
              className={cx(
                "cm-bag-choice group rounded-[28px] border px-5 py-5 text-left transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(0,0,0,0.24)]",
                bagMode === "express"
                  ? "border-[#f59e0b]/45 bg-[#f59e0b]/16 text-white shadow-[0_0_0_1px_rgba(245,158,11,0.18)]"
                  : "text-zinc-200 hover:border-[#f59e0b]/32",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.28em] text-[#f08a45]">
                    Clique aqui • Bag express
                  </p>
                  <p className="mt-3 text-[1.35rem] font-semibold leading-tight">
                    Abra uma Bag rápida para a cozinha com poucos cliques.
                  </p>
                  <p className="mt-3 text-sm leading-7">
                    Informe quantas entregas vão sair e pelo menos um bairro ou
                    referência para orientar o entregador.
                  </p>
                </div>
                <span
                  className={cx(
                    "inline-flex min-w-[112px] justify-center rounded-2xl border px-3 py-2 text-xs font-medium transition",
                    bagMode === "express"
                      ? "border-sky-500/35 bg-sky-500/18 text-sky-100"
                      : "border-white/10 bg-white/[0.04] text-zinc-200 group-hover:border-sky-500/25",
                  )}
                >
                  Selecionar
                </span>
              </div>
            </button>
          </div>

          {bagMode ? null : (
            <div className="mt-5 rounded-[24px] border border-dashed border-white/10 bg-black/20 p-5 text-sm text-zinc-300">
              Selecione um dos dois botões acima. Depois que a Bag for enviada,
              você ainda terá uma janela curta para corrigir ou cancelar antes
              do fluxo normal começar.
            </div>
          )}
          <div className="mt-5 grid gap-5 xl:grid-cols-[1.08fr_0.92fr]">
            {bagMode === "detalhada" ? (
              <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
                <div className="grid gap-3 md:grid-cols-2">
                  <DetailCell
                    label="Empresa emissora"
                    value={establishment.nome}
                  />
                  <DetailCell
                    label="Documento cadastrado"
                    value={establishment.documento}
                  />
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto_1fr]">
                  <Input
                    label="CEP"
                    value={draft.cep}
                    onChange={(v) =>
                      setDraft((c) => ({ ...c, cep: formatCep(v) }))
                    }
                    placeholder="15900-000"
                  />
                  <button
                    type="button"
                    onClick={lookupCep}
                    className="rounded-2xl border border-[#22c55e]/30 bg-[#22c55e]/10 px-4 py-3 text-sm font-medium text-[#8af3a8] transition hover:bg-[#22c55e]/18 hover:shadow-[0_0_0_1px_rgba(34,197,94,0.25)]"
                  >
                    Buscar CEP
                  </button>
                  <SelectField
                    label="Forma de pagamento do pedido"
                    value={draft.pagamentoCliente}
                    onChange={(v) =>
                      setDraft((c) => ({
                        ...c,
                        pagamentoCliente: v as PaymentMethod,
                      }))
                    }
                    options={[
                      "PIX do cliente",
                      "Dinheiro",
                      "Cartão / maquininha da casa",
                    ]}
                  />
                </div>

                {cepFeedback ? (
                  <p className="mt-3 rounded-2xl border border-sky-500/20 bg-sky-500/10 px-3 py-2 text-sm text-sky-100">
                    {cepFeedback}
                  </p>
                ) : null}

                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <Input
                    label="Nome do cliente"
                    required
                    value={draft.clienteNome}
                    onChange={(v) =>
                      setDraft((c) => ({ ...c, clienteNome: v }))
                    }
                    error={submitAttempted ? errors.clienteNome : undefined}
                  />
                  <Input
                    label="Telefone do cliente"
                    value={draft.clienteTelefone}
                    onChange={(v) =>
                      setDraft((c) => ({
                        ...c,
                        clienteTelefone: formatPhone(v),
                      }))
                    }
                    placeholder="Opcional"
                  />
                  <Input
                    label="Descrição do pedido"
                    required
                    value={draft.descricaoPedido}
                    onChange={(v) =>
                      setDraft((c) => ({ ...c, descricaoPedido: v }))
                    }
                    error={submitAttempted ? errors.descricaoPedido : undefined}
                  />
                  <Input
                    label="Número da comanda / pedido / protocolo"
                    value={draft.numeroComanda}
                    onChange={(v) =>
                      setDraft((c) => ({ ...c, numeroComanda: v }))
                    }
                    placeholder="Opcional"
                  />

                  <div className="md:col-span-2">
                    <label className="block rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-sm text-zinc-300">
                      <span className="mb-2 inline-flex items-center gap-1">
                        Rua<span className="text-[#f59e0b]">*</span>
                      </span>
                      <div className="relative">
                        <input
                          value={draft.rua}
                          onFocus={() => setRuaFocused(true)}
                          onBlur={() =>
                            window.setTimeout(() => setRuaFocused(false), 140)
                          }
                          onChange={(e) =>
                            setDraft((c) => ({ ...c, rua: e.target.value }))
                          }
                          placeholder="Digite a rua ou um endereço conhecido em Taquaritinga"
                          className={cx(
                            "w-full rounded-xl border px-3 py-2 pr-10 text-white outline-none transition",
                            submitAttempted && errors.rua
                              ? "border-rose-500/40 bg-rose-500/5"
                              : "border-white/10 bg-black/20 hover:border-white/20",
                          )}
                        />
                        <SearchIcon className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                        {ruaFocused &&
                        (streetSuggestions.length > 0 || searchingAddress) ? (
                          <div className="absolute bottom-[calc(100%+8px)] left-0 right-0 z-20 rounded-2xl border border-white/10 bg-[#0b1324] p-2 shadow-2xl">
                            {searchingAddress ? (
                              <p className="px-3 py-2 text-xs text-zinc-400">
                                Buscando endereço real...
                              </p>
                            ) : null}
                            {streetSuggestions.map((item) => (
                              <button
                                key={`${item.rua}-${item.cep}-${item.display}`}
                                type="button"
                                onClick={() => applySuggestion(item)}
                                className="flex w-full flex-col rounded-xl px-3 py-2 text-left transition hover:bg-white/[0.05]"
                              >
                                <span className="text-sm font-medium text-white">
                                  {item.rua}
                                </span>
                                <span className="text-xs text-zinc-400">
                                  {item.bairro || "Bairro a conferir"}
                                  {item.cep ? ` • ${item.cep}` : ""} •{" "}
                                  {item.cidade}/{item.uf}
                                </span>
                              </button>
                            ))}
                            {!searchingAddress &&
                            streetSuggestions.length === 0 ? (
                              <p className="px-3 py-2 text-xs text-zinc-500">
                                Nenhuma sugestão confiável encontrada. Continue
                                manualmente.
                              </p>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                      {submitAttempted && errors.rua ? (
                        <p className="mt-2 text-xs text-rose-200">
                          {errors.rua}
                        </p>
                      ) : null}
                    </label>
                  </div>

                  <Input
                    label="Número"
                    required
                    value={draft.numero}
                    onChange={(v) => setDraft((c) => ({ ...c, numero: v }))}
                    error={submitAttempted ? errors.numero : undefined}
                  />
                  <Input
                    label="Complemento"
                    value={draft.complemento}
                    onChange={(v) =>
                      setDraft((c) => ({ ...c, complemento: v }))
                    }
                  />
                  <Input
                    label="Bairro"
                    required
                    value={draft.bairro}
                    onChange={(v) => setDraft((c) => ({ ...c, bairro: v }))}
                    error={submitAttempted ? errors.bairro : undefined}
                  />
                  <Input
                    label="Cidade"
                    value={draft.cidade}
                    onChange={(v) => setDraft((c) => ({ ...c, cidade: v }))}
                  />
                  <Input
                    label="UF"
                    value={draft.uf}
                    onChange={(v) =>
                      setDraft((c) => ({
                        ...c,
                        uf: v.toUpperCase().slice(0, 2),
                      }))
                    }
                  />
                  <Input
                    label="Ponto de referência"
                    value={draft.referencia}
                    onChange={(v) => setDraft((c) => ({ ...c, referencia: v }))}
                  />
                  <Input
                    label="Observação útil ao entregador"
                    value={draft.observacao}
                    onChange={(v) => setDraft((c) => ({ ...c, observacao: v }))}
                  />
                </div>

                {submitAttempted && missingFields.length ? (
                  <div className="mt-4 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-3 text-sm text-rose-100">
                    <p className="font-medium">
                      Antes de adicionar esta entrega à Bag, complete os campos
                      obrigatórios.
                    </p>
                    <ul className="mt-2 list-disc space-y-1 pl-5">
                      {missingFields.map((error) => (
                        <li key={error}>{error}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    title={
                      missingFields.length
                        ? `Faltam campos: ${missingFields.join(" ")}`
                        : "Adicionar entrega à Bag"
                    }
                    onClick={saveDelivery}
                    className={cx(
                      "rounded-2xl px-4 py-3 text-sm font-medium transition",
                      missingFields.length
                        ? "cursor-not-allowed border border-[#f59e0b]/25 bg-[#f59e0b]/8 text-[#ffd8a8] hover:bg-[#f59e0b]/12"
                        : "bg-white text-[#11131b] hover:bg-zinc-100 hover:shadow-[0_0_0_1px_rgba(255,255,255,0.2)]",
                    )}
                  >
                    {editingId
                      ? "Atualizar entrega da Bag"
                      : "Adicionar entrega à Bag"}
                  </button>
                  <button
                    type="button"
                    onClick={resetDraft}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white transition hover:bg-white/[0.08]"
                  >
                    Limpar formulário
                  </button>
                </div>
              </div>
            ) : bagMode === "express" ? (
              <div className="rounded-[24px] border border-sky-500/20 bg-black/20 p-4">
                <SectionTitle
                  eyebrow="Bag express"
                  title="Despache por quantidade e libere o entregador com poucos cliques."
                  description="Escolha quantas entregas normais e distantes vão sair. Informe os bairros ou referências separados por vírgula antes de enviar."
                />
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <DetailCell
                    label="Estabelecimento"
                    value={establishment.nome}
                  />
                  <DetailCell
                    label="Telefone do estabelecimento"
                    value={establishment.whatsapp}
                  />
                </div>
                <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-sm text-zinc-300">
                  O entregador já verá o estabelecimento no aceite. Se você
                  quiser orientar melhor a rota, descreva os bairros separados
                  por vírgula.
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <SelectField
                    label="Entregas normais"
                    value={quickDispatch.normais}
                    onChange={(v) =>
                      setQuickDispatch((cur) => ({ ...cur, normais: v }))
                    }
                    options={["", "0", "1", "2", "3", "4", "5", "6"]}
                  />
                  <SelectField
                    label="Entregas distantes"
                    value={quickDispatch.distantes}
                    onChange={(v) =>
                      setQuickDispatch((cur) => ({ ...cur, distantes: v }))
                    }
                    options={["", "0", "1", "2", "3", "4", "5", "6"]}
                  />
                  <Input
                    label="Bairros ou referências separados por vírgula"
                    required
                    value={quickDispatch.bairros}
                    onChange={(v) =>
                      setQuickDispatch((cur) => ({ ...cur, bairros: v }))
                    }
                    error={
                      notice?.toLowerCase().includes("bairro")
                        ? "Informe ao menos uma referência."
                        : undefined
                    }
                    placeholder="sobral 1, ipiranga, ipês"
                  />
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <DetailCell label="Normais" value={`${quickNormais}`} />
                  <DetailCell label="Distantes" value={`${quickDistantes}`} />
                  <DetailCell
                    label="Valor estimado"
                    value={`R$ ${quickTotal.toFixed(2).replace(".", ",")}`}
                  />
                </div>
                <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-sm text-zinc-300">
                  Você confirma que esta Bag express tem{" "}
                  <span className="font-semibold text-white">
                    {quickNormais}
                  </span>{" "}
                  entrega(s) normal(is) e{" "}
                  <span className="font-semibold text-white">
                    {quickDistantes}
                  </span>{" "}
                  distante(s). Os bairros podem ser descritos assim:{" "}
                  <span className="text-white">
                    centro, laranjeiras, paraíso 2
                  </span>
                  .
                </div>
                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={sendQuickDispatch}
                    className="rounded-2xl border border-sky-500/30 bg-sky-500/12 px-4 py-3 text-sm font-medium text-sky-100 transition hover:bg-sky-500/20 hover:scale-[1.02]"
                  >
                    Confirmar e enviar Bag express
                  </button>
                </div>
              </div>
            ) : null}

            <div
              className={cx(
                "rounded-[24px] border border-white/10 bg-black/20 p-4 transition",
                bag.length > 0 &&
                  bagMode === "detalhada" &&
                  "shadow-[0_0_0_1px_rgba(34,197,94,0.12)]",
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.28em] text-[#f08a45]">
                    {bagMode === "detalhada"
                      ? "Bag atual"
                      : bagMode === "express"
                        ? "Resumo da Bag express"
                        : "Selecione um modo"}
                  </p>
                  <p className="mt-2 text-sm text-zinc-300">
                    {bagMode === "detalhada"
                      ? "Cadastre aqui as entregas que vão sair juntas para o entregador."
                      : bagMode === "express"
                        ? "Confirme rapidamente as quantidades antes de enviar a Bag express."
                        : "Clique em Bag detalhada ou Bag express para abrir o preenchimento correto."}
                  </p>
                </div>
                <div
                  className={cx(
                    "inline-flex h-11 w-11 items-center justify-center rounded-2xl border transition",
                    (bag.length > 0 && bagMode === "detalhada") ||
                      (bagMode === "express" &&
                        quickNormais + quickDistantes > 0)
                      ? "animate-pulse border-[#22c55e]/30 bg-[#22c55e]/10 text-[#8af3a8]"
                      : "border-white/10 bg-white/[0.04] text-zinc-400",
                  )}
                >
                  <IconImage
                    name="entregador-na-moto-preto-cinza"
                    alt="Bag express"
                    className="h-7 w-7"
                  />
                </div>
              </div>
              {bagMode === "detalhada" ? (
                <>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <DetailCell label="Empresa" value={establishment.nome} />
                    <DetailCell
                      label="Documento"
                      value={establishment.documento}
                    />
                    <DetailCell
                      label="Entregas salvas"
                      value={`${bag.length}`}
                    />
                    <DetailCell
                      label="Valor atual"
                      value={`R$ ${bagTotal.toFixed(2).replace(".", ",")}`}
                    />
                  </div>
                  <div className="mt-4 space-y-3">
                    {bag.length ? (
                      bag.map((item, index) => {
                        const tones = [
                          "border-[#22c55e]/25 bg-[#22c55e]/[0.06]",
                          "border-[#f59e0b]/25 bg-[#f59e0b]/[0.06]",
                          "border-sky-500/25 bg-sky-500/[0.06]",
                          "border-fuchsia-500/25 bg-fuchsia-500/[0.06]",
                        ];
                        return (
                          <article
                            key={item.id}
                            className={cx(
                              "rounded-2xl border p-4",
                              tones[index % tones.length],
                            )}
                          >
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-semibold text-white">
                                Entrega {index + 1}
                              </p>
                              <StatusBadge
                                tone={
                                  item.tipo === "distante" ? "orange" : "green"
                                }
                              >
                                {item.tipo === "distante"
                                  ? "Distante"
                                  : "Normal"}
                              </StatusBadge>
                              <StatusBadge tone="slate">
                                R$ {item.valor.toFixed(2).replace(".", ",")}
                              </StatusBadge>
                            </div>
                            <p className="mt-2 text-sm text-zinc-100">
                              {item.clienteNome}
                              {item.clienteTelefone
                                ? ` • ${item.clienteTelefone}`
                                : ""}
                            </p>
                            <p className="text-sm text-zinc-300">
                              {deliveryDestinationText(item)}
                              {item.complemento ? ` • ${item.complemento}` : ""}
                            </p>
                            <p className="text-sm text-zinc-400">
                              {item.cidade}/{item.uf}
                              {item.cep ? ` • ${item.cep}` : ""}
                            </p>
                            <div className="mt-3 grid gap-3 md:grid-cols-2">
                              <DetailCell
                                label="Descrição"
                                value={item.descricaoPedido}
                              />
                              <DetailCell
                                label="Pagamento do cliente"
                                value={item.pagamentoCliente}
                              />
                              <DetailCell
                                label="Comanda / pedido / protocolo"
                                value={
                                  item.numeroComanda || "Sem número informado"
                                }
                              />
                              <DetailCell
                                label="Referência"
                                value={
                                  item.referencia ||
                                  item.observacao ||
                                  "Sem observação adicional"
                                }
                              />
                            </div>
                            <div className="mt-4 flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => editDelivery(item)}
                                className="rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-xs text-white transition hover:bg-white/[0.08]"
                              >
                                Editar
                              </button>
                              <button
                                type="button"
                                onClick={() => removeDelivery(item.id)}
                                className="rounded-xl border border-rose-500/25 bg-rose-500/10 px-3 py-2 text-xs text-rose-200 transition hover:bg-rose-500/18"
                              >
                                Remover
                              </button>
                            </div>
                          </article>
                        );
                      })
                    ) : (
                      <p className="rounded-2xl border border-dashed border-white/10 px-4 py-6 text-sm text-zinc-400">
                        Nenhuma entrega foi adicionada à Bag ainda. Preencha a
                        primeira entrega e clique em adicionar.
                      </p>
                    )}
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={closeBag}
                      className={cx(
                        "rounded-2xl px-4 py-3 text-sm font-medium transition",
                        bag.length
                          ? "border border-[#f59e0b]/30 bg-[#f59e0b]/10 text-[#ffd8a8] hover:bg-[#f59e0b]/18 hover:shadow-[0_0_0_1px_rgba(245,158,11,0.22)]"
                          : "cursor-not-allowed border border-white/10 bg-white/[0.03] text-zinc-500",
                      )}
                    >
                      Fechar Bag
                    </button>
                    <button
                      type="button"
                      onClick={publishCurrentBag}
                      className={cx(
                        "rounded-2xl px-4 py-3 text-sm font-medium transition",
                        bagClosed
                          ? "border border-[#22c55e]/30 bg-[#22c55e]/12 text-[#8af3a8] hover:bg-[#22c55e]/18 hover:shadow-[0_0_0_1px_rgba(34,197,94,0.22)]"
                          : "cursor-not-allowed border border-white/10 bg-white/[0.03] text-zinc-500",
                      )}
                    >
                      Confirmar e enviar Bag
                    </button>
                  </div>
                  {bagClosed ? (
                    <div className="mt-4 rounded-2xl border border-sky-500/20 bg-sky-500/10 p-3 text-sm text-sky-100">
                      Bag fechada para revisão. Revise os cards e só depois
                      solicite o entregador.
                    </div>
                  ) : null}
                  {!creditsEnough && bag.length ? (
                    <div className="mt-4 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-3 text-sm text-rose-100">
                      Seu saldo atual não cobre esta Bag. Vá em Créditos,
                      solicite aprovação e volte aqui depois da liberação.
                    </div>
                  ) : null}
                </>
              ) : (
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <DetailCell label="Normais" value={`${quickNormais}`} />
                  <DetailCell label="Distantes" value={`${quickDistantes}`} />
                  <DetailCell
                    label="Valor estimado"
                    value={`R$ ${quickTotal.toFixed(2).replace(".", ",")}`}
                  />
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    );
  }

  function renderCredits() {
    return (
      <div className="space-y-5">
        {notice ? (
          <div className="rounded-[24px] border border-sky-500/20 bg-sky-500/10 px-4 py-3 text-sm text-sky-100">
            {notice}
          </div>
        ) : null}
        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <StatCard
            label="Créditos disponíveis"
            value={`R$ ${store.creditApproved.toFixed(2).replace(".", ",")}`}
            helper={`Isso cobre aproximadamente ${normalEstimate} entregas normais.`}
            tone="green"
            icon={
              <IconImage name="creditos" alt="Créditos" className="h-7 w-7" />
            }
          />
          <StatCard
            label="Solicitações pendentes"
            value={`${pendingCredits.length}`}
            helper="Pedidos ainda aguardando conferência da equipe administrativa."
            tone="orange"
            icon={
              <IconImage
                name="entrega-nao-finalizada"
                alt="Não finalizada"
                className="h-7 w-7"
              />
            }
          />
          <StatCard
            label="Aviso operacional"
            value="Saldo antes do pico"
            helper="Peça créditos antes do horário de maior movimento para evitar atraso."
            tone="blue"
            icon={
              <IconImage
                name="entrega-em-andamento"
                alt="Em andamento"
                className="h-7 w-7"
              />
            }
          />
        </section>

        <section className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <SectionTitle
                eyebrow="Adicionar créditos"
                title="Solicite saldo operacional e aguarde a liberação da equipe."
                description="O admin confere o pagamento, aprova os créditos e a plataforma atualiza seu saldo disponível."
              />
              <HelpHint title="Dúvida rápida">{help.creditos}</HelpHint>
            </div>

            <div className="mt-5 space-y-3">
              <label className="flex flex-col rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-sm text-zinc-200">
                <span className="mb-2">Valor em créditos</span>
                <input
                  value={creditInput}
                  onChange={(e) =>
                    setCreditInput(formatMoneyInput(e.target.value))
                  }
                  placeholder="0,00"
                  className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-white outline-none transition hover:border-white/20"
                />
              </label>
              <div className="rounded-2xl border border-[#22c55e]/20 bg-[#22c55e]/10 p-4 text-sm text-zinc-200">
                <p className="font-medium text-white">PIX da plataforma</p>
                <p className="mt-2 leading-6">
                  Antes de registrar, envie o valor para a chave PIX cadastrada
                  pela equipe Chegou Motoca.
                </p>
                <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
                  <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
                    <span className="block text-xs uppercase tracking-[0.18em] text-zinc-500">
                      Chave PIX
                    </span>
                    <strong className="mt-1 block break-all text-white">
                      {store.settings.pixKey ||
                        "Chave PIX ainda não cadastrada pelo admin"}
                    </strong>
                    <span className="mt-1 block text-xs text-zinc-400">
                      Recebedor:{" "}
                      {store.settings.pixReceiverName || "Chegou Motoca"}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(store.settings.pixKey || "")}
                    className="rounded-xl border border-white/10 bg-white/[0.05] px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/[0.1]"
                  >
                    Copiar PIX
                  </button>
                </div>
                {creditAttachment ? (
                  <p className="mt-3 rounded-xl border border-[#22c55e]/20 bg-[#22c55e]/10 px-3 py-2 text-xs text-[#baf7cd]">
                    Comprovante separado: {creditAttachment}
                  </p>
                ) : null}
              </div>

              <input
                ref={fileRef}
                type="file"
                accept="image/*,.pdf"
                className="hidden"
                onChange={handleCreditFile}
              />

              <div className="grid gap-3 sm:grid-cols-3">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white transition hover:bg-white/[0.08]"
                >
                  <IconImage name="anexar" alt="" className="h-5 w-5" /> Anexar
                  comprovante
                </button>
                <button
                  type="button"
                  onClick={() =>
                    askCredit(
                      creditAttachment ? "comprovante" : "plataforma",
                      false,
                    )
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#22c55e]/30 bg-[#22c55e]/10 px-4 py-3 text-sm font-medium text-[#8af3a8] transition hover:bg-[#22c55e]/18 hover:shadow-[0_0_0_1px_rgba(34,197,94,0.3)]"
                >
                  <IconImage name="creditos" alt="" className="h-5 w-5" />{" "}
                  Registrar solicitação
                </button>
                <button
                  type="button"
                  onClick={() =>
                    askCredit(
                      creditAttachment ? "comprovante" : "whatsapp",
                      true,
                    )
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#25D366]/30 bg-[#25D366]/12 px-4 py-3 text-sm font-medium text-[#8ef5b4] transition hover:bg-[#25D366]/20"
                >
                  <IconImage name="whatsapp" alt="" className="h-5 w-5" />{" "}
                  Solicitar créditos no WhatsApp
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
            <SectionTitle
              eyebrow="Pedidos recentes"
              title="Veja o que já foi aprovado e o que ainda aguarda análise."
            />
            <div className="mt-5 space-y-3">
              {store.pendingCreditRequests.length ? (
                store.pendingCreditRequests.map((r: CreditRequest) => (
                  <article
                    key={r.id}
                    className="rounded-2xl border border-white/10 bg-black/20 p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-medium text-white">
                        R$ {r.amount.toFixed(2).replace(".", ",")}
                      </p>
                      <StatusBadge
                        tone={
                          r.status === "aprovado"
                            ? "green"
                            : r.status === "recusado"
                              ? "red"
                              : "orange"
                        }
                      >
                        {r.status === "aprovado"
                          ? "Aprovado"
                          : r.status === "recusado"
                            ? "Recusado"
                            : "Pendente"}
                      </StatusBadge>
                    </div>
                    <p className="mt-2 text-sm text-zinc-300">
                      {new Date(r.requestedAt).toLocaleString("pt-BR")}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-zinc-400">
                      {r.message}
                    </p>
                  </article>
                ))
              ) : (
                <p className="rounded-2xl border border-dashed border-white/10 px-4 py-6 text-sm text-zinc-400">
                  Nenhum pedido de crédito foi registrado ainda.
                </p>
              )}
            </div>
          </div>
        </section>
      </div>
    );
  }

  function renderRunning() {
    return (
      <div className="space-y-5">
        {notice ? (
          <div className="rounded-[24px] border border-sky-500/20 bg-sky-500/10 px-4 py-3 text-sm text-sky-100">
            {notice}
          </div>
        ) : null}

        <section className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <SectionTitle
              eyebrow="Fluxo da Bag"
              title="Acompanhe cada etapa sem depender de rolagem longa nem de anexo obrigatório."
              description="Depois de enviada, a Bag entra no fluxo do entregador. Use esta área para acompanhar, corrigir rapidamente no começo e depois confirmar retirada, rota e finalização."
            />
            <HelpHint title="Dúvida rápida">{help["em-andamento"]}</HelpHint>
          </div>
        </section>

        <section
          className={cx(
            "rounded-[28px] border border-white/10 bg-white/[0.04] p-5 transition",
            sent.length > 0 && "pulse-card-blue",
          )}
        >
          <SectionTitle
            eyebrow="Bags enviadas"
            title="Estas Bags já saíram do rascunho e aguardam um entregador aceitar."
          />
          <div className="mt-4 space-y-3">
            {sent.length ? (
              sent.map((m) => {
                const freeEdit = minutesLeftSince(m.createdAt, 1);
                return (
                  <article
                    key={m.id}
                    className="rounded-[24px] border border-white/10 bg-black/20 p-4"
                  >
                    <MissionCard mission={m} />
                    {freeEdit ? (
                      <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-zinc-300">
                        Você ainda tem até 1 minuto para corrigir ou cancelar
                        esta Bag antes do fluxo normal começar.
                      </div>
                    ) : (
                      <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-zinc-400">
                        A janela rápida já terminou. Agora a Bag segue
                        aguardando aceite normalmente.
                      </div>
                    )}
                    {freeEdit ? (
                      <div className="mt-4 flex flex-wrap gap-3">
                        <button
                          type="button"
                          onClick={() => reopenMissionToEdit(m)}
                          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white transition hover:bg-white/[0.08]"
                        >
                          Editar Bag ({freeEdit})
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (!minutesLeftSince(m.createdAt, 1)) {
                              setNotice(
                                `O prazo de cancelamento rápido da ${missionDisplayCode(m.id)} já expirou.`,
                              );
                              return;
                            }
                            cancelAvailableMissionByEstablishment(m.id);
                            playAlertTone("erro");
                            setNotice(
                              `A ${missionDisplayCode(m.id)} foi cancelada antes do aceite e não entrou no fluxo do entregador.`,
                            );
                          }}
                          className="rounded-2xl border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-200 transition hover:bg-rose-500/18"
                        >
                          Cancelar grátis ({freeEdit})
                        </button>
                      </div>
                    ) : null}
                  </article>
                );
              })
            ) : (
              <p className="rounded-2xl border border-dashed border-white/10 px-4 py-6 text-sm text-zinc-400">
                Nenhuma Bag enviada está aguardando aceite agora.
              </p>
            )}
          </div>
        </section>

        <section
          className={cx(
            "rounded-[28px] border border-amber-500/20 bg-amber-500/10 p-5 transition",
            expiredAvailable.length > 0 && "pulse-card-amber",
          )}
        >
          <SectionTitle
            eyebrow="Sem aceite / expiradas"
            title="Estas Bags passaram 10 minutos sem aceite e precisam de uma decisão."
          />
          <div className="mt-4 space-y-3">
            {expiredAvailable.length ? (
              expiredAvailable.map((m) => (
                <article
                  key={m.id}
                  className="rounded-[24px] border border-amber-500/20 bg-black/20 p-4"
                >
                  <MissionCard mission={m} compact />
                  <div className="mt-4 rounded-2xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-sm text-[#ffd8a8]">
                    Entrega prioritária • aceite rápido e fortaleça sua
                    reputação com os estabelecimentos.
                  </div>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        requeueAvailableMission(m.id);
                        playAlertTone("coin");
                        setNotice(
                          `A ${missionDisplayCode(m.id)} voltou ao topo da fila com prioridade.`,
                        );
                      }}
                      className="rounded-2xl border border-[#22c55e]/30 bg-[#22c55e]/12 px-4 py-3 text-sm font-medium text-[#8ef5b4] transition hover:bg-[#22c55e]/18"
                    >
                      Reenviar com prioridade
                    </button>
                    {(m.attempt ?? 1) >= 2 ? (
                      <button
                        type="button"
                        onClick={() => {
                          requestMissionCreditReview(
                            m.id,
                            `Sem aceite após múltiplas tentativas na ${missionDisplayCode(m.id)}.`,
                          );
                          archiveExpiredAvailableMission(
                            m.id,
                            "ESTABELECIMENTO / OUTROS: sem aceite após múltiplas tentativas.",
                          );
                          playAlertTone("erro");
                          setNotice(
                            `Solicitação de devolução de créditos enviada para ${missionDisplayCode(m.id)}.`,
                          );
                        }}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white transition hover:bg-white/[0.08]"
                      >
                        Solicitar devolução / análise
                      </button>
                    ) : null}
                  </div>
                </article>
              ))
            ) : (
              <p className="rounded-2xl border border-dashed border-white/10 px-4 py-6 text-sm text-zinc-300">
                Nenhuma Bag expirou por falta de aceite.
              </p>
            )}
          </div>
        </section>

        <section
          className={cx(
            "rounded-[28px] border border-[#f59e0b]/20 bg-[#f59e0b]/10 p-5 shadow-[0_0_0_1px_rgba(245,158,11,0.15)] transition",
            awaiting.length > 0 && "pulse-card-amber",
          )}
        >
          <SectionTitle
            eyebrow="Bags aceitas"
            title="O entregador já aceitou. Agora confirme ou devolva para a fila."
          />
          <div className="mt-4 space-y-3">
            {awaiting.length ? (
              awaiting.map((m) => {
                const rider = riderById(m.riderId);
                return (
                  <article
                    key={m.id}
                    className="rounded-[24px] border border-[#f59e0b]/20 bg-black/20 p-4 shadow-[0_0_0_1px_rgba(245,158,11,0.12)]"
                  >
                    <div className="mb-3 flex items-center gap-3 rounded-2xl border border-[#f59e0b]/20 bg-[#f59e0b]/10 px-3 py-2 text-sm text-[#ffd8a8] animate-pulse">
                      <span className="inline-flex h-2.5 w-2.5 rounded-full bg-[#f59e0b]" />
                      Motoboy solicitando confirmação nesta Bag.
                    </div>
                    <div className="mb-4 flex items-center gap-3">
                      <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-[#22c55e]/30 bg-[#22c55e]/10 text-sm font-semibold text-[#8af3a8]">
                        <SafeAvatar
                          value={rider?.avatar}
                          fallback={
                            m.riderName?.slice(0, 2).toUpperCase() || "MT"
                          }
                        />
                      </div>
                      <div>
                        <p className="text-sm text-zinc-400">
                          Entregador aguardando sua decisão
                        </p>
                        <p className="font-medium text-white">{m.riderName}</p>
                      </div>
                    </div>
                    {m.riderAcceptanceMessage &&
                    m.riderAcceptanceMessage.length < 180 ? (
                      <div className="mb-4 rounded-2xl border border-sky-500/20 bg-sky-500/10 px-3 py-2 text-sm text-sky-100">
                        Mensagem do entregador: {m.riderAcceptanceMessage}
                      </div>
                    ) : null}
                    <MissionCard mission={m} compact />
                    <div className="mt-4 flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          confirmMissionByEstablishment(m.id);
                          playAlertTone("coin");
                          setNotice(
                            `Entregador confirmado na ${missionDisplayCode(m.id)}. Agora a Bag fica aguardando retirada.`,
                          );
                        }}
                        className="rounded-2xl bg-white px-4 py-3 text-sm font-medium text-[#11131b] transition hover:bg-zinc-100 hover:scale-[1.02] hover:shadow-[0_0_0_1px_rgba(255,255,255,0.2)]"
                      >
                        Confirmar entregador
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          rejectMissionByEstablishment(
                            m.id,
                            "Estabelecimento preferiu outro entregador.",
                          );
                          playAlertTone("erro");
                          setNotice(
                            `A ${missionDisplayCode(m.id)} voltou para a fila e ficará oculta para este entregador nesta Bag.`,
                          );
                        }}
                        className="rounded-2xl border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-200 transition hover:bg-rose-500/18 hover:scale-[1.02]"
                      >
                        Ignorar entregador e devolver à fila
                      </button>
                    </div>
                  </article>
                );
              })
            ) : (
              <p className="rounded-2xl border border-dashed border-white/10 px-4 py-6 text-sm text-zinc-400">
                Nenhuma Bag aceita aguarda sua confirmação agora.
              </p>
            )}
          </div>
        </section>

        <section
          className={cx(
            "rounded-[28px] border border-sky-500/20 bg-sky-500/10 p-5 transition",
            pickup.length > 0 && "pulse-card-amber",
          )}
        >
          <SectionTitle
            eyebrow="Aguardando retirada"
            title="A Bag já foi confirmada. Marque em entrega quando o entregador sair do estabelecimento."
          />
          <div className="mt-4 space-y-3">
            {pickup.length ? (
              pickup.map((m) => (
                <article
                  key={m.id}
                  className="rounded-[24px] border border-sky-500/20 bg-black/20 p-4 shadow-[0_0_0_1px_rgba(14,165,233,0.12)]"
                >
                  <MissionCard mission={m} />
                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        establishmentMarkInDelivery(m.id);
                        playAlertTone("partida");
                        setNotice(
                          `A ${missionDisplayCode(m.id)} agora está em entrega.`,
                        );
                      }}
                      className="rounded-2xl border border-[#f59e0b]/30 bg-[#f59e0b]/12 px-4 py-3 text-sm font-medium text-[#ffd8a8] transition hover:bg-[#f59e0b]/22 hover:scale-[1.02] hover:shadow-[0_0_0_1px_rgba(245,158,11,0.35)]"
                    >
                      Marcar em entrega
                    </button>
                    {m.pickupDeadlineAt ? (
                      new Date(m.pickupDeadlineAt).getTime() > nowTick ? (
                        <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-zinc-300">
                          Cancelamento sem custo disponível em{" "}
                          {missionCountdownLabel(m) || "00:00"}
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            cancelMissionByEstablishment(
                              m.id,
                              "Cancelada pelo estabelecimento antes da retirada. Crédito devolvido.",
                            );
                            playAlertTone("erro");
                            setNotice(
                              `A ${missionDisplayCode(m.id)} foi cancelada sem custo após o prazo de retirada. O crédito foi devolvido.`,
                            );
                          }}
                          className="rounded-2xl border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-200 transition hover:bg-rose-500/18"
                        >
                          Cancelar sem custo
                        </button>
                      )
                    ) : null}
                    {m.riderId ? (
                      <a
                        href={wa(
                          `Olá, ${m.riderName}. A ${missionDisplayCode(m.id)} já está pronta para retirada.`,
                          riderWhats(m.riderId),
                        )}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#25D366]/30 bg-[#25D366]/12 px-4 py-3 text-sm font-medium text-[#8ef5b4] transition hover:bg-[#25D366]/20 hover:scale-[1.02] hover:shadow-[0_0_0_1px_rgba(37,211,102,0.24)]"
                      >
                        <IconImage
                          name="whatsapp"
                          alt="WhatsApp"
                          className="h-5 w-5"
                        />{" "}
                        Falar com entregador
                      </a>
                    ) : null}
                  </div>
                </article>
              ))
            ) : (
              <p className="rounded-2xl border border-dashed border-white/10 px-4 py-6 text-sm text-zinc-400">
                Nenhuma Bag confirmada aguarda retirada agora.
              </p>
            )}
          </div>
        </section>

        <section
          className={cx(
            "rounded-[28px] border border-white/10 bg-white/[0.04] p-5 transition",
            (route.length > 0 || riderDone.length > 0) &&
              (riderDone.length > 0 ? "pulse-card-violet" : "pulse-card-cyan"),
          )}
        >
          <SectionTitle
            eyebrow="Em entrega"
            title="Finalize quando o retorno estiver certo ou responda à solicitação do entregador."
            description="Use verde para confirmar, vermelho para registrar divergência e WhatsApp só quando precisar alinhar rápido."
          />
          <div className="mt-4 space-y-3">
            {[...route, ...riderDone].length ? (
              [...route, ...riderDone].map((m) => (
                <article
                  key={m.id}
                  className={cx(
                    "rounded-[24px] border bg-black/20 p-4 transition",
                    m.status === "motoboy_marcou_finalizada"
                      ? "pulse-card-violet border-violet-500/25 shadow-[0_0_0_1px_rgba(168,85,247,0.18)]"
                      : "pulse-card-orange border-orange-500/25 shadow-[0_0_0_1px_rgba(249,115,22,0.18)]",
                  )}
                >
                  <MissionCard mission={m} />
                  {m.status === "motoboy_marcou_finalizada" ? (
                    <div className="mt-4 rounded-2xl border border-violet-500/20 bg-violet-500/10 px-3 py-2 text-sm text-violet-100">
                      O entregador pediu finalização nesta Bag. Responda para
                      liberar o próximo chamado.
                    </div>
                  ) : null}
                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        establishmentFinishMission(m.id, true);
                        playAlertTone("coin");
                        setRatingMissionId(m.id);
                        setRatingScore(5);
                        setRatingComment("");
                        setRatingTags([]);
                        setNotice(
                          `A ${missionDisplayCode(m.id)} foi finalizada. Avalie o entregador para concluir o registro.`,
                        );
                      }}
                      className="rounded-2xl border border-[#22c55e]/30 bg-[#22c55e]/12 px-4 py-3 text-sm font-medium text-[#8af3a8] transition hover:bg-[#22c55e]/18 hover:scale-[1.02] hover:shadow-[0_0_0_1px_rgba(34,197,94,0.3)]"
                    >
                      {m.status === "motoboy_marcou_finalizada"
                        ? "Aceitar finalização do entregador"
                        : "Finalizar entrega"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        playAlertTone("erro");
                        setFinishMissionId(m.id);
                        setFinishReason("");
                        setFinishCategory("estabelecimento_outros");
                      }}
                      className="rounded-2xl border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-200 transition hover:bg-rose-500/18 hover:scale-[1.02]"
                    >
                      Entrega não finalizada
                    </button>
                    {m.riderId ? (
                      <a
                        href={wa(
                          `Olá, ${m.riderName}. Precisamos alinhar a ${missionDisplayCode(m.id)}.`,
                          riderWhats(m.riderId),
                        )}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#25D366]/30 bg-[#25D366]/12 px-4 py-3 text-sm font-medium text-[#8ef5b4] transition hover:bg-[#25D366]/20"
                      >
                        <IconImage
                          name="whatsapp"
                          alt="WhatsApp"
                          className="h-5 w-5"
                        />{" "}
                        Falar com entregador
                      </a>
                    ) : null}
                  </div>
                </article>
              ))
            ) : (
              <p className="rounded-2xl border border-dashed border-white/10 px-4 py-6 text-sm text-zinc-400">
                Nenhuma Bag está em rota agora.
              </p>
            )}
          </div>
        </section>

        {finishMissionId ? (
          <section
            ref={finishBoxRef}
            className="rounded-[28px] border border-rose-500/20 bg-rose-500/10 p-5"
          >
            <SectionTitle
              eyebrow="Justificativa"
              title="Explique por que esta Bag não foi confirmada como finalizada."
            />
            <div className="mt-4 space-y-3">
              <div className="grid gap-3 sm:grid-cols-3">
                {(
                  ["entregador", "cliente", "estabelecimento_outros"] as const
                ).map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setFinishCategory(opt)}
                    className={cx(
                      "rounded-2xl border px-4 py-3 text-sm transition",
                      finishCategory === opt
                        ? "border-[#f59e0b]/30 bg-[#f59e0b]/12 text-[#ffd8a8]"
                        : "border-white/10 bg-white/[0.04] text-zinc-200 hover:bg-white/[0.08]",
                    )}
                  >
                    {opt === "entregador"
                      ? "Entregador"
                      : opt === "cliente"
                        ? "Cliente"
                        : "Estabelecimento / outros"}
                  </button>
                ))}
              </div>
              <Input
                label="Motivo"
                value={finishReason}
                onChange={setFinishReason}
                placeholder="Ex.: faltou troco, retorno incompleto..."
              />
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => {
                    establishmentFinishMission(
                      finishMissionId,
                      false,
                      `${finishCategory === "estabelecimento_outros" ? "ESTABELECIMENTO / OUTROS" : finishCategory.toUpperCase()}: ${finishReason || "Estabelecimento informou divergência na finalização."}`,
                    );
                    playAlertTone("erro");
                    setNotice(
                      `A ${missionDisplayCode(finishMissionId || "")} foi enviada ao histórico com divergência.`,
                    );
                    setFinishMissionId(null);
                    setFinishReason("");
                  }}
                  className="rounded-2xl bg-white px-4 py-3 text-sm font-medium text-[#11131b] hover:bg-zinc-100"
                >
                  Salvar motivo
                </button>
                <button
                  type="button"
                  onClick={() => setFinishMissionId(null)}
                  className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white hover:bg-white/[0.08]"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </section>
        ) : null}
      </div>
    );
  }

  function renderNonFinalized() {
    return (
      <div className="space-y-5">
        {notice ? (
          <div className="rounded-[24px] border border-sky-500/20 bg-sky-500/10 px-4 py-3 text-sm text-sky-100">
            {notice}
          </div>
        ) : null}
        <section className="rounded-[28px] border border-rose-500/20 bg-rose-500/10 p-5">
          <SectionTitle
            eyebrow="Entregas não finalizadas"
            title="Veja divergências abertas, motivos informados e reenvie quando fizer sentido."
            description="Essas Bags ficam fora do fluxo normal até você reenviar para a fila ou solicitar devolução de créditos para análise."
          />
          <div className="mt-5 space-y-3">
            {divergences.length ? (
              divergences.map((m) => (
                <article
                  key={m.id}
                  className="rounded-[24px] border border-rose-500/20 bg-black/20 p-4"
                >
                  <MissionCard mission={m} compact />
                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        requeueMissionFromHistory(m.id);
                        playAlertTone("coin");
                        setNotice(
                          `A ${missionDisplayCode(m.id)} voltou para a fila com prioridade.`,
                        );
                        setSection("em-andamento");
                      }}
                      className="rounded-2xl border border-[#22c55e]/30 bg-[#22c55e]/12 px-4 py-3 text-sm font-medium text-[#8ef5b4] transition hover:bg-[#22c55e]/18"
                    >
                      Reenviar para a fila
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        requestMissionCreditReview(
                          m.id,
                          `Solicitação de devolução de créditos • ${missionDisplayCode(m.id)} • motivo registrado: ${m.finishReason || "Sem motivo"}.`,
                        );
                        playAlertTone("erro");
                        setNotice(
                          `Solicitação de devolução de créditos enviada para ${missionDisplayCode(m.id)}.`,
                        );
                      }}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white transition hover:bg-white/[0.08]"
                    >
                      Solicitar devolução de créditos
                    </button>
                  </div>
                  <p className="mt-3 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs leading-6 text-zinc-300">
                    A solicitação será enviada para análise administrativa. A
                    Chegou Motoca atua como intermediadora operacional entre
                    estabelecimento e entregador e não garante ressarcimento em
                    casos ligados a falhas internas do estabelecimento,
                    desistência do cliente, separação incorreta de pedidos,
                    indisponibilidade de itens ou demais ocorrências alheias à
                    execução do entregador.
                  </p>
                </article>
              ))
            ) : (
              <p className="rounded-2xl border border-dashed border-white/10 px-4 py-6 text-sm text-zinc-300">
                Nenhuma Bag está com divergência aberta agora.
              </p>
            )}
          </div>
        </section>
      </div>
    );
  }

  function renderHistory() {
    return (
      <div className="space-y-5">
        {notice ? (
          <div className="rounded-[24px] border border-sky-500/20 bg-sky-500/10 px-4 py-3 text-sm text-sky-100">
            {notice}
          </div>
        ) : null}
        <section className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <SectionTitle
              eyebrow="Histórico"
              title="Veja finalizações do dia, divergências e tudo o que precisa de mediação."
            />
            <HelpHint title="Dúvida rápida">{help.historico}</HelpHint>
          </div>
          <div className="mt-5 grid gap-5 xl:grid-cols-2">
            <div className="space-y-3">
              <p className="text-sm font-medium text-zinc-200">Finalizadas</p>
              {finalized.length ? (
                finalized.map((m) => (
                  <article
                    key={m.id}
                    className="rounded-[24px] border border-white/10 bg-black/20 p-4"
                  >
                    <MissionCard mission={m} />
                    <div className="mt-4 grid gap-3 sm:grid-cols-3 xl:grid-cols-4">
                      <DetailCell
                        label="Entregador"
                        value={m.riderName || "Sem entregador"}
                      />
                      <DetailCell
                        label="Criada em"
                        value={new Date(m.createdAt).toLocaleString("pt-BR")}
                      />
                      <DetailCell
                        label="Finalizada em"
                        value={
                          m.establishmentFinishedAt
                            ? new Date(
                                m.establishmentFinishedAt,
                              ).toLocaleString("pt-BR")
                            : "Sem data"
                        }
                      />
                      <DetailCell
                        label="Avaliação"
                        value={
                          m.rating
                            ? `${m.rating.score} ★${m.rating.tags?.length ? ` • ${m.rating.tags.join(", ")}` : ""}`
                            : "Pendente"
                        }
                      />
                    </div>
                    {m.riderId ? (
                      <div className="mt-4 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setRatingMissionId(m.id);
                            setRatingScore(m.rating?.score || 5);
                            setRatingComment(m.rating?.comment || "");
                            setRatingTags(m.rating?.tags || []);
                          }}
                          className="rounded-2xl border border-[#f59e0b]/25 bg-[#f59e0b]/10 px-4 py-3 text-sm font-bold text-[#ffd8a8] hover:bg-[#f59e0b]/16"
                        >
                          {m.rating ? "Editar avaliação" : "Avaliar entregador"}
                        </button>
                        {riderWhats(m.riderId) ? (
                          <a
                            href={wa(
                              `Olá, ${m.riderName || "motoboy"}. Sobre a ${missionDisplayCode(m.id)}.`,
                              riderWhats(m.riderId),
                            )}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 rounded-2xl border border-[#25D366]/30 bg-[#25D366]/12 px-4 py-3 text-sm font-bold text-[#8ef5b4] hover:bg-[#25D366]/20"
                          >
                            <IconImage
                              name="whatsapp"
                              alt="WhatsApp"
                              className="h-5 w-5"
                            />{" "}
                            Falar com entregador
                          </a>
                        ) : null}
                      </div>
                    ) : null}
                  </article>
                ))
              ) : (
                <p className="rounded-2xl border border-dashed border-white/10 px-4 py-6 text-sm text-zinc-400">
                  Ainda não há Bags finalizadas.
                </p>
              )}
            </div>
            <div className="space-y-3">
              <p className="text-sm font-medium text-zinc-200">Divergências</p>
              {divergences.length ? (
                divergences.map((m) => (
                  <article
                    key={m.id}
                    className="rounded-[24px] border border-rose-500/20 bg-rose-500/10 p-4"
                  >
                    <MissionCard mission={m} />
                    <div className="mt-4 flex flex-wrap gap-3">
                      <a
                        href={wa(
                          `Solicitação de análise administrativa sobre ${missionDisplayCode(m.id)}. Motivo registrado: ${m.finishReason || "Sem motivo detalhado"}.`,
                          platformConfig.telefoneAdminWhatsApp,
                        )}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#25D366]/30 bg-[#25D366]/12 px-4 py-3 text-sm font-medium text-[#8ef5b4] transition hover:bg-[#25D366]/20"
                      >
                        <IconImage
                          name="whatsapp"
                          alt="WhatsApp"
                          className="h-5 w-5"
                        />{" "}
                        Solicitar análise no WhatsApp
                      </a>
                    </div>
                  </article>
                ))
              ) : (
                <p className="rounded-2xl border border-dashed border-white/10 px-4 py-6 text-sm text-zinc-400">
                  Nenhuma divergência foi registrada até agora.
                </p>
              )}
            </div>
          </div>
        </section>
      </div>
    );
  }

  function toggleRatingTag(tag: string) {
    setRatingTags((cur) =>
      cur.includes(tag) ? cur.filter((item) => item !== tag) : [...cur, tag],
    );
  }

  function renderRatingModal() {
    if (!ratingMissionId) return null;
    const mission = [...active, ...history, ...finalized].find(
      (item) => item.id === ratingMissionId,
    );
    return (
      <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
        <section className="w-full max-w-xl rounded-[30px] border border-white/10 bg-[#0b1119] p-5 text-white shadow-[0_30px_90px_rgba(0,0,0,0.48)]">
          <p className="text-xs uppercase tracking-[0.3em] text-[#f59e0b]">
            Avaliação do entregador
          </p>
          <h2 className="mt-3 text-2xl font-black">Como foi a entrega?</h2>
          <p className="mt-2 text-sm leading-7 text-zinc-300">
            A avaliação fica no histórico do motoboy e ajuda a equipe a
            acompanhar qualidade, pontualidade e problemas de operação.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRatingScore(star)}
                className={cx(
                  "h-12 w-12 rounded-2xl border text-xl font-black",
                  star <= ratingScore
                    ? "border-[#f59e0b]/40 bg-[#f59e0b]/18 text-[#ffd8a8]"
                    : "border-white/10 bg-white/[0.04] text-zinc-400",
                )}
              >
                ★
              </button>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {[
              "pontual",
              "educado",
              "confirmou certo",
              "demorou",
              "problema na retirada",
            ].map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => toggleRatingTag(tag)}
                className={cx(
                  "rounded-full border px-3 py-2 text-xs font-bold",
                  ratingTags.includes(tag)
                    ? "border-[#22c55e]/35 bg-[#22c55e]/14 text-[#a8f7bf]"
                    : "border-white/10 bg-white/[0.04] text-zinc-300",
                )}
              >
                {tag}
              </button>
            ))}
          </div>
          <textarea
            value={ratingComment}
            onChange={(event) => setRatingComment(event.target.value)}
            className="mt-4 min-h-24 w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white outline-none"
            placeholder="Comentário opcional"
          />
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => {
                rateMission(
                  ratingMissionId,
                  ratingScore,
                  ratingComment,
                  ratingTags,
                );
                setRatingMissionId(null);
                setNotice(
                  `${mission ? missionDisplayCode(mission.id) : "Bag"} avaliada com sucesso.`,
                );
              }}
              className="cm-primary rounded-2xl px-4 py-3 text-sm font-black"
            >
              Salvar avaliação
            </button>
            <button
              type="button"
              onClick={() => setRatingMissionId(null)}
              className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-bold text-white hover:bg-white/[0.08]"
            >
              Avaliar depois
            </button>
          </div>
        </section>
      </div>
    );
  }

  const renderProfile = () => (
    <section className="space-y-5 rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
      <SectionTitle
        eyebrow="Meu perfil"
        title="Dados do estabelecimento em uma tela própria."
        description="Responsável, WhatsApp, endereço base e logo ficam organizados para evitar menus escondidos no desktop e no celular."
      />
      <div className="grid gap-2 sm:grid-cols-5">
        {[
          ["dados", "Dados"],
          ["responsavel", "Responsável"],
          ["endereco", "Endereço base"],
          ["entregas", "Raio/entregas"],
          ["logo", "Logo/foto"],
        ].map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setProfileFocus(key as EstProfileFocus)}
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

      <div className="grid gap-5 xl:grid-cols-[280px_minmax(0,1fr)]">
        <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
          <p className="text-sm font-bold text-white">Logo ou foto</p>
          <div className="mt-4 flex items-center gap-4">
            <span className="inline-flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-3xl border border-white/10 bg-white/[0.05]">
              {profilePhotoPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profilePhotoPreview}
                  alt="Logo do estabelecimento"
                  className="h-full w-full object-cover"
                />
              ) : (
                <StoreIcon className="h-7 w-7 text-zinc-400" />
              )}
            </span>
            <div className="min-w-0 text-sm text-zinc-300">
              <p className="truncate">
                {profilePhotoName || "Sem imagem enviada"}
              </p>
              <button
                type="button"
                onClick={() => establishmentLogoRef.current?.click()}
                className="mt-3 rounded-2xl border border-[#22c55e]/25 bg-[#22c55e]/10 px-4 py-2 text-xs font-bold text-[#9ef5b4] hover:bg-[#22c55e]/16"
              >
                {profilePhotoPreview ? "Modificar imagem" : "Enviar imagem"}
              </button>
              <input
                ref={establishmentLogoRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={readProfileImage}
              />
            </div>
          </div>
        </div>

        <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
          {profileFocus === "dados" ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm text-zinc-300">
                Nome do estabelecimento
                <input
                  value={profileDraft.nome}
                  onChange={(e) => setProfileField("nome", e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-[#0b1119] px-4 py-3 text-white outline-none focus:border-[#22c55e]/50"
                />
              </label>
              <label className="text-sm text-zinc-300">
                CNPJ/CPF
                <input
                  value={profileDraft.documento}
                  onChange={(e) => setProfileField("documento", e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-[#0b1119] px-4 py-3 text-white outline-none focus:border-[#22c55e]/50"
                />
              </label>
              <label className="text-sm text-zinc-300 sm:col-span-2">
                Cidade / operação
                <input
                  value={profileDraft.cidade}
                  onChange={(e) => setProfileField("cidade", e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-[#0b1119] px-4 py-3 text-white outline-none focus:border-[#22c55e]/50"
                />
              </label>
            </div>
          ) : null}

          {profileFocus === "responsavel" ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm text-zinc-300">
                Responsável
                <input
                  value={profileDraft.responsavel}
                  onChange={(e) =>
                    setProfileField("responsavel", e.target.value)
                  }
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
              <label className="text-sm text-zinc-300 sm:col-span-2">
                E-mail
                <input
                  value={profileDraft.email}
                  onChange={(e) => setProfileField("email", e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-[#0b1119] px-4 py-3 text-white outline-none focus:border-[#22c55e]/50"
                />
              </label>
            </div>
          ) : null}

          {profileFocus === "endereco" ? (
            <div className="space-y-3">
              <label className="text-sm text-zinc-300">
                Endereço base
                <textarea
                  value={profileDraft.endereco}
                  onChange={(e) => {
                    setProfileField("endereco", e.target.value);
                    setBaseAddress(e.target.value);
                  }}
                  className="mt-2 min-h-28 w-full rounded-2xl border border-white/10 bg-[#0b1119] px-4 py-3 text-white outline-none focus:border-[#22c55e]/50"
                  placeholder="Rua, número, bairro, cidade..."
                />
              </label>
              <p className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-[#ffd8a8]">
                O endereço base ajuda em futuras regras de raio, distância e
                cálculo de entrega normal/distante.
              </p>
            </div>
          ) : null}


          {profileFocus === "entregas" ? (
            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-[1fr_150px]">
                <label className="text-sm text-zinc-300">
                  Endereço usado como base
                  <input
                    value={baseAddress}
                    onChange={(e) => setBaseAddress(e.target.value)}
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-[#0b1119] px-4 py-3 text-white outline-none focus:border-[#22c55e]/50"
                    placeholder="Rua, número, bairro, cidade..."
                  />
                </label>
                <label className="text-sm text-zinc-300">
                  Raio normal
                  <div className="mt-2 grid grid-cols-[1fr_auto] overflow-hidden rounded-2xl border border-white/10 bg-[#0b1119] focus-within:border-[#22c55e]/50">
                    <input
                      value={distanceRadiusKm}
                      onChange={(e) => setDistanceRadiusKm(e.target.value.replace(/[^0-9,.]/g, ""))}
                      inputMode="decimal"
                      className="bg-transparent px-4 py-3 text-white outline-none"
                      placeholder="3"
                    />
                    <span className="inline-flex items-center border-l border-white/10 px-3 text-sm font-bold text-zinc-400">km</span>
                  </div>
                </label>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={saveRouteSettingsFromAddress}
                  className="cm-primary rounded-2xl px-5 py-3 text-sm font-black"
                >
                  Salvar raio e localizar endereço
                </button>
                <button
                  type="button"
                  onClick={useCurrentLocationForBase}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-sky-400/30 bg-sky-400/12 px-5 py-3 text-sm font-bold text-sky-100 hover:bg-sky-400/18"
                >
                  <LocationIcon className="h-4 w-4" /> Usar minha localização
                </button>
              </div>
              <p className="rounded-2xl border border-[#22c55e]/20 bg-[#22c55e]/10 px-4 py-3 text-sm leading-6 text-[#d7ffe4]">
                Quando a entrega tiver endereço reconhecido, o app calcula a distância aproximada da base. Se passar do raio normal, a entrega entra como distante e usa o valor de entrega distante.
              </p>
              <p className="text-xs leading-5 text-zinc-500">
                Base atual: {baseLatitude !== undefined && baseLongitude !== undefined ? `${baseLatitude.toFixed(5)}, ${baseLongitude.toFixed(5)}` : "endereço ainda não localizado"}.
              </p>
            </div>
          ) : null}

          {profileFocus === "logo" ? (
            <p className="rounded-2xl border border-sky-500/20 bg-sky-500/10 px-4 py-3 text-sm text-sky-100">
              Use a prévia ao lado para conferir a imagem. Se quiser trocar,
              clique em “Modificar imagem”.
            </p>
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
              onClick={() => setSection("visao-geral")}
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
    if (section === "visao-geral") return renderOverview();
    if (section === "nova-solicitacao") return renderBag();
    if (section === "creditos") return renderCredits();
    if (section === "em-andamento") return renderRunning();
    if (section === "nao-finalizadas") return renderNonFinalized();
    if (section === "perfil") return renderProfile();
    return renderHistory();
  };

  return (
    <main className="cm-page pb-24 text-white">
      <div className="mx-auto flex min-h-screen max-w-[1580px] flex-col gap-5 px-4 py-4 lg:px-6">
        <BrandHeader
          profileLabel={profileDraft.nome || establishment.nome}
          profileRole="Estabelecimento"
          profileImageUrl={
            profilePhotoPreview || establishment.profilePhotoDataUrl
          }
          onLogoClick={() => {
            setSection("visao-geral");
            setMenuOpen(false);
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          onProfileAction={openProfileFromHeader}
        />
        {renderRatingModal()}
        {section === "visao-geral" ? (
          <section className="rounded-[28px] border border-white/10 bg-[#0b1119] p-4 shadow-[0_18px_50px_rgba(0,0,0,0.22)] xl:hidden">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.34em] text-[#f59e0b]">
                  Estabelecimento
                </p>
                <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white">
                  {establishment.nome}
                </h1>
              </div>
              <button
                type="button"
                onClick={() => {
                  clearAppSession();
                  window.location.href = "/login";
                }}
                className="cm-danger inline-flex h-12 items-center justify-center rounded-2xl border px-4 text-sm"
              >
                Sair
              </button>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setSection("nova-solicitacao")}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#f59e0b]/25 bg-[#f59e0b]/10 px-4 py-3 text-sm font-medium text-[#ffd8a8]"
              >
                <IconImage
                  name="entregador-na-moto-preto-cinza"
                  alt=""
                  className="h-6 w-6"
                />{" "}
                Nova Bag
              </button>
              <button
                type="button"
                onClick={() => setSection("em-andamento")}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-sky-500/20 bg-sky-500/10 px-4 py-3 text-sm text-sky-100"
              >
                <IconImage
                  name="entrega-em-andamento"
                  alt=""
                  className="h-6 w-6"
                />{" "}
                Acompanhar
              </button>
            </div>
          </section>
        ) : null}
        <div className="grid gap-5 xl:grid-cols-[300px_minmax(0,1fr)]">
          <aside className="cm-sidebar hidden rounded-[32px] p-5 xl:block">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.34em] text-[#f59e0b]">
                  Estabelecimento
                </p>
                <h1 className="mt-3 text-[2.1rem] font-semibold leading-[1.05] tracking-tight text-white">
                  {establishment.nome}
                </h1>
                <p className="mt-4 max-w-[22ch] text-base leading-8 text-zinc-300">
                  Use a Bag para agrupar entregas, solicitar entregador e
                  confirmar o retorno da operação.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setMenuOpen((c) => !c)}
                className="inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-[#22c55e]/20 bg-[#22c55e]/10 text-[#8af3a8] xl:hidden"
              >
                <IconImage
                  name="estabelecimento-colorido"
                  alt="Estabelecimento"
                  className="h-7 w-7"
                />
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
                Créditos disponíveis
              </p>
              <p className="mt-3 text-3xl font-semibold tracking-tight text-white">
                R$ {store.creditApproved.toFixed(2).replace(".", ",")}
              </p>
              <p className="mt-3 text-sm leading-6 text-zinc-300">
                Isso cobre aproximadamente {normalEstimate} entregas normais.
              </p>
              <p className="mt-2 text-xs leading-6 text-zinc-400">
                Entregas distantes usam o mesmo saldo, mas com valor diferente
                por entrega.
              </p>
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => setSection("creditos")}
                  className="inline-flex items-center gap-2 rounded-xl border border-[#22c55e]/30 bg-[#22c55e]/12 px-3 py-2 text-xs text-[#8af3a8] hover:bg-[#22c55e]/18"
                >
                  <IconImage name="creditos" alt="" className="h-5 w-5" />{" "}
                  Adicionar créditos
                </button>
                <button
                  type="button"
                  onClick={() => {
                    clearAppSession();
                    window.location.href = "/login";
                  }}
                  className="cm-danger rounded-xl border px-3 py-2 text-xs"
                >
                  Sair
                </button>
              </div>
            </div>
          </aside>
          <section className="space-y-5">{renderSection()}</section>
          <div className="xl:col-span-2">
            <AppFooter compact />
          </div>
        </div>
        <nav className="cm-bottom-nav flex items-center justify-between px-2 py-2 xl:hidden">
          {menu.map(([key, label, icon]) => (
            <button
              key={key}
              type="button"
              onClick={() => setSection(key as SectionKey)}
              aria-current={section === key ? "page" : undefined}
              className={cx(
                "flex min-w-0 flex-1 flex-col items-center gap-1 rounded-2xl px-1 py-2 text-[10px] transition",
                section === key ? "cm-nav-active" : "",
                key === "em-andamento" &&
                  awaiting.length +
                    pickup.length +
                    route.length +
                    riderDone.length >
                    0
                  ? "cm-nav-alert"
                  : "",
              )}
            >
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03]">
                {icon}
              </span>
              <span className="truncate">
                {label
                  .replace("Visão geral", "Início")
                  .replace("Nova solicitação", "Nova")
                  .replace("Bags em andamento", "Bags")
                  .replace("Não finalizadas", "Alertas")}
              </span>
            </button>
          ))}
        </nav>
      </div>
    </main>
  );
}
