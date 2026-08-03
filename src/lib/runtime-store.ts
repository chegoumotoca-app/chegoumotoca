"use client";

import { useEffect, useState } from "react";
import { bairrosTaquaritingaExemplo, platformConfig } from "@/lib/mock-data";
import { hasSupabaseEnv, supabase } from "@/lib/supabase";
import { getAppSession } from "@/lib/auth";
import {
  fetchRemoteStore,
  persistAcceptMission,
  persistAddAdminUser,
  persistAddRegisteredEstablishment,
  persistAddRegisteredRider,
  persistApproveRegistrationApplication,
  persistRejectRegistrationApplication,
  persistRegistrationApplication,
  persistApproveCreditRequest,
  persistArchiveExpiredAvailableMission,
  persistCancelAvailableMission,
  persistCancelMissionByEstablishment,
  persistConfirmMissionByEstablishment,
  persistEstablishmentFinishMission,
  persistEstablishmentMarkInDelivery,
  persistHideMissionForRider,
  persistMarkMissionPaid,
  persistPublishMission,
  persistRejectMissionByEstablishment,
  persistRemoveRegisteredEstablishment,
  persistRemoveRegisteredRider,
  persistResetEntityPassword,
  persistResetAdminPassword,
  persistSetAdminActive,
  persistRemoveAdminAccess,
  persistSetRegisteredRiderStatus,
  persistSetRegisteredEstablishmentStatus,
  persistRequeueMission,
  persistRequestCredits,
  persistRequestMissionCreditReview,
  persistRiderAddProof,
  persistRiderMarkFinished,
  persistRiderRequestCancel,
  persistRiderWithdrawAcceptance,
  persistSetRiderAvailability,
  persistUpdateOperationalSettings,
  persistRateMission,
  persistSubmitAppFeedback,
  persistUpdateAppFeedbackStatus,
  persistUpdateRegisteredEstablishmentRouteSettings,
} from "@/lib/runtime-store-supabase";

export type DeliveryPaymentMethod = "PIX do cliente" | "Dinheiro" | "Cartão / maquininha da casa";

export type DeliveryItem = {
  id: string;
  clienteNome: string;
  clienteTelefone?: string;
  descricaoPedido: string;
  numeroComanda: string;
  cep: string;
  rua: string;
  numero: string;
  complemento?: string;
  bairro: string;
  cidade: string;
  uf: string;
  referencia?: string;
  observacao?: string;
  pagamentoCliente: DeliveryPaymentMethod;
  tipo: "normal" | "distante";
  valor: number;
  latitude?: number;
  longitude?: number;
  distanciaKm?: number;
};

export type MissionStatus =
  | "disponivel"
  | "aguardando_confirmacao_estabelecimento"
  | "aguardando_retirada"
  | "em_entrega"
  | "motoboy_marcou_finalizada"
  | "finalizada_estabelecimento"
  | "divergencia_estabelecimento";

export type MissionProof = {
  id: string;
  name: string;
  uploadedAt: string;
  kind: "comprovante" | "comanda";
};

export type MissionRating = {
  score: number;
  comment?: string;
  tags?: string[];
  createdAt: string;
  ratedByEstablishmentId?: string;
};

export type Mission = {
  riderAcceptanceMessage?: string;
  id: string;
  mode?: "detalhada" | "express";
  estabelecimentoId: string;
  estabelecimentoNome: string;
  documento: string;
  deliveries: DeliveryItem[];
  total: number;
  status: MissionStatus;
  riderId?: string;
  riderName?: string;
  createdAt: string;
  acceptedAt?: string;
  confirmedAt?: string;
  startedAt?: string;
  riderFinishedAt?: string;
  establishmentFinishedAt?: string;
  finishReason?: string;
  proofs: MissionProof[];
  payoutStatus?: "pendente" | "pago";
  payoutMethod?: "pix" | "dinheiro";
  payoutAt?: string;
  commandasEsperadas: number;
  commandasEnviadas: number;
  blockedRiderIds?: string[];
  cancelFreeUntil?: string;
  pickupDeadlineAt?: string;
  routeDeadlineAt?: string;
  quickDestinationsText?: string;
  priority?: boolean;
  attempt?: number;
  riderCancelUntil?: string;
  rootMissionId?: string;
  cancelCategory?: "entregador" | "cliente" | "estabelecimento_outros";
  rating?: MissionRating;
};

export type CreditRequest = {
  id: string;
  amount: number;
  requestedAt: string;
  status: "pendente" | "aprovado" | "recusado";
  message: string;
  attachmentName?: string;
  channel: "whatsapp" | "plataforma" | "comprovante";
};

export type OperationalSettings = {
  valorNormal: number;
  valorDistante: number;
  taxaPlataformaPercentual: number;
  bairrosDistantes: string[];
  cidadeBase: string;
  ufBase: string;
  pixKey?: string;
  pixReceiverName?: string;
  supportWhatsapp?: string;
  supportEmail?: string;
  supportPhone?: string;
};


export type RegisteredEstablishment = {
  id: string;
  nome: string;
  documento: string;
  whatsapp: string;
  cidade: string;
  status: "ativo" | "pendente" | "bloqueado";
  email?: string;
  username?: string;
  accessPassword?: string;
  responsavel?: string;
  endereco?: string;
  raioNormalKm?: number;
  baseLatitude?: number;
  baseLongitude?: number;
  profilePhotoName?: string;
  profilePhotoDataUrl?: string;
};

export type RegisteredRider = {
  id: string;
  nome: string;
  whatsapp: string;
  pix: string;
  cidade: string;
  status: "online" | "offline" | "bloqueado";
  avatar?: string;
  email?: string;
  username?: string;
  accessPassword?: string;
  cpf?: string;
  placa?: string;
  profilePhotoName?: string;
  profilePhotoDataUrl?: string;
  source?: string;
};

export type RegistrationApplication = {
  id: string;
  role: "motoboy" | "estabelecimento";
  status: "pendente" | "aprovado" | "recusado";
  nome: string;
  username: string;
  email: string;
  whatsapp: string;
  password: string;
  cidade: string;
  createdAt: string;
  reviewedAt?: string;
  reviewNote?: string;
  cpf?: string;
  placa?: string;
  pix?: string;
  profilePhotoName?: string;
  profilePhotoDataUrl?: string;
  source?: string;
  documento?: string;
  responsavel?: string;
  endereco?: string;
  raioNormalKm?: number;
  baseLatitude?: number;
  baseLongitude?: number;
};


export type AppFeedback = {
  id: string;
  name: string;
  email?: string;
  whatsapp?: string;
  kind: "sugestao" | "problema" | "elogio" | "contato";
  message: string;
  status: "novo" | "em_analise" | "resolvido";
  createdAt: string;
};

export type AdminUser = {
  id: string;
  cityId?: string;
  cityLabel: string;
  role: "admin" | "superadmin";
  username: string;
  name: string;
  email?: string;
  phone?: string;
  isActive: boolean;
  createdAt?: string;
};

