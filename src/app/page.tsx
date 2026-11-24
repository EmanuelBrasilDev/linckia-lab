import CurrentField from "@/components/sections/CurrentField";
import Hero from "@/components/sections/Hero";
import Solutions from "@/components/sections/Solutions";
import FeaturedProject from "@/components/sections/FeaturedProject";
import Process from "@/components/sections/Process";
import Philosophy from "@/components/sections/Philosophy";
import FinalCta from "@/components/sections/FinalCta";

export default function Home() {
  return (
    <>
      {/* Uma única corrente de ondas (WebGL, camada fixa atrás do conteúdo)
          percorre todas as seções da Home. */}
      <div>
        <CurrentField />
        <Hero />
        <Solutions />
        <FeaturedProject />
        <Process />
        <Philosophy />
        <FinalCta />
      </div>
    </>
  );
}
