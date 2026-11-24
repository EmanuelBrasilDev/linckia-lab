import Section, { Eyebrow } from "@/components/ui/Section";
import Reveal from "@/components/ui/Reveal";

export default function Philosophy() {
  return (
    <Section
      labelledBy="filosofia-titulo"
      className="py-32 sm:py-44"
    >
      <div
        aria-hidden="true"
        className="absolute left-1/2 top-1/2 -z-10 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-linckia/20 blur-[110px] sm:h-96 sm:w-96"
      />
      <Reveal className="mx-auto max-w-3xl text-center">
        <div className="flex justify-center">
          <Eyebrow>Nossa filosofia</Eyebrow>
        </div>
        <h2
          id="filosofia-titulo"
          className="font-display text-3xl font-bold leading-tight tracking-tight sm:text-5xl"
        >
          Não é apenas sobre estar online. É sobre criar algo que faça{" "}
          <span className="text-bio">sentido.</span>
        </h2>
        <p className="mx-auto mt-8 max-w-xl text-lg leading-relaxed text-muted">
          Acreditamos que um bom projeto digital precisa unir estética,
          usabilidade e tecnologia. É essa combinação que buscamos em cada
          experiência que desenvolvemos.
        </p>
      </Reveal>
    </Section>
  );
}