export type AppStore = {
  creditApproved: number;
  pendingCreditRequests: CreditRequest[];
  availableMissions: Mission[];
  activeMissions: Mission[];
  missionHistory: Mission[];
  riderStatus: Record<string, "online" | "offline">;
  riderHiddenMissionIds: Record<string, string[]>;
  settings: OperationalSettings;
  registeredEstablishments: RegisteredEstablishment[];
  registeredRiders: RegisteredRider[];
  pendingRegistrations: RegistrationApplication[];
  adminUsers: AdminUser[];
  feedbacks: AppFeedback[];
};

const STORE_KEY = "chegoumotoca:runtime-store:v39";
const LEGACY_STORE_KEYS = [
  "chegoumotoca:runtime-store:v38",
  "chegoumotoca:runtime-store:v37",
  "chegoumotoca:runtime-store:v36",
  "chegoumotoca:runtime-store:v35",
  "chegoumotoca:runtime-store:v34",
  "chegoumotoca:runtime-store:v33",
  "chegoumotoca:runtime-store:v32",
];
const STORE_EVENT = "chegoumotoca:store-update";
const nowIso = () => new Date().toISOString();

let remoteRefreshTimer: number | null = null;

async function refreshStoreFromSupabase(force = false) {
  if (!hasSupabaseEnv() || !supabase) return null;
  try {
    const remote = await fetchRemoteStore(defaults(), defaultSettings);
    if (remote) {
      saveStore(remote);
      return remote;
    }
  } catch (error) {
    if (force) console.error("[runtime-store] supabase refresh failed", error);
  }
  return null;
}

function scheduleRemoteRefresh(delay = 250) {
  if (typeof window === "undefined" || !hasSupabaseEnv() || !supabase) return;
  if (remoteRefreshTimer) window.clearTimeout(remoteRefreshTimer);
  remoteRefreshTimer = window.setTimeout(() => {
    void refreshStoreFromSupabase(true);
  }, delay);
}

function currentEstablishmentFromStore(cur: AppStore) {
  const session = getAppSession();
  const bySession = session?.role === "estabelecimento" && session.entityId ? cur.registeredEstablishments.find((item) => item.id === session.entityId) : undefined;
  const fallbackByCity = session?.role === "estabelecimento" ? cur.registeredEstablishments.find((item) => item.status !== "bloqueado") : undefined;
  return bySession ?? fallbackByCity ?? {
    id: "sem-estabelecimento",
    nome: "Estabelecimento não autenticado",
    documento: "",
    whatsapp: "",
    cidade: session?.cityName || "Taquaritinga/SP",
    status: "pendente" as const,
  };
}

function currentRiderFromStore(cur: AppStore) {
  const session = getAppSession();
  const bySession = session?.role === "motoboy" && session.entityId ? cur.registeredRiders.find((item) => item.id === session.entityId) : undefined;
  const fallbackByCity = session?.role === "motoboy" ? cur.registeredRiders.find((item) => item.status !== "bloqueado") : undefined;
  return bySession ?? fallbackByCity ?? {
    id: "sem-motoboy",
    nome: "Motoboy não autenticado",
    whatsapp: "",
    pix: "",
    cidade: session?.cityName || "Taquaritinga/SP",
    status: "offline" as const,
    avatar: "",
  };
}

