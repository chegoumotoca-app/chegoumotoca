"use client";

import { useEffect, useState } from "react";
import { getAppSession } from "@/lib/auth";

type AppVersion = {
  version: string;
  label: string;
  releasedAt: string;
};

const VERSION_STORAGE_KEY = "chegoumotoca:pwa-version";
const NOTIFICATION_DISMISSED_KEY = "chegoumotoca:notification-prompt-dismissed:v46";
const LOCATION_DISMISSED_KEY = "chegoumotoca:location-prompt-dismissed:v46";
const LOCATION_OK_KEY = "chegoumotoca:location-permission-ok";
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";

function isStandaloneMode() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in window.navigator && Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone))
  );
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i += 1) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

async function savePushSubscriptionForCurrentUser(registration: ServiceWorkerRegistration) {
  if (typeof window === "undefined" || !("PushManager" in window) || !VAPID_PUBLIC_KEY) return;
  const current = await registration.pushManager.getSubscription();
  const subscription = current || (await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
  }));
  await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ subscription: subscription.toJSON(), session: getAppSession() }),
  }).catch(() => undefined);
}

async function registerServiceWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return null;
  const registration = await navigator.serviceWorker.register("/sw.js?v=51", { scope: "/" });
  registration.update().catch(() => undefined);
  return registration;
}

