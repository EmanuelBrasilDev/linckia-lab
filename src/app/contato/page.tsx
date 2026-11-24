import type { Metadata } from "next";
import Image from "next/image";
import { Suspense } from "react";
import Reveal from "@/components/ui/Reveal";
import { CONTACT } from "@/data/contact";
import { LEVEL_IDS, SERVICES } from "@/data/services";
import OceanScene from "./OceanScene";
import QuoteForm from "./QuoteForm";
import styles from "./contact.module.css";

export const metadata: Metadata = {
  title: "Contato",
  description: "Fale com a Linckia Lab sobre seu projeto e solicite um orçamento para sites e soluções web sob medida.",
};

const channels = [
  { ...CONTACT.whatsapp, name: "WhatsApp", icon: "whatsapp", hint: "Conversar pelo WhatsApp" },
  { ...CONTACT.email, name: "E-mail", icon: "email", hint: "Escrever um e-mail" },
];

function QuoteSelections({ service, level }: { service?: string; level?: string }) {
  return (
    <>
      <div className={styles.field}>
        <label htmlFor="quote-service">Serviço de interesse <span aria-hidden="true">*</span></label>
        <select key={service} id="quote-service" name="service" defaultValue={service ?? ""} required>
          <option value="" disabled>Selecione um serviço</option>
          {SERVICES.map(({ id, name }) => <option key={id} value={id}>{name}</option>)}
          <option value="indefinido">Ainda não sei</option>
        </select>
      </div>
      <div className={styles.field}>
        <label htmlFor="quote-level">Nível de desenvolvimento</label>
        <select key={level} id="quote-level" name="level" defaultValue={level ?? ""}>
          <option value="">Selecione um nível</option>
          {SERVICES[0].levels.map(({ id, name }) => <option key={id} value={id}>{name}</option>)}
          <option value="orientacao">Preciso de orientação</option>
        </select>
      </div>
    </>
  );
}

async function PrefilledSelections({ searchParams }: Pick<PageProps<"/contato">, "searchParams">) {
  const { servico, nivel } = await searchParams;
  const service = SERVICES.find(({ id }) => id === servico)?.id;
  const level = LEVEL_IDS.find((id) => id === nivel);
  return <QuoteSelections service={service} level={level} />;
}

export default function Contato({ searchParams }: PageProps<"/contato">) {
  return (
    <section className={styles.contact} aria-labelledby="contato-titulo">
      <OceanScene />
      <div className={styles.layout}>
        <div className={styles.intro}>
          <Reveal>
            <p className={styles.eyebrow}>Vamos conversar</p>
            <h1 id="contato-titulo" className={styles.title}>
              Seu próximo projeto começa com uma <span>conversa.</span>
            </h1>
            <p className={styles.description}>
              Conte para a Linckia Lab sobre o seu projeto. Vamos entender seus objetivos,
              explorar as melhores soluções e construir, juntos, a próxima etapa da sua ideia.
            </p>
          </Reveal>

          <Reveal delay={90}>
            <ul className={styles.channels} aria-label="Canais de contato">
              {channels.map(({ name, display, href, icon, hint }) => (
                <li key={name}>
                  <a href={href} className={styles.channel} aria-label={`${name}, ${display}`}>
                    <Image unoptimized src={`/assets/contact/icons/${icon}.webp`} width={40} height={40} alt="" />
                    <span className={styles.channelTitle}>{name}</span>
                    <span className={styles.channelDetail}>{display}</span>
                    <span className={styles.channelHint} aria-hidden="true">{hint}<span>↗</span></span>
                  </a>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>

        <Reveal className={styles.formReveal}>
          <QuoteForm>
            <Suspense fallback={<QuoteSelections />}>
              <PrefilledSelections searchParams={searchParams} />
            </Suspense>
          </QuoteForm>
        </Reveal>
      </div>
    </section>
  );
}
