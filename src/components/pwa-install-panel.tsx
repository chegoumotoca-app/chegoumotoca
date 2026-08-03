"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { BellIcon, CheckIcon, LocationIcon, WarningIcon } from "@/components/icons";
import { getAppSession } from "@/lib/auth";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
const LOCATION_KEY = "chegoumotoca:location-permission-ok";

function cx(...items: (string | false | null | undefined)[]) {
  return items.filter(Boolean).join(" ");
}

function isStandaloneMode() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in window.navigator && Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone))
  );
}

type IosBrowser = "chrome" | "safari" | "other" | null;

function getIosBrowser(): IosBrowser {
  if (typeof window === "undefined") return null;
  const ua = window.navigator.userAgent.toLowerCase();
  const isIos = /iphone|ipad|ipod/.test(ua) || (window.navigator.platform === "MacIntel" && window.navigator.maxTouchPoints > 1);
  if (!isIos) return null;
  if (/crios/.test(ua)) return "chrome";
  if (/safari/.test(ua) && !/crios|fxios|edgios/.test(ua)) return "safari";
  return "other";
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i += 1) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

async function ensureServiceWorker() {
  if (!("serviceWorker" in navigator)) return null;
  const existing = await navigator.serviceWorker.getRegistration();
  if (existing) return existing;
  return navigator.serviceWorker.register("/sw.js?v=51", { scope: "/" });
}

async function savePushSubscription(subscription: PushSubscription) {
  const payload = {
    subscription: subscription.toJSON(),
    session: getAppSession(),
  };
  const res = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return res.json().catch(() => null) as Promise<{ ok?: boolean; saved?: boolean; warning?: string; error?: string } | null>;
}

