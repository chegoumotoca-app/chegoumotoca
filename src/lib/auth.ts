"use client";

import { useEffect, useState } from "react";
import { hasSupabaseEnv, supabase } from "@/lib/supabase";

export type AppRole = "admin" | "estabelecimento" | "motoboy" | "superadmin";

export type AppSession = {
  userId: string;
  role: AppRole;
  username: string;
  name: string;
  cityId?: string;
  cityName?: string;
  citySlug?: string;
  entityId?: string;
  createdAt: string;
  lastActivityAt?: number;
  expiresAt?: number;
};

const SESSION_TIMEOUT_MS = 60 * 60 * 1000;
const SESSION_KEY = "chegoumotoca:auth-session:v39";
const LEGACY_SESSION_KEYS = [
  "chegoumotoca:auth-session:v38",
  "chegoumotoca:auth-session:v37",
  "chegoumotoca:auth-session:v36",
  "chegoumotoca:auth-session:v35",
  "chegoumotoca:auth-session:v34",
  "chegoumotoca:auth-session:v33",
  "chegoumotoca:auth-session:v32",
];
const AUTH_EVENT = "chegoumotoca:auth-changed";

function normalizeSession(raw: any): AppSession | null {
  if (!raw) return null;
  const role = raw.role || raw.user_role;
  if (!["admin", "estabelecimento", "motoboy", "superadmin"].includes(role)) return null;
  return {
    userId: String(raw.user_id || raw.userId || raw.id || ""),
    role,
    username: String(raw.username || ""),
    name: String(raw.display_name || raw.name || raw.username || "Usuário"),
    cityId: raw.city_id || raw.cityId || undefined,
    cityName: raw.city_name || raw.cityName || undefined,
    citySlug: raw.city_slug || raw.citySlug || undefined,
    entityId: raw.entity_id || raw.entityId || undefined,
    createdAt: String(raw.created_at || raw.createdAt || new Date().toISOString()),
    lastActivityAt: typeof raw.lastActivityAt === "number" ? raw.lastActivityAt : Date.now(),
    expiresAt: typeof raw.expiresAt === "number" ? raw.expiresAt : Date.now() + SESSION_TIMEOUT_MS,
  };
}

export function getAppSession(): AppSession | null {
  if (typeof window === "undefined") return null;
  try {
    const current = normalizeSession(JSON.parse(window.localStorage.getItem(SESSION_KEY) || "null"));
    if (current) {
      if (current.expiresAt && Date.now() > current.expiresAt) {
        clearAppSession();
        return null;
      }
      return current;
    }
    for (const key of LEGACY_SESSION_KEYS) {
      const legacy = normalizeSession(JSON.parse(window.localStorage.getItem(key) || "null"));
      if (legacy) {
        legacy.lastActivityAt = Date.now();
        legacy.expiresAt = Date.now() + SESSION_TIMEOUT_MS;
        window.localStorage.setItem(SESSION_KEY, JSON.stringify(legacy));
        window.localStorage.removeItem(key);
        return legacy;
      }
    }
    return null;
  } catch {
    return null;
  }
}

export function setAppSession(session: AppSession | null) {
  if (typeof window === "undefined") return;
  if (session) {
    const stamped = { ...session, lastActivityAt: Date.now(), expiresAt: Date.now() + SESSION_TIMEOUT_MS };
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(stamped));
  } else {
    window.localStorage.removeItem(SESSION_KEY);
  }
  window.dispatchEvent(new Event(AUTH_EVENT));
}

export function clearAppSession() {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(SESSION_KEY);
    LEGACY_SESSION_KEYS.forEach((key) => window.localStorage.removeItem(key));
    window.localStorage.removeItem("chegoumotoca:auth-session:v38");
    window.localStorage.removeItem("chegoumotoca:auth-session:v31");
    window.localStorage.removeItem("chegoumotoca:runtime-store:v37");
    window.localStorage.removeItem("chegoumotoca:runtime-store:v36");
    window.localStorage.removeItem("chegoumotoca:runtime-store:v35");
    window.localStorage.removeItem("chegoumotoca:runtime-store:v34");
    window.localStorage.removeItem("chegoumotoca:runtime-store:v33");
    window.localStorage.removeItem("chegoumotoca:runtime-store:v32");
    window.dispatchEvent(new Event(AUTH_EVENT));
  }
}


export function touchAppSession() {
  if (typeof window === "undefined") return;
  try {
    const session = normalizeSession(JSON.parse(window.localStorage.getItem(SESSION_KEY) || "null"));
    if (!session?.userId) return;
    session.lastActivityAt = Date.now();
    session.expiresAt = Date.now() + SESSION_TIMEOUT_MS;
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    // ignora sessão corrompida
  }
}

export function useAppSession() {
  const [session, setSession] = useState<AppSession | null>(null);

  useEffect(() => {
    const sync = () => setSession(getAppSession());
    sync();
    const touch = () => { touchAppSession(); sync(); };
    const interval = window.setInterval(touch, 5 * 60 * 1000);
    ["click", "keydown", "touchstart"].forEach((event) => window.addEventListener(event, touch, { passive: true }));
    window.addEventListener(AUTH_EVENT, sync);
    window.addEventListener("storage", sync);
    window.addEventListener("visibilitychange", touch);
    return () => {
      window.clearInterval(interval);
      ["click", "keydown", "touchstart"].forEach((event) => window.removeEventListener(event, touch));
      window.removeEventListener(AUTH_EVENT, sync);
      window.removeEventListener("storage", sync);
      window.removeEventListener("visibilitychange", touch);
    };
  }, []);

  return session;
}

export async function loginAppUser(identifier: string, password: string, citySlug = "taquaritinga-sp", expectedRole?: "admin" | "estabelecimento" | "motoboy" | "superadmin") {
  const cleanIdentifier = identifier.trim();
  const cleanPassword = password.trim();
  if (!cleanIdentifier || !cleanPassword) {
    return { ok: false as const, error: "Informe usuário/e-mail e senha." };
  }
  if (!hasSupabaseEnv() || !supabase) {
    return { ok: false as const, error: "Supabase não configurado. Confira as variáveis NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY." };
  }

  const res = await supabase.rpc("chm_login", {
    p_identifier: cleanIdentifier,
    p_password: cleanPassword,
    p_city_slug: citySlug,
  });

  if (res.error) {
    return { ok: false as const, error: res.error.message || "Não foi possível validar o acesso." };
  }

  const session = normalizeSession(res.data);
  if (!session?.userId) {
    return { ok: false as const, error: "Usuário, senha ou cidade não conferem." };
  }

  if (expectedRole) {
    const adminAllowed = expectedRole === "admin" && (session.role === "admin" || session.role === "superadmin");
    if (!adminAllowed && session.role !== expectedRole) {
      return { ok: false as const, error: "Essa conta não corresponde ao tipo de acesso selecionado." };
    }
  }

  setAppSession(session);
  return { ok: true as const, session };
}

export function routeForRole(role: AppRole) {
  if (role === "admin" || role === "superadmin") return "/admin";
  if (role === "estabelecimento") return "/estabelecimento";
  return "/motoboy";
}
