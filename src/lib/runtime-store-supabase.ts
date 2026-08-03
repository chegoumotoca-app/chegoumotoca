import { hasSupabaseEnv, supabase } from "@/lib/supabase";
import { getAppSession } from "@/lib/auth";
import type {
  AppStore,
  AdminUser,
  CreditRequest,
  DeliveryItem,
  Mission,
  MissionProof,
  MissionStatus,
  OperationalSettings,
  RegisteredEstablishment,
  RegisteredRider,
  RegistrationApplication,
  AppFeedback,
} from "@/lib/runtime-store";

const enabled = () => Boolean(supabase && hasSupabaseEnv());

function toClientPaymentMethod(value?: string): DeliveryItem["pagamentoCliente"] {
  switch (value) {
    case "dinheiro":
    case "Dinheiro":
      return "Dinheiro";
    case "cartao_casa":
    case "Cartão / maquininha da casa":
    case "Cartão / maquininha da casa":
      return "Cartão / maquininha da casa";
    default:
      return "PIX do cliente";
  }
}

function toDbPaymentMethod(value: DeliveryItem["pagamentoCliente"]) {
  if (value === "Dinheiro") return "dinheiro";
  if (value === "Cartão / maquininha da casa") return "cartao_casa";
  return "pix_cliente";
}

function mapBagStatus(status?: string): MissionStatus {
  switch (status) {
    case "aguardando_confirmacao_estabelecimento":
    case "aguardando_retirada":
    case "em_entrega":
    case "motoboy_marcou_finalizada":
    case "finalizada_estabelecimento":
    case "divergencia_estabelecimento":
    case "disponivel":
      return status;
    default:
      return "disponivel";
  }
}

function formatCreditMessage(req: any, establishmentName?: string) {
  const amount = Number(req.amount || 0).toFixed(2).replace(".", ",");
  return `${establishmentName || "Estabelecimento"} solicitou R$ ${amount} em créditos. ${req.attachment_name ? `Comprovante: ${req.attachment_name}. ` : ""}Aguardando conferência do administrador.`;
}

function parseCancelCategory(reason?: string): Mission["cancelCategory"] {
  const text = (reason || "").toLowerCase();
  if (text.startsWith("entregador:")) return "entregador";
  if (text.startsWith("cliente:")) return "cliente";
  if (text.startsWith("estabelecimento_outros:") || text.startsWith("estabelecimento / outros:")) return "estabelecimento_outros";
  return undefined;
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((item) => item[0]?.toUpperCase())
    .join("");
}

function plusMinutes(iso: string | undefined, minutes: number) {
  if (!iso) return undefined;
  const dt = new Date(iso);
  dt.setMinutes(dt.getMinutes() + minutes);
  return dt.toISOString();
}

function groupBy(items: any[], key: string) {
  return items.reduce<Record<string, any[]>>((acc, item) => {
    const value = String(item[key]);
    acc[value] = acc[value] || [];
    acc[value].push(item);
    return acc;
  }, {});
}

