import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  const appManifest = {
    id: "/?source=pwa",
    name: "Chegou Motoca",
    short_name: "Chegou Motoca",
    description: "Gestão de corridas com motoboys, PIX da plataforma, conferência posterior e notificações da operação.",
    start_url: "/?source=pwa",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#050b0f",
    theme_color: "#0c0e13",
    categories: ["business", "productivity", "utilities"],
    icons: [
      {
        src: "/icons/pwa-icon-v45-72.png",
        sizes: "72x72",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/pwa-icon-v45-96.png",
        sizes: "96x96",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/pwa-icon-v45-128.png",
        sizes: "128x128",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/pwa-icon-v45-144.png",
        sizes: "144x144",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/pwa-icon-v45-152.png",
        sizes: "152x152",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/pwa-icon-v45-180.png",
        sizes: "180x180",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/pwa-icon-v45-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/pwa-icon-v45-maskable-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/pwa-icon-v45-384.png",
        sizes: "384x384",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/pwa-icon-v45-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/pwa-icon-v45-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Instalar app",
        short_name: "Instalar",
        description: "Abrir área de instalação e notificações.",
        url: "/instalar",
        icons: [{ src: "/icons/pwa-icon-v45-192.png", sizes: "192x192" }],
      },
      {
        name: "Entrar no painel",
        short_name: "Painel",
        description: "Acessar o painel do usuário.",
        url: "/login",
        icons: [{ src: "/icons/pwa-icon-v45-192.png", sizes: "192x192" }],
      },
    ],
  } as MetadataRoute.Manifest;

  return appManifest;
}