function missionDateStamp(date = new Date()) {
  return `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;
}

function nextMissionSequence(cur: AppStore, stamp: string) {
  const all = [...cur.availableMissions, ...cur.activeMissions, ...cur.missionHistory];
  return all.filter((item) => item.id.startsWith(`BAG-${stamp}-`)).length + 1;
}

function missionCodeFor(date: Date, seq: number) {
  return `BAG-${missionDateStamp(date)}-${String(seq).padStart(3, "0")}`;
}

export function missionDisplayCode(id: string) {
  const match = id.match(/^BAG-(\d{4})(\d{2})(\d{2})-(\d{3})$/);
  if (!match) return id;
  return `BAG ${match[3]}/${match[2]}/${match[1]} • ${match[4]}`;
}

const defaultSettings: OperationalSettings = {
  valorNormal: platformConfig.valorNormal,
  valorDistante: platformConfig.valorDistante,
  taxaPlataformaPercentual: platformConfig.taxaPercentualMotoboy,
  bairrosDistantes: bairrosTaquaritingaExemplo.filter((b: any) => b.tipo === "distante").map((b: any) => b.nome),
  cidadeBase: "Taquaritinga",
  ufBase: "SP",
  pixKey: "Configure a chave PIX no painel admin",
  pixReceiverName: "Chegou Motoca",
  supportWhatsapp: "",
  supportEmail: "",
  supportPhone: "",
};


function safeNumber(value: unknown, fallback = 0) {
  const n = typeof value === "string" ? Number(value.replace(",", ".")) : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeSettings(value: Partial<OperationalSettings> | undefined): OperationalSettings {
  return {
    ...defaultSettings,
    ...(value ?? {}),
    valorNormal: safeNumber(value?.valorNormal, defaultSettings.valorNormal),
    valorDistante: safeNumber(value?.valorDistante, defaultSettings.valorDistante),
    taxaPlataformaPercentual: safeNumber(value?.taxaPlataformaPercentual, defaultSettings.taxaPlataformaPercentual),
    bairrosDistantes: Array.isArray(value?.bairrosDistantes) ? value!.bairrosDistantes : defaultSettings.bairrosDistantes,
    cidadeBase: value?.cidadeBase || defaultSettings.cidadeBase,
    ufBase: value?.ufBase || defaultSettings.ufBase,
  };
}

const defaults = (): AppStore => ({
  creditApproved: 0,
  pendingCreditRequests: [],
  availableMissions: [],
  activeMissions: [],
  missionHistory: [],
  riderStatus: {},
  riderHiddenMissionIds: {},
  settings: defaultSettings,
  registeredEstablishments: [],
  registeredRiders: [],
  pendingRegistrations: [],
  adminUsers: [],
  feedbacks: [],
});

const emit = () => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(STORE_EVENT));
  }
};



export function onlyDigits(value: string | undefined | null) {
  return String(value || "").replace(/\D/g, "");
}

export function normalizeLookup(value: string | undefined | null) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "")
    .trim();
}

function sanitizePublicText(value: unknown) {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) return undefined;
  if (text.startsWith("data:") || text.length > 180 || /^[A-Za-z0-9+/=_-]{80,}$/.test(text)) return undefined;
  return text;
}

export function findRegistrationConflict(payload: { id?: string; role?: string; username?: string; email?: string; whatsapp?: string; cpf?: string; documento?: string; placa?: string }) {
  const store = loadStore();
  const username = normalizeLookup(payload.username);
  const email = normalizeLookup(payload.email);
  const phone = onlyDigits(payload.whatsapp);
  const documentNumber = onlyDigits(payload.role === "estabelecimento" ? payload.documento : payload.cpf || payload.documento);
  const plate = normalizeLookup(payload.placa);

  const pending = (store.pendingRegistrations || []).filter((item) => item.status === "pendente" && item.id !== payload.id);
  const allPeople = [
    ...store.registeredRiders.map((item) => ({ kind: "entregador", username: item.username, email: item.email, whatsapp: item.whatsapp, document: item.cpf, placa: item.placa })),
    ...store.registeredEstablishments.map((item) => ({ kind: "estabelecimento", username: item.username, email: item.email, whatsapp: item.whatsapp, document: item.documento, placa: undefined })),
    ...pending.map((item) => ({ kind: item.role === "motoboy" ? "cadastro de entregador pendente" : "cadastro de estabelecimento pendente", username: item.username, email: item.email, whatsapp: item.whatsapp, document: item.role === "motoboy" ? item.cpf : item.documento, placa: item.placa })),
  ];

  if (username && allPeople.some((item) => normalizeLookup(item.username) === username)) return { field: "username", message: "Este nome de usuário já está cadastrado ou em análise." };
  if (email && allPeople.some((item) => normalizeLookup(item.email) === email)) return { field: "email", message: "Este e-mail já está vinculado a uma conta no Chegou Motoca." };
  if (phone && allPeople.some((item) => onlyDigits(item.whatsapp) === phone)) return { field: "whatsapp", message: "Este WhatsApp já está vinculado a uma conta no Chegou Motoca." };
  if (documentNumber && allPeople.some((item) => onlyDigits(item.document) === documentNumber)) return { field: payload.role === "estabelecimento" ? "documento" : "cpf", message: "Este CPF/CNPJ já possui cadastro ou análise no Chegou Motoca." };
  if (payload.role === "motoboy" && plate && allPeople.some((item) => normalizeLookup(item.placa) === plate)) return { field: "placa", message: "Esta placa já está cadastrada ou em análise." };
  return null;
}

function cleanMissionList(value: unknown): Mission[] {
  return Array.isArray(value)
    ? value.map((mission: any) => ({
        ...mission,
        total: safeNumber(mission?.total, 0),
        deliveries: Array.isArray(mission?.deliveries) ? mission.deliveries.map((delivery: any) => ({ ...delivery, valor: safeNumber(delivery?.valor, 0) })) : [],
        proofs: Array.isArray(mission?.proofs) ? mission.proofs : [],
        riderAcceptanceMessage: sanitizePublicText(mission?.riderAcceptanceMessage),
        blockedRiderIds: Array.isArray(mission?.blockedRiderIds) ? mission.blockedRiderIds : [],
        commandasEsperadas: Number.isFinite(Number(mission?.commandasEsperadas)) ? Number(mission.commandasEsperadas) : Array.isArray(mission?.deliveries) ? mission.deliveries.length : 0,
        commandasEnviadas: Number.isFinite(Number(mission?.commandasEnviadas)) ? Number(mission.commandasEnviadas) : 0,
      }))
    : [];
}

function normalizeStore(parsed: Partial<AppStore>): AppStore {
  const base = defaults();
  return {
    ...base,
    ...parsed,
    creditApproved: Number(parsed.creditApproved || 0),
    pendingCreditRequests: Array.isArray(parsed.pendingCreditRequests)
      ? parsed.pendingCreditRequests.map((item: any) => ({ ...item, amount: safeNumber(item?.amount, 0) }))
      : [],
    availableMissions: cleanMissionList(parsed.availableMissions),
    activeMissions: cleanMissionList(parsed.activeMissions),
    missionHistory: cleanMissionList(parsed.missionHistory),
    riderStatus: parsed.riderStatus && typeof parsed.riderStatus === "object" ? parsed.riderStatus : {},
    riderHiddenMissionIds: parsed.riderHiddenMissionIds && typeof parsed.riderHiddenMissionIds === "object" ? parsed.riderHiddenMissionIds : {},
    settings: normalizeSettings(parsed.settings),
    registeredEstablishments: Array.isArray(parsed.registeredEstablishments) ? parsed.registeredEstablishments : [],
    registeredRiders: Array.isArray(parsed.registeredRiders) ? parsed.registeredRiders : [],
    pendingRegistrations: Array.isArray(parsed.pendingRegistrations) ? parsed.pendingRegistrations : [],
    adminUsers: Array.isArray(parsed.adminUsers) ? parsed.adminUsers : [],
    feedbacks: Array.isArray(parsed.feedbacks) ? parsed.feedbacks : [],
  } as AppStore;
}

export function loadStore(): AppStore {
  if (typeof window === "undefined") {
    return defaults();
  }

  const raw = window.localStorage.getItem(STORE_KEY);
  if (!raw) {
    LEGACY_STORE_KEYS.forEach((key) => window.localStorage.removeItem(key));
    const d = defaults();
    window.localStorage.setItem(STORE_KEY, JSON.stringify(d));
    return d;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<AppStore>;
    return normalizeStore(parsed);
  } catch {
    const d = defaults();
    window.localStorage.setItem(STORE_KEY, JSON.stringify(d));
    return d;
  }
}

export function saveStore(next: AppStore) {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(STORE_KEY, JSON.stringify(next));
  emit();
}

export function useRuntimeStore() {
  const [store, setStore] = useState<AppStore>(defaults());

  useEffect(() => {
    setStore(loadStore());
    const sync = () => setStore(loadStore());
    window.addEventListener(STORE_EVENT, sync);
    window.addEventListener("storage", sync);
    void refreshStoreFromSupabase();
    const poll = window.setInterval(() => {
      void refreshStoreFromSupabase();
    }, 8000);
    return () => {
      window.removeEventListener(STORE_EVENT, sync);
      window.removeEventListener("storage", sync);
      window.clearInterval(poll);
    };
  }, []);

  return store;
}

function mutate(fn: (cur: AppStore) => AppStore) {
  saveStore(fn(loadStore()));
}
function addMinutes(iso: string, minutes: number) {
  const base = new Date(iso);
  base.setMinutes(base.getMinutes() + minutes);
  return base.toISOString();
}

function withinMinutes(iso: string | undefined, minutes: number) {
  if (!iso) return false;
  return Date.now() <= new Date(iso).getTime() + minutes * 60_000;
}

function estimateRouteDeadline(mission: Mission) {
  const normalCount = mission.deliveries.filter((item) => item.tipo === "normal").length;
  const distantCount = mission.deliveries.filter((item) => item.tipo === "distante").length;
  const totalMinutes = Math.max(15, normalCount * 10 + distantCount * 15 + 5);
  return addMinutes(mission.startedAt ?? nowIso(), totalMinutes);
}

function createRetriedMission(cur: AppStore, mission: Mission, blockedExtra?: string[]) {
  const now = new Date();
  return {
    ...mission,
    id: mission.id,
    rootMissionId: mission.rootMissionId ?? mission.id,
    attempt: (mission.attempt ?? 1) + 1,
    priority: true,
    status: "disponivel" as const,
    riderId: undefined,
    riderName: undefined,
    riderAcceptanceMessage: undefined,
    acceptedAt: undefined,
    confirmedAt: undefined,
    startedAt: undefined,
    riderFinishedAt: undefined,
    establishmentFinishedAt: undefined,
    finishReason: undefined,
    cancelCategory: undefined,
    cancelFreeUntil: undefined,
    pickupDeadlineAt: undefined,
    routeDeadlineAt: undefined,
    riderCancelUntil: undefined,
    payoutStatus: "pendente" as const,
    payoutMethod: undefined,
    payoutAt: undefined,
    blockedRiderIds: Array.from(new Set([...(mission.blockedRiderIds ?? []), ...(blockedExtra ?? [])])),
    createdAt: nowIso(),
  };
}

export function parseFinishCategory(reason?: string) {
  const text = (reason || "").toLowerCase();
  if (text.startsWith("ENTREGADOR:".toLowerCase())) return "entregador" as const;
  if (text.startsWith("CLIENTE:".toLowerCase())) return "cliente" as const;
  if (text.startsWith("ESTABELECIMENTO_OUTROS:".toLowerCase()) || text.startsWith("ESTABELECIMENTO / OUTROS:".toLowerCase())) return "estabelecimento_outros" as const;
  return undefined;
}



export function platformFeePercent(settings = loadStore().settings) {
  const value = Number(settings.taxaPlataformaPercentual);
  return Number.isFinite(value) ? Math.max(0, Math.min(value, 40)) : 10;
}

export function missionPlatformFee(mission: Mission, settings = loadStore().settings) {
  return mission.total * (platformFeePercent(settings) / 100);
}

export function missionRiderPayout(mission: Mission, settings = loadStore().settings) {
  return Math.max(0, mission.total - missionPlatformFee(mission, settings));
}

export function formatCurrencyBR(value: number) {
  return `R$ ${value.toFixed(2).replace(".", ",")}`;
}

export function missionCountdownLabel(mission: Mission) {
  const target = mission.status === "aguardando_retirada" ? mission.pickupDeadlineAt : mission.status === "em_entrega" || mission.status === "motoboy_marcou_finalizada" ? mission.routeDeadlineAt : undefined;
  if (!target) return null;
  const diff = new Date(target).getTime() - Date.now();
  if (diff <= 0) return "Tempo excedido";
  const min = Math.floor(diff / 60000);
  const sec = Math.floor((diff % 60000) / 1000);
  return `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

export function missionCountdownTone(mission: Mission) {
  const target = mission.status === "aguardando_retirada" ? mission.pickupDeadlineAt : mission.status === "em_entrega" || mission.status === "motoboy_marcou_finalizada" ? mission.routeDeadlineAt : undefined;
  if (!target) return "slate" as const;
  const diff = new Date(target).getTime() - Date.now();
  if (diff <= 0) return "red" as const;
  if (diff < 5 * 60000) return "red" as const;
  if (diff < 10 * 60000) return "orange" as const;
  return "blue" as const;
}


export function acceptMission(missionId: string, riderId: string, riderName: string, message?: string) {
  mutate((cur) => {
    const mission = cur.availableMissions.find((m) => m.id === missionId && m.status === "disponivel");
    if (!mission) return cur;
    if ((mission.blockedRiderIds ?? []).includes(riderId)) return cur;
    void persistAcceptMission(missionId, riderId, message?.trim()).finally(() => scheduleRemoteRefresh());
    return {
      ...cur,
      availableMissions: cur.availableMissions.filter((m) => m.id !== missionId),
      activeMissions: [
        {
          ...mission,
          riderId,
          riderName,
          riderAcceptanceMessage: message?.trim() || undefined,
          status: "aguardando_confirmacao_estabelecimento",
          acceptedAt: nowIso(),
          riderCancelUntil: addMinutes(nowIso(), 1),
          priority: mission.priority ?? false,
          attempt: mission.attempt ?? 1,
          rootMissionId: mission.rootMissionId ?? mission.id,
        },
        ...cur.activeMissions,
      ],
    };
  });
}

export function confirmMissionByEstablishment(missionId: string) {
  mutate((cur) => {
    const mission = cur.activeMissions.find((m) => m.id === missionId && m.status === "aguardando_confirmacao_estabelecimento");
    if (!mission) return cur;
    const confirmedAt = nowIso();
    void persistConfirmMissionByEstablishment(missionId).finally(() => scheduleRemoteRefresh());
    return {
      ...cur,
      creditApproved: Math.max(0, cur.creditApproved - mission.total),
      activeMissions: cur.activeMissions.map((m) =>
        m.id === missionId
          ? {
              ...m,
              status: "aguardando_retirada",
              confirmedAt,
              cancelFreeUntil: addMinutes(confirmedAt, 1),
              pickupDeadlineAt: addMinutes(confirmedAt, 15),
            }
          : m,
      ),
    };
  });
}

export function rejectMissionByEstablishment(missionId: string, reason?: string) {
  mutate((cur) => {
    const mission = cur.activeMissions.find((m) => m.id === missionId && m.status === "aguardando_confirmacao_estabelecimento");
    if (!mission) return cur;
    const blocked = mission.riderId
      ? Array.from(new Set([...(mission.blockedRiderIds ?? []), mission.riderId]))
      : mission.blockedRiderIds;
    void persistRejectMissionByEstablishment(missionId, reason).finally(() => scheduleRemoteRefresh());
    return {
      ...cur,
      activeMissions: cur.activeMissions.filter((m) => m.id !== missionId),
      availableMissions: [
        {
          ...mission,
          status: "disponivel",
          riderId: undefined,
          riderName: undefined,
          riderAcceptanceMessage: undefined,
          acceptedAt: undefined,
          confirmedAt: undefined,
          cancelFreeUntil: undefined,
          pickupDeadlineAt: undefined,
          routeDeadlineAt: undefined,
          blockedRiderIds: blocked,
          finishReason: reason,
          riderCancelUntil: undefined,
        },
        ...cur.availableMissions,
      ],
    };
  });
}


export function requestCredits(amount: number, opts?: { attachmentName?: string; channel?: CreditRequest["channel"] }) {
  if (!amount || amount < loadStore().settings.valorNormal) {
    return;
  }

  mutate((cur) => ({
    ...cur,
    pendingCreditRequests: [
      {
        id: `cred-${Date.now()}`,
        amount,
        requestedAt: nowIso(),
        status: "pendente",
        attachmentName: opts?.attachmentName,
        channel: opts?.channel ?? (opts?.attachmentName ? "comprovante" : "plataforma"),
        message: `${currentEstablishmentFromStore(cur).nome} solicitou R$ ${amount.toFixed(2).replace(".", ",")} em créditos. ${opts?.attachmentName ? `Comprovante: ${opts.attachmentName}. ` : ""}Aguardando conferência do administrador.`,
      },
      ...cur.pendingCreditRequests,
    ],
  }));
  void persistRequestCredits(amount, opts?.attachmentName, opts?.channel ?? (opts?.attachmentName ? "comprovante" : "plataforma")).finally(() => scheduleRemoteRefresh());
}

export function approveCreditRequest(id: string) {
  mutate((cur) => {
    const req = cur.pendingCreditRequests.find((i) => i.id === id && i.status === "pendente");
    if (!req) {
      return cur;
    }

    void persistApproveCreditRequest(id).finally(() => scheduleRemoteRefresh());
    return {
      ...cur,
      creditApproved: cur.creditApproved + req.amount,
      pendingCreditRequests: cur.pendingCreditRequests.map((i) => (i.id === id ? { ...i, status: "aprovado" } : i)),
    };
  });
}

export function setRiderAvailability(riderId: string, value: "online" | "offline") {
  mutate((cur) => ({
    ...cur,
    riderStatus: { ...cur.riderStatus, [riderId]: value },
    registeredRiders: cur.registeredRiders.map((item) => item.id === riderId ? { ...item, status: value } : item),
  }));
  // Mantém a escolha do motoboy imediata no app. O Supabase sincroniza em segundo plano,
  // mas não forçamos refresh instantâneo para evitar o botão piscar e voltar ao estado anterior
  // caso a resposta remota demore alguns segundos.
  void persistSetRiderAvailability(riderId, value).catch((error) => console.error("[runtime-store] disponibilidade não sincronizou", error));
}

function sendNewBagPush(mission: Mission) {
  if (typeof window === "undefined") return;
  fetch("/api/push/send-bag", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      bagCode: mission.id,
      establishmentName: mission.estabelecimentoNome,
      deliveriesCount: mission.deliveries.length,
      amount: mission.total,
    }),
  }).catch(() => undefined);
}