export async function fetchRemoteStore(defaultStore: AppStore, defaultSettings: OperationalSettings): Promise<AppStore | null> {
  if (!enabled()) return null;

  const [
    profilesRes,
    establishmentsRes,
    ridersRes,
    walletsRes,
    creditReqsRes,
    paymentSettingsRes,
    neighborhoodRulesRes,
    bagsRes,
    deliveriesRes,
    attemptsRes,
    proofsRes,
    disputesRes,
    riderActionsRes,
  ] = await Promise.all([
    supabase!.from("profiles").select("id, full_name, phone, email, status"),
    supabase!.from("establishments").select("id, profile_id, trade_name, cnpj, phone, whatsapp, city, state, status").order("created_at", { ascending: true }),
    supabase!.from("riders").select("id, profile_id, pix_key, city, state, status, online_now, response_time_seconds, avg_rating, whatsapp, profile_photo_url, completed_bags_count, cancelled_accepts_count, priority_accepts_count, rescue_count").order("created_at", { ascending: true }),
    supabase!.from("establishment_wallets").select("establishment_id, approved_balance, updated_at"),
    supabase!.from("credit_requests").select("id, establishment_id, city_id, amount, status, request_channel, attachment_name, requested_at, notes").order("requested_at", { ascending: false }),
    supabase!.from("payment_settings").select("*").limit(1).maybeSingle(),
    supabase!.from("neighborhood_rules").select("name, rule_type, active"),
    supabase!.from("bags").select("*").order("created_at", { ascending: false }),
    supabase!.from("bag_deliveries").select("*").order("id", { ascending: true }),
    supabase!.from("bag_attempts").select("*").order("attempt_number", { ascending: true }),
    supabase!.from("bag_proofs").select("*").order("created_at", { ascending: false }),
    supabase!.from("bag_disputes").select("*").order("created_at", { ascending: false }),
    supabase!.from("bag_attempt_rider_actions").select("*").order("created_at", { ascending: false }),
  ]);

  if (bagsRes.error) throw bagsRes.error;
  if (deliveriesRes.error) throw deliveriesRes.error;
  if (attemptsRes.error) throw attemptsRes.error;
  if (proofsRes.error) throw proofsRes.error;
  if (disputesRes.error) throw disputesRes.error;

  const session = getAppSession();
  const profiles: any[] = (profilesRes.data ?? []) as any[];
  const profileMap = new Map<string, any>(profiles.map((item: any) => [item.id, item]));
  const establishments = establishmentsRes.data ?? [];
  const riders = ridersRes.data ?? [];
  const wallets = walletsRes.data ?? [];
  const creditReqs = creditReqsRes.data ?? [];
  const paymentSettings = paymentSettingsRes.data as any | null;
  const neighborhoodRules = (neighborhoodRulesRes.data ?? []).filter((item: any) => item.active);
  const bags = bagsRes.data ?? [];
  const deliveries = deliveriesRes.data ?? [];
  const attempts = attemptsRes.data ?? [];
  const proofs = proofsRes.data ?? [];
  const disputes = disputesRes.data ?? [];
  const riderActions = riderActionsRes.data ?? [];

  let registrationRows: any[] = defaultStore.pendingRegistrations ?? [];
  try {
    const registrationsRes = await supabase!.from("registration_applications").select("*").order("created_at", { ascending: false });
    if (!registrationsRes.error) registrationRows = registrationsRes.data ?? [];
  } catch {
    registrationRows = defaultStore.pendingRegistrations ?? [];
  }


  let adminUserRows: any[] = defaultStore.adminUsers ?? [];
  try {
    const adminsRes = await supabase!.rpc("chm_list_admin_users");
    if (!adminsRes.error) adminUserRows = adminsRes.data ?? [];
  } catch {
    adminUserRows = defaultStore.adminUsers ?? [];
  }

  let appUserRows: any[] = [];
  try {
    const identitiesRes = await supabase!.rpc("chm_list_app_identities");
    if (!identitiesRes.error) appUserRows = identitiesRes.data ?? [];
  } catch {
    appUserRows = [];
  }

  let ratingRows: any[] = [];
  try {
    const ratingsRes = await supabase!.from("bag_ratings").select("*").order("created_at", { ascending: false });
    if (!ratingsRes.error) ratingRows = ratingsRes.data ?? [];
  } catch {
    ratingRows = [];
  }

  let feedbackRows: any[] = defaultStore.feedbacks ?? [];
  try {
    const feedbackRes = await supabase!.from("app_feedbacks").select("*").order("created_at", { ascending: false });
    if (!feedbackRes.error) feedbackRows = feedbackRes.data ?? [];
  } catch {
    feedbackRows = defaultStore.feedbacks ?? [];
  }

  const ratingMap = new Map<string, any>();
  for (const row of ratingRows) {
    if (!ratingMap.has(String(row.bag_id))) ratingMap.set(String(row.bag_id), row);
  }

  const deliveryMap = groupBy(deliveries, "bag_id");
  const proofMap = groupBy(proofs.filter((item: any) => item.is_active !== false), "bag_id");
  const attemptMap = groupBy(attempts, "bag_id");
  const disputeMap = groupBy(disputes, "bag_id");
  const actionMapByAttempt = groupBy(riderActions, "bag_attempt_id");

  const registeredEstablishments: RegisteredEstablishment[] = establishments.map((item: any) => {
    const profile = item.profile_id ? profileMap.get(item.profile_id) : null;
    const identity = appUserRows.find((user: any) => String(user.entity_id || "") === String(item.id) && user.role === "estabelecimento");
    const city = [item.city, item.state].filter(Boolean).join("/") || defaultSettings.cidadeBase + "/" + defaultSettings.ufBase;
    return {
      id: item.id,
      nome: item.trade_name,
      documento: identity?.document_number || item.document_number || item.cnpj || "",
      whatsapp: identity?.phone || item.whatsapp || item.phone || profile?.phone || "",
      cidade: city,
      status: item.status === "ativo" ? "ativo" : item.status === "bloqueado" ? "bloqueado" : "pendente",
      email: identity?.email || profile?.email || undefined,
      username: identity?.username || undefined,
      responsavel: item.responsible_name || undefined,
      endereco: item.base_address || item.address || undefined,
      raioNormalKm: item.normal_radius_km !== undefined && item.normal_radius_km !== null ? Number(item.normal_radius_km) : undefined,
      baseLatitude: item.base_latitude !== undefined && item.base_latitude !== null ? Number(item.base_latitude) : undefined,
      baseLongitude: item.base_longitude !== undefined && item.base_longitude !== null ? Number(item.base_longitude) : undefined,
      profilePhotoDataUrl: item.profile_image_url || undefined,
    };
  });

  const registeredRiders: RegisteredRider[] = riders.map((item: any) => {
    const profile = item.profile_id ? profileMap.get(item.profile_id) : null;
    const identity = appUserRows.find((user: any) => String(user.entity_id || "") === String(item.id) && user.role === "motoboy");
    const name = profile?.full_name || identity?.display_name || "Motoboy";
    return {
      id: item.id,
      nome: name,
      whatsapp: identity?.phone || item.whatsapp || profile?.phone || "",
      pix: item.pix_key || "",
      cidade: [item.city, item.state].filter(Boolean).join("/") || `${defaultSettings.cidadeBase}/${defaultSettings.ufBase}`,
      status: item.status === "bloqueado" ? "bloqueado" : item.online_now ? "online" : "offline",
      avatar: item.profile_photo_url || initials(name),
      email: identity?.email || profile?.email || undefined,
      username: identity?.username || undefined,
      cpf: identity?.document_number || item.cpf || undefined,
      placa: item.vehicle_plate || undefined,
      profilePhotoDataUrl: item.profile_photo_url || undefined,
    };
  });

  const riderStatus: Record<string, "online" | "offline"> = Object.fromEntries(
    registeredRiders.map((item) => [item.id, item.status === "online" ? "online" : "offline"]),
  );

  const selectedEstablishmentId = session?.role === "estabelecimento" ? session.entityId : undefined;
  const firstEstablishmentId = selectedEstablishmentId || registeredEstablishments[0]?.id;
  const wallet = wallets.find((item: any) => item.establishment_id === firstEstablishmentId);
  const firstEstName = registeredEstablishments.find((item) => item.id === firstEstablishmentId)?.nome || "Estabelecimento";
  const canSeeAllCredits = session?.role === "admin" || session?.role === "superadmin";

  const pendingCreditRequests: CreditRequest[] = creditReqs
    .filter((item: any) => canSeeAllCredits || !firstEstablishmentId || item.establishment_id === firstEstablishmentId)
    .map((item: any) => {
      const reqEstName = registeredEstablishments.find((est) => est.id === item.establishment_id)?.nome || firstEstName;
      return {
        id: item.id,
        amount: Number(item.amount || 0),
        requestedAt: item.requested_at,
        status: item.status,
        attachmentName: item.attachment_name || undefined,
        channel: item.request_channel === "whatsapp" ? "whatsapp" : item.attachment_name ? "comprovante" : "plataforma",
        message: formatCreditMessage(item, reqEstName),
      };
    });

  const settings: OperationalSettings = {
    valorNormal: Number(paymentSettings?.normal_delivery_value ?? defaultSettings.valorNormal),
    valorDistante: Number(paymentSettings?.distant_delivery_value ?? defaultSettings.valorDistante),
    taxaPlataformaPercentual: Number(paymentSettings?.platform_fee_percent ?? defaultSettings.taxaPlataformaPercentual),
    bairrosDistantes: neighborhoodRules.filter((item: any) => item.rule_type === "distante").map((item: any) => item.name),
    cidadeBase: paymentSettings?.city_name || defaultSettings.cidadeBase,
    ufBase: paymentSettings?.state || defaultSettings.ufBase,
    pixKey: paymentSettings?.pix_key || defaultSettings.pixKey,
    pixReceiverName: paymentSettings?.pix_receiver_name || defaultSettings.pixReceiverName,
    supportWhatsapp: paymentSettings?.support_whatsapp || defaultSettings.supportWhatsapp,
    supportEmail: paymentSettings?.support_email || defaultSettings.supportEmail,
    supportPhone: paymentSettings?.support_phone || defaultSettings.supportPhone,
  };

  // fallback to default if no rules were configured
  if (!settings.bairrosDistantes.length) settings.bairrosDistantes = defaultSettings.bairrosDistantes;

  const riderHiddenMissionIds: Record<string, string[]> = {};
  const activeByCode = new Set<string>();

  const missions: Mission[] = bags.map((bag: any) => {
    const bagDeliveriesRaw = deliveryMap[String(bag.id)] ?? [];
    const bagProofsRaw = proofMap[String(bag.id)] ?? [];
    const bagAttemptsRaw = (attemptMap[String(bag.id)] ?? []).sort((a: any, b: any) => a.attempt_number - b.attempt_number);
    const currentAttempt = bagAttemptsRaw.find((item: any) => item.id === bag.current_attempt_id) || bagAttemptsRaw[bagAttemptsRaw.length - 1] || null;
    const bagDisputes = disputeMap[String(bag.id)] ?? [];
    const actionItems: any[] = currentAttempt ? (actionMapByAttempt[String(currentAttempt.id)] ?? []) : [];
    for (const action of actionItems) {
      if (action.action_type === "ocultou") {
        riderHiddenMissionIds[action.rider_id] = Array.from(new Set([...(riderHiddenMissionIds[action.rider_id] ?? []), bag.bag_code]));
      }
    }

    const blockedRiderIds = Array.from(
      new Set(
        bagDisputes.filter((item: any) => item.reason_type === "entregador" && item.rider_id).map((item: any) => item.rider_id)
      )
    );

    const deliveriesMapped: DeliveryItem[] = bagDeliveriesRaw.map((item: any) => ({
      id: item.id,
      clienteNome: item.customer_name || "",
      clienteTelefone: item.customer_phone || "",
      descricaoPedido: item.order_description || "",
      numeroComanda: item.receipt_number || "",
      cep: item.zipcode || "",
      rua: item.street || "",
      numero: item.street_number || "",
      complemento: item.complement || "",
      bairro: item.neighborhood || "",
      cidade: item.city || defaultSettings.cidadeBase,
      uf: item.state || defaultSettings.ufBase,
      referencia: item.reference_point || "",
      observacao: item.notes || "",
      pagamentoCliente: toClientPaymentMethod(item.customer_payment_method),
      tipo: item.delivery_type === "distante" ? "distante" : "normal",
      valor: Number(item.delivery_amount || 0),
    }));

    const proofsMapped: MissionProof[] = bagProofsRaw.map((item: any) => ({
      id: item.id,
      name: item.file_name,
      uploadedAt: item.created_at,
      kind: item.proof_type === "comanda" ? "comanda" : "comprovante",
    }));

    const est = registeredEstablishments.find((item) => item.id === bag.establishment_id);
    const rider = registeredRiders.find((item) => item.id === bag.rider_id);
    const acceptedAt = bag.accepted_at || currentAttempt?.accepted_at || undefined;
    const confirmedAt = bag.confirmed_at || currentAttempt?.establishment_confirmed_at || undefined;
    const startedAt = bag.started_at || currentAttempt?.started_at || undefined;
    const riderFinishedAt = bag.rider_finished_at || currentAttempt?.rider_finished_at || undefined;
    const establishmentFinishedAt = bag.establishment_finished_at || currentAttempt?.establishment_finished_at || undefined;
    const payoutStatus = bag.payout_status === "pago" ? "pago" : bag.status === "divergencia_estabelecimento" && parseCancelCategory(bag.finish_reason) === "entregador" ? undefined : (bag.payout_status || "pendente");

    const mission: Mission = {
      id: bag.bag_code,
      mode: bag.bag_kind === "express" ? "express" : "detalhada",
      estabelecimentoId: bag.establishment_id,
      estabelecimentoNome: est?.nome || "Estabelecimento",
      documento: est?.documento || "",
      deliveries: deliveriesMapped,
      total: Number(bag.total_amount || 0),
      status: mapBagStatus(bag.status),
      riderId: bag.rider_id || undefined,
      riderName: rider?.nome,
      createdAt: bag.created_at,
      acceptedAt,
      confirmedAt,
      startedAt,
      riderFinishedAt,
      establishmentFinishedAt,
      finishReason: bag.finish_reason || undefined,
      proofs: proofsMapped,
      payoutStatus: payoutStatus === "pago" ? "pago" : payoutStatus === "pendente" ? "pendente" : undefined,
      payoutMethod: bag.payout_method || undefined,
      payoutAt: bag.payout_at || undefined,
      commandasEsperadas: deliveriesMapped.length,
      commandasEnviadas: proofsMapped.filter((item) => item.kind === "comanda").length,
      blockedRiderIds,
      cancelFreeUntil: confirmedAt ? plusMinutes(confirmedAt, 1) : undefined,
      pickupDeadlineAt: currentAttempt?.pickup_deadline_at || undefined,
      routeDeadlineAt: currentAttempt?.route_deadline_at || undefined,
      quickDestinationsText: bag.bag_kind === "express" ? Array.from(new Set(deliveriesMapped.map((item) => item.bairro).filter(Boolean))).join(", ") : undefined,
      priority: bag.urgency_level === "prioritaria" || Number(currentAttempt?.priority_level || 0) > 0,
      attempt: currentAttempt?.attempt_number || 1,
      riderCancelUntil: acceptedAt ? plusMinutes(acceptedAt, 1) : undefined,
      rootMissionId: bag.bag_code,
      cancelCategory: parseCancelCategory(bag.finish_reason),
      riderAcceptanceMessage: currentAttempt?.rider_message || undefined,
      rating: ratingMap.get(String(bag.id))
        ? {
            score: Number(ratingMap.get(String(bag.id)).score || 0),
            comment: ratingMap.get(String(bag.id)).comment || undefined,
            tags: Array.isArray(ratingMap.get(String(bag.id)).tags) ? ratingMap.get(String(bag.id)).tags : [],
            createdAt: ratingMap.get(String(bag.id)).created_at || bag.establishment_finished_at || bag.created_at,
            ratedByEstablishmentId: ratingMap.get(String(bag.id)).establishment_id || undefined,
          }
        : undefined,
    };

    return mission;
  });

  const availableMissions = missions.filter((item) => item.status === "disponivel");
  const activeMissions = missions.filter((item) => [
    "aguardando_confirmacao_estabelecimento",
    "aguardando_retirada",
    "em_entrega",
    "motoboy_marcou_finalizada",
  ].includes(item.status));
  const missionHistory = missions.filter((item) => item.status === "finalizada_estabelecimento" || item.status === "divergencia_estabelecimento" || item.payoutStatus === "pago");

  const feedbacks: AppFeedback[] = feedbackRows.map((item: any) => ({
    id: item.id,
    name: item.name || "Sem nome",
    email: item.email || undefined,
    whatsapp: item.whatsapp || undefined,
    kind: ["sugestao", "problema", "elogio", "contato"].includes(item.kind) ? item.kind : "sugestao",
    message: item.message || "",
    status: ["novo", "em_analise", "resolvido"].includes(item.status) ? item.status : "novo",
    createdAt: item.created_at || new Date().toISOString(),
  }));

  const adminUsers: AdminUser[] = adminUserRows.map((item: any) => ({
    id: item.id,
    cityId: item.city_id || undefined,
    cityLabel: item.city_label || "Plataforma Geral",
    role: item.role === "superadmin" ? "superadmin" : "admin",
    username: item.username || "",
    name: item.display_name || item.username || "Admin",
    email: item.email || undefined,
    phone: item.phone || undefined,
    isActive: item.is_active !== false,
    createdAt: item.created_at || undefined,
  }));

  const pendingRegistrations: RegistrationApplication[] = registrationRows.map((item: any) => ({
    id: item.id,
    role: item.role === "estabelecimento" ? "estabelecimento" : "motoboy",
    status: item.status === "aprovado" ? "aprovado" : item.status === "recusado" ? "recusado" : "pendente",
    nome: item.full_name || item.trade_name || "Cadastro sem nome",
    username: item.username || "",
    email: item.email || "",
    whatsapp: item.whatsapp || "",
    password: item.access_password || "",
    cidade: item.city && item.state ? `${item.city}/${item.state}` : `${defaultSettings.cidadeBase}/${defaultSettings.ufBase}`,
    createdAt: item.created_at || new Date().toISOString(),
    reviewedAt: item.reviewed_at || undefined,
    reviewNote: item.review_note || undefined,
    cpf: item.cpf || undefined,
    placa: item.vehicle_plate || undefined,
    pix: item.pix_key || undefined,
    profilePhotoName: item.profile_photo_name || undefined,
    profilePhotoDataUrl: item.profile_photo_data_url || undefined,
    source: item.source || undefined,
    documento: item.document_number || undefined,
    responsavel: item.responsible_name || undefined,
    endereco: item.address || undefined,
    raioNormalKm: item.normal_radius_km !== undefined && item.normal_radius_km !== null ? Number(item.normal_radius_km) : undefined,
    baseLatitude: item.base_latitude !== undefined && item.base_latitude !== null ? Number(item.base_latitude) : undefined,
    baseLongitude: item.base_longitude !== undefined && item.base_longitude !== null ? Number(item.base_longitude) : undefined,
  }));

  return {
    ...defaultStore,
    creditApproved: Number(wallet?.approved_balance || 0),
    pendingCreditRequests,
    availableMissions,
    activeMissions,
    missionHistory,
    riderStatus,
    riderHiddenMissionIds,
    settings,
    registeredEstablishments,
    registeredRiders,
    pendingRegistrations,
    adminUsers,
    feedbacks,
  };
}

