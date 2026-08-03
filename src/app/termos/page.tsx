import Link from "next/link";
import { BrandHeader } from "@/components/brand-header";
import { IconImage } from "@/components/icon-image";
import { AppFooter } from "@/components/app-footer";
import { PublicMobileNav } from "@/components/public-mobile-nav";

const terms = [
  {
    title: "Cadastro e aprovação",
    text: "Motoboys e estabelecimentos passam por análise antes de operar. O administrador pode solicitar documento, foto, placa, responsável, endereço e contato válido para liberar o acesso.",
  },
  {
    title: "Valores operacionais",
    text: "Os valores das entregas podem variar conforme regras vigentes, tipo de entrega, distância e ajustes operacionais definidos pela equipe. Antes de aceitar ou enviar uma solicitação, o usuário deve conferir o valor exibido na plataforma.",
  },
  {
    title: "Taxa da plataforma",
    text: "O Chegou Motoca pode aplicar taxa operacional sobre entregas realizadas pela plataforma. Essa taxa e as regras de repasse podem sofrer ajustes conforme a operação evoluir, sempre com o valor final apresentado antes do aceite da Bag.",
  },
  {
    title: "Créditos e repasse",
    text: "O estabelecimento utiliza créditos aprovados para abrir Bags. O motoboy visualiza o valor líquido antes de aceitar e o repasse fica condicionado à finalização e conferência da operação.",
  },
  {
    title: "Conduta e divergências",
    text: "Cancelamentos, atrasos, divergências e contestações podem afetar avaliação, prioridade e análise administrativa. A plataforma registra histórico para proteger estabelecimento e entregador.",
  },
];

export default function TermosPage() {
  return (
    <main className="cm-page min-h-screen pb-10 text-white">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 px-4 py-4 md:px-6 xl:px-8 xl:py-6">
        <BrandHeader publicView />
        <section className="cm-card rounded-[34px] p-6 md:p-8">
          <p className="text-xs uppercase tracking-[0.35em] text-[#f59e0b]">
            Termos de uso
          </p>
          <h1 className="mt-4 text-4xl font-black leading-tight tracking-tight text-white md:text-5xl">
            Regras básicas para usar o Chegou Motoca.
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-8 text-zinc-300">
            Leia antes de solicitar cadastro. Estes termos explicam cadastro,
            créditos, repasse, finalizações, taxas operacionais e situações que
            podem gerar análise da equipe.
          </p>
        </section>
        <section className="grid gap-4 md:grid-cols-2">
          {terms.map((item, index) => (
            <article key={item.title} className="cm-card rounded-[28px] p-5">
              <div className="flex items-start gap-3">
                <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#22c55e]/25 bg-[#22c55e]/12 text-[#8af3a8]">
                  {index === 1 ? (
                    <IconImage name="creditos" className="h-8 w-8" />
                  ) : index === 2 ? (
                    <IconImage name="caixa-de-entrega" className="h-8 w-8" />
                  ) : index === 3 ? (
                    <IconImage name="historico" className="h-8 w-8" />
                  ) : (
                    <IconImage name="entrega-finalizada" className="h-8 w-8" />
                  )}
                </span>
                <div>
                  <h2 className="text-xl font-black text-white">
                    {item.title}
                  </h2>
                  <p className="mt-2 text-sm leading-7 text-zinc-300">
                    {item.text}
                  </p>
                </div>
              </div>
            </article>
          ))}
        </section>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href="/cadastro"
            className="cm-primary inline-flex min-h-12 items-center justify-center rounded-2xl px-5 text-sm font-black"
          >
            Voltar ao cadastro
          </Link>
          <Link
            href="/"
            className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] px-5 text-sm font-black text-white hover:bg-white/[0.08]"
          >
            Voltar ao início
          </Link>
        </div>
        <AppFooter compact />
      </div>
      <PublicMobileNav />
    </main>
  );
}
