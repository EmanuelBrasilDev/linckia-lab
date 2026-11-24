"use client";

import { useSyncExternalStore, type FormEvent, type ReactNode } from "react";
import { INVESTMENT_RANGES, whatsappQuoteHref } from "@/data/contact";
import styles from "./contact.module.css";

const subscribeToHydration = () => () => {};
const isHydrated = () => true;
const isServerRender = () => false;

export default function QuoteForm({ children }: { children: ReactNode }) {
  const ready = useSyncExternalStore(subscribeToHydration, isHydrated, isServerRender);

  function submitQuote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const value = (name: string) => String(data.get(name) ?? "").trim();
    const selectedLabel = (name: string) => {
      const select = form.elements.namedItem(name);
      return select instanceof HTMLSelectElement && select.value
        ? select.selectedOptions[0].text
        : "";
    };

    const name = value("name");
    const project = value("project");
    const nameInput = form.elements.namedItem("name") as HTMLInputElement;
    const projectInput = form.elements.namedItem("project") as HTMLTextAreaElement;
    nameInput.setCustomValidity(name ? "" : "Informe seu nome.");
    projectInput.setCustomValidity(project ? "" : "Conte um pouco sobre o seu projeto.");
    if (!form.reportValidity()) return;

    const destination = whatsappQuoteHref({
      name,
      email: value("email"),
      company: value("company"),
      service: selectedLabel("service"),
      level: selectedLabel("level"),
      investment: value("investment"),
      project,
    });
    window.location.assign(destination);
  }

  return (
    <form
      className={styles.form}
      aria-labelledby="orcamento-titulo"
      method="post"
      onSubmit={submitQuote}
    >
      <h2 id="orcamento-titulo">Fale com a Linckia Lab</h2>
      <p className={styles.formDescription}>Conte um pouco sobre o projeto que deseja desenvolver.</p>

      <div className={styles.fields}>
        <div className={styles.field}>
          <label htmlFor="quote-name">Nome <span aria-hidden="true">*</span></label>
          <input
            id="quote-name"
            name="name"
            type="text"
            autoComplete="name"
            placeholder="Seu nome"
            required
            maxLength={120}
            onInput={(event) => event.currentTarget.setCustomValidity("")}
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="quote-email">E-mail <span aria-hidden="true">*</span></label>
          <input
            id="quote-email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="voce@exemplo.com"
            required
            maxLength={254}
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="quote-company">Empresa</label>
          <input
            id="quote-company"
            name="company"
            type="text"
            autoComplete="organization"
            placeholder="Nome da empresa"
            maxLength={120}
          />
        </div>
        {children}
        <div className={styles.field}>
          <label htmlFor="quote-investment">Faixa de investimento</label>
          <select id="quote-investment" name="investment" defaultValue="">
            <option value="">Selecione uma faixa</option>
            {INVESTMENT_RANGES.map((range) => <option key={range} value={range}>{range}</option>)}
          </select>
        </div>
        <div className={`${styles.field} ${styles.fullField}`}>
          <label htmlFor="quote-project">Sobre o projeto <span aria-hidden="true">*</span></label>
          <textarea
            id="quote-project"
            name="project"
            placeholder="Conte brevemente sobre seus objetivos e o que precisa desenvolver."
            required
            maxLength={2000}
            rows={4}
            onInput={(event) => event.currentTarget.setCustomValidity("")}
          />
        </div>
      </div>

      <button type="submit" className={styles.submit} disabled={!ready} aria-describedby="orcamento-destino">
        Solicitar orçamento via WhatsApp <span aria-hidden="true">→</span>
      </button>
      <p id="orcamento-destino" className={styles.submitHint}>
        Você será direcionado ao WhatsApp para enviar sua solicitação.
      </p>
    </form>
  );
}
