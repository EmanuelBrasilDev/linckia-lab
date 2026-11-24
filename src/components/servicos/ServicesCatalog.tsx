"use client";

import Link from "next/link";
import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
} from "react";
import Reveal, { holdRevealReset } from "@/components/ui/Reveal";
import ServiceIcon from "./ServiceIcon";
import {
  CONTACT_ENABLED,
  SERVICES,
  formatPrice,
  quoteHref,
  startingPrice,
  type LevelId,
  type Service,
  type ServiceId,
} from "@/data/services";

/**
 * Catálogo de serviços com painéis expansíveis.
 *
 * Um único grid: cada fileira de cards é seguida por um "slot" de largura
 * total. O painel abre no slot da fileira REAL do card (3 colunas no desktop,
 * 2 no tablet, 1 no mobile — logo abaixo do card). Os cards nunca trocam de
 * pai, então não remontam quando o número de colunas muda.
 *
 * - Altura do slot animada por CSS (altura medida com ResizeObserver): abrir,
 *   fechar e trocar de conteúdo deslocam o resto do grid suavemente.
 * - Mesma fileira: o painel continua aberto e só o conteúdo transita.
 * - Outra fileira: o slot antigo recolhe (mantendo o conteúdo durante a
 *   saída) enquanto o novo abre na posição correspondente.
 * - Um painel por vez; clicar de novo, no X ou Esc recolhe.
 */

const TRANSITION_MS = 560;
const GAP_REM = 1.25; // gap-x-5

// ---------- colunas atuais (mesmos breakpoints do CSS: md 768 / lg 1024) ----------
const LG = "(min-width: 1024px)";
const MD = "(min-width: 768px)";
const subscribeCols = (cb: () => void) => {
  const a = window.matchMedia(LG);
  const b = window.matchMedia(MD);
  a.addEventListener("change", cb);
  b.addEventListener("change", cb);
  return () => {
    a.removeEventListener("change", cb);
    b.removeEventListener("change", cb);
  };
};
const getCols = () =>
  window.matchMedia(LG).matches ? 3 : window.matchMedia(MD).matches ? 2 : 1;
const useCols = () => useSyncExternalStore(subscribeCols, getCols, () => 3);

const slotId = (row: number) => `servicos-painel-${row}`;
const buttonId = (id: ServiceId) => `servico-${id}-explorar`;

export default function ServicesCatalog() {
  const cols = useCols();
  const [selected, setSelected] = useState<ServiceId | null>(null);

  const selIndex = selected ? SERVICES.findIndex((s) => s.id === selected) : -1;
  const selRow = selIndex >= 0 ? Math.floor(selIndex / cols) : -1;
  const selCol = selIndex >= 0 ? selIndex % cols : 0;
  const rows = Math.ceil(SERVICES.length / cols);

  const toggle = (id: ServiceId) => {
    // o deslocamento causado pelo painel não deve reiniciar o Scroll Reveal
    holdRevealReset(TRANSITION_MS + 400);
    setSelected((cur) => (cur === id ? null : id));
  };
  const close = () => {
    if (!selected) return;
    holdRevealReset(TRANSITION_MS + 400);
    const id = selected;
    setSelected(null);
    document.getElementById(buttonId(id))?.focus({ preventScroll: true });
  };

  // painel recém-aberto muito abaixo da dobra: rola só o necessário para mostrá-lo
  useEffect(() => {
    if (selRow < 0) return;
    const timer = window.setTimeout(() => {
      const el = document.getElementById(slotId(selRow));
      if (!el) return;
      const top = el.getBoundingClientRect().top;
      const vh = window.innerHeight;
      if (top > vh * 0.78) {
        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        window.scrollBy({ top: top - vh * 0.35, behavior: reduce ? "auto" : "smooth" });
      }
    }, 140);
    return () => window.clearTimeout(timer);
  }, [selected, selRow]);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape" && selected) {
      e.preventDefault();
      close();
    }
  };

  const items: ReactNode[] = [];
  for (let r = 0; r < rows; r++) {
    for (let k = 0; k < cols; k++) {
      const i = r * cols + k;
      const s = SERVICES[i];
      if (!s) break;
      items.push(
        <Reveal key={s.id} delay={k * 90} className="pb-5">
          <ServiceCard
            service={s}
            selected={selected === s.id}
            controls={slotId(r)}
            onToggle={() => toggle(s.id)}
          />
        </Reveal>,
      );
    }
    const open = selRow === r;
    items.push(
      <PanelSlot
        key={`slot-${r}`}
        id={slotId(r)}
        open={open}
        service={open ? SERVICES[selIndex] : null}
        col={selCol}
        cols={cols}
        onClose={close}
      />,
    );
  }

  return (
    <div
      className="grid grid-cols-1 gap-x-5 md:grid-cols-2 lg:grid-cols-3"
      onKeyDown={onKeyDown}
    >
      {items}
    </div>
  );
}

