import Button from "@/components/ui/Button";

export default function Hero() {
  return (
    <section
      aria-labelledby="hero-titulo"
      className="relative isolate overflow-hidden pt-32 sm:pt-40 lg:flex lg:min-h-[46rem] lg:items-center lg:pb-16 lg:pt-28"
    >
      {/* o glow e a corrente vêm do CurrentField (camada global da Home) */}
      {/* grid sutil */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 opacity-[0.06] [background-image:linear-gradient(#fff_1px,transparent_1px),linear-gradient(90deg,#fff_1px,transparent_1px)] [background-size:56px_56px] [mask-image:radial-gradient(ellipse_at_40%_40%,black,transparent_75%)]"
      />

      <div className="mx-auto grid w-full max-w-6xl items-center gap-6 px-5 sm:px-8 lg:grid-cols-2">
        <div data-wave-avoid>
          <h1
            id="hero-titulo"
            className="font-display text-4xl font-bold leading-[1.05] tracking-tight sm:text-6xl lg:text-[4.25rem]"
          >
            Sua ideia merece ganhar vida no{" "}
            <span className="bg-gradient-to-r from-linckia to-bio bg-clip-text text-transparent">
              digital.
            </span>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted">
            Criamos sites e soluções web que combinam design, tecnologia e
            funcionalidade para transformar ideias em experiências digitais.
          </p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Button href="#solucoes">Explorar soluções</Button>
            <Button href="#projeto" variant="ghost">
              Conhecer nosso trabalho
            </Button>
          </div>
        </div>
        {/* coluna visual: as ondas do canvas ocupam este espaço */}
        <div aria-hidden="true" className="h-72 sm:h-96 lg:h-[30rem]" />
      </div>
    </section>
  );
}