async function getBagByCode(bagCode: string) {
  const res = await supabase!.from("bags").select("*").eq("bag_code", bagCode).maybeSingle();
  if (res.error) throw res.error;
  return res.data;
}

async function getWalletBalance(establishmentId: string) {
  const res = await supabase!.from("establishment_wallets").select("approved_balance").eq("establishment_id", establishmentId).maybeSingle();
  if (res.error) throw res.error;
  return Number(res.data?.approved_balance || 0);
}

async function setWalletBalance(establishmentId: string, value: number) {
  const res = await supabase!.from("establishment_wallets").upsert({ establishment_id: establishmentId, approved_balance: value, updated_at: new Date().toISOString() });
  if (res.error) throw res.error;
}

async function addBagEvent(bagId: string, eventType: string, actorRole: string, message: string, actorId?: string | null) {
  const res = await supabase!.from("bag_events").insert({ bag_id: bagId, event_type: eventType, actor_role: actorRole, actor_id: actorId ?? null, message, created_at: new Date().toISOString() });
  if (res.error) throw res.error;
}

export async function persistPublishMission(mission: Mission) {
  if (!enabled()) return;
  const now = new Date().toISOString();
  const bagInsert = await supabase!.from("bags").insert({
    bag_code: mission.id,
    establishment_id: mission.estabelecimentoId,
    rider_id: null,
    total_amount: mission.total,
    status: "disponivel",
    bag_kind: mission.mode === "express" ? "express" : "detalhada",
    created_at: mission.createdAt || now,
    published_at: mission.createdAt || now,
    expires_without_accept_at: new Date(new Date(mission.createdAt || now).getTime() + 10 * 60000).toISOString(),
    urgency_level: mission.priority ? "prioritaria" : "normal",
    priority_label: mission.priority ? "Entrega prioritária • aceite rápido e fortaleça sua reputação com os estabelecimentos." : null,
    deliveries_count: mission.deliveries.length,
    last_status_message: "Bag publicada na fila.",
    payout_status: "pendente",
  }).select("id").single();
  if (bagInsert.error) throw bagInsert.error;
  const bagId = bagInsert.data.id;
  if (mission.deliveries.length) {
    const deliveryRows = mission.deliveries.map((item: DeliveryItem) => ({
      bag_id: bagId,
      customer_name: item.clienteNome || "Entrega rápida",
      customer_phone: item.clienteTelefone || null,
      order_description: item.descricaoPedido || "Despacho rápido sem detalhamento completo.",
      receipt_number: item.numeroComanda || null,
      zipcode: item.cep || null,
      street: item.rua || "",
      street_number: item.numero || "",
      complement: item.complemento || null,
      neighborhood: item.bairro || "",
      city: item.cidade || "Taquaritinga",
      state: item.uf || "SP",
      reference_point: item.referencia || null,
      notes: item.observacao || null,
      customer_payment_method: toDbPaymentMethod(item.pagamentoCliente),
      delivery_type: item.tipo,
      delivery_amount: item.valor,
    }));
    const ins = await supabase!.from("bag_deliveries").insert(deliveryRows);
    if (ins.error) throw ins.error;
  }
}