export function publishBagMission(deliveries: DeliveryItem[], mode: "detalhada" | "express" = "detalhada") {
  if (!deliveries.length) {
    return;
  }

  const total = deliveries.reduce((sum, item) => sum + item.valor, 0);
  const cur = loadStore();
  const now = new Date();
  const stamp = missionDateStamp(now);
  const currentEst = currentEstablishmentFromStore(cur);
  const mission: Mission = {
    id: missionCodeFor(now, nextMissionSequence(cur, stamp)),
    mode,
    estabelecimentoId: currentEst.id,
    estabelecimentoNome: currentEst.nome,
    documento: currentEst.documento,
    deliveries,
    total,
    status: "disponivel",
    createdAt: nowIso(),
    proofs: [],
    payoutStatus: "pendente",
    commandasEsperadas: deliveries.length,
    commandasEnviadas: 0,
  };

  saveStore({
    ...cur,
    availableMissions: [mission, ...cur.availableMissions],
  });
  void persistPublishMission(mission).finally(() => scheduleRemoteRefresh());
  sendNewBagPush(mission);
}


export function publishQuickMission(options: { normais: number; distantes: number; bairros?: string[] }) {
  const bairros = (options.bairros ?? []).map((item) => item.trim()).filter(Boolean);
  const cur = loadStore();
  const settings = cur.settings;
  const currentEst = currentEstablishmentFromStore(cur);
  const deliveries: DeliveryItem[] = [];

  for (let index = 0; index < options.normais; index += 1) {
    const bairro = bairros[index] ?? "Entrega normal";
    deliveries.push({
      id: `quick-n-${Date.now()}-${index}`,
      clienteNome: `Entrega rápida ${index + 1}`,
      clienteTelefone: "",
      descricaoPedido: "Despacho rápido sem detalhamento completo.",
      numeroComanda: "",
      cep: "",
      rua: "",
      numero: "",
      complemento: "",
      bairro,
      cidade: currentEst.cidade.split("/")[0],
      uf: currentEst.cidade.split("/")[1] || "SP",
      referencia: "",
      observacao: "Bag express",
      pagamentoCliente: "PIX do cliente",
      tipo: "normal",
      valor: settings.valorNormal,
    });
  }

  for (let index = 0; index < options.distantes; index += 1) {
    const bairro = bairros[options.normais + index] ?? "Entrega distante";
    deliveries.push({
      id: `quick-d-${Date.now()}-${index}`,
      clienteNome: `Entrega rápida ${options.normais + index + 1}`,
      clienteTelefone: "",
      descricaoPedido: "Despacho rápido sem detalhamento completo.",
      numeroComanda: "",
      cep: "",
      rua: "",
      numero: "",
      complemento: "",
      bairro,
      cidade: currentEst.cidade.split("/")[0],
      uf: currentEst.cidade.split("/")[1] || "SP",
      referencia: "",
      observacao: "Bag express",
      pagamentoCliente: "PIX do cliente",
      tipo: "distante",
      valor: settings.valorDistante,
    });
  }

  const now = new Date();
  const stamp = missionDateStamp(now);
  const mission: Mission = {
    id: missionCodeFor(now, nextMissionSequence(cur, stamp)),
    mode: "express",
    estabelecimentoId: currentEst.id,
    estabelecimentoNome: currentEst.nome,
    documento: currentEst.documento,
    deliveries,
    total: deliveries.reduce((sum, item) => sum + item.valor, 0),
    status: "disponivel",
    createdAt: nowIso(),
    proofs: [],
    payoutStatus: "pendente",
    commandasEsperadas: deliveries.length,
    commandasEnviadas: 0,
    quickDestinationsText: bairros.join(", "),
  };

  saveStore({ ...cur, availableMissions: [mission, ...cur.availableMissions] });
  void persistPublishMission(mission).finally(() => scheduleRemoteRefresh());
  sendNewBagPush(mission);
}

