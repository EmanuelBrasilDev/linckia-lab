import Section, { Eyebrow } from "@/components/ui/Section";
import Reveal from "@/components/ui/Reveal";

const steps = [
  {
    n: "01",
    title: "Entendemos",
    text: "Conhecemos a ideia e as necessidades.",
  },
  {
    n: "02",
    title: "Desenvolvemos",
    text: "Transformamos o planejamento em uma solução funcional.",
  },
  {
    n: "03",
    title: "Evoluímos",
    text: "Validamos e avaliamos melhorias.",
  },
];

export default function Process() {
  return (
    <Section labelledBy="processo-titulo">
      <Reveal>
        <Eyebrow>Como trabalhamos</Eyebrow>
        <h2
          id="processo-titulo"
          className="max-w-3xl font-display text-3xl font-bold leading-tight tracking-tight sm:text-5xl"
        >
          Da primeira conversa à experiência digital.
        </h2>
      </Reveal>

      <ol className="relative mt-16 grid gap-10 md:grid-cols-3 md:gap-8">
        <div
          aria-hidden="true"
          className="absolute left-0 right-0 top-6 hidden h-px bg-gradient-to-r from-linckia/60 via-bio/40 to-transparent md:block"
        />
        {steps.map((s, i) => (
          <li key={s.n} className="relative">
            <Reveal delay={i * 150}>
              <span className="relative z-10 grid h-12 w-12 place-items-center rounded-full border border-linckia/50 bg-abyss font-display text-sm font-semibold text-bio">
                {s.n}
              </span>
              <h3 className="mt-6 font-display text-xl font-semibold">
                {s.title}
              </h3>
              <p className="mt-2 max-w-xs leading-relaxed text-muted">
                {s.text}
              </p>
            </Reveal>
          </li>
        ))}
      </ol>
    </Section>
  );
}
