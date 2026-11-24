const whatsappNumber = "5585996329056";
const emailAddress = "linckialab@gmail.com";

export const CONTACT = {
  whatsapp: {
    display: "(85) 99632-9056",
    href: `https://wa.me/${whatsappNumber}`,
  },
  email: {
    display: emailAddress,
    href: `mailto:${emailAddress}`,
  },
} as const;

export const INVESTMENT_RANGES = [
  "Até R$ 1.000",
  "De R$ 1.001 a R$ 3.000",
  "De R$ 3.001 a R$ 6.000",
  "De R$ 6.001 a R$ 12.000",
  "Acima de R$ 12.000",
  "Ainda não defini",
] as const;

export function whatsappQuoteHref({
  name,
  email,
  company,
  service,
  level,
  investment,
  project,
}: {
  name: string;
  email: string;
  company: string;
  service: string;
  level: string;
  investment: string;
  project: string;
}) {
  const details = [
    ["Nome", name],
    ["E-mail", email],
    ["Empresa", company],
    ["Serviço de interesse", service],
    ["Nível de desenvolvimento", level],
    ["Faixa de investimento", investment],
  ];
  const lines = details.filter(([, value]) => value).map(([label, value]) => `${label}: ${value}`);
  const message = [
    "Olá, Linckia Lab!",
    "",
    "Gostaria de solicitar um orçamento para um projeto.",
    "",
    ...lines,
    "",
    "Sobre o projeto:",
    project,
  ].join("\n");

  const destination = new URL(CONTACT.whatsapp.href);
  destination.searchParams.set("text", message);
  return destination.href;
}