export function PwaInstallPanel({ compact = false }: { compact?: boolean }) {
  const [canInstall, setCanInstall] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [iosBrowser, setIosBrowser] = useState<IosBrowser>(null);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | "unsupported">("unsupported");
  const [locationAllowed, setLocationAllowed] = useState(false);
  const [pushReady, setPushReady] = useState(false);
  const [message, setMessage] = useState<string>("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const syncInstall = () => {
      setInstalled(isStandaloneMode());
      setIosBrowser(getIosBrowser());
      setCanInstall(Boolean(window.__chegouMotocaInstallPrompt));
    };
    syncInstall();

    const installHandler = (event: Event) => {
      event.preventDefault();
      window.__chegouMotocaInstallPrompt = event as BeforeInstallPromptEvent;
      setCanInstall(true);
    };
    const readyHandler = () => setCanInstall(Boolean(window.__chegouMotocaInstallPrompt));
    const installedHandler = () => {
      setInstalled(true);
      setCanInstall(false);
      window.__chegouMotocaInstallPrompt = undefined;
    };

    window.addEventListener("beforeinstallprompt", installHandler);
    window.addEventListener("chegoumotoca:pwa-install-ready", readyHandler);
    window.addEventListener("appinstalled", installedHandler);
    window.addEventListener("focus", syncInstall);
    return () => {
      window.removeEventListener("beforeinstallprompt", installHandler);
      window.removeEventListener("chegoumotoca:pwa-install-ready", readyHandler);
      window.removeEventListener("appinstalled", installedHandler);
      window.removeEventListener("focus", syncInstall);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setNotificationPermission("Notification" in window ? Notification.permission : "unsupported");
    setLocationAllowed(window.localStorage.getItem(LOCATION_KEY) === "1");
    ensureServiceWorker()
      .then((registration) => setPushReady(Boolean(registration && "PushManager" in window)))
      .catch(() => setPushReady(false));
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("Notification" in window) || Notification.permission !== "granted") return;
    ensureServiceWorker()
      .then(async (registration) => {
        if (!registration || !("PushManager" in window) || !VAPID_PUBLIC_KEY) return;
        const current = await registration.pushManager.getSubscription();
        const subscription = current || (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        }));
        await savePushSubscription(subscription);
      })
      .catch(() => undefined);
  }, [notificationPermission]);

  const notificationText = useMemo(() => {
    if (notificationPermission === "unsupported") return "Este navegador não oferece avisos para este tipo de app.";
    if (notificationPermission === "granted") return "Avisos ativados neste aparelho.";
    if (notificationPermission === "denied") return "Avisos bloqueados. Você pode liberar depois nas configurações do navegador ou do app.";
    return "Ative para receber novas entregas, confirmações e atualizações importantes.";
  }, [notificationPermission]);

  async function installApp() {
    if (installed) {
      setMessage("O Chegou Motoca já está instalado ou aberto em modo aplicativo neste aparelho.");
      return;
    }
    const deferredPrompt = window.__chegouMotocaInstallPrompt;
    if (!deferredPrompt) {
      if (iosBrowser === "chrome") {
        setMessage("No Chrome do iPhone, toque em Compartilhar, escolha Adicionar à Tela de Início e confirme. Se a opção não aparecer, atualize o Chrome ou abra esta página no Safari.");
      } else if (iosBrowser === "safari") {
        setMessage("No Safari do iPhone, toque em Compartilhar, escolha Adicionar à Tela de Início e confirme.");
      } else if (iosBrowser) {
        setMessage("No iPhone, use o botão Compartilhar do navegador e escolha Adicionar à Tela de Início. Se a opção não aparecer, abra no Safari.");
      } else {
        setMessage("Se o botão não apareceu, abra o menu do navegador e escolha Instalar app ou Adicionar à tela inicial.");
      }
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice.catch(() => null);
      window.__chegouMotocaInstallPrompt = undefined;
      setCanInstall(false);
      if (choice?.outcome === "accepted") {
        setMessage("Instalação iniciada. Em alguns segundos o Chegou Motoca deve aparecer na tela inicial.");
      } else {
        setMessage("Instalação cancelada. Você pode tentar novamente por esta tela ou pelo menu do navegador.");
      }
    } finally {
      setBusy(false);
    }
  }

  async function enableNotifications() {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setNotificationPermission("unsupported");
      setMessage("Este navegador não oferece notificações para este aplicativo.");
      return;
    }
    if (!window.isSecureContext) {
      setMessage("Para ativar notificações, acesse o Chegou Motoca pelo endereço seguro do aplicativo.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      if (permission !== "granted") {
        setMessage(permission === "denied" ? "Notificações bloqueadas. Para não perder entregas disponíveis, libere depois nas configurações do navegador ou do aplicativo." : "Permissão de notificações não concluída.");
        return;
      }

      const registration = await ensureServiceWorker();
      if (!registration) {
        setMessage("Notificações permitidas neste aparelho.");
        return;
      }

      if (pushReady && VAPID_PUBLIC_KEY) {
        const current = await registration.pushManager.getSubscription();
        const subscription = current || (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        }));
        await savePushSubscription(subscription);
      }

      setMessage("Notificações ativadas. Assim você evita perder novas entregas, confirmações e avisos da operação.");
    } catch {
      setMessage("Não foi possível ativar notificações neste aparelho. Tente novamente pelas configurações do navegador ou do aplicativo.");
    } finally {
      setBusy(false);
    }
  }

  async function enableLocation() {
    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      setMessage("Este aparelho não liberou localização para o navegador.");
      return;
    }
    setBusy(true);
    setMessage("Quando o aparelho perguntar, permita a localização para melhorar rotas e cálculo de distância.");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        window.localStorage.setItem(LOCATION_KEY, "1");
        window.localStorage.setItem("chegoumotoca:last-location", JSON.stringify({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
          accuracy: position.coords.accuracy,
          savedAt: new Date().toISOString(),
        }));
        setLocationAllowed(true);
        setBusy(false);
        setMessage("Localização liberada. Ela ajuda o app a calcular rota, distância e entregas normais ou distantes com mais precisão.");
      },
      () => {
        setBusy(false);
        setMessage("Localização não liberada. Para usar cálculo de distância com mais precisão, ative a permissão nas configurações do navegador ou do app.");
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
    );
  }

  return (
    <section className={cx("rounded-[32px] border border-white/10 bg-white/[0.055] p-4 text-white shadow-[0_24px_70px_rgba(0,0,0,.24)] backdrop-blur-xl", !compact && "md:p-6")}>
      <div className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-[#22c55e]/25 bg-[#22c55e]/12 px-3 py-2 text-[11px] font-black uppercase tracking-[0.22em] text-[#8af3a8]">
            App oficial
          </div>
          <h2 className="mt-4 text-2xl font-black tracking-tight sm:text-3xl">Instale o Chegou Motoca no celular</h2>
          <p className="mt-3 text-sm leading-6 text-zinc-300 sm:text-base">
            Tenha acesso rápido pela tela inicial, receba avisos importantes e deixe o app pronto para calcular rotas e distâncias com mais precisão.
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <button type="button" onClick={installApp} disabled={busy || installed} className="cm-primary inline-flex min-h-12 items-center justify-center rounded-2xl px-5 py-3 text-sm font-black disabled:cursor-not-allowed disabled:opacity-60">
              {installed ? "App instalado" : canInstall ? "Instalar agora" : "Como instalar"}
            </button>
            <button type="button" onClick={enableNotifications} disabled={busy || notificationPermission === "granted" || notificationPermission === "unsupported"} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-[#f59e0b]/30 bg-[#f59e0b]/12 px-5 py-3 text-sm font-black text-[#ffd8a8] disabled:cursor-not-allowed disabled:opacity-60">
              <BellIcon className="h-4 w-4" /> {notificationPermission === "granted" ? "Avisos ativos" : "Ativar avisos"}
            </button>
            <button type="button" onClick={enableLocation} disabled={busy || locationAllowed} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-sky-400/30 bg-sky-400/12 px-5 py-3 text-sm font-black text-sky-100 disabled:cursor-not-allowed disabled:opacity-60">
              <LocationIcon className="h-4 w-4" /> {locationAllowed ? "Localização ativa" : "Permitir localização"}
            </button>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <span className="rounded-2xl border border-white/10 bg-black/20 px-4 py-2 text-xs font-bold text-zinc-300">
              Aparelho: {installed ? "instalado" : "pronto para instalar"}
            </span>
            <span className="rounded-2xl border border-white/10 bg-black/20 px-4 py-2 text-xs font-bold text-zinc-300">
              Avisos: {notificationPermission === "granted" ? "liberados" : "pendentes"}
            </span>
          </div>

          {message ? (
            <div className="mt-4 rounded-2xl border border-[#22c55e]/25 bg-[#22c55e]/10 p-3 text-sm leading-6 text-[#d7ffe4]">
              {message}
            </div>
          ) : null}

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-[22px] border border-white/10 bg-black/20 p-4">
              <BellIcon className="h-5 w-5 text-[#f59e0b]" />
              <strong className="mt-2 block">Por que ativar avisos?</strong>
              <p className="mt-1 text-sm leading-6 text-zinc-300">Para não perder novas entregas disponíveis, confirmações de aceite, retirada, finalização e recados importantes.</p>
            </div>
            <div className="rounded-[22px] border border-white/10 bg-black/20 p-4">
              <LocationIcon className="h-5 w-5 text-sky-300" />
              <strong className="mt-2 block">Por que permitir localização?</strong>
              <p className="mt-1 text-sm leading-6 text-zinc-300">Para melhorar rota, distância e a classificação entre entrega normal e entrega distante quando o estabelecimento configurar seu raio.</p>
            </div>
          </div>
        </div>

        <div className="rounded-[28px] border border-white/10 bg-[#071018]/82 p-4">
          <div className="flex items-center gap-3 rounded-[24px] border border-[#22c55e]/20 bg-[#22c55e]/10 p-4">
            <span className="relative h-16 w-16 shrink-0 overflow-hidden rounded-[22px] border border-white/10 bg-[#050b0f]">
              <Image src="/icons/pwa-icon-v45-192.png" alt="Ícone Chegou Motoca" fill className="object-cover" />
            </span>
            <div>
              <strong className="block text-lg">Chegou Motoca na tela inicial</strong>
              <span className="text-sm leading-6 text-zinc-300">Abra como aplicativo, com acesso rápido e visual próprio.</span>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-[22px] border border-white/10 bg-white/[0.045] p-4">
              <CheckIcon className="h-5 w-5 text-[#22c55e]" />
              <strong className="mt-2 block">Android</strong>
              <p className="mt-1 text-sm leading-6 text-zinc-300">Toque em Instalar agora. Se não aparecer, use o menu do navegador e escolha Instalar app.</p>
            </div>
            <div className="rounded-[22px] border border-white/10 bg-white/[0.045] p-4">
              <CheckIcon className="h-5 w-5 text-[#22c55e]" />
              <strong className="mt-2 block">iPhone</strong>
              <p className="mt-1 text-sm leading-6 text-zinc-300">No Safari ou Chrome, toque em Compartilhar, escolha Adicionar à Tela de Início e confirme.</p>
            </div>
            <div className="rounded-[22px] border border-white/10 bg-white/[0.045] p-4 sm:col-span-2">
              <WarningIcon className="h-5 w-5 text-[#f59e0b]" />
              <strong className="mt-2 block">Permissões</strong>
              <p className="mt-1 text-sm leading-6 text-zinc-300">{notificationText}</p>
            </div>
          </div>
        </div>
      </div>

      {!compact ? (
        <div className="mt-6">
          <div className="mb-4 flex flex-col gap-3 rounded-3xl border border-[#22c55e]/20 bg-[#22c55e]/10 p-4 text-sm leading-6 text-[#d7ffe4] sm:flex-row sm:items-center sm:justify-between">
            <span>Toque em qualquer imagem para abrir em tamanho maior. No Android, use o botão automático ou o menu do Chrome. No iPhone, abra pela tela inicial depois de adicionar o app; assim o visual fica mais parecido com aplicativo.</span>
            <a href="/install/guia-instalacao-chegou-motoca-v49.pdf" target="_blank" rel="noreferrer" className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-2xl bg-white px-4 text-sm font-black text-[#052e16]">
              Baixar guia em PDF
            </a>
          </div>
          <div className="grid gap-4 xl:grid-cols-3">
            <a href="/install/tutorial-android-real-v49.png" target="_blank" rel="noreferrer" className="block rounded-[28px] border border-white/10 bg-black/20 p-3 transition hover:border-[#22c55e]/50">
              <span className="mb-3 block px-2 text-sm font-black text-white">Android / Chrome</span>
              <p className="mb-3 px-2 text-xs leading-5 text-zinc-300">Instalação pelo aviso nativo. Se o aviso não aparecer, use o menu do Chrome e toque em Instalar app.</p>
              <Image src="/install/tutorial-android-real-v49.png" alt="Tutorial ampliável para instalar o Chegou Motoca no Android pelo Chrome, com opção automática e alternativa pelo menu" width={3058} height={892} className="h-auto w-full rounded-[22px] bg-white shadow-[0_14px_40px_rgba(0,0,0,.28)]" />
            </a>
            <a href="/install/tutorial-iphone-safari-real-v49.png" target="_blank" rel="noreferrer" className="block rounded-[28px] border border-white/10 bg-black/20 p-3 transition hover:border-sky-400/50">
              <span className="mb-3 block px-2 text-sm font-black text-white">iPhone / Safari</span>
              <p className="mb-3 px-2 text-xs leading-5 text-zinc-300">Abra no Safari, toque em Compartilhar, escolha Adicionar à Tela de Início e confirme em Adicionar.</p>
              <Image src="/install/tutorial-iphone-safari-real-v49.png" alt="Tutorial ampliável para instalar o Chegou Motoca no iPhone pelo Safari" width={1570} height={870} className="h-auto w-full rounded-[22px] bg-white shadow-[0_14px_40px_rgba(0,0,0,.28)]" />
            </a>
            <a href="/install/tutorial-iphone-chrome-real-v49.png" target="_blank" rel="noreferrer" className="block rounded-[28px] border border-white/10 bg-black/20 p-3 transition hover:border-violet-400/50">
              <span className="mb-3 block px-2 text-sm font-black text-white">iPhone / Chrome</span>
              <p className="mb-3 px-2 text-xs leading-5 text-zinc-300">No Chrome do iPhone, toque em Compartilhar, escolha Adicionar à Tela de Início e confirme.</p>
              <Image src="/install/tutorial-iphone-chrome-real-v49.png" alt="Tutorial ampliável para instalar o Chegou Motoca no iPhone pelo Chrome" width={1562} height={870} className="h-auto w-full rounded-[22px] bg-white shadow-[0_14px_40px_rgba(0,0,0,.28)]" />
            </a>
          </div>
          <div className="mt-4 rounded-3xl border border-white/10 bg-black/20 p-4 text-sm leading-6 text-zinc-300">
            Se a pessoa tiver dificuldade para ler na tela, ela pode abrir a imagem em tamanho maior ou baixar o guia em PDF para enviar pelo WhatsApp.
          </div>
        </div>
      ) : null}
    </section>
  );
}
