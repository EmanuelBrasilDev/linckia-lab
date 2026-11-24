import Link from "next/link";
import Section from "@/components/ui/Section";
import Reveal from "@/components/ui/Reveal";
import { quoteHref } from "@/data/services";

export default function FinalCta() {
  return (
    <Section labelledBy="cta-titulo" className="pb-28 pt-8 sm:pb-36">
      <Reveal>
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-linckia/30 via-abyss-2 to-abyss p-8 text-center sm:p-16">
          <div
            aria-hidden="true"
            className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-bio/20 blur-[90px]"
          />
          <h2
            id="cta-titulo"
            className="relative mx-auto max-w-2xl font-display text-3xl font-bold leading-tight tracking-tight sm:text-5xl"
          >
            Tem uma ideia? Vamos dar forma a ela.
          </h2>
          <p className="relative mx-auto mt-6 max-w-xl text-lg leading-relaxed text-muted">
            Conte o que você tem em mente. Podemos conversar sobre como
            transformar seu projeto em uma experiência digital.
          </p>
          <Link
            href={quoteHref()}
            className="relative mt-10 inline-flex items-center justify-center rounded-full bg-linckia px-7 py-3.5 text-sm font-semibold text-white shadow-[0_8px_30px_-8px_rgba(68,104,242,0.7)] transition-colors hover:bg-[#5576f5]"
          >
            Solicitar orçamento
          </Link>
        </div>
      </Reveal>
    </Section>
  );
}