export function PwaManager() {
  const [updateAvailable, setUpdateAvailable] = useState<AppVersion | null>(null);
  const [showNotificationPrompt, setShowNotificationPrompt] = useState(false);
  const [showLocationPrompt, setShowLocationPrompt] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    registerServiceWorker().then((registration) => {
      if (registration && typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
        savePushSubscriptionForCurrentUser(registration).catch(() => undefined);
      }
    }).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    let cancelled = false;
    fetch(`/version.json?ts=${Date.now()}`, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: AppVersion | null) => {
        if (cancelled || !data?.version) return;
        const stored = window.localStorage.getItem(VERSION_STORAGE_KEY);
        if (!stored) {
          window.localStorage.setItem(VERSION_STORAGE_KEY, data.version);
          return;
        }
        if (stored !== data.version) setUpdateAvailable(data);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const installed = isStandaloneMode();
    const installDismissed = window.localStorage.getItem("chegoumotoca:pwa-install-dismissed") === "1";
    if (!installed && !installDismissed) return;

    if ("Notification" in window && Notification.permission === "default" && window.localStorage.getItem(NOTIFICATION_DISMISSED_KEY) !== "1") {
      const timer = window.setTimeout(() => setShowNotificationPrompt(true), 3200);
      return () => window.clearTimeout(timer);
    }

    if ("geolocation" in navigator && window.localStorage.getItem(LOCATION_OK_KEY) !== "1" && window.localStorage.getItem(LOCATION_DISMISSED_KEY) !== "1") {
      const timer = window.setTimeout(() => setShowLocationPrompt(true), 3800);
      return () => window.clearTimeout(timer);
    }
  }, []);

  async function updateNow() {
    if (typeof window === "undefined" || !updateAvailable) return;
    try {
      const keys = "caches" in window ? await caches.keys().catch(() => []) : [];
      await Promise.all(keys.filter((key) => key.includes("chegoumotoca")).map((key) => caches.delete(key)));
      const registration = await navigator.serviceWorker?.getRegistration?.();
      await registration?.update?.();
      registration?.waiting?.postMessage({ type: "SKIP_WAITING" });
    } finally {
      window.localStorage.setItem(VERSION_STORAGE_KEY, updateAvailable.version);
      window.location.reload();
    }
  }

  async function enableNotifications() {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      setShowNotificationPrompt(false);
      setMessage("Notificações ativadas. Você será avisado sobre novas entregas, confirmações e atualizações importantes.");
      const registration = await registerServiceWorker();
      if (registration) await savePushSubscriptionForCurrentUser(registration);
      maybePromptLocationSoon();
    } else if (permission === "denied") {
      setShowNotificationPrompt(false);
      setMessage("Notificações bloqueadas. Para não perder entregas disponíveis, libere depois nas configurações do navegador ou do aplicativo.");
      maybePromptLocationSoon();
    }
  }

  function maybePromptLocationSoon() {
    if (typeof window === "undefined") return;
    if (!("geolocation" in navigator)) return;
    if (window.localStorage.getItem(LOCATION_OK_KEY) === "1") return;
    if (window.localStorage.getItem(LOCATION_DISMISSED_KEY) === "1") return;
    window.setTimeout(() => setShowLocationPrompt(true), 800);
  }

  function dismissNotifications() {
    window.localStorage.setItem(NOTIFICATION_DISMISSED_KEY, "1");
    setShowNotificationPrompt(false);
    maybePromptLocationSoon();
  }

  function enableLocation() {
    if (typeof window === "undefined" || !("geolocation" in navigator)) return;
    setMessage("Quando o aparelho perguntar, permita a localização para melhorar rotas e cálculo de distância.");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        window.localStorage.setItem(LOCATION_OK_KEY, "1");
        window.localStorage.setItem("chegoumotoca:last-location", JSON.stringify({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
          accuracy: position.coords.accuracy,
          savedAt: new Date().toISOString(),
        }));
        setShowLocationPrompt(false);
        setMessage("Localização ativada. Isso ajuda o Chegou Motoca a calcular rotas, distância e entregas normais ou distantes.");
      },
      () => {
        setShowLocationPrompt(false);
        setMessage("Localização não liberada. Você pode ativar depois nas configurações do navegador ou do aplicativo.");
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
    );
  }

  function dismissLocation() {
    window.localStorage.setItem(LOCATION_DISMISSED_KEY, "1");
    setShowLocationPrompt(false);
  }

  return (
    <>
      {updateAvailable ? (
        <div className="fixed inset-x-3 bottom-[calc(5.25rem+max(env(safe-area-inset-bottom),0px))] z-[75] mx-auto max-w-md rounded-[24px] border border-[#22c55e]/25 bg-[#0b1119]/96 p-4 text-white shadow-[0_20px_70px_rgba(0,0,0,.5)] backdrop-blur-xl sm:bottom-5">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-[#22c55e]">Nova versão disponível</p>
          <p className="mt-2 text-lg font-black">Atualizar Chegou Motoca</p>
          <p className="mt-1 text-sm leading-6 text-zinc-300">Atualize para carregar as melhorias mais recentes do aplicativo.</p>
          <div className="mt-4 flex gap-2">
            <button type="button" onClick={updateNow} className="cm-primary rounded-2xl px-4 py-3 text-sm font-black">Atualizar agora</button>
            <button type="button" onClick={() => setUpdateAvailable(null)} className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-bold text-white">Depois</button>
          </div>
        </div>
      ) : null}

      {showNotificationPrompt ? (
        <div className="fixed inset-x-3 bottom-[calc(5.25rem+max(env(safe-area-inset-bottom),0px))] z-[72] mx-auto max-w-md rounded-[24px] border border-[#f59e0b]/25 bg-[#0b1119]/96 p-4 text-white shadow-[0_20px_70px_rgba(0,0,0,.5)] backdrop-blur-xl sm:bottom-5">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-[#f59e0b]">Avisos importantes</p>
          <p className="mt-2 text-lg font-black">Ativar notificações?</p>
          <p className="mt-1 text-sm leading-6 text-zinc-300">Permita notificações para não perder novas entregas disponíveis, confirmações e avisos da operação.</p>
          <div className="mt-4 flex gap-2">
            <button type="button" onClick={enableNotifications} className="cm-primary rounded-2xl px-4 py-3 text-sm font-black">Ativar</button>
            <button type="button" onClick={dismissNotifications} className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-bold text-white">Agora não</button>
          </div>
        </div>
      ) : null}

      {showLocationPrompt ? (
        <div className="fixed inset-x-3 bottom-[calc(5.25rem+max(env(safe-area-inset-bottom),0px))] z-[72] mx-auto max-w-md rounded-[24px] border border-sky-400/25 bg-[#0b1119]/96 p-4 text-white shadow-[0_20px_70px_rgba(0,0,0,.5)] backdrop-blur-xl sm:bottom-5">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-sky-300">Localização</p>
          <p className="mt-2 text-lg font-black">Permitir localização?</p>
          <p className="mt-1 text-sm leading-6 text-zinc-300">A localização ajuda o aplicativo a calcular distância, rota e identificar entregas normais ou distantes com mais precisão.</p>
          <div className="mt-4 flex gap-2">
            <button type="button" onClick={enableLocation} className="cm-primary rounded-2xl px-4 py-3 text-sm font-black">Permitir</button>
            <button type="button" onClick={dismissLocation} className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-bold text-white">Agora não</button>
          </div>
        </div>
      ) : null}

      {message ? (
        <div className="fixed inset-x-3 bottom-[calc(1rem+max(env(safe-area-inset-bottom),0px))] z-[71] mx-auto max-w-md rounded-2xl border border-white/10 bg-[#0b1119]/96 px-4 py-3 text-sm leading-6 text-zinc-200 shadow-[0_18px_55px_rgba(0,0,0,.45)] backdrop-blur-xl">
          {message}
          <button type="button" onClick={() => setMessage("")} className="ml-3 font-black text-[#22c55e]">OK</button>
        </div>
      ) : null}
    </>
  );
}