export async function persistAcceptMission(missionCode: string, riderId: string, message?: string) {
  if (!enabled()) return;
  const bag = await getBagByCode(missionCode);
  if (!bag) return;
  const now = new Date().toISOString();
  const bagRes = await supabase!.from("bags").update({ rider_id: riderId, status: "aguardando_confirmacao_estabelecimento", accepted_at: now, last_status_message: "Entregador aceitou a Bag." }).eq("id", bag.id);
  if (bagRes.error) throw bagRes.error;
  const attRes = await supabase!.from("bag_attempts").update({ rider_id: riderId, rider_message: message || null, status: "aceite_pendente_estabelecimento", accepted_at: now, visible_in_queue: false }).eq("id", bag.current_attempt_id);
  if (attRes.error) throw attRes.error;
  await addBagEvent(bag.id, "bag_aceita", "motoboy", message || "Bag aceita pelo entregador.", riderId);
}

export async function persistConfirmMissionByEstablishment(missionCode: string) {
  if (!enabled()) return;
  const bag = await getBagByCode(missionCode);
  if (!bag) return;
  const now = new Date().toISOString();
  const pickupDeadline = new Date(Date.now() + 15 * 60000).toISOString();
  const bagRes = await supabase!.from("bags").update({ status: "aguardando_retirada", confirmed_at: now, last_status_message: "Entregador confirmado pelo estabelecimento." }).eq("id", bag.id);
  if (bagRes.error) throw bagRes.error;
  const attRes = await supabase!.from("bag_attempts").update({ status: "aguardando_retirada", establishment_confirmed_at: now, pickup_deadline_at: pickupDeadline }).eq("id", bag.current_attempt_id);
  if (attRes.error) throw attRes.error;
  const balance = await getWalletBalance(bag.establishment_id);
  await setWalletBalance(bag.establishment_id, Math.max(0, balance - Number(bag.total_amount || 0)));
  await addBagEvent(bag.id, "estabelecimento_confirmou_entregador", "estabelecimento", "Entregador confirmado pelo estabelecimento.", bag.establishment_id);
}