// ---------- card ----------

function ServiceCard({
  service,
  selected,
  controls,
  onToggle,
}: {
  service: Service;
  selected: boolean;
  controls: string;
  onToggle: () => void;
}) {
  const ref = useRef<HTMLElement | null>(null);

  // inclinação 2.5D + luz que acompanha o mouse (sem estado React por movimento)
  const onMove = (e: PointerEvent<HTMLElement>) => {
    if (e.pointerType !== "mouse") return;
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    el.style.setProperty("--mx", `${(x * 100).toFixed(1)}%`);
    el.style.setProperty("--my", `${(y * 100).toFixed(1)}%`);
    el.style.setProperty("--rx", `${((0.5 - y) * 4).toFixed(2)}deg`);
    el.style.setProperty("--ry", `${((x - 0.5) * 5).toFixed(2)}deg`);
    el.dataset.hover = "true";
  };
  const onLeave = () => {
    const el = ref.current;
    if (!el) return;
    el.style.removeProperty("--rx");
    el.style.removeProperty("--ry");
    delete el.dataset.hover;
  };
  // o card inteiro é clicável com o mouse; o controle semântico é o botão
  const onClick = (e: MouseEvent<HTMLElement>) => {
    if ((e.target as HTMLElement).closest("button, a")) return;
    onToggle();
  };

  return (
    <article
      ref={ref}
      className="lk-svc-card h-full"
      data-selected={selected ? "true" : undefined}
      data-cursor="interactive"
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      onClick={onClick}
      aria-labelledby={`${service.id}-nome`}
    >
      <span className="lk-svc-glow" aria-hidden="true" />
      <div className="relative flex h-full flex-col p-6">
        <div className="flex items-start gap-4">
          <span className="lk-icon-tile grid h-12 w-12 shrink-0 place-items-center rounded-xl text-bio">
            <ServiceIcon name={service.icon} />
          </span>
          <div className="min-w-0">
            <h2
              id={`${service.id}-nome`}
              className="font-display text-lg font-semibold leading-snug text-ink"
            >
              {service.name}
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-muted">{service.description}</p>
          </div>
        </div>

        <div className="mt-auto pt-5">
          <div className="flex items-end justify-between gap-3 border-t border-white/10 pt-4">
            <p className="leading-none">
              <span className="block text-xs text-muted">A partir de</span>
              <span className="mt-1.5 block font-display text-2xl font-bold text-bio">
                {formatPrice(startingPrice(service))}
              </span>
            </p>
            <button
              id={buttonId(service.id)}
              type="button"
              aria-expanded={selected}
              aria-controls={controls}
              onClick={onToggle}
              className="lk-explore inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-medium"
            >
              Explorar serviço
              <span className="sr-only">: {service.name}</span>
              <svg
                viewBox="0 0 24 24"
                className="lk-chevron h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>
          </div>
        </div>
      </div>
      {/* conexão luminosa com o painel aberto logo abaixo */}
      <span className="lk-svc-link" aria-hidden="true" />
    </article>
  );
}

// ---------- slot + painel ----------

