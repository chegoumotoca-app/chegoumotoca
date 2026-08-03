import type { Metadata, Viewport } from "next";
import "./globals.css";
import { InstallPrompt } from "@/components/install-prompt";
import { PwaManager } from "@/components/pwa-manager";

export const metadata: Metadata = {
  title: "Chegou Motoca",
  description: "Plataforma para estabelecimentos chamarem motoboys, pagarem a plataforma e acompanharem a operação com conferência posterior.",
  applicationName: "Chegou Motoca",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Chegou Motoca",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icons/pwa-icon-v45-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/pwa-icon-v45-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/pwa-icon-v45-180.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: "#0c0e13",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body className="min-h-full">
        {children}
        <InstallPrompt />
        <PwaManager />
      </body>
    </html>
  );
}