export async function persistRejectMissionByEstablishment(missionCode: string, reason?: string) {
  if (!enabled()) return;
  const bag = await getBagByCode(missionCode);
  if (!bag) return;
  const now = new Date().toISOString();
  const attemptUpdate = await supabase!.from("bag_attempts").update({ status: "cancelada_estabelecimento", visible_in_queue: false, cancelled_at: now, cancelled_by_role: "estabelecimento", cancel_reason: reason || "Entregador recusado pelo estabelecimento." }).eq("id", bag.current_attempt_id);
  if (attemptUpdate.error) throw attemptUpdate.error;
  if (bag.rider_id) {
    const action = await supabase!.from("bag_attempt_rider_actions").insert({ bag_attempt_id: bag.current_attempt_id, rider_id: bag.rider_id, action_type: "ocultou", reason: reason || "Ignorado pelo estabelecimento.", created_at: now });
    if (action.error) throw action.error;
  }
  const rpc = await supabase!.rpc("requeue_bag", { p_bag_id: bag.id, p_requested_role: "estabelecimento", p_priority_label: "Entrega prioritária • aceite rápido e fortaleça sua reputação com os estabelecimentos." });
  if (rpc.error) throw rpc.error;
}

export async function persistRequestCredits(amount: number, attachmentName?: string, channel: CreditRequest["channel"] = "plataforma") {
  if (!enabled()) return;
  const session = getAppSession();
  let establishmentId = session?.role === "estabelecimento" ? session.entityId : undefined;
  if (!establishmentId) {
    const establishmentsRes = await supabase!.from("establishments").select("id").order("created_at", { ascending: true }).limit(1).maybeSingle();
    if (establishmentsRes.error) throw establishmentsRes.error;
    establishmentId = establishmentsRes.data?.id;
  }
  if (!establishmentId) throw new Error("Estabelecimento não identificado para solicitar créditos.");
  const res = await supabase!.from("credit_requests").insert({
    establishment_id: establishmentId,
    city_id: session?.cityId || null,
    requested_by_user_id: session?.userId || null,
    amount,
    status: "pendente",
    request_channel: channel === "comprovante" ? "plataforma" : channel,
    attachment_name: attachmentName || null,
    requested_at: new Date().toISOString(),
    notes: "Solicitação criada pela plataforma v33.",
  }).select("id").maybeSingle();
  if (res.error) throw res.error;
}

export async function persistApproveCreditRequest(id: string) {
  if (!enabled()) return;
  const reqRes = await supabase!.from("credit_requests").select("*").eq("id", id).maybeSingle();
  if (reqRes.error) throw reqRes.error;
  const req = reqRes.data;
  if (!req) return;
  const upd = await supabase!.from("credit_requests").update({ status: "aprovado", reviewed_at: new Date().toISOString() }).eq("id", id);
  if (upd.error) throw upd.error;
  const balance = await getWalletBalance(req.establishment_id);
  await setWalletBalance(req.establishment_id, balance + Number(req.amount || 0));
}

export async function persistSetRiderAvailability(riderId: string, value: "online" | "offline") {
  if (!enabled()) return;
  const res = await supabase!.from("riders").update({ online_now: value === "online" }).eq("id", riderId);
  if (res.error) throw res.error;
}

export async function persistEstablishmentMarkInDelivery(mission: Mission) {
  if (!enabled()) return;
  const bag = await getBagByCode(mission.id);
  if (!bag) return;
  const now = new Date().toISOString();
  const routeDeadline = mission.routeDeadlineAt || new Date(Date.now() + 30 * 60000).toISOString();
  const bagRes = await supabase!.from("bags").update({ status: "em_entrega", started_at: now, last_status_message: "Bag em rota." }).eq("id", bag.id);
  if (bagRes.error) throw bagRes.error;
  const attRes = await supabase!.from("bag_attempts").update({ status: "em_entrega", started_at: now, route_deadline_at: routeDeadline }).eq("id", bag.current_attempt_id);
  if (attRes.error) throw attRes.error;
}

export async function persistCancelMissionByEstablishment(missionCode: string, reason: string, creditValue: number) {
  if (!enabled()) return;
  const bag = await getBagByCode(missionCode);
  if (!bag) return;
  const now = new Date().toISOString();
  const bagRes = await supabase!.from("bags").update({ status: "divergencia_estabelecimento", establishment_finished_at: now, finish_reason: reason, last_status_message: reason, payout_status: null }).eq("id", bag.id);
  if (bagRes.error) throw bagRes.error;
  const attRes = await supabase!.from("bag_attempts").update({ status: "cancelada_estabelecimento", visible_in_queue: false, cancelled_at: now, cancelled_by_role: "estabelecimento", cancel_reason: reason, establishment_finished_at: now }).eq("id", bag.current_attempt_id);
  if (attRes.error) throw attRes.error;
  const balance = await getWalletBalance(bag.establishment_id);
  await setWalletBalance(bag.establishment_id, balance + creditValue);
}

export async function persistCancelAvailableMission(missionCode: string) {
  if (!enabled()) return;
  const bag = await getBagByCode(missionCode);
  if (!bag) return;
  const now = new Date().toISOString();
  const bagRes = await supabase!.from("bags").update({ status: "divergencia_estabelecimento", establishment_finished_at: now, finish_reason: "ESTABELECIMENTO_OUTROS: Bag cancelada antes do aceite.", last_status_message: "Bag cancelada pelo estabelecimento antes do aceite.", payout_status: null }).eq("id", bag.id);
  if (bagRes.error) throw bagRes.error;
  const attRes = await supabase!.from("bag_attempts").update({ status: "cancelada_estabelecimento", visible_in_queue: false, cancelled_at: now, cancelled_by_role: "estabelecimento", cancel_reason: "Bag cancelada antes do aceite." }).eq("id", bag.current_attempt_id);
  if (attRes.error) throw attRes.error;
}

export async function persistRiderWithdrawAcceptance(missionCode: string, riderId: string, reason: string) {
  if (!enabled()) return;
  const bag = await getBagByCode(missionCode);
  if (!bag) return;
  const now = new Date().toISOString();
  const action = await supabase!.from("bag_attempt_rider_actions").insert({ bag_attempt_id: bag.current_attempt_id, rider_id: riderId, action_type: "cancelou_aceite", reason, created_at: now });
  if (action.error) throw action.error;
  const attRes = await supabase!.from("bag_attempts").update({ status: "cancelada_motoboy", visible_in_queue: false, cancelled_at: now, cancelled_by_role: "motoboy", cancel_reason: reason }).eq("id", bag.current_attempt_id);
  if (attRes.error) throw attRes.error;
  const rpc = await supabase!.rpc("requeue_bag", { p_bag_id: bag.id, p_requested_role: "motoboy", p_priority_label: bag.priority_label || null });
  if (rpc.error) throw rpc.error;
}

export async function persistHideMissionForRider(missionCode: string, riderId: string) {
  if (!enabled()) return;
  const bag = await getBagByCode(missionCode);
  if (!bag) return;
  const res = await supabase!.from("bag_attempt_rider_actions").insert({ bag_attempt_id: bag.current_attempt_id, rider_id: riderId, action_type: "ocultou", reason: "Solicitação ocultada pelo entregador.", created_at: new Date().toISOString() });
  if (res.error) throw res.error;
}