export function establishmentMarkInDelivery(missionId: string) {
  mutate((cur) => ({
    ...cur,
    activeMissions: cur.activeMissions.map((m) =>
      m.id === missionId ? (() => { const startedAt = m.startedAt ?? nowIso(); const updated = { ...m, status: "em_entrega" as MissionStatus, startedAt, routeDeadlineAt: (() => { const copy = { ...m, startedAt } as Mission; return estimateRouteDeadline(copy); })() } as Mission; void persistEstablishmentMarkInDelivery(updated).finally(() => scheduleRemoteRefresh()); return updated; })() : m,
    ),
  }));
}

export function cancelMissionByEstablishment(missionId: string, reason = "Cancelada pelo estabelecimento antes da retirada. Crédito devolvido.") {
  mutate((cur) => {
    const mission = cur.activeMissions.find((m) => m.id === missionId && m.status === "aguardando_retirada");
    if (!mission || !mission.confirmedAt) return cur;
    const freeWindow = mission.cancelFreeUntil ? new Date(mission.cancelFreeUntil).getTime() : 0;
    if (Date.now() > freeWindow) return cur;
    const archived: Mission = {
      ...mission,
      status: "divergencia_estabelecimento",
      establishmentFinishedAt: nowIso(),
      payoutStatus: undefined,
      finishReason: reason,
    };
    void persistCancelMissionByEstablishment(missionId, reason, mission.total).finally(() => scheduleRemoteRefresh());
    return {
      ...cur,
      creditApproved: cur.creditApproved + mission.total,
      activeMissions: cur.activeMissions.filter((m) => m.id !== missionId),
      missionHistory: [archived, ...cur.missionHistory],
    };
  });
}

export function countOnlineRiders() {
  return Object.values(loadStore().riderStatus).filter((value) => value === "online").length;
}


