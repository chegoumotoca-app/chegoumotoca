export type AdminTab =
  | "dashboard"
  | "estabelecimentos"
  | "motoboys"
  | "solicitacoes"
  | "conferencia"
  | "pagamentos"
  | "configuracoes";

export type BairroTipo = "normal" | "distante";
export type SolicitacaoStatus =
  | "Aguardando pagamento"
  | "Aguardando motoboy"
  | "Aguardando confirmação do estabelecimento"
  | "Em entrega"
  | "Finalizada"
  | "Conferência pendente";

export const platformConfig = {
  pix: {
    tipo: "Chave celular",
    chave: "(17) 99700-1020",
    favorecido: "Chegou Motoca Operações",
    banco: "Banco de Testes",
    instrucoes:
      "Confirme o pagamento por PIX antes de liberar a solicitação. Sem pagamento confirmado, a chamada não pode ser enviada aos motoboys.",
  },
  taxaPercentualMotoboy: 10,
  valorNormal: 8,
  valorDistante: 12,
  avisoFraude:
    "Ao confirmar o pagamento, o estabelecimento declara que o PIX foi realizado corretamente e que as informações enviadas são verdadeiras. Em caso de fraude, divergência intencional ou envio de informação falsa, a conta poderá ser suspensa ou excluída da plataforma, além das medidas previstas em contrato.",
  telefoneAdminWhatsApp: "5517997001020",
  prazoAlertaNormalMin: 30,
  prazoAlertaDistanteMin: 50,
};

export const bairrosTaquaritingaExemplo: { nome: string; tipo: BairroTipo; cepPrefixo?: string }[] = [
  { nome: "Centro", tipo: "normal", cepPrefixo: "15900" },
  { nome: "Jardim São Luiz", tipo: "normal", cepPrefixo: "15903" },
  { nome: "Jardim Sumaré", tipo: "normal", cepPrefixo: "15902" },
  { nome: "Higienópolis", tipo: "normal", cepPrefixo: "15901" },
  { nome: "São Judas", tipo: "normal" },
  { nome: "Boa Vista", tipo: "normal" },
  { nome: "Laranjeiras", tipo: "distante" },
  { nome: "Vale do Sol", tipo: "distante" },
  { nome: "Ipiranga", tipo: "distante" },
  { nome: "Jardim Buscardi", tipo: "normal" },
  { nome: "Jardim Maria Luiza", tipo: "normal" },
  { nome: "Talavasso", tipo: "distante" },
  { nome: "Jardim do Bosque", tipo: "distante" },
  { nome: "Jardim Ignez", tipo: "normal" },
];

export type AddressSuggestion = {
  rua: string;
  bairro: string;
  cep: string;
  cidade: string;
  uf: string;
};

export const taquaritingaAddressBook: AddressSuggestion[] = [
  { rua: "Rua Prudente de Morais", bairro: "Centro", cep: "15900-057", cidade: "Taquaritinga", uf: "SP" },
  { rua: "Rua Treze de Maio", bairro: "Centro", cep: "15900-057", cidade: "Taquaritinga", uf: "SP" },
  { rua: "Rua Capitão José Camargo Lima", bairro: "Talavasso", cep: "15905-120", cidade: "Taquaritinga", uf: "SP" },
  { rua: "Rua Rui Barbosa", bairro: "Centro", cep: "15900-011", cidade: "Taquaritinga", uf: "SP" },
  { rua: "Avenida Washington Luís", bairro: "Jardim São Luiz", cep: "15903-120", cidade: "Taquaritinga", uf: "SP" },
  { rua: "Rua Rafael Fabrício", bairro: "Jardim Sumaré", cep: "15902-180", cidade: "Taquaritinga", uf: "SP" },
  { rua: "Rua José Bonifácio", bairro: "Higienópolis", cep: "15901-060", cidade: "Taquaritinga", uf: "SP" },
  { rua: "Rua Visconde do Rio Branco", bairro: "São Judas", cep: "15900-220", cidade: "Taquaritinga", uf: "SP" },
  { rua: "Rua Campos Sales", bairro: "Boa Vista", cep: "15900-320", cidade: "Taquaritinga", uf: "SP" },
  { rua: "Rua Antônio Dantas", bairro: "Laranjeiras", cep: "15904-020", cidade: "Taquaritinga", uf: "SP" },
  { rua: "Rua Francisco de Paula", bairro: "Vale do Sol", cep: "15904-115", cidade: "Taquaritinga", uf: "SP" },
  { rua: "Rua José Mazetto", bairro: "Ipiranga", cep: "15904-210", cidade: "Taquaritinga", uf: "SP" },
  { rua: "Rua Paschoal Salvagni", bairro: "Jardim Buscardi", cep: "15902-460", cidade: "Taquaritinga", uf: "SP" },
  { rua: "Rua Hermínio Morano", bairro: "Jardim Maria Luiza", cep: "15902-550", cidade: "Taquaritinga", uf: "SP" },
  { rua: "Avenida Heitor Alves Gomes", bairro: "Jardim Ignez", cep: "15903-420", cidade: "Taquaritinga", uf: "SP" },
  { rua: "Rua Domingos Morano", bairro: "Jardim do Bosque", cep: "15904-330", cidade: "Taquaritinga", uf: "SP" },
];