export async function persistRiderRequestCancel(missionCode: string, riderId: string, reason: string) {
  if (!enabled()) return;
  const bag = await getBagByCode(missionCode);
  if (!bag) return;
  const attRes = await supabase!.from("bag_attempts").update({ rider_message: reason ? `Solicitação de cancelamento: ${reason}` : null }).eq("id", bag.current_attempt_id);
  if (attRes.error) throw attRes.error;
  await addBagEvent(bag.id, "solicitacao_cancelamento_motoboy", "motoboy", reason || "Motoboy solicitou cancelamento.", riderId);
}

export async function persistRiderMarkFinished(missionCode: string) {
  if (!enabled()) return;
  const bag = await getBagByCode(missionCode);
  if (!bag) return;
  const now = new Date().toISOString();
  const bagRes = await supabase!.from("bags").update({ status: "motoboy_marcou_finalizada", rider_finished_at: now, last_status_message: "Entregador solicitou finalização." }).eq("id", bag.id);
  if (bagRes.error) throw bagRes.error;
  const attRes = await supabase!.from("bag_attempts").update({ status: "finalizacao_solicitada", rider_finished_at: now }).eq("id", bag.current_attempt_id);
  if (attRes.error) throw attRes.error;
}

export async function persistEstablishmentFinishMission(missionCode: string, approved: boolean, reason?: string) {
  if (!enabled()) return;
  const bag = await getBagByCode(missionCode);
  if (!bag) return;
  const now = new Date().toISOString();
  const status = approved ? "finalizada_estabelecimento" : "divergencia_estabelecimento";
  const payoutStatus = approved || parseCancelCategory(reason) !== "entregador" ? "pendente" : null;
  const bagRes = await supabase!.from("bags").update({ status, establishment_finished_at: now, finish_reason: approved ? null : reason || null, payout_status: payoutStatus, last_status_message: approved ? "Bag finalizada pelo estabelecimento." : reason || "Bag enviada para divergência." }).eq("id", bag.id);
  if (bagRes.error) throw bagRes.error;
  const attRes = await supabase!.from("bag_attempts").update({ status: approved ? "finalizada" : "divergencia", establishment_finished_at: now, cancel_reason: approved ? null : reason || null }).eq("id", bag.current_attempt_id);
  if (attRes.error) throw attRes.error;
}

export async function persistRequeueMission(missionCode: string) {
  if (!enabled()) return;
  const bag = await getBagByCode(missionCode);
  if (!bag) return;
  const rpc = await supabase!.rpc("requeue_bag", { p_bag_id: bag.id, p_requested_role: "estabelecimento", p_priority_label: "Entrega prioritária • aceite rápido e fortaleça sua reputação com os estabelecimentos." });
  if (rpc.error) throw rpc.error;
}

export async function persistRequestMissionCreditReview(missionCode: string, reason: string, amount: number, category?: Mission["cancelCategory"]) {
  if (!enabled()) return;
  const bag = await getBagByCode(missionCode);
  if (!bag) return;
  const reasonType = category === "entregador" ? "entregador" : category === "cliente" ? "cliente" : "estabelecimento_outros";
  const rpc = await supabase!.rpc("request_bag_credit_review", {
    p_bag_id: bag.id,
    p_reason_type: reasonType,
    p_reason_text: reason || "Solicitação enviada pela plataforma.",
    p_requested_credit_amount: amount,
    p_requested_by_role: "estabelecimento",
    p_requested_by_id: null,
  });
  if (rpc.error) throw rpc.error;
}

export async function persistArchiveExpiredAvailableMission(missionCode: string, reason: string) {
  if (!enabled()) return;
  const bag = await getBagByCode(missionCode);
  if (!bag) return;
  const now = new Date().toISOString();
  const bagRes = await supabase!.from("bags").update({ status: "divergencia_estabelecimento", establishment_finished_at: now, finish_reason: `ESTABELECIMENTO_OUTROS: ${reason}`, last_status_message: reason }).eq("id", bag.id);
  if (bagRes.error) throw bagRes.error;
  const attRes = await supabase!.from("bag_attempts").update({ status: "cancelada_estabelecimento", visible_in_queue: false, cancelled_at: now, cancelled_by_role: "estabelecimento", cancel_reason: reason }).eq("id", bag.current_attempt_id);
  if (attRes.error) throw attRes.error;
}

export async function persistRiderAddProof(missionCode: string, name: string, kind: MissionProof["kind"]) {
  if (!enabled()) return;
  const bag = await getBagByCode(missionCode);
  if (!bag) return;
  const res = await supabase!.from("bag_proofs").insert({ bag_id: bag.id, uploaded_by_role: "motoboy", proof_type: kind, file_name: name, created_at: new Date().toISOString(), is_active: true });
  if (res.error) throw res.error;
}

export async function persistRateMission(missionCode: string, score: number, comment?: string, tags?: string[]) {
  if (!enabled()) return;
  const bag = await getBagByCode(missionCode);
  if (!bag) return;
  const session = getAppSession();
  try {
    const res = await supabase!.from("bag_ratings").upsert({
      bag_id: bag.id,
      establishment_id: bag.establishment_id,
      rider_id: bag.rider_id || null,
      score,
      comment: comment?.trim() || null,
      tags: tags || [],
      created_by: session?.userId || null,
      created_at: new Date().toISOString(),
    }, { onConflict: "bag_id" });
    if (res.error) throw res.error;
  } catch (error) {
    await addBagEvent(bag.id, "avaliacao_entregador", "estabelecimento", `Avaliação do entregador: ${score} estrela(s). ${comment || ""}`, session?.userId || null);
  }
}

export async function persistMarkMissionPaid(missionCode: string, method: "pix" | "dinheiro") {
  if (!enabled()) return;
  const bag = await getBagByCode(missionCode);
  if (!bag) return;
  const rpc = await supabase!.rpc("mark_bag_payout_paid", { p_bag_id: bag.id, p_method: method, p_actor_id: null });
  if (rpc.error) throw rpc.error;
}

export async function persistUpdateOperationalSettings(partial: Partial<OperationalSettings>) {
  if (!enabled()) return;
  const current = await supabase!.from("payment_settings").select("id").limit(1).maybeSingle();
  if (current.error) throw current.error;
  const payload: any = { updated_at: new Date().toISOString() };
  if (typeof partial.valorNormal === "number") payload.normal_delivery_value = partial.valorNormal;
  if (typeof partial.valorDistante === "number") payload.distant_delivery_value = partial.valorDistante;
  if (typeof partial.taxaPlataformaPercentual === "number") payload.platform_fee_percent = partial.taxaPlataformaPercentual;
  if (partial.pixKey !== undefined) payload.pix_key = partial.pixKey;
  if (partial.pixReceiverName !== undefined) payload.pix_receiver_name = partial.pixReceiverName;
  if (partial.supportWhatsapp !== undefined) payload.support_whatsapp = partial.supportWhatsapp;
  if (partial.supportEmail !== undefined) payload.support_email = partial.supportEmail;
  if (partial.supportPhone !== undefined) payload.support_phone = partial.supportPhone;
  if (partial.cidadeBase !== undefined) payload.city_name = partial.cidadeBase;
  if (partial.ufBase !== undefined) payload.state = partial.ufBase;
  if (current.data?.id) payload.id = current.data.id;
  const upsert = await supabase!.from("payment_settings").upsert(payload);
  if (upsert.error) throw upsert.error;
}