export function validateCpfCnpj(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 11) {
    if (/^(\d)\1{10}$/.test(digits)) return false;
    let sum = 0;
    for (let i = 0; i < 9; i += 1) sum += Number(digits[i]) * (10 - i);
    let check = (sum * 10) % 11;
    if (check === 10) check = 0;
    if (check !== Number(digits[9])) return false;
    sum = 0;
    for (let i = 0; i < 10; i += 1) sum += Number(digits[i]) * (11 - i);
    check = (sum * 10) % 11;
    if (check === 10) check = 0;
    return check === Number(digits[10]);
  }

  if (digits.length === 14) {
    if (/^(\d)\1{13}$/.test(digits)) return false;
    const calc = (size: number) => {
      let numbers = digits.substring(0, size);
      let sum = 0;
      let pos = size - 7;
      for (let i = size; i >= 1; i -= 1) {
        sum += Number(numbers[size - i]) * pos--;
        if (pos < 2) pos = 9;
      }
      const result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
      return result;
    };
    const d1 = calc(12);
    const d2 = calc(13);
    return d1 === Number(digits[12]) && d2 === Number(digits[13]);
  }

  return false;
}

export function cancelAvailableMissionByEstablishment(missionId: string) {
  mutate((cur) => ({
    ...cur,
    availableMissions: cur.availableMissions.filter((item) => item.id !== missionId || !withinMinutes(item.createdAt, 1)),
  }));
  void persistCancelAvailableMission(missionId).finally(() => scheduleRemoteRefresh());
}

export function submitRegistrationApplication(payload: Omit<RegistrationApplication, "id" | "status" | "createdAt" | "reviewedAt" | "reviewNote">): { ok: true; application: RegistrationApplication } | { ok: false; error: string; field?: string } {
  const conflict = findRegistrationConflict(payload);
  if (conflict) return { ok: false, error: conflict.message, field: conflict.field };

  const application: RegistrationApplication = {
    ...payload,
    username: payload.username.trim().toLowerCase(),
    email: payload.email.trim().toLowerCase(),
    whatsapp: onlyDigits(payload.whatsapp),
    cpf: payload.cpf ? onlyDigits(payload.cpf) : undefined,
    documento: payload.documento ? onlyDigits(payload.documento) : undefined,
    placa: payload.placa ? payload.placa.trim().toUpperCase() : undefined,
    id: `CAD-${Date.now()}`,
    status: "pendente",
    createdAt: nowIso(),
  };

  mutate((cur) => ({
    ...cur,
    pendingRegistrations: [application, ...(cur.pendingRegistrations ?? [])],
  }));
  void persistRegistrationApplication(application).catch((error) => console.error("[runtime-store] cadastro pendente não sincronizou", error)).finally(() => scheduleRemoteRefresh());
  return { ok: true, application };
}

export function approveRegistrationApplication(id: string) {
  mutate((cur) => {
    const app = (cur.pendingRegistrations ?? []).find((item) => item.id === id && item.status === "pendente");
    if (!app) return cur;
    const conflict = findRegistrationConflict(app);
    if (conflict) {
      window.alert?.(conflict.message);
      return cur;
    }
    const reviewedAt = nowIso();

    if (app.role === "motoboy") {
      const riderId = `RID-${Date.now()}`;
      const rider: RegisteredRider = {
        id: riderId,
        nome: app.nome,
        whatsapp: app.whatsapp,
        pix: app.pix || "",
        cidade: app.cidade || "Taquaritinga/SP",
        status: "offline",
        avatar: app.profilePhotoDataUrl || app.nome.slice(0, 2).toUpperCase(),
        email: app.email,
        username: app.username,
        cpf: app.cpf,
        placa: app.placa,
        profilePhotoName: app.profilePhotoName,
        profilePhotoDataUrl: app.profilePhotoDataUrl,
        source: app.source,
      };
      void persistApproveRegistrationApplication(app).catch((error) => console.error("[runtime-store] aprovação de motoboy não sincronizou", error)).finally(() => scheduleRemoteRefresh());
      return {
        ...cur,
        registeredRiders: [rider, ...cur.registeredRiders],
        riderStatus: { ...cur.riderStatus, [riderId]: "offline" },
        pendingRegistrations: cur.pendingRegistrations.map((item) => item.id === id ? { ...item, status: "aprovado", reviewedAt } : item),
      };
    }

    const establishment: RegisteredEstablishment = {
      id: `EST-${Date.now()}`,
      nome: app.nome,
      documento: app.documento || app.cpf || "",
      whatsapp: app.whatsapp,
      cidade: app.cidade || "Taquaritinga/SP",
      status: "ativo",
      email: app.email,
      username: app.username,
      responsavel: app.responsavel,
      endereco: app.endereco,
      raioNormalKm: app.raioNormalKm,
      baseLatitude: app.baseLatitude,
      baseLongitude: app.baseLongitude,
    };
    void persistApproveRegistrationApplication(app).catch((error) => console.error("[runtime-store] aprovação de estabelecimento não sincronizou", error)).finally(() => scheduleRemoteRefresh());
    return {
      ...cur,
      registeredEstablishments: [establishment, ...cur.registeredEstablishments],
      pendingRegistrations: cur.pendingRegistrations.map((item) => item.id === id ? { ...item, status: "aprovado", reviewedAt } : item),
    };
  });
}

export function rejectRegistrationApplication(id: string, note = "Cadastro recusado pelo administrador.") {
  mutate((cur) => {
    const app = (cur.pendingRegistrations ?? []).find((item) => item.id === id);
    if (!app) return cur;
    void persistRejectRegistrationApplication(app, note).catch((error) => console.error("[runtime-store] recusa de cadastro não sincronizou", error)).finally(() => scheduleRemoteRefresh());
    return {
      ...cur,
      pendingRegistrations: cur.pendingRegistrations.map((item) => item.id === id ? { ...item, status: "recusado", reviewedAt: nowIso(), reviewNote: note } : item),
    };
  });
}

export function addRegisteredRider(payload: Omit<RegisteredRider, "id">) {
  const id = `RID-${Date.now()}`;
  mutate((cur) => ({
    ...cur,
    registeredRiders: [{ ...payload, id }, ...cur.registeredRiders],
    riderStatus: { ...cur.riderStatus, [id]: payload.status === "online" ? "online" : "offline" },
  }));
  void persistAddRegisteredRider(payload).finally(() => scheduleRemoteRefresh());
}

export function setRegisteredRiderStatus(id: string, status: RegisteredRider["status"]) {
  mutate((cur) => ({
    ...cur,
    registeredRiders: cur.registeredRiders.map((item) => item.id === id ? { ...item, status } : item),
    riderStatus: { ...cur.riderStatus, [id]: status === "online" ? "online" : "offline" },
  }));
  void persistSetRegisteredRiderStatus(id, status).finally(() => scheduleRemoteRefresh());
}

export function removeRegisteredRider(id: string) {
  // Exclusão lógica: bloqueia acesso e mantém histórico/repasse/auditoria.
  setRegisteredRiderStatus(id, "bloqueado");
  void persistRemoveRegisteredRider(id).finally(() => scheduleRemoteRefresh());
}

