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
 *
 * Cursor na borda direita: o Chromium descarta um cursor CSS personalizado
 * quando a imagem não cabe inteira na viewport visível e cai no `auto` (seta
 * branca do sistema). Com o hotspot na ponta da seta, os 28px do cursor
 * sempre ultrapassam a borda direita sobre a barra — nenhum CSS resolve.
 * Por isso, sobre a barra e durante o arraste, o cursor do sistema é ocultado
 * (`cursor: none`) e o MESMO SVG da marca é desenhado por uma camada fixa que
 * segue o ponteiro no próprio evento (sem rAF, sem atraso).
 */

const MIN_THUMB = 48;
const CURSOR_SRC = "/cursors/cursor.svg";
const HOTSPOT = 2; // igual ao `2 2` do CSS

export default function PremiumScrollbar() {
  const [enabled, setEnabled] = useState(false);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const thumbRef = useRef<HTMLDivElement | null>(null);
  const m = useRef({ max: 0, travel: 0, thumb: MIN_THUMB });
  const drag = useRef<{ y: number; scroll: number } | null>(null);
  const softRef = useRef<HTMLDivElement | null>(null);
  const softImgRef = useRef<HTMLImageElement | null>(null);
  const over = useRef(false);

  /** posiciona o cursor desenhado e o mostra só dentro da viewport */
  const moveSoft = (x: number, y: number) => {
    const layer = softRef.current;
    const img = softImgRef.current;
    if (!layer || !img) return;
    const active = over.current || drag.current !== null;
    const inside = x >= 0 && y >= 0 && x < window.innerWidth && y < window.innerHeight;
    img.style.transform = `translate3d(${x - HOTSPOT}px, ${y - HOTSPOT}px, 0)`;
    const on = active && inside ? "true" : "false";
    if (layer.dataset.on !== on) layer.dataset.on = on;
  };

  useEffect(() => {
    const mq = window.matchMedia("(hover: hover) and (pointer: fine) and (forced-colors: none)");
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
    let previousY = -1;
    let previousPercent = Number(thumb.getAttribute("aria-valuenow"));

    const place = () => {
      const { max, travel } = m.current;
      const fraction = max > 0 ? Math.min(Math.max(window.scrollY, 0), max) / max : 0;
      const y = travel * fraction;
      if (y !== previousY) {
        thumb.style.transform = `translate3d(0, ${y}px, 0)`;
        previousY = y;
      }
      const pct = Math.round(fraction * 100);
      if (pct !== previousPercent) {
        thumb.setAttribute("aria-valuenow", String(pct));
        previousPercent = pct;
      }
    };

    const measure = () => {
      const vh = doc.clientHeight;
      const sh = doc.scrollHeight;
      const max = sh - vh;
      const hidden = max <= 1 ? "true" : "false";
      if (track.dataset.hidden !== hidden) track.dataset.hidden = hidden;
      const th = track.clientHeight;
      const thumbH = Math.min(th, Math.max(MIN_THUMB, (th * vh) / Math.max(sh, 1)));
      if (thumbH !== m.current.thumb || !thumb.style.height) thumb.style.height = `${thumbH}px`;
      m.current = { max: Math.max(0, max), travel: Math.max(0, th - thumbH), thumb: thumbH };
      place();
    };

    measure();
    window.addEventListener("scroll", place, { passive: true });
    window.addEventListener("resize", measure);
    const ro = new ResizeObserver(measure);
    ro.observe(doc);
    ro.observe(document.body);

    // cursor desenhado: ativo sobre a barra (hover) e durante o arraste
    const enter = (e: globalThis.PointerEvent) => {
      if (e.pointerType !== "mouse" && e.pointerType !== "pen") return;
      over.current = true;
      moveSoft(e.clientX, e.clientY);
    };
    const leave = (e: globalThis.PointerEvent) => {
      over.current = false;
      moveSoft(e.clientX, e.clientY);
    };
    const follow = (e: globalThis.PointerEvent) => {
      if (over.current || drag.current) moveSoft(e.clientX, e.clientY);
    };
    const outOfWindow = () => {
      over.current = false;
      if (softRef.current) softRef.current.dataset.on = "false";
    };
    // Alt+Tab no meio do arraste: o pointerup pode nunca chegar
    const onBlur = () => {
      outOfWindow();
      if (!drag.current) return;
      drag.current = null;
      delete track.dataset.dragging;
      delete doc.dataset.lkDrag;
    };
    track.addEventListener("pointerenter", enter);
    track.addEventListener("pointerleave", leave);
    window.addEventListener("pointermove", follow, { capture: true, passive: true });
    doc.addEventListener("mouseleave", outOfWindow);
    window.addEventListener("blur", onBlur);

    return () => {
      doc.classList.remove("has-custom-scrollbar");
      delete doc.dataset.lkDrag;
      window.removeEventListener("scroll", place);
      window.removeEventListener("resize", measure);
      ro.disconnect();
      track.removeEventListener("pointerenter", enter);
      track.removeEventListener("pointerleave", leave);
      window.removeEventListener("pointermove", follow, { capture: true });
      doc.removeEventListener("mouseleave", outOfWindow);
      window.removeEventListener("blur", onBlur);
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
    // durante o arraste o cursor da marca vale para a página inteira e nada é selecionado
    document.documentElement.dataset.lkDrag = "true";
  };
  const onThumbMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    const { max, travel } = m.current;
    if (!d) return;
    // botão já solto sem pointerup (evento perdido): encerra em vez de "grudar"
    if (e.pointerType === "mouse" && (e.buttons & 1) === 0) return endDrag(e);
    if (travel <= 0) return;
    window.scrollTo({ top: d.scroll + ((e.clientY - d.y) * max) / travel, behavior: "instant" });
  };
  const endDrag = (e: PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return;
    drag.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    delete trackRef.current!.dataset.dragging;
    delete document.documentElement.dataset.lkDrag;
    // soltou fora da barra: devolve o cursor CSS normal; dentro: segue desenhado
    const r = trackRef.current!.getBoundingClientRect();
    over.current =
      e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
    moveSoft(e.clientX, e.clientY);
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
    <>
    <div ref={softRef} className="lk-soft-cursor" data-on="false" aria-hidden="true">
      {/* eslint-disable-next-line @next/next/no-img-element -- cursor: SVG fixo de 28px, sem otimização */}
      <img ref={softImgRef} src={CURSOR_SRC} alt="" width={28} height={28} draggable={false} />
    </div>
    <div
      ref={trackRef}
      className="lk-scrollbar"
      data-hidden="true"
      onMouseDown={(e) => e.preventDefault()}
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
        onMouseDown={(e) => e.preventDefault()}
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
    </>
  );
}