async function upsertAppUser(params: { role: "admin" | "estabelecimento" | "motoboy"; username?: string; password?: string; displayName: string; email?: string; phone?: string; documentNumber?: string; entityId?: string; citySlug?: string }) {
  if (!enabled() || !params.username || !params.password) return;
  const res = await supabase!.rpc("chm_upsert_app_user", {
    p_city_slug: params.citySlug || "taquaritinga-sp",
    p_role: params.role,
    p_username: params.username,
    p_password: params.password,
    p_display_name: params.displayName,
    p_email: params.email || null,
    p_phone: params.phone || null,
    p_document_number: params.documentNumber || null,
    p_entity_id: params.entityId || null,
  });
  if (res.error) throw res.error;
}

function splitCityUf(cidade: string | undefined) {
  const [city, state] = (cidade || "Taquaritinga/SP").split("/");
  return { city: city || "Taquaritinga", state: state || "SP" };
}

export async function persistRegistrationApplication(application: RegistrationApplication) {
  if (!enabled()) return;
  const { city, state } = splitCityUf(application.cidade);
  try {
    const check = await supabase!.rpc("chm_check_registration_conflict", {
      p_username: application.username || null,
      p_email: application.email || null,
      p_phone: application.whatsapp || null,
      p_document_number: application.role === "motoboy" ? application.cpf || null : application.documento || null,
      p_plate: application.placa || null,
      p_ignore_application_id: application.id || null,
    });
    const conflict = Array.isArray(check.data) ? check.data[0] : check.data;
    if (!check.error && conflict?.has_conflict) throw new Error(conflict.message || "Dados já cadastrados no Chegou Motoca.");
  } catch (error: any) {
    if (String(error?.message || "").includes("Dados") || String(error?.message || "").includes("cadastrad")) throw error;
  }
  const res = await supabase!.from("registration_applications").upsert({
    id: application.id,
    role: application.role,
    status: application.status,
    full_name: application.nome,
    username: application.username,
    email: application.email,
    whatsapp: application.whatsapp,
    access_password: application.password,
    city,
    state,
    cpf: application.cpf || null,
    vehicle_plate: application.placa || null,
    pix_key: application.pix || null,
    profile_photo_name: application.profilePhotoName || null,
    profile_photo_data_url: application.profilePhotoDataUrl || null,
    source: application.source || null,
    document_number: application.documento || null,
    responsible_name: application.responsavel || null,
    address: application.endereco || null,
    created_at: application.createdAt,
  });
  if (res.error) throw res.error;
}

export async function persistApproveRegistrationApplication(application: RegistrationApplication) {
  if (!enabled()) return;
  const { city, state } = splitCityUf(application.cidade);
  const upd = await supabase!.from("registration_applications").update({ status: "aprovado", reviewed_at: new Date().toISOString() }).eq("id", application.id);
  if (upd.error) throw upd.error;

  if (application.role === "motoboy") {
    const profRes = await supabase!.from("profiles").insert({ role: "motoboy", full_name: application.nome, phone: application.whatsapp, email: application.email, status: "ativo", created_at: new Date().toISOString() }).select("id").single();
    if (profRes.error) throw profRes.error;
    const riderRes = await supabase!.from("riders").insert({ profile_id: profRes.data.id, pix_key: application.pix || null, city, state, city_id: "10000000-0000-4000-8000-000000000001", status: "ativo", online_now: false, whatsapp: application.whatsapp, vehicle_plate: application.placa || null, cpf: application.cpf || null, profile_photo_url: application.profilePhotoDataUrl || null, created_at: new Date().toISOString() }).select("id").single();
    if (riderRes.error) throw riderRes.error;
    await upsertAppUser({ role: "motoboy", username: application.username, password: application.password, displayName: application.nome, email: application.email, phone: application.whatsapp, documentNumber: application.cpf, entityId: riderRes.data.id });
    return;
  }

  const profRes = await supabase!.from("profiles").insert({ role: "estabelecimento", full_name: application.nome, phone: application.whatsapp, email: application.email, status: "ativo", created_at: new Date().toISOString() }).select("id").single();
  if (profRes.error) throw profRes.error;
  const estRes = await supabase!.from("establishments").insert({ profile_id: profRes.data.id, trade_name: application.nome, cnpj: application.documento || application.cpf || "", whatsapp: application.whatsapp, city, state, city_id: "10000000-0000-4000-8000-000000000001", status: "ativo", address: application.endereco || null, responsible_name: application.responsavel || null, created_at: new Date().toISOString() }).select("id").single();
  if (estRes.error) throw estRes.error;
  const walletRes = await supabase!.from("establishment_wallets").upsert({ establishment_id: estRes.data.id, approved_balance: 0, updated_at: new Date().toISOString() });
  if (walletRes.error) throw walletRes.error;
  await upsertAppUser({ role: "estabelecimento", username: application.username, password: application.password, displayName: application.nome, email: application.email, phone: application.whatsapp, documentNumber: application.documento || application.cpf, entityId: estRes.data.id });
}

export async function persistRejectRegistrationApplication(application: RegistrationApplication, note: string) {
  if (!enabled()) return;
  const res = await supabase!.from("registration_applications").update({ status: "recusado", reviewed_at: new Date().toISOString(), review_note: note }).eq("id", application.id);
  if (res.error) throw res.error;
}

export async function persistAddRegisteredRider(payload: Omit<RegisteredRider, "id">) {
  if (!enabled()) return;
  const profRes = await supabase!.from("profiles").insert({ role: "motoboy", full_name: payload.nome, phone: payload.whatsapp, email: payload.email || null, status: payload.status === "bloqueado" ? "bloqueado" : "ativo", created_at: new Date().toISOString() }).select("id").single();
  if (profRes.error) throw profRes.error;
  const riderRes = await supabase!.from("riders").insert({ profile_id: profRes.data.id, pix_key: payload.pix, city: payload.cidade.split("/")[0], state: payload.cidade.split("/")[1] || "SP", city_id: "10000000-0000-4000-8000-000000000001", status: payload.status === "bloqueado" ? "bloqueado" : "ativo", online_now: payload.status === "online", whatsapp: payload.whatsapp, vehicle_plate: payload.placa || null, cpf: payload.cpf || null, created_at: new Date().toISOString() }).select("id").single();
  if (riderRes.error) throw riderRes.error;
  await upsertAppUser({ role: "motoboy", username: payload.username, password: payload.accessPassword, displayName: payload.nome, email: payload.email, phone: payload.whatsapp, documentNumber: payload.cpf, entityId: riderRes.data.id });
}

