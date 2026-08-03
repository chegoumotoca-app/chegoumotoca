import Link from "next/link";
import { BrandHeader } from "@/components/brand-header";
import { IconImage } from "@/components/icon-image";
import { AppFooter } from "@/components/app-footer";
import { PublicMobileNav } from "@/components/public-mobile-nav";

export default function RecuperarAcessoPage() {
  const message = encodeURIComponent(
    "Olá, preciso recuperar meu acesso no Chegou Motoca. Meu nome é: ",
  );
  return (
    <main className="cm-page pb-10 text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 px-4 py-4 md:px-6 xl:px-8 xl:py-6">
        <BrandHeader publicView />
        <section className="cm-card rounded-[34px] p-6 md:p-8">
          <div className="grid gap-6 md:grid-cols-[0.78fr_1.22fr] md:items-center">
            <div className="hidden justify-center md:flex">
              <span className="inline-flex h-40 w-40 items-center justify-center rounded-[38px] border border-[#22c55e]/20 bg-[#22c55e]/10">
                <IconImage name="whatsapp" className="h-24 w-24" />
              </span>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-[#f59e0b]">
                Recuperação de acesso
              </p>
              <h1 className="mt-4 text-4xl font-black leading-tight tracking-tight text-white md:text-5xl">
                Recupere usuário ou senha com ajuda da equipe.
              </h1>
              <p className="mt-4 text-base leading-8 text-zinc-300">
                Para proteger contas de motoboy e estabelecimento, a recuperação
                é assistida. A equipe confirma seus dados e libera uma nova
                senha inicial.
              </p>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <a
                  href={`https://wa.me/5517997001020?text=${message}`}
                  target="_blank"
                  rel="noreferrer"
                  className="cm-whatsapp inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl px-4 text-sm font-black"
                >
                  <IconImage
                    name="whatsapp"
                    alt="WhatsApp"
                    className="h-5 w-5"
                  />{" "}
                  Falar com a equipe no WhatsApp
                </a>
                <Link
                  href="/login"
                  className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-sm font-black text-white transition hover:bg-white/[0.08]"
                >
                  Voltar ao login
                </Link>
              </div>
            </div>
          </div>
        </section>
        <AppFooter compact />
      </div>
      <PublicMobileNav />
    </main>
  );
}