export const establishments = [
  {
    id: "EST-204",
    nome: "Speed Burger Centro",
    status: "Ativo",
    responsavel: "Carlos Henrique",
    cidade: "Taquaritinga/SP",
    telefone: "(17) 99700-1020",
    cnpj: "48.120.550/0001-26",
    whatsapp: "5517997001020",
    ultimaSolicitacao: "Hoje, 19:40",
  },
  {
    id: "EST-198",
    nome: "Churrascaria do Zé",
    status: "Ativo",
    responsavel: "Marcos Antônio",
    cidade: "Taquaritinga/SP",
    telefone: "(17) 99611-7788",
    cnpj: "18.112.430/0001-90",
    whatsapp: "5517996117788",
    ultimaSolicitacao: "Hoje, 18:55",
  },
  {
    id: "EST-176",
    nome: "Açaí Prime Delivery",
    status: "Em análise",
    responsavel: "Juliana Costa",
    cidade: "Taquaritinga/SP",
    telefone: "(17) 98114-5500",
    cnpj: "22.918.400/0001-11",
    whatsapp: "5517981145500",
    ultimaSolicitacao: "Ontem, 22:05",
  },
];

export const riders = [
  {
    id: "MOT-031",
    nome: "Robson Oliveira",
    status: "Online",
    placa: "FGE-2A41",
    cidade: "Taquaritinga/SP",
    telefone: "(17) 99771-2144",
    pix: "robsonoliveira@pix.com",
    mediaAvaliacao: 4.9,
    tempoResposta: "1min 42s",
    entregasHoje: 18,
    provasPendentes: 2,
    saldoPrevisto: 168,
    whatsapp: "5517997712144",
    avatar: "RO",
  },
  {
    id: "MOT-028",
    nome: "Patrícia Silva",
    status: "Offline",
    placa: "DQM-9K20",
    cidade: "Taquaritinga/SP",
    telefone: "(17) 99655-3322",
    pix: "17996553322",
    mediaAvaliacao: 4.7,
    tempoResposta: "3min 10s",
    entregasHoje: 11,
    provasPendentes: 0,
    saldoPrevisto: 96,
    whatsapp: "5517996553322",
    avatar: "PS",
  },
  {
    id: "MOT-014",
    nome: "André Souza",
    status: "Bloqueado",
    placa: "ABC-1D23",
    cidade: "Taquaritinga/SP",
    telefone: "(17) 99110-7788",
    pix: "andre.souza@email.com",
    mediaAvaliacao: 3.8,
    tempoResposta: "6min 20s",
    entregasHoje: 4,
    provasPendentes: 1,
    saldoPrevisto: 0,
    whatsapp: "5517991107788",
    avatar: "AS",
  },
];

export const loginDemo: never[] = [];

