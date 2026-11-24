"use client";

import { useEffect, useRef, useState } from "react";
import { mountWebGLCanvas, releaseWebGLCanvas } from "@/components/graphics/webglCanvas";

/**
 * Superfície líquida digital da página de Serviços.
 *
 * - Um único triângulo de tela cheia + fragment shader procedural: nenhuma
 *   textura, nenhuma geometria por quadro, um draw call.
 * - Altura do "líquido" = fbm com domain warping em duas camadas (Q → R → h),
 *   animado no tempo. A normal vem de diferenças finitas da última camada e
 *   alimenta dois reflexos especulares + fresnel com iridescência entre o azul
 *   Linckia e o verde bioluminescente.
 * - O cursor deixa um rastro de até 6 pontos (posição, velocidade, idade). Cada
 *   ponto arrasta e gira o domínio localmente com intensidade que decai no
 *   tempo, então a superfície volta sozinha ao movimento natural.
 * - Canvas fixo do tamanho da viewport, renderizado em resolução interna
 *   reduzida (a imagem é suave por natureza); qualidade adaptativa só desce.
 * - Tempo por deltaTime limitado; pausa em aba oculta; com Activity (rota
 *   oculta) o efeito é desmontado e os recursos da GPU são liberados.
 * - Sem WebGL (ou contexto perdido), fica visível o fallback em CSS.
 */

const TRAIL = 6;

const VS = `
attribute vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }`;

