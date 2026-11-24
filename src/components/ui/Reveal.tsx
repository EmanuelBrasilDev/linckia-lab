"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";

/**
 * Scroll reveal reutilizável.
 *
 * Dois observers compartilhados (um único par para a página inteira):
 *  - ENTRADA: ao cruzar 15% de visibilidade (com 8% de folga na base) adiciona
 *    `is-visible`, o que dispara a animação de entrada.
 *  - REINÍCIO: só remove `is-visible` quando o elemento está COMPLETAMENTE
 *    abaixo da viewport (não intersecta e `top` >= altura da viewport).
 *    Elementos parcialmente visíveis ou já passados por cima nunca reiniciam,
 *    e o reinício acontece fora da tela — sem piscadas.
 *
 * A transição vive em `.reveal.is-visible` (veja globals.css): a entrada
 * anima; o reinício é instantâneo e invisível. Mudar a direção da rolagem
 * durante a animação apenas reverte a transição em curso, sem saltos.
 */

let enterIO: IntersectionObserver | null = null;
let resetIO: IntersectionObserver | null = null;

/**
 * Rede de segurança do reinício: saltos instantâneos (arrastar a scrollbar,
 * Home/End, âncoras) levam elementos de "acima da viewport" direto para
 * "abaixo" (ou vice-versa) sem nunca intersectar — o IntersectionObserver não
 * dispara nesse caso. Quando a rolagem para, uma varredura barata reinicia o
 * que estiver visível e totalmente abaixo da viewport e revela o que foi
 * pulado por cima (nunca deixa conteúdo preso invisível).
 */
const tracked = new Set<HTMLElement>();
let idle = 0;
const sweep = () => {
  const vh = window.innerHeight;
  tracked.forEach((el) => {
    const r = el.getBoundingClientRect();
    const on = el.classList.contains("is-visible");
    if (on && r.top >= vh) el.classList.remove("is-visible"); // totalmente abaixo
    else if (!on && r.bottom <= 0) el.classList.add("is-visible"); // pulado por cima
  });
};
const onScroll = () => {
  window.clearTimeout(idle);
  idle = window.setTimeout(sweep, 140);
};

function observers() {
  if (typeof IntersectionObserver === "undefined") return null;
  if (!enterIO) {
    enterIO = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) e.target.classList.add("is-visible");
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -8% 0px" },
    );
    resetIO = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const vh = e.rootBounds?.height ?? window.innerHeight;
          if (!e.isIntersecting && e.boundingClientRect.top >= vh) {
            e.target.classList.remove("is-visible");
          }
        }
      },
      { threshold: 0, rootMargin: "0px" },
    );
  }
  return { enterIO, resetIO: resetIO! };
}

export default function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = observers();
    if (!obs) {
      el.classList.add("is-visible");
      return;
    }
    obs.enterIO.observe(el);
    obs.resetIO.observe(el);
    if (tracked.size === 0) window.addEventListener("scroll", onScroll, { passive: true });
    tracked.add(el);
    return () => {
      obs.enterIO.unobserve(el);
      obs.resetIO.unobserve(el);
      tracked.delete(el);
      if (tracked.size === 0) {
        window.removeEventListener("scroll", onScroll);
        window.clearTimeout(idle);
      }
    };
  }, []);

  return (
    <div
      ref={ref}
      className={`reveal ${className}`}
      style={{ "--d": `${delay}ms` } as CSSProperties}
    >
      {children}
    </div>
  );
}