export function addRegisteredEstablishment(payload: Omit<RegisteredEstablishment, "id">) {
  mutate((cur) => ({
    ...cur,
    registeredEstablishments: [{ ...payload, id: `EST-${Date.now()}` }, ...cur.registeredEstablishments],
  }));
  void persistAddRegisteredEstablishment(payload).finally(() => scheduleRemoteRefresh());
}

export function setRegisteredEstablishmentStatus(id: string, status: RegisteredEstablishment["status"]) {
  mutate((cur) => ({
    ...cur,
    registeredEstablishments: cur.registeredEstablishments.map((item) => item.id === id ? { ...item, status } : item),
  }));
  void persistSetRegisteredEstablishmentStatus(id, status).finally(() => scheduleRemoteRefresh());
}

export function removeRegisteredEstablishment(id: string) {
  // Exclusão lógica: bloqueia acesso e mantém histórico/repasse/auditoria.
  setRegisteredEstablishmentStatus(id, "bloqueado");
  void persistRemoveRegisteredEstablishment(id).finally(() => scheduleRemoteRefresh());
}

export function addAdminUser(payload: { citySlug: string; cityLabel: string; username: string; password: string; name: string; email?: string; phone?: string; role?: "admin" | "superadmin" }) {
  const optimistic: AdminUser = {
    id: `ADM-${Date.now()}`,
    cityLabel: payload.cityLabel,
    role: payload.role || "admin",
    username: payload.username,
    name: payload.name,
    email: payload.email,
    phone: payload.phone,
    isActive: true,
    createdAt: nowIso(),
  };
  mutate((cur) => ({ ...cur, adminUsers: [optimistic, ...(cur.adminUsers ?? [])] }));
  void persistAddAdminUser(payload).finally(() => scheduleRemoteRefresh());
}

export function updateRegisteredEstablishmentRouteSettings(id: string, payload: { endereco?: string; raioNormalKm?: number; baseLatitude?: number; baseLongitude?: number }) {
  mutate((cur) => ({
    ...cur,
    registeredEstablishments: cur.registeredEstablishments.map((item) =>
      item.id === id
        ? {
            ...item,
            endereco: payload.endereco ?? item.endereco,
            raioNormalKm: payload.raioNormalKm ?? item.raioNormalKm,
            baseLatitude: payload.baseLatitude ?? item.baseLatitude,
            baseLongitude: payload.baseLongitude ?? item.baseLongitude,
          }
        : item,
    ),
  }));
  void persistUpdateRegisteredEstablishmentRouteSettings(id, payload).finally(() => scheduleRemoteRefresh());
}

export function submitAppFeedback(payload: Omit<AppFeedback, "id" | "status" | "createdAt">) {
  const feedback: AppFeedback = {
    ...payload,
    id: `FBK-${Date.now()}`,
    status: "novo",
    createdAt: nowIso(),
  };
  mutate((cur) => ({ ...cur, feedbacks: [feedback, ...(cur.feedbacks ?? [])] }));
  void persistSubmitAppFeedback(feedback).finally(() => scheduleRemoteRefresh());
}

export function updateAppFeedbackStatus(id: string, status: AppFeedback["status"]) {
  mutate((cur) => ({
    ...cur,
    feedbacks: (cur.feedbacks ?? []).map((item) => (item.id === id ? { ...item, status } : item)),
  }));
  void persistUpdateAppFeedbackStatus(id, status).finally(() => scheduleRemoteRefresh());
}

export function resetEntityPassword(role: "estabelecimento" | "motoboy", entityId: string, newPassword: string) {
  if (!entityId || newPassword.length < 4 || newPassword.length > 6) return;
  void persistResetEntityPassword(role, entityId, newPassword).finally(() => scheduleRemoteRefresh());
}

export function resetAdminPassword(userId: string, newPassword: string, actorPassword?: string) {
  if (!userId || newPassword.length < 8) return;
  void persistResetAdminPassword(userId, newPassword, getAppSession()?.userId, actorPassword).finally(() => scheduleRemoteRefresh());
}

export function setAdminActive(userId: string, isActive: boolean, actorPassword?: string) {
  if (!userId) return;
  void persistSetAdminActive(userId, isActive, getAppSession()?.userId, actorPassword).finally(() => scheduleRemoteRefresh());
}

export function removeAdminAccess(userId: string, actorPassword?: string) {
  if (!userId) return;
  void persistRemoveAdminAccess(userId, getAppSession()?.userId, actorPassword).finally(() => scheduleRemoteRefresh());
}

export function riderWithdrawAcceptance(missionId: string, riderId: string, reason = "Entregador desistiu dentro da janela curta.") {
  mutate((cur) => {
    const mission = cur.activeMissions.find((m) => m.id === missionId && m.riderId === riderId && (m.status === "aguardando_confirmacao_estabelecimento" || m.status === "aguardando_retirada"));
    if (!mission) return cur;
    const limit = mission.riderCancelUntil ? new Date(mission.riderCancelUntil).getTime() : 0;
    if (Date.now() > limit) return cur;
    const hidden = cur.riderHiddenMissionIds[riderId] ?? [];
    void persistRiderWithdrawAcceptance(missionId, riderId, reason).finally(() => scheduleRemoteRefresh());
    return {
      ...cur,
      riderHiddenMissionIds: { ...cur.riderHiddenMissionIds, [riderId]: Array.from(new Set([...hidden, missionId])) },
      activeMissions: cur.activeMissions.filter((m) => m.id !== missionId),
      availableMissions: [{
        ...mission,
        status: "disponivel",
        riderId: undefined,
        riderName: undefined,
        riderAcceptanceMessage: undefined,
        acceptedAt: undefined,
        confirmedAt: undefined,
        cancelFreeUntil: undefined,
        pickupDeadlineAt: undefined,
        routeDeadlineAt: undefined,
        riderCancelUntil: undefined,
        finishReason: reason,
      }, ...cur.availableMissions],
    };
  });
}

export function hideMissionForRider(missionId: string, riderId: string) {
  mutate((cur) => ({
    ...cur,
    riderHiddenMissionIds: {
      ...cur.riderHiddenMissionIds,
      [riderId]: Array.from(new Set([...(cur.riderHiddenMissionIds[riderId] ?? []), missionId])),
    },
  }));
  void persistHideMissionForRider(missionId, riderId).finally(() => scheduleRemoteRefresh());
}

export function riderRequestCancel(missionId: string, riderId: string, reason: string) {
  mutate((cur) => ({
    ...cur,
    activeMissions: cur.activeMissions.map((m) => m.id === missionId && m.riderId === riderId ? { ...m, riderAcceptanceMessage: reason ? `Solicitação de cancelamento: ${reason}` : m.riderAcceptanceMessage } : m),
  }));
  void persistRiderRequestCancel(missionId, riderId, reason).finally(() => scheduleRemoteRefresh());
}

