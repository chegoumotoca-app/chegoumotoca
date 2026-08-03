import Image from "next/image";

export type AppIconName =
  | "anexar"
  | "bag-enviada(1)"
  | "camera-para-tirar-fotos"
  | "caixa-de-entrega"
  | "caixa-de-entrega-pb"
  | "capacete"
  | "creditos"
  | "entrega"
  | "entregador-caixa-de-entrega-BAG-icone-localizacao-colorido"
  | "entregador-caixa-de-entrega-BAG-icone-localizacao-preto-cinza"
  | "entregador-na-moto-preto-cinza"
  | "entrega-em-andamento"
  | "entrega-finalizada"
  | "entrega-nao-finalizada"
  | "estabelecimento-colorido"
  | "estabelecimento-preto-cinza"
  | "historico"
  | "mapa"
  | "whatsapp";

export function IconImage({ name, alt = "", className = "h-7 w-7" }: { name: AppIconName; alt?: string; className?: string }) {
  return <Image src={`/icons/${name}.png`} alt={alt} width={96} height={96} className={className} />;
}
