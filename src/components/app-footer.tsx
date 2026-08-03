import Image from "next/image";
import Link from "next/link";

export function AppFooter({ compact = false }: { compact?: boolean }) {
  return (
    <footer className={compact ? "relative mx-auto mt-8 w-full max-w-[1480px] px-0 pb-28 text-sm text-zinc-400 xl:pb-8" : "relative mx-auto mt-8 w-full max-w-[1480px] px-4 pb-28 text-sm text-zinc-400 sm:px-6 lg:px-8 xl:pb-8"}>
      <div className="rounded-[28px] border border-white/10 bg-white/[0.035] px-4 py-4 backdrop-blur-xl sm:px-5 md:px-6">
        <div className="grid gap-4 md:grid-cols-[auto_1fr_auto] md:items-center">
          <Link href="/" className="relative block h-12 w-44 shrink-0 overflow-hidden rounded-xl sm:h-14 sm:w-52" title="Chegou Motoca">
            <Image src="/brand/logo-chegoumotoca-cutout.png" alt="Chegou Motoca" fill className="object-contain object-left" />
          </Link>
          <span className="text-sm leading-6 md:text-center">© 2026 Chegou Motoca</span>
          <nav className="flex flex-wrap items-center gap-x-5 gap-y-2 md:justify-end" aria-label="Links institucionais">
            <Link href="/sobre" className="whitespace-nowrap transition hover:text-white">O que é</Link>
            <Link href="/avaliacoes" className="whitespace-nowrap transition hover:text-white">Avaliações / sugestões</Link>
            <Link href="/instalar" className="whitespace-nowrap transition hover:text-white">Instalar app</Link>
            <Link href="/termos" className="whitespace-nowrap transition hover:text-white">Termos de uso</Link>
            <Link href="/recuperar-acesso" className="whitespace-nowrap transition hover:text-white">Suporte</Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
