import Image from "next/image";
import Section, { Eyebrow } from "@/components/ui/Section";
import Reveal from "@/components/ui/Reveal";

const steps = [
  {
    icon: "discovery",
    title: "Entendemos",
    text: "Conhecemos a ideia e as necessidades.",
  },
  {
    icon: "build",
    title: "Desenvolvemos",
    text: "Transformamos o planejamento em uma solução funcional.",
  },
  {
    icon: "iterate",
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

      <ol className="relative mt-16 grid gap-10 before:absolute before:left-0 before:right-0 before:top-6 before:hidden before:h-px before:bg-gradient-to-r before:from-linckia/60 before:via-bio/40 before:to-transparent md:grid-cols-3 md:gap-8 md:before:block">
        {steps.map((s, i) => (
          <li key={s.icon} className="relative">
            <Reveal delay={i * 150}>
              <span className="relative z-10 grid h-12 w-12 place-items-center rounded-full border border-linckia/50 bg-abyss">
                <Image
                  unoptimized
                  src={`/assets/home/icons/${s.icon}.webp`}
                  width={30}
                  height={30}
                  className="h-[30px] w-[30px] object-contain"
                  alt=""
                />
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