export function riderMarkFinished(missionId: string) {
  mutate((cur) => ({
    ...cur,
    activeMissions: cur.activeMissions.map((m) =>
      m.id === missionId ? { ...m, status: "motoboy_marcou_finalizada", riderFinishedAt: nowIso() } : m,
    ),
  }));
  void persistRiderMarkFinished(missionId).finally(() => scheduleRemoteRefresh());
}

export function establishmentFinishMission(missionId: string, approved: boolean, reason?: string) {
  mutate((cur) => {
    const mission = cur.activeMissions.find((m) => m.id === missionId);
    if (!mission) {
      return cur;
    }

    const category = parseFinishCategory(reason);
    const shouldPayRider = approved || category !== "entregador";
    const updated: Mission = {
      ...mission,
      status: approved ? "finalizada_estabelecimento" : "divergencia_estabelecimento",
      establishmentFinishedAt: nowIso(),
      finishReason: approved ? mission.finishReason : reason,
      cancelCategory: approved ? undefined : category,
      payoutStatus: shouldPayRider ? "pendente" : undefined,
    };
    void persistEstablishmentFinishMission(missionId, approved, reason).finally(() => scheduleRemoteRefresh());

    return {
      ...cur,
      activeMissions: cur.activeMissions.filter((m) => m.id !== missionId),
      missionHistory: [updated, ...cur.missionHistory],
    };
  });
}

export function requeueMissionFromHistory(missionId: string) {
  mutate((cur) => {
    const mission = cur.missionHistory.find((m) => m.id === missionId && m.status === "divergencia_estabelecimento");
    if (!mission) return cur;
    const blockedExtra = mission.cancelCategory === "entregador" && mission.riderId ? [mission.riderId] : [];
    const retried = createRetriedMission(cur, mission, blockedExtra);
    void persistRequeueMission(missionId).finally(() => scheduleRemoteRefresh());
    return {
      ...cur,
      availableMissions: [retried, ...cur.availableMissions],
    };
  });
}

export function requeueAvailableMission(missionId: string) {
  mutate((cur) => ({
    ...cur,
    availableMissions: cur.availableMissions.map((m) => m.id === missionId ? { ...m, createdAt: nowIso(), priority: true, attempt: (m.attempt ?? 1) + 1 } : m),
  }));
  void persistRequeueMission(missionId).finally(() => scheduleRemoteRefresh());
}

export function requestMissionCreditReview(missionId: string, reason: string) {
  mutate((cur) => {
    const mission = [...cur.availableMissions, ...cur.activeMissions, ...cur.missionHistory].find((m) => m.id === missionId);
    if (!mission) return cur;
    void persistRequestMissionCreditReview(missionId, reason, mission.total, mission.cancelCategory).finally(() => scheduleRemoteRefresh());
    return {
      ...cur,
      pendingCreditRequests: [{
        id: `cred-review-${Date.now()}`,
        amount: mission.total,
        requestedAt: nowIso(),
        status: "pendente",
        channel: "plataforma",
        message: `${missionDisplayCode(mission.id)} • solicitação de devolução de créditos. ${reason}`,
      }, ...cur.pendingCreditRequests],
    };
  });
}

export function archiveExpiredAvailableMission(missionId: string, reason: string) {
  mutate((cur) => {
    const mission = cur.availableMissions.find((m) => m.id === missionId);
    if (!mission) return cur;
    const archived: Mission = { ...mission, status: "divergencia_estabelecimento", finishReason: reason, establishmentFinishedAt: nowIso(), cancelCategory: "estabelecimento_outros" };
    void persistArchiveExpiredAvailableMission(missionId, reason).finally(() => scheduleRemoteRefresh());
    return { ...cur, availableMissions: cur.availableMissions.filter((m) => m.id !== missionId), missionHistory: [archived, ...cur.missionHistory] };
  });
}

export function riderAddProof(missionId: string, name: string, kind: MissionProof["kind"] = "comprovante") {
  if (!name.trim()) {
    return;
  }

  mutate((cur) => ({
    ...cur,
    activeMissions: cur.activeMissions.map((m) =>
      m.id === missionId
        ? {
            ...m,
            proofs: [{ id: `proof-${Date.now()}`, name, kind, uploadedAt: nowIso() }, ...m.proofs],
            commandasEnviadas: kind === "comanda" ? Math.min(m.commandasEsperadas, m.commandasEnviadas + 1) : m.commandasEnviadas,
          }
        : m,
    ),
    missionHistory: cur.missionHistory.map((m) =>
      m.id === missionId
        ? {
            ...m,
            proofs: [{ id: `proof-${Date.now()}`, name, kind, uploadedAt: nowIso() }, ...m.proofs],
            commandasEnviadas: kind === "comanda" ? Math.min(m.commandasEsperadas, m.commandasEnviadas + 1) : m.commandasEnviadas,
          }
        : m,
    ),
  }));
  void persistRiderAddProof(missionId, name, kind).finally(() => scheduleRemoteRefresh());
}

export function rateMission(missionId: string, score: number, comment?: string, tags?: string[]) {
  const cleanScore = Math.max(1, Math.min(5, Math.round(score)));
  mutate((cur) => ({
    ...cur,
    missionHistory: cur.missionHistory.map((m) =>
      m.id === missionId
        ? {
            ...m,
            rating: {
              score: cleanScore,
              comment: comment?.trim() || undefined,
              tags: tags?.filter(Boolean),
              createdAt: nowIso(),
              ratedByEstablishmentId: m.estabelecimentoId,
            },
          }
        : m,
    ),
  }));
  void persistRateMission(missionId, cleanScore, comment, tags).finally(() => scheduleRemoteRefresh());
}

export function markMissionPaid(missionId: string, method: "pix" | "dinheiro") {
  mutate((cur) => ({
    ...cur,
    missionHistory: cur.missionHistory.map((m) =>
      m.id === missionId ? { ...m, payoutStatus: "pago", payoutMethod: method, payoutAt: nowIso() } : m,
    ),
  }));
  void persistMarkMissionPaid(missionId, method).finally(() => scheduleRemoteRefresh());
}

export function updateOperationalSettings(partial: Partial<OperationalSettings>) {
  mutate((cur) => ({
    ...cur,
    settings: {
      ...cur.settings,
      ...partial,
      bairrosDistantes: partial.bairrosDistantes ?? cur.settings.bairrosDistantes,
    },
  }));
  void persistUpdateOperationalSettings(partial).finally(() => scheduleRemoteRefresh());
}

export const countsForNormalCredits = (balance: number, unitValue = loadStore().settings.valorNormal) =>
  Math.floor(balance / Math.max(unitValue, 1));

export function inferDeliveryPricing(bairro: string, settings = loadStore().settings) {
  const normalized = normalize(bairro);
  const isDistante = settings.bairrosDistantes.some((item) => normalize(item) === normalized);
  const tipo: "distante" | "normal" = isDistante ? "distante" : "normal";
  return {
    tipo,
    valor: isDistante ? settings.valorDistante : settings.valorNormal,
  };
}

export function normalize(value: string) {
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}