export async function persistSetRegisteredRiderStatus(id: string, status: RegisteredRider["status"]) {
  if (!enabled()) return;
  const normalized = status === "bloqueado" ? "bloqueado" : "ativo";
  const rpc = await supabase!.rpc("chm_set_entity_access_status", { p_role: "motoboy", p_entity_id: id, p_status: normalized });
  if (!rpc.error) return;
  const riderRes = await supabase!.from("riders").select("profile_id").eq("id", id).maybeSingle();
  if (riderRes.error) throw riderRes.error;
  const upd = await supabase!.from("riders").update({ status: normalized, online_now: status === "online" }).eq("id", id);
  if (upd.error) throw upd.error;
  if (riderRes.data?.profile_id) {
    const prof = await supabase!.from("profiles").update({ status: normalized }).eq("id", riderRes.data.profile_id);
    if (prof.error) throw prof.error;
  }
  await supabase!.from("app_users").update({ is_active: status !== "bloqueado" }).eq("role", "motoboy").eq("entity_id", id);
}

export async function persistRemoveRegisteredRider(id: string) {
  if (!enabled()) return;
  await persistSetRegisteredRiderStatus(id, "bloqueado");
}

export async function persistAddRegisteredEstablishment(payload: Omit<RegisteredEstablishment, "id">) {
  if (!enabled()) return;
  const profRes = await supabase!.from("profiles").insert({ role: "estabelecimento", full_name: payload.nome, phone: payload.whatsapp, email: payload.email || null, status: payload.status, created_at: new Date().toISOString() }).select("id").single();
  if (profRes.error) throw profRes.error;
  const estRes = await supabase!.from("establishments").insert({ profile_id: profRes.data.id, trade_name: payload.nome, cnpj: payload.documento, whatsapp: payload.whatsapp, city: payload.cidade.split("/")[0], state: payload.cidade.split("/")[1] || "SP", city_id: "10000000-0000-4000-8000-000000000001", status: payload.status, address: payload.endereco || null, responsible_name: payload.responsavel || null, created_at: new Date().toISOString() }).select("id").single();
  if (estRes.error) throw estRes.error;
  const walletRes = await supabase!.from("establishment_wallets").upsert({ establishment_id: estRes.data.id, approved_balance: 0, updated_at: new Date().toISOString() });
  if (walletRes.error) throw walletRes.error;
  await upsertAppUser({ role: "estabelecimento", username: payload.username, password: payload.accessPassword, displayName: payload.nome, email: payload.email, phone: payload.whatsapp, documentNumber: payload.documento, entityId: estRes.data.id });
}

export async function persistSetRegisteredEstablishmentStatus(id: string, status: RegisteredEstablishment["status"]) {
  if (!enabled()) return;
  const normalized = status === "bloqueado" ? "bloqueado" : status === "pendente" ? "pendente" : "ativo";
  const rpc = await supabase!.rpc("chm_set_entity_access_status", { p_role: "estabelecimento", p_entity_id: id, p_status: normalized });
  if (!rpc.error) return;
  const estRes = await supabase!.from("establishments").select("profile_id").eq("id", id).maybeSingle();
  if (estRes.error) throw estRes.error;
  const upd = await supabase!.from("establishments").update({ status: normalized }).eq("id", id);
  if (upd.error) throw upd.error;
  if (estRes.data?.profile_id) {
    const prof = await supabase!.from("profiles").update({ status: normalized }).eq("id", estRes.data.profile_id);
    if (prof.error) throw prof.error;
  }
  await supabase!.from("app_users").update({ is_active: status === "ativo" }).eq("role", "estabelecimento").eq("entity_id", id);
}

export async function persistRemoveRegisteredEstablishment(id: string) {
  if (!enabled()) return;
  await persistSetRegisteredEstablishmentStatus(id, "bloqueado");
}


export async function persistUpdateRegisteredEstablishmentRouteSettings(id: string, payload: { endereco?: string; raioNormalKm?: number; baseLatitude?: number; baseLongitude?: number }) {
  if (!enabled()) return;
  const update: Record<string, any> = {};
  if (payload.endereco !== undefined) {
    update.address = payload.endereco || null;
    update.base_address = payload.endereco || null;
  }
  if (payload.raioNormalKm !== undefined) update.normal_radius_km = payload.raioNormalKm;
  if (payload.baseLatitude !== undefined) update.base_latitude = payload.baseLatitude;
  if (payload.baseLongitude !== undefined) update.base_longitude = payload.baseLongitude;
  if (!Object.keys(update).length) return;
  const res = await supabase!.from("establishments").update(update).eq("id", id);
  if (res.error) throw res.error;
}

export async function persistSubmitAppFeedback(feedback: AppFeedback) {
  if (!enabled()) return;
  const res = await supabase!.from("app_feedbacks").insert({
    id: feedback.id,
    name: feedback.name,
    email: feedback.email || null,
    whatsapp: feedback.whatsapp || null,
    kind: feedback.kind,
    message: feedback.message,
    status: feedback.status,
    created_at: feedback.createdAt,
  });
  if (res.error) throw res.error;
}

export async function persistUpdateAppFeedbackStatus(id: string, status: AppFeedback["status"]) {
  if (!enabled()) return;
  const res = await supabase!.from("app_feedbacks").update({ status, reviewed_at: new Date().toISOString() }).eq("id", id);
  if (res.error) throw res.error;
}

export async function persistAddAdminUser(payload: { citySlug: string; username: string; password: string; name: string; email?: string; phone?: string; role?: "admin" | "superadmin" }) {
  if (!enabled()) return;
  const res = await supabase!.rpc("chm_create_admin_user", {
    p_city_slug: payload.citySlug,
    p_username: payload.username,
    p_password: payload.password,
    p_display_name: payload.name,
    p_email: payload.email || null,
    p_phone: payload.phone || null,
    p_role: payload.role || "admin",
  });
  if (res.error) throw res.error;
}

export async function persistResetEntityPassword(role: "estabelecimento" | "motoboy", entityId: string, newPassword: string) {
  if (!enabled()) return;
  const res = await supabase!.rpc("chm_reset_entity_password", {
    p_role: role,
    p_entity_id: entityId,
    p_new_password: newPassword,
  });
  if (res.error) throw res.error;
}

export async function persistResetAdminPassword(userId: string, newPassword: string, actorUserId?: string, actorPassword?: string) {
  if (!enabled()) return;
  const res = actorUserId && actorPassword
    ? await supabase!.rpc("chm_reset_admin_password_secure", {
        p_actor_user_id: actorUserId,
        p_actor_password: actorPassword,
        p_target_user_id: userId,
        p_new_password: newPassword,
      })
    : await supabase!.rpc("chm_reset_app_user_password", {
        p_user_id: userId,
        p_new_password: newPassword,
      });
  if (res.error) throw res.error;
}

export async function persistSetAdminActive(userId: string, isActive: boolean, actorUserId?: string, actorPassword?: string) {
  if (!enabled()) return;
  const res = await supabase!.rpc("chm_set_admin_active_secure", {
    p_actor_user_id: actorUserId || null,
    p_actor_password: actorPassword || null,
    p_target_user_id: userId,
    p_is_active: isActive,
  });
  if (res.error) throw res.error;
}

export async function persistRemoveAdminAccess(userId: string, actorUserId?: string, actorPassword?: string) {
  if (!enabled()) return;
  const res = await supabase!.rpc("chm_remove_admin_access_secure", {
    p_actor_user_id: actorUserId || null,
    p_actor_password: actorPassword || null,
    p_target_user_id: userId,
  });
  if (res.error) throw res.error;
}
