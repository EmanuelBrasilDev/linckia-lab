import Image from "next/image";
import Section, { Eyebrow } from "@/components/ui/Section";
import Reveal from "@/components/ui/Reveal";

export default function FeaturedProject() {
  return (
    <Section id="projeto" labelledBy="projeto-titulo">
      <Reveal>
        <Eyebrow>Projeto em destaque</Eyebrow>
        <h2
          id="projeto-titulo"
          className="max-w-3xl font-display text-3xl font-bold leading-tight tracking-tight sm:text-5xl"
        >
          Ideias que começam a ganhar forma.
        </h2>
      </Reveal>

      <div className="mt-14 grid items-center gap-10 lg:grid-cols-[0.8fr_1.2fr]">
        <Reveal>
          <h3 className="font-display text-2xl font-semibold text-bio sm:text-3xl">
            Copa Jangurussu
          </h3>
          <p className="mt-4 max-w-md text-lg leading-relaxed text-muted">
            Uma plataforma web sob medida, desenvolvida a partir das
            necessidades de um projeto real.
          </p>
        </Reveal>

        <Reveal delay={150}>
          <figure className="relative">
            <div
              aria-hidden="true"
              className="absolute -inset-6 -z-10 rounded-[2rem] bg-linckia/20 blur-3xl"
            />
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-abyss-2 shadow-[0_30px_80px_-30px_rgba(68,104,242,0.6)]">
              <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
                <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
                <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
                <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
              </div>
              <Image
                src="/projetos/copa-jangurussu.webp"
                alt="Plataforma Copa Jangurussu — Futebol Virtual"
                width={1900}
                height={867}
                sizes="(min-width: 1024px) 700px, 100vw"
                className="h-auto w-full"
              />
            </div>
          </figure>
        </Reveal>
      </div>
    </Section>
  );
}