const FS = (precision: string) => `
precision ${precision} float;
uniform vec2 uRes;
uniform float uTime;
uniform float uScroll;
uniform float uDetail;
uniform int uTrailCount;
uniform vec4 uP[${TRAIL}];
uniform vec2 uV[${TRAIL}];

float hash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
vec4 lattice(vec2 cell) {
  return vec4(hash(cell), hash(cell + vec2(1.0, 0.0)),
              hash(cell + vec2(0.0, 1.0)), hash(cell + vec2(1.0, 1.0)));
}
float interpolateNoise(vec4 corners, vec2 f) {
  vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  return mix(mix(corners.x, corners.y, u.x), mix(corners.z, corners.w, u.x), u.y);
}
float noise(vec2 p) {
  return interpolateNoise(lattice(floor(p)), fract(p));
}
const mat2 M = mat2(1.6, 1.2, -1.2, 1.6);
float fbm(vec2 p) {
  float s = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    if (i == 3 && uDetail < 0.5) break;
    s += a * noise(p);
    p = M * p;
    a *= 0.5;
  }
  return s;
}

// As mesmas diferenças finitas de 0.02. Amostras na mesma célula
// reaproveitam os quatro hashes, inclusive nas oitavas do ruído.
vec3 surfaceSamples(vec2 p) {
  vec2 px = p + vec2(0.02, 0.0);
  vec2 py = p + vec2(0.0, 0.02);
  vec3 samples = vec3(0.0);
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    if (i == 3 && uDetail < 0.5) break;
    vec2 cell = floor(p);
    vec2 cx = floor(px);
    vec2 cy = floor(py);
    vec4 corners = lattice(cell);
    vec4 cornersX = all(equal(cell, cx)) ? corners : lattice(cx);
    vec4 cornersY = all(equal(cell, cy)) ? corners : lattice(cy);
    samples += a * vec3(interpolateNoise(corners, fract(p)),
                        interpolateNoise(cornersX, fract(px)),
                        interpolateNoise(cornersY, fract(py)));
    p = M * p;
    px = M * px;
    py = M * py;
    a *= 0.5;
  }
  return samples;
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
  vec2 p = uv * 0.95;
  p.y -= uScroll;

  // perturbações do cursor: arrasto na direção do movimento + leve redemoinho
  for (int i = 0; i < ${TRAIL}; i++) {
    if (i >= uTrailCount) break;
    vec4 P = uP[i];
    vec2 d = uv - P.xy;
    float g = P.z * exp(-dot(d, d) / (P.w * P.w));
    p -= uV[i] * g * 0.16;
    p += vec2(-d.y, d.x) * g * 1.4;
  }

  float t = uTime * 0.05;
  vec2 q = vec2(fbm(p + vec2(0.0, t)), fbm(p + vec2(5.2, 1.3) - t * 0.8));
  vec2 r = vec2(
    fbm(p + 3.0 * q + vec2(1.7, 9.2) + t * 0.6),
    fbm(p + 3.0 * q + vec2(8.3, 2.8) - t * 0.5)
  );
  vec3 surface = surfaceSamples(p + 2.2 * r);
  float h = surface.x;
  vec3 n = normalize(vec3((vec2(h) - surface.yz) / 0.02 * 1.1, 1.0));

  // reflexos: brilho largo + núcleo quente, luz principal e contraluz
  vec3 V = vec3(0.0, 0.0, 1.0);
  vec3 R1 = reflect(-normalize(vec3(-0.5, 0.6, 0.62)), n);
  vec3 R2 = reflect(-normalize(vec3(0.65, -0.3, 0.7)), n);
  float d1 = max(dot(R1, V), 0.0);
  float d2 = max(dot(R2, V), 0.0);
  float broad = pow(d1, 14.0) + 0.7 * pow(d2, 18.0);
  float glow = pow(d1, 4.0) + 0.6 * pow(d2, 5.0);
  float core = pow(d1, 70.0) + 0.7 * pow(d2, 90.0);
  float fres = pow(1.0 - clamp(n.z, 0.0, 1.0), 2.2);

  // regiões iluminadas x sombra profunda; centro mais calmo para a leitura
  float region = 0.12 + 0.88 * smoothstep(0.3, 0.7, fbm(p * 0.9 + vec2(t * 0.6, -t * 0.35) + 7.0));
  float vig = smoothstep(0.1, 0.85, length(uv * vec2(0.8, 1.25)));
  float lit = region * mix(0.28, 1.0, vig);

  // iridescência: azul elétrico, azul Linckia e verde bioluminescente
  // cor só espacial (acompanha o líquido): sem deriva global da paleta no tempo
  float hue = h * 3.0 + r.x * 2.0 - q.y + n.x * 1.5;
  vec3 elec = vec3(0.1, 0.32, 1.0);
  vec3 blue = vec3(0.267, 0.408, 0.949);
  vec3 bio = vec3(0.0, 0.92, 0.8);
  vec3 irid = mix(elec, blue, 0.5 + 0.5 * sin(hue));
  // regiões bioluminescentes: campo espacial lento (acento, não domina)
  float cz = smoothstep(0.56, 0.7, fbm(p * 1.3 + vec2(-t * 0.3, t * 0.5) + 3.0) + 0.1 * sin(hue));
  irid = mix(irid, bio, 0.9 * cz);

  vec3 col = vec3(0.006, 0.01, 0.032) + vec3(0.012, 0.022, 0.06) * h * h;
  col += irid * 0.03 * lit * smoothstep(0.45, 0.9, h);
  col += irid * (glow * 0.32 + broad * 3.0 + fres * 1.0) * lit;
  col += mix(irid, vec3(0.8, 0.95, 1.0), 0.55) * core * 3.2 * lit;
  col = 1.0 - exp(-col * 1.5);
  // dithering não periódico (evita banding sem criar padrão de grade)
  col += (fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233)) + fract(uTime) * 7.0) * 43758.5453) - 0.5) / 255.0;
  gl_FragColor = vec4(col, 1.0);
}`;

/** escala da resolução interna por nível de qualidade (só desce) */
const SCALE = { desktop: [0.5, 0.4, 0.32], mobile: [0.45, 0.36, 0.28] };
const MAX_PIXELS = 650_000;

