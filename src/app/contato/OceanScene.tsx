"use client";

import { useEffect, useRef } from "react";
import styles from "./contact.module.css";

const particles = Array.from({ length: 78 }, (_, index) => ({
  x: ((index * 53.71 + 9) % 100).toFixed(2),
  y: ((index * 27.61 + 7) % 100).toFixed(2),
  opacity: (0.13 + ((index * 13) % 11) * 0.037).toFixed(2),
}));

export default function OceanScene() {
  const ref = useRef<HTMLDivElement>(null);
  const waterRef = useRef<HTMLDivElement>(null);
  const marineRef = useRef<HTMLDivElement>(null);
  const terrainRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scene = ref.current;
    const section = scene?.parentElement;
    if (!scene || !section) return;

    const pointer = window.matchMedia("(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)");
    const layers = [
      [waterRef.current, -0.28, -0.28],
      [marineRef.current, 0.18, 0.18],
      [terrainRef.current, 0.58, 0.55],
    ] as const;
    let visible = true;
    let tracking = false;
    let frame = 0;
    let x = 0;
    let y = 0;

    function updateAnimation() {
      if (!scene) return;
      const paused = document.hidden || !visible;
      const value = String(paused);
      if (scene.dataset.paused !== value) scene.dataset.paused = value;

      const shouldTrack = !paused && pointer.matches;
      if (shouldTrack === tracking) return;
      tracking = shouldTrack;
      if (tracking) {
        section?.addEventListener("pointermove", point, { passive: true });
        section?.addEventListener("pointerleave", resetParallax);
      } else {
        section?.removeEventListener("pointermove", point);
        section?.removeEventListener("pointerleave", resetParallax);
        cancelAnimationFrame(frame);
        frame = 0;
        if (!pointer.matches) resetParallax();
      }
    }

    function paintParallax() {
      frame = 0;
      for (const [layer, depthX, depthY] of layers) {
        if (layer) layer.style.translate = `${x * depthX}px ${y * depthY}px`;
      }
    }

    function point(event: PointerEvent) {
      if (event.pointerType !== "mouse") return;
      x = (event.clientX / window.innerWidth - 0.5) * 17;
      y = (event.clientY / window.innerHeight - 0.5) * 10;
      if (!frame) frame = requestAnimationFrame(paintParallax);
    }

    function resetParallax() {
      x = y = 0;
      if (frame) cancelAnimationFrame(frame);
      paintParallax();
    }

    // Wait for hydration before starting the ambient timeline.
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      updateAnimation();
    });
    observer.observe(section);
    updateAnimation();
    document.addEventListener("visibilitychange", updateAnimation);
    pointer.addEventListener("change", updateAnimation);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", updateAnimation);
      section.removeEventListener("pointermove", point);
      section.removeEventListener("pointerleave", resetParallax);
      pointer.removeEventListener("change", updateAnimation);
      cancelAnimationFrame(frame);
      scene.dataset.paused = "true";
      for (const [layer] of layers) layer?.style.removeProperty("translate");
    };
  }, []);

  return (
    <div ref={ref} className={styles.scene} aria-hidden="true" data-paused="true">
      <div ref={waterRef} className={styles.water} />
      <div className={styles.rays} />
      {[0, 1, 2].map((depth) => (
        <div key={depth} className={styles.particles} data-depth={depth}>
          {particles.slice(depth * 26, (depth + 1) * 26).map(({ x, y, opacity }) => (
            <i key={x} style={{ left: `${x}%`, top: `${y}%`, opacity }} />
          ))}
        </div>
      ))}
      <div ref={marineRef} className={styles.marine}>
        <div className={styles.manta}><i /></div>
        <div className={styles.shark}><i /></div>
        <div className={styles.school}><i /></div>
        <div className={styles.fish}><i /></div>
      </div>
      <div ref={terrainRef} className={styles.terrain}>
        <div className={styles.rocksLeft} />
        <div className={styles.rocksRight} />
        <div className={styles.coralLeft} />
        <div className={styles.coralRight} />
      </div>
      <div className={styles.shade} />
    </div>
  );
}
