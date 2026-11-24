import type { ReactNode } from "react";
import Section from "@/components/ui/Section";
import Reveal from "@/components/ui/Reveal";
import {
  LandingIllustration,
  SiteIllustration,
  SystemsIllustration,
} from "./SolutionIllustrations";

const cards: {
  title: string;
  text: string;
  icon: ReactNode;
  art: ReactNode;
}[] = [
  {
    title: "Sites institucionais",
    text: "Presença digital profissional.",
    icon: <path d="M4 10.5 12 4l8 6.5V20h-5v-5.5H9V20H4z" />,
    art: <SiteIllustration />,
  },
  {
    title: "Landing pages",
    text: "Páginas focadas em ofertas e campanhas.",
    icon: <path d="M4 4h16v16H4zM4 10h16M10 10v10" />,
    art: <LandingIllustration />,
  },
  {
    title: "Soluções web personalizadas",
    text: "Plataformas para necessidades específicas.",
    icon: <path d="M8 7l-5 5 5 5M16 7l5 5-5 5M14 4l-4 16" />,
    art: <SystemsIllustration />,
  },
];

export default function Solutions() {
  return (
    <Section id="solucoes" labelledBy="solucoes-titulo" className="overflow-hidden">
      <Reveal>
        <div data-wave-avoid className="max-w-3xl">
        <span
          aria-hidden="true"
          className="mb-6 block h-1 w-14 rounded-full bg-gradient-to-r from-linckia to-bio"
        />
        <p className="mb-4 text-xs font-semibold uppercase tracking-[0.25em] text-bio">
          Nossas soluções
        </p>
        <h2
          id="solucoes-titulo"
          className="max-w-3xl font-display text-3xl font-bold leading-tight tracking-tight sm:text-5xl"
        >
          Tecnologia que transforma ideias em{" "}
          <span className="bg-gradient-to-r from-linckia to-bio bg-clip-text text-transparent">
            possibilidades.
          </span>
        </h2>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted">
          Cada negócio tem sua identidade. Nosso trabalho é desenvolver
          experiências digitais que façam sentido para seus objetivos e para as
          pessoas que vão utilizá-las.
        </p>
        </div>
      </Reveal>

      <ul className="mt-14 grid gap-6 md:grid-cols-3">
        {cards.map((c, i) => (
          <li key={c.title}>
            <Reveal delay={i * 120} className="h-full">
              <article className="group relative h-full rounded-3xl bg-[linear-gradient(160deg,rgba(255,255,255,0.2),rgba(68,104,242,0.28)_40%,rgba(255,255,255,0.05)_70%,rgba(0,217,193,0.25))] p-px shadow-[0_20px_50px_-30px_rgba(68,104,242,0.6)] transition-[transform,box-shadow] duration-500 ease-out hover:-translate-y-2 hover:shadow-[0_30px_70px_-25px_rgba(68,104,242,0.85)] active:-translate-y-2">
                {/* borda iluminada no hover */}
                <span
                  aria-hidden="true"
                  className="absolute inset-0 rounded-3xl bg-[linear-gradient(160deg,rgba(0,217,193,0.9),rgba(68,104,242,0.7)_45%,rgba(68,104,242,0.15)_75%,rgba(0,217,193,0.6))] opacity-0 transition-opacity duration-500 group-hover:opacity-100 group-active:opacity-100"
                />
                <div className="relative h-full overflow-hidden rounded-[calc(1.5rem-1px)] bg-[linear-gradient(180deg,rgba(17,27,72,0.88),rgba(8,13,33,0.94))] p-6 backdrop-blur-xl">
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent"
                  />
                  <span
                    aria-hidden="true"
                    className="absolute -bottom-16 left-1/2 h-40 w-64 -translate-x-1/2 rounded-full bg-linckia/25 opacity-60 blur-3xl transition-opacity duration-500 group-hover:opacity-100"
                  />

                  <div
                    aria-hidden="true"
                    className="relative mx-auto h-44 max-w-[16rem] [perspective:900px] sm:h-48"
                  >
                    <div className="absolute inset-x-6 bottom-0 h-8 rounded-full bg-linckia/40 blur-2xl" />
                    <div className="relative h-full transition-transform duration-700 ease-out [transform:rotateY(-14deg)_rotateX(10deg)] group-hover:[transform:rotateY(-5deg)_rotateX(4deg)_translateY(-6px)]">
                      {c.art}
                    </div>
                  </div>

                  <div className="relative mt-6 flex items-center gap-4">
                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-bio shadow-[inset_0_0_14px_rgba(68,104,242,0.35)]">
                      <svg
                        viewBox="0 0 24 24"
                        className="h-5 w-5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        {c.icon}
                      </svg>
                    </span>
                    <h3 className="font-display text-xl font-semibold">
                      {c.title}
                    </h3>
                  </div>
                  <p className="relative mt-3 leading-relaxed text-muted">
                    {c.text}
                  </p>
                </div>
              </article>
            </Reveal>
          </li>
        ))}
      </ul>
    </Section>
  );
}