function PanelSlot({
  id,
  open,
  service,
  col,
  cols,
  onClose,
}: {
  id: string;
  open: boolean;
  service: Service | null;
  col: number;
  cols: number;
  onClose: () => void;
}) {
  // mantém o último conteúdo durante o recolhimento
  const [shown, setShown] = useState<{ service: Service; col: number } | null>(null);
  if (open && service && (shown?.service !== service || shown.col !== col)) {
    setShown({ service, col });
  }

  const innerRef = useRef<HTMLDivElement | null>(null);
  const [height, setHeight] = useState(0);
  useEffect(() => {
    const el = innerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setHeight(el.offsetHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      id={id}
      className="lk-slot col-span-full"
      style={{ height: open ? height : 0 }}
      inert={!open}
    >
      <div ref={innerRef} className="pb-5 pt-2.5">
        {shown && (
          <ServicePanel
            key={shown.service.id}
            service={shown.service}
            col={shown.col}
            cols={cols}
            onClose={onClose}
          />
        )}
      </div>
    </div>
  );
}

function ServicePanel({
  service,
  col,
  cols,
  onClose,
}: {
  service: Service;
  col: number;
  cols: number;
  onClose: () => void;
}) {
  const notch: CSSProperties = {
    left: `calc(${(col + 0.5) / cols} * (100% + ${GAP_REM}rem) - ${GAP_REM / 2}rem)`,
  };
  return (
    <section className="lk-panel" aria-labelledby={`${service.id}-niveis`}>
      <span className="lk-panel-notch" style={notch} aria-hidden="true" />
      <div className="relative p-5 sm:p-7">
        <div className="lk-rise flex items-start gap-4">
          <span className="lk-icon-tile hidden h-12 w-12 shrink-0 place-items-center rounded-xl text-bio sm:grid">
            <ServiceIcon name={service.icon} />
          </span>
          <div className="min-w-0 flex-1">
            <h3
              id={`${service.id}-niveis`}
              className="font-display text-xl font-semibold leading-snug text-ink sm:text-2xl"
            >
              {service.name}{" "}
              <span className="text-muted">—</span>{" "}
              <span className="bg-gradient-to-r from-linckia to-bio bg-clip-text text-transparent">
                Compare os níveis
              </span>
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">{service.detail}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={`Fechar níveis de ${service.name}`}
            className="lk-close grid h-10 w-10 shrink-0 place-items-center rounded-xl border"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>

        <ul className="mt-6 grid gap-4 lg:grid-cols-3">
          {service.levels.map((level, i) => (
            <li
              key={level.id}
              className="lk-rise lk-level flex flex-col rounded-2xl p-5"
              style={{ "--d": `${110 + i * 90}ms` } as CSSProperties}
            >
              <h4 className="font-display text-lg font-semibold text-ink">{level.name}</h4>
              <p className="mt-1 text-sm leading-relaxed text-muted">{level.summary}</p>
              <p className="mt-4 leading-none">
                <span className="block text-xs text-muted">A partir de</span>
                <span className="mt-1.5 block font-display text-3xl font-bold text-bio">
                  {formatPrice(level.price)}
                </span>
              </p>
              <ul className="mt-4 space-y-2.5 border-t border-white/10 pt-4 text-sm text-ink/90">
                {level.features.map((f) => (
                  <li key={f} className="flex gap-2.5">
                    <svg
                      viewBox="0 0 24 24"
                      className="mt-0.5 h-4 w-4 shrink-0 text-bio"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="m5 12.5 4.5 4.5L19 7.5" />
                    </svg>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-auto pt-5">
                <QuoteAction service={service.id} level={level.id} />
              </div>
            </li>
          ))}
        </ul>

        <div
          className="lk-rise mt-5 space-y-1.5 text-xs leading-relaxed text-muted"
          style={{ "--d": "380ms" } as CSSProperties}
        >
          <p>
            Valores iniciais de referência para desenvolvimento e implantação, não mensalidades.
            O investimento final varia conforme escopo, funcionalidades e integrações.
          </p>
          {service.note && <p>{service.note}</p>}
        </div>
      </div>
    </section>
  );
}

/**
 * Botão de orçamento. Já aponta para /contato?servico=…&nivel=…, mas só é
 * ativado quando CONTACT_ENABLED = true (ver src/data/services.ts).
 */
function QuoteAction({ service, level }: { service: ServiceId; level: LevelId }) {
  if (CONTACT_ENABLED) {
    return (
      <Link href={quoteHref(service, level)} className="lk-quote">
        Solicitar orçamento
      </Link>
    );
  }
  return (
    <button type="button" disabled className="lk-quote" title="Disponível em breve">
      Solicitar orçamento
      <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[0.7rem] font-medium text-muted">
        em breve
      </span>
    </button>
  );
}
