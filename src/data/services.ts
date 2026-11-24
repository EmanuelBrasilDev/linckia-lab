/**
 * Catálogo comercial da Linckia Lab — fonte única de serviços, níveis, preços
 * e funcionalidades. Os componentes apenas leem estes dados.
 *
 * Os valores são referências iniciais de desenvolvimento/implantação
 * ("a partir de"), não preços fechados nem mensalidades.
 *
 * Integração com /contato:
 * - `quoteHref(servico, nivel?)` gera `/contato?servico=<id>&nivel=<id>`.
 */

export const LEVEL_IDS = ["basico", "intermediario", "avancado"] as const;
export type LevelId = (typeof LEVEL_IDS)[number];

export const SERVICE_IDS = [
  "landing-page",
  "site-institucional",
  "loja-virtual",
  "sistema-web",
  "aplicativo-web",
  "redesign",
] as const;
export type ServiceId = (typeof SERVICE_IDS)[number];

export type ServiceIconName = "landing" | "site" | "store" | "system" | "app" | "redesign";

export interface ServiceLevel {
  id: LevelId;
  name: string;
  /** breve descrição do nível */
  summary: string;
  /** valor inicial em reais */
  price: number;
  features: string[];
}

export interface Service {
  id: ServiceId;
  name: string;
  icon: ServiceIconName;
  /** descrição do card */
  description: string;
  /** texto complementar do painel expandido */
  detail: string;
  /** observação específica do serviço (opcional) */
  note?: string;
  levels: [ServiceLevel, ServiceLevel, ServiceLevel];
}