export default function LiquidField() {
  const ref = useRef<HTMLDivElement>(null);
  const time = useRef<number | null>(null);
  const [contextVersion, setContextVersion] = useState(0);

  useEffect(() => {
    const host = ref.current;
    if (!host) return;
    const canvas = mountWebGLCanvas(host, "lk-liquid absolute inset-0 h-full w-full");
    const gl = canvas.getContext("webgl", {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      premultipliedAlpha: false,
      preserveDrawingBuffer: false,
    });
    if (!gl) {
      releaseWebGLCanvas(canvas, gl);
      return; // fallback CSS permanece visível
    }

    const hp = gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT);
    const precision = hp && hp.precision > 0 ? "highp" : "mediump";
    const parallel = gl.getExtension("KHR_parallel_shader_compile");
    const shader = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return s;
    };
    const vs = shader(gl.VERTEX_SHADER, VS);
    const fs = shader(gl.FRAGMENT_SHADER, FS(precision));
    const prog = gl.createProgram()!;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    const configure = () => {
      gl.useProgram(prog);
      const buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      const aPos = gl.getAttribLocation(prog, "a_pos");
      gl.enableVertexAttribArray(aPos);
      gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
      return {
        buffer,
        resolution: gl.getUniformLocation(prog, "uRes"),
        time: gl.getUniformLocation(prog, "uTime"),
        scroll: gl.getUniformLocation(prog, "uScroll"),
        detail: gl.getUniformLocation(prog, "uDetail"),
        trailCount: gl.getUniformLocation(prog, "uTrailCount"),
        positions: gl.getUniformLocation(prog, "uP"),
        velocities: gl.getUniformLocation(prog, "uV"),
      };
    };
    let bindings: ReturnType<typeof configure> | null = null;

    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let reduced = motion.matches;

    // ---------- tamanho / qualidade ----------
    let quality = 0;
    let cssW = 0;
    let cssH = 0;
    const resize = () => {
      if (!bindings) return;
      cssW = canvas.clientWidth;
      cssH = canvas.clientHeight;
      const mobile = cssW < 768;
      const scale = (mobile ? SCALE.mobile : SCALE.desktop)[quality];
      let k = Math.min(window.devicePixelRatio || 1, 2) * scale;
      const px = cssW * cssH * k * k;
      if (px > MAX_PIXELS) k *= Math.sqrt(MAX_PIXELS / px);
      const w = Math.max(1, Math.round(cssW * k));
      const h = Math.max(1, Math.round(cssH * k));
      if (canvas.width !== w) canvas.width = w;
      if (canvas.height !== h) canvas.height = h;
      gl.viewport(0, 0, w, h);
      gl.uniform2f(bindings.resolution, w, h);
      gl.uniform1f(bindings.detail, quality >= 2 ? 0 : 1);
    };

    // ---------- rastro do cursor (posições em unidades do shader) ----------
    const trail = Array.from({ length: TRAIL }, () => ({ x: 0, y: 0, vx: 0, vy: 0, born: -99, amp: 0 }));
    let head = 0;
    const last = { x: 0, y: 0, t: 0, has: false };
    const P = new Float32Array(TRAIL * 4);
    const Vel = new Float32Array(TRAIL * 2);
    let t = time.current ?? (reduced ? 22 : 0);
    const savePointer = (x: number, y: number) => {
      last.x = x;
      last.y = y;
      last.t = t;
      last.has = true;
    };

    const onPointer = (e: PointerEvent) => {
      if (!cssH || lost || document.hidden) return;
      const x = (e.clientX - 0.5 * cssW) / cssH;
      const y = (cssH - e.clientY - 0.5 * cssH) / cssH;
      const now = t;
      if (!last.has) {
        savePointer(x, y);
        return;
      }
      const dt = Math.max(now - last.t, 1 / 120);
      const dx = x - last.x;
      const dy = y - last.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 0.02 && now - last.t < 0.06) return;
      let vx = dx / dt;
      let vy = dy / dt;
      const sp = Math.hypot(vx, vy);
      if (sp > 1.6) {
        vx *= 1.6 / sp;
        vy *= 1.6 / sp;
      }
      const p = trail[head];
      p.x = x;
      p.y = y;
      p.vx = vx;
      p.vy = vy;
      p.born = now;
      p.amp = Math.min(1, 0.25 + sp * 0.6);
      head = (head + 1) % TRAIL;
      savePointer(x, y);
    };
    const onLeave = () => {
      last.has = false;
    };

    // ---------- desenho ----------
    let scrollU = 0;
    let previousTrailCount = 0;
    const draw = () => {
      if (!bindings) return;
      let count = 0;
      if (!reduced) {
        for (const p of trail) {
          const age = t - p.born;
          if (age <= 0 || age > 4) continue;
          // sobe rápido, relaxa devagar e se espalha enquanto relaxa
          const s = p.amp * Math.min(1, age / 0.12) * Math.exp(-age * 1.15);
          P[count * 4] = p.x;
          P[count * 4 + 1] = p.y;
          P[count * 4 + 2] = s * 0.15;
          P[count * 4 + 3] = 0.1 + age * 0.05;
          Vel[count * 2] = p.vx;
          Vel[count * 2 + 1] = p.vy;
          count++;
        }
      }
      if (count !== previousTrailCount) {
        gl.uniform1i(bindings.trailCount, count);
        previousTrailCount = count;
      }
      if (count) {
        gl.uniform4fv(bindings.positions, P);
        gl.uniform2fv(bindings.velocities, Vel);
      }
      gl.uniform1f(bindings.time, t);
      gl.uniform1f(bindings.scroll, scrollU);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    let shown = false;
    const reveal = () => {
      if (shown) return;
      shown = true;
      canvas.dataset.ready = "true";
    };

    // qualidade adaptativa (mesma política da Home): janelas de 2 s, só desce
    let winFrames = 0;
    let winSlow = 0;
    let winTime = 0;
    const adapt = (dtMs: number) => {
      if (quality >= 2 || dtMs > 100) return;
      winFrames++;
      winTime += dtMs;
      if (dtMs > 24) winSlow++;
      if (winTime < 2000) return;
      const slow = winFrames > 20 && winSlow / winFrames > 0.4;
      winFrames = winSlow = winTime = 0;
      if (!slow) return;
      quality++;
      resize();
    };

    let raf = 0;
    let prev = 0;
    let lost = false;
    let needsResize = true;
    const syncFrame = () => {
      if (lost || document.hidden) {
        cancelAnimationFrame(raf);
        raf = 0;
        prev = 0;
        winFrames = winSlow = winTime = 0;
        last.has = false;
      } else if (!raf) {
        raf = requestAnimationFrame(loop);
      }
    };
    const loop = (now: number) => {
      raf = 0;
      if (lost || document.hidden) return;
      if (!bindings) {
        // A consulta de conclusão é não bloqueante. O fallback permanece
        // visível até o primeiro quadro válido da superfície.
        if (parallel && !gl.getProgramParameter(prog, parallel.COMPLETION_STATUS_KHR)) {
          syncFrame();
          return;
        }
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
          lost = true;
          gl.deleteProgram(prog);
          releaseWebGLCanvas(canvas, gl);
          return;
        }
        bindings = configure();
      }
      if (needsResize) {
        resize();
        needsResize = false;
      }
      if (!reduced) {
        const dtMs = prev ? now - prev : 0;
        prev = now;
        adapt(dtMs);
        t += Math.min(dtMs, 100) / 1000;
        // leve paralaxe: a superfície acompanha 40% da rolagem
        scrollU = (window.scrollY / Math.max(cssH, 1)) * 1.35 * 0.4;
      }
      draw();
      reveal();
      if (!reduced) syncFrame();
    };

    const ro = new ResizeObserver(() => {
      needsResize = true;
      syncFrame();
    });
    ro.observe(canvas);

    const syncMotion = () => {
      prev = 0;
      reduced = motion.matches;
      if (reduced) {
        window.removeEventListener("pointermove", onPointer);
        window.removeEventListener("pointerdown", onPointer);
        document.documentElement.removeEventListener("pointerleave", onLeave);
        last.has = false;
        for (const p of trail) p.born = -99;
      } else {
        window.addEventListener("pointermove", onPointer, { passive: true });
        window.addEventListener("pointerdown", onPointer, { passive: true });
        document.documentElement.addEventListener("pointerleave", onLeave);
      }
      syncFrame();
    };
    const onLost = (e: Event) => {
      e.preventDefault();
      lost = true;
      delete canvas.dataset.ready; // volta ao fallback CSS
      syncFrame();
    };
    const onRestored = () => setContextVersion((version) => version + 1);
    canvas.addEventListener("webglcontextlost", onLost);
    canvas.addEventListener("webglcontextrestored", onRestored);
    document.addEventListener("visibilitychange", syncFrame);
    motion.addEventListener("change", syncMotion);
    syncMotion();

    return () => {
      cancelAnimationFrame(raf);
      time.current = t;
      ro.disconnect();
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("pointerdown", onPointer);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      document.removeEventListener("visibilitychange", syncFrame);
      motion.removeEventListener("change", syncMotion);
      canvas.removeEventListener("webglcontextlost", onLost);
      canvas.removeEventListener("webglcontextrestored", onRestored);
      gl.deleteBuffer(bindings?.buffer ?? null);
      gl.deleteProgram(prog);
      releaseWebGLCanvas(canvas, gl);
    };
  }, [contextVersion]);

  return (
    <div ref={ref} aria-hidden="true" className="pointer-events-none fixed inset-0 z-0">
      <div className="lk-liquid-fallback absolute inset-0" />
    </div>
  );
}
