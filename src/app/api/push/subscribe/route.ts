import { NextResponse } from "next/server";
import { hasSupabaseEnv, supabase } from "@/lib/supabase";

type PushPayload = {
  subscription?: {
    endpoint?: string;
    expirationTime?: number | null;
    keys?: {
      p256dh?: string;
      auth?: string;
    };
  };
  session?: {
    userId?: string;
    role?: string;
    username?: string;
    name?: string;
    entityId?: string;
    cityId?: string;
  } | null;
};

export async function POST(request: Request) {
  let payload: PushPayload;
  try {
    payload = (await request.json()) as PushPayload;
  } catch {
    return NextResponse.json({ ok: false, error: "Payload inválido." }, { status: 400 });
  }

  const subscription = payload.subscription;
  if (!subscription?.endpoint) {
    return NextResponse.json({ ok: false, error: "Inscrição push sem endpoint." }, { status: 400 });
  }

  if (!hasSupabaseEnv() || !supabase) {
    return NextResponse.json({ ok: true, saved: false, warning: "Supabase não configurado para salvar a inscrição push." });
  }

  const session = payload.session || null;
  const record = {
    endpoint: subscription.endpoint,
    p256dh: subscription.keys?.p256dh || null,
    auth: subscription.keys?.auth || null,
    expiration_time: subscription.expirationTime ? new Date(subscription.expirationTime).toISOString() : null,
    user_id: session?.userId || null,
    role: session?.role || null,
    username: session?.username || null,
    display_name: session?.name || null,
    entity_id: session?.entityId || null,
    city_id: session?.cityId || null,
    subscription_json: subscription,
    user_agent: request.headers.get("user-agent") || null,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from("push_subscriptions").upsert(record, { onConflict: "endpoint" });
  if (error) {
    return NextResponse.json({
      ok: true,
      saved: false,
      warning: `Permissão ativada, mas não foi possível concluir o cadastro deste aparelho agora. Tente novamente mais tarde.`,
    });
  }

  return NextResponse.json({ ok: true, saved: true });
}
