"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";

/**
 * Scrollbar personalizada (somente ponteiro preciso).
 *
 * Os navegadores não permitem trocar o cursor sobre a scrollbar nativa nem
 * estilizá-la por completo, então esta é uma barra DOM que apenas REFLETE a
 * rolagem real do documento — nada é movido artificialmente:
 *  - o indicador é posicionado direto no evento `scroll` (sem atraso);
 *  - arrastar usa Pointer Events + pointer capture e chama `scrollTo` instantâneo;
 *  - clique no trilho rola uma página; teclado completo no indicador.
 * A barra nativa só é ocultada (classe em <html>) depois que este componente
 * montou; em touch/sem ponteiro preciso nada é renderizado e vale o nativo.
 */

const MIN_THUMB = 48;

export default function Scrollbar() {
  const [enabled, setEnabled] = useState(false);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const thumbRef = useRef<HTMLDivElement | null>(null);
  const m = useRef({ max: 0, travel: 0, thumb: MIN_THUMB });
  const drag = useRef<{ y: number; scroll: number } | null>(null);

  useEffect(() => {
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    const sync = () => setEnabled(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const track = trackRef.current;
    const thumb = thumbRef.current;
    if (!track || !thumb) return;
    const doc = document.documentElement;
    doc.classList.add("has-custom-scrollbar");

    const place = () => {
      const { max, travel } = m.current;
      const y = max > 0 ? (travel * Math.min(Math.max(window.scrollY, 0), max)) / max : 0;
      thumb.style.transform = `translate3d(0, ${y}px, 0)`;
      const pct = max > 0 ? Math.round((Math.min(window.scrollY, max) / max) * 100) : 0;
      if (thumb.getAttribute("aria-valuenow") !== String(pct)) {
        thumb.setAttribute("aria-valuenow", String(pct));
      }
    };

    const measure = () => {
      const vh = doc.clientHeight;
      const sh = doc.scrollHeight;
      const max = sh - vh;
      track.dataset.hidden = max <= 1 ? "true" : "false";
      const th = track.clientHeight;
      const thumbH = Math.min(th, Math.max(MIN_THUMB, (th * vh) / Math.max(sh, 1)));
      m.current = { max: Math.max(0, max), travel: Math.max(0, th - thumbH), thumb: thumbH };
      thumb.style.height = `${thumbH}px`;
      place();
    };

    measure();
    window.addEventListener("scroll", place, { passive: true });
    window.addEventListener("resize", measure);
    const ro = new ResizeObserver(measure);
    ro.observe(doc);
    ro.observe(document.body);

    return () => {
      doc.classList.remove("has-custom-scrollbar");
      window.removeEventListener("scroll", place);
      window.removeEventListener("resize", measure);
      ro.disconnect();
    };
  }, [enabled]);

  if (!enabled) return null;

  const onThumbDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.preventDefault(); // não inicia seleção de texto
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { y: e.clientY, scroll: window.scrollY };
    trackRef.current!.dataset.dragging = "true";
  };
  const onThumbMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    const { max, travel } = m.current;
    if (!d || travel <= 0) return;
    window.scrollTo({ top: d.scroll + ((e.clientY - d.y) * max) / travel, behavior: "instant" });
  };
  const endDrag = (e: PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return;
    drag.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    delete trackRef.current!.dataset.dragging;
  };

  const onTrackDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget || e.button !== 0) return;
    e.preventDefault();
    const r = thumbRef.current!.getBoundingClientRect();
    const dir = e.clientY < r.top ? -1 : 1;
    window.scrollBy({ top: dir * window.innerHeight * 0.9, behavior: "auto" });
  };

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const vh = window.innerHeight;
    const by = (top: number) => window.scrollBy({ top, behavior: "auto" });
    switch (e.key) {
      case "ArrowDown": by(60); break;
      case "ArrowUp": by(-60); break;
      case "PageDown": by(vh * 0.9); break;
      case "PageUp": by(-vh * 0.9); break;
      case "Home": window.scrollTo({ top: 0, behavior: "auto" }); break;
      case "End": window.scrollTo({ top: m.current.max, behavior: "auto" }); break;
      default: return;
    }
    e.preventDefault();
  };

  return (
    <div
      ref={trackRef}
      className="lk-scrollbar"
      data-hidden="true"
      onPointerDown={onTrackDown}
    >
      <div
        ref={thumbRef}
        className="lk-thumb"
        role="scrollbar"
        aria-label="Rolagem da página"
        aria-orientation="vertical"
        aria-controls="conteudo"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={0}
        tabIndex={0}
        onPointerDown={onThumbDown}
        onPointerMove={onThumbMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onLostPointerCapture={endDrag}
        onKeyDown={onKey}
      >
        <span className="lk-thumb-bar" />
      </div>
    </div>
  );
}