export const SERVICES: Service[] = [
  {
    id: "landing-page",
    name: "Landing Pages",
    icon: "landing",
    description: "Páginas estratégicas para divulgação, campanhas e captação de clientes.",
    detail: "Escolha o nível ideal para o objetivo da sua página e veja o que está incluso em cada um.",
    levels: [
      {
        id: "basico",
        name: "Básico",
        summary: "Uma página objetiva para apresentar sua oferta e receber contatos.",
        price: 500,
        features: [
          "Página única",
          "Até 6 seções",
          "Design responsivo",
          "Botão de contato pelo WhatsApp",
          "Formulário simples",
          "SEO técnico básico",
        ],
      },
      {
        id: "intermediario",
        name: "Intermediário",
        summary: "Mais conteúdo, identidade própria e movimento na experiência.",
        price: 800,
        features: [
          "Recursos do nível Básico",
          "Seções adicionais",
          "Identidade visual mais personalizada",
          "Animações e transições personalizadas",
          "Formulários mais elaborados",
          "Integrações simples",
        ],
      },
      {
        id: "avancado",
        name: "Avançado",
        summary: "Uma página pensada para conversão, com recursos exclusivos.",
        price: 1500,
        features: [
          "Recursos do nível Intermediário",
          "Estrutura estratégica de conversão",
          "Animações e interações avançadas",
          "Componentes exclusivos",
          "Integrações personalizadas",
          "Refinamento de desempenho",
        ],
      },
    ],
  },
  {
    id: "site-institucional",
    name: "Sites Institucionais",
    icon: "site",
    description:
      "Sites profissionais para apresentar empresas, fortalecer marcas e construir uma presença digital.",
    detail: "Do site essencial à presença institucional completa, conforme o tamanho da sua operação.",
    levels: [
      {
        id: "basico",
        name: "Básico",
        summary: "A presença essencial para apresentar sua empresa com clareza.",
        price: 1000,
        features: [
          "Até 5 páginas",
          "Design personalizado",
          "Navegação institucional",
          "Layout responsivo",
          "Formulário de contato simples",
          "SEO técnico básico",
        ],
      },
      {
        id: "intermediario",
        name: "Intermediário",
        summary: "Mais páginas, conteúdo recorrente e uma interface mais rica.",
        price: 1800,
        features: [
          "Recursos do nível Básico",
          "Páginas adicionais",
          "Blog ou catálogo simples",
          "Componentes personalizados",
          "Animações de interface",
          "Integrações simples",
        ],
      },
      {
        id: "avancado",
        name: "Avançado",
        summary: "Uma estrutura institucional ampla, com áreas e recursos exclusivos.",
        price: 3000,
        features: [
          "Recursos do nível Intermediário",
          "Estrutura institucional ampliada",
          "Áreas e componentes exclusivos",
          "Gerenciamento de conteúdo conforme escopo",
          "Integrações personalizadas",
          "Experiências visuais avançadas",
        ],
      },
    ],
  },
  {
    id: "loja-virtual",
    name: "Lojas Virtuais",
    icon: "store",
    description:
      "Plataformas de vendas online com catálogo, pagamentos e gerenciamento de produtos e pedidos.",
    detail: "Da loja essencial à experiência de compra personalizada para o seu modelo de vendas.",
    note:
      "Os projetos podem utilizar frontend, backend e infraestrutura próprios, conforme a proposta contratada — sem dependência obrigatória de plataformas prontas.",
    levels: [
      {
        id: "basico",
        name: "Básico",
        summary: "Tudo o que é necessário para começar a vender online.",
        price: 2000,
        features: [
          "Catálogo de produtos",
          "Carrinho de compras",
          "Checkout",
          "Integração com um gateway de pagamento",
          "Gerenciamento básico de produtos",
          "Gerenciamento básico de pedidos",
        ],
      },
      {
        id: "intermediario",
        name: "Intermediário",
        summary: "Mais organização, recursos de venda e controle da operação.",
        price: 4000,
        features: [
          "Recursos do nível Básico",
          "Categorias e filtros",
          "Cupons de desconto",
          "Cadastro de clientes",
          "Controle de estoque ampliado",
          "Painel administrativo mais completo",
        ],
      },
      {
        id: "avancado",
        name: "Avançado",
        summary: "Regras e experiências de compra feitas para o seu negócio.",
        price: 7000,
        features: [
          "Recursos do nível Intermediário",
          "Regras comerciais personalizadas",
          "Personalização de produtos conforme escopo",
          "Integrações adicionais",
          "Experiência de compra personalizada",
          "Relatórios e recursos gerenciais",
        ],
      },
    ],
  },
  {
    id: "sistema-web",
    name: "Sistemas Web Personalizados",
    icon: "system",
    description:
      "Plataformas completas com funcionalidades e regras de negócio desenvolvidas sob medida.",
    detail:
      "Plataformas de campeonatos, gerenciamento e operações internas podem se enquadrar nesta categoria.",
    note: "A Copa Jangurussu, apresentada na Home, é um exemplo real de sistema web personalizado.",
    levels: [
      {
        id: "basico",
        name: "Básico",
        summary: "Um sistema enxuto, com um módulo principal bem resolvido.",
        price: 3000,
        features: [
          "Autenticação de usuários",
          "Banco de dados",
          "Painel administrativo simples",
          "Um módulo funcional principal",
          "Regras de negócio essenciais",
          "Interface responsiva",
        ],
      },
      {
        id: "intermediario",
        name: "Intermediário",
        summary: "Vários módulos, perfis de acesso e visão gerencial dos dados.",
        price: 6000,
        features: [
          "Recursos do nível Básico",
          "Múltiplos módulos",
          "Perfis e permissões de usuários",
          "Dashboards e relatórios",
          "Regras de negócio adicionais",
          "Gerenciamento de dados ampliado",
        ],
      },
      {
        id: "avancado",
        name: "Avançado",
        summary: "Fluxos complexos, integrações e uma base pronta para crescer.",
        price: 12000,
        features: [
          "Recursos do nível Intermediário",
          "Fluxos e regras de negócio complexos",
          "Funcionalidades em tempo real",
          "Integrações com APIs externas",
          "Relatórios e painéis personalizados",
          "Arquitetura adequada à evolução do sistema",
        ],
      },
    ],
  },
  {
    id: "aplicativo-web",
    name: "Aplicativos Web (PWA)",
    icon: "app",
    description: "Aplicações web modernas com experiência semelhante à de aplicativos instaláveis.",
    detail: "Aplicações acessadas pelo navegador que podem ser instaladas em dispositivos compatíveis.",
    note:
      "Instalação, notificações e recursos offline dependem do navegador e do dispositivo. Não se trata de aplicativos nativos para Android ou iOS.",
    levels: [
      {
        id: "basico",
        name: "Básico",
        summary: "Uma aplicação instalável com as telas essenciais.",
        price: 2500,
        features: [
          "Aplicação web responsiva",
          "Instalação em dispositivos compatíveis",
          "Telas essenciais",
          "Interface personalizada",
          "Funcionalidades de baixa complexidade",
          "Configuração de manifest e service worker",
        ],
      },
      {
        id: "intermediario",
        name: "Intermediário",
        summary: "Mais telas, dados persistentes e uso parcial sem conexão.",
        price: 5000,
        features: [
          "Recursos do nível Básico",
          "Telas e funcionalidades adicionais",
          "Autenticação quando necessária",
          "Persistência de dados",
          "Recursos offline selecionados",
          "Integrações simples",
        ],
      },
      {
        id: "avancado",
        name: "Avançado",
        summary: "Uma aplicação modular, integrada e pronta para evoluir.",
        price: 10000,
        features: [
          "Recursos do nível Intermediário",
          "Múltiplos módulos funcionais",
          "Integrações personalizadas",
          "Experiência mobile aprimorada",
          "Notificações em dispositivos compatíveis, quando previstas no escopo",
          "Arquitetura preparada para evolução",
        ],
      },
    ],
  },
  {
    id: "redesign",
    name: "Redesign e Modernização",
    icon: "redesign",
    description:
      "Transformação visual, funcional e tecnológica de sites e aplicações existentes.",
    detail: "Da atualização visual à reconstrução da experiência do seu site ou aplicação.",
    note:
      "O orçamento final considera a estrutura, a qualidade e as condições técnicas do projeto original.",
    levels: [
      {
        id: "basico",
        name: "Básico",
        summary: "Um visual atualizado sem mexer no que já funciona.",
        price: 800,
        features: [
          "Modernização visual de um site pequeno",
          "Ajustes de layout",
          "Atualização de cores e componentes",
          "Refinamento de responsividade",
          "Preservação das funcionalidades existentes",
        ],
      },
      {
        id: "intermediario",
        name: "Intermediário",
        summary: "Interface reorganizada, páginas redesenhadas e mais usabilidade.",
        price: 1500,
        features: [
          "Recursos do nível Básico",
          "Reorganização da interface",
          "Redesenho de páginas",
          "Novos componentes visuais",
          "Animações e transições",
          "Melhorias de usabilidade",
        ],
      },
      {
        id: "avancado",
        name: "Avançado",
        summary: "Uma reconstrução ampla da experiência e da base frontend.",
        price: 3000,
        features: [
          "Recursos do nível Intermediário",
          "Reconstrução visual ampliada",
          "Modernização de componentes frontend",
          "Revisão da experiência do usuário",
          "Otimização técnica",
          "Interações e experiências personalizadas",
        ],
      },
    ],
  },
];

/** valor inicial do serviço = menor valor entre os níveis */
export const startingPrice = (s: Service) => Math.min(...s.levels.map((l) => l.price));

/** "R$ 1.500" (sem centavos, separador de milhar pt-BR) */
export const formatPrice = (value: number) =>
  `R$ ${value.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`;

/** Destino do orçamento: /contato?servico=<id>&nivel=<id> */
export const quoteHref = (service?: ServiceId, level?: LevelId) => {
  const q = new URLSearchParams();
  if (service) q.set("servico", service);
  if (level) q.set("nivel", level);
  const s = q.toString();
  return s ? `/contato?${s}` : "/contato";
};

export const BUDGET_NOTES = {
  reference:
    "Os valores apresentados são referências iniciais de desenvolvimento e implantação. O orçamento final é definido conforme a complexidade, funcionalidades e necessidades de cada projeto.",
  extras:
    "Custos de domínio, hospedagem, manutenção e serviços de terceiros são avaliados separadamente.",
};
