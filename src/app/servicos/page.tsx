import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import Reveal from "@/components/ui/Reveal";
import LiquidField from "@/components/servicos/LiquidField";
import ServicesCatalog from "@/components/servicos/ServicesCatalog";
import { BUDGET_NOTES, quoteHref } from "@/data/services";

export const metadata: Metadata = {
  title: "Serviços",
  description:
    "Landing pages, sites institucionais, lojas virtuais, sistemas web, aplicativos web (PWA) e redesign — com níveis de desenvolvimento e valores iniciais de referência.",
};

export default function Servicos() {
  return (
    <div className="relative">
      <LiquidField />

      <div className="relative z-10 mx-auto max-w-6xl px-5 sm:px-8">
        {/* apresentação compacta: o catálogo aparece logo na primeira dobra */}
        <header className="pb-10 pt-28 text-center sm:pb-12 sm:pt-32">
          <Reveal>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-bio">
              Nossas soluções
            </p>
            <h1 className="mx-auto mt-4 max-w-3xl font-display text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
              Serviços de{" "}
              <span className="bg-gradient-to-r from-linckia to-bio bg-clip-text text-transparent">
                desenvolvimento web
              </span>
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-muted sm:text-lg">
              Da presença digital à solução completa, com projetos que se adaptam às
              necessidades do seu negócio.
            </p>
            <span
              aria-hidden="true"
              className="mx-auto mt-7 block h-1 w-14 rounded-full bg-gradient-to-r from-linckia to-bio"
            />
          </Reveal>
        </header>

        <section aria-label="Catálogo de serviços">
          <ServicesCatalog />
        </section>

        {/* informação comercial */}
        <Reveal>
          <aside
            aria-label="Sobre os valores"
            className="mx-auto mt-6 flex max-w-3xl gap-3 rounded-2xl border border-white/10 bg-abyss/60 p-5 text-sm leading-relaxed text-muted sm:p-6"
          >
            <Image
              unoptimized
              src="/assets/shared/icons/information.webp"
              width={20}
              height={20}
              className="mt-0.5 h-5 w-5 shrink-0"
              alt=""
            />
            <div className="space-y-2">
              <p>{BUDGET_NOTES.reference}</p>
              <p>{BUDGET_NOTES.extras}</p>
            </div>
          </aside>
        </Reveal>

        {/* CTA final */}
        <section aria-labelledby="servicos-cta" className="pb-24 pt-16 sm:pb-32 sm:pt-20">
          <Reveal>
            <div className="lk-panel overflow-hidden p-8 text-center sm:p-14">
              <h2
                id="servicos-cta"
                className="mx-auto max-w-2xl font-display text-3xl font-bold leading-tight tracking-tight sm:text-4xl"
              >
                Tem um projeto em mente?
              </h2>
              <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-muted sm:text-lg">
                Conte o que você precisa e encontramos juntos o formato e o nível ideais
                para o seu negócio.
              </p>
              <Link
                href={quoteHref()}
                className="mt-9 inline-flex items-center justify-center gap-2 rounded-full bg-linckia px-7 py-3.5 text-sm font-semibold text-white shadow-[0_8px_30px_-8px_rgba(68,104,242,0.7)] transition-colors hover:bg-[#5576f5]"
              >
                Solicitar orçamento
              </Link>
            </div>
          </Reveal>
        </section>
      </div>
    </div>
  );
}
