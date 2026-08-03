"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type IosBrowser = "chrome" | "safari" | "other" | null;

function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in window.navigator && Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone))
  );
}

function getIosBrowser(): IosBrowser {
  if (typeof window === "undefined") return null;
  const ua = window.navigator.userAgent.toLowerCase();
  const isIos = /iphone|ipad|ipod/.test(ua) || (window.navigator.platform === "MacIntel" && window.navigator.maxTouchPoints > 1);
  if (!isIos) return null;
  if (/crios/.test(ua)) return "chrome";
  if (/safari/.test(ua) && !/fxios|edgios|crios/.test(ua)) return "safari";
  return "other";
}

export function InstallPrompt() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [iosBrowser, setIosBrowser] = useState<IosBrowser>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isStandalone()) return;
    if (localStorage.getItem("chegoumotoca:pwa-install-dismissed") === "1") return;

    const currentIosBrowser = getIosBrowser();
    setIosBrowser(currentIosBrowser);

    if (currentIosBrowser) {
      const timer = window.setTimeout(() => setVisible(true), 1700);
      return () => window.clearTimeout(timer);
    }

    const handler = (event: Event) => {
      event.preventDefault();
      window.__chegouMotocaInstallPrompt = event as BeforeInstallPromptEvent;
      window.dispatchEvent(new Event("chegoumotoca:pwa-install-ready"));
      setInstallEvent(event as BeforeInstallPromptEvent);
      window.setTimeout(() => setVisible(true), 1200);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!visible) return null;

  async function install() {
    if (!installEvent) return;
    await installEvent.prompt();
    await installEvent.userChoice.catch(() => undefined);
    setVisible(false);
    setInstallEvent(null);
    window.__chegouMotocaInstallPrompt = undefined;
  }

  function dismiss() {
    localStorage.setItem("chegoumotoca:pwa-install-dismissed", "1");
    setVisible(false);
  }

  const isIos = Boolean(iosBrowser);
  const title = isIos ? "Adicionar à tela inicial?" : "Instalar aplicativo?";
  const body = iosBrowser === "chrome"
    ? "No Chrome do iPhone, toque em Compartilhar, escolha Adicionar à Tela de Início e confirme. O ícone ficará na tela inicial como um app."
    : iosBrowser === "safari"
      ? "No Safari do iPhone, toque em Compartilhar, escolha Adicionar à Tela de Início e confirme."
      : isIos
        ? "No iPhone, use o botão Compartilhar do navegador e escolha Adicionar à Tela de Início."
        : "Instale o Chegou Motoca para abrir mais rápido, com cara de app e acesso direto na tela inicial.";

  return (
    <div className="fixed inset-x-3 bottom-[calc(5.25rem+max(env(safe-area-inset-bottom),0px))] z-[70] mx-auto max-w-md rounded-[24px] border border-[#22c55e]/25 bg-[#0b1119]/96 p-4 text-white shadow-[0_20px_70px_rgba(0,0,0,.5)] backdrop-blur-xl sm:bottom-5">
      <p className="text-xs font-black uppercase tracking-[0.24em] text-[#f59e0b]">
        Chegou Motoca
      </p>
      <p className="mt-2 text-lg font-black">{title}</p>
      <p className="mt-1 text-sm leading-6 text-zinc-300">{body}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {!isIos && installEvent ? (
          <button type="button" onClick={install} className="cm-primary rounded-2xl px-4 py-3 text-sm font-black">
            Instalar
          </button>
        ) : null}
        <Link href="/instalar" className="rounded-2xl border border-[#f59e0b]/25 bg-[#f59e0b]/10 px-4 py-3 text-sm font-black text-[#ffd8a8]">
          Ver passo a passo
        </Link>
        <button type="button" onClick={dismiss} className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-bold text-white">
          Agora não
        </button>
      </div>
    </div>
  );
}
