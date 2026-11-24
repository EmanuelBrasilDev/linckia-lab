"use client";

import { useEffect, useRef } from "react";

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
uniform vec4 uP[${TRAIL}];
uniform vec2 uV[${TRAIL}];

float hash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
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

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
  vec2 p = uv * 0.95;
  p.y -= uScroll;

  // perturbações do cursor: arrasto na direção do movimento + leve redemoinho
  for (int i = 0; i < ${TRAIL}; i++) {
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
  vec2 w = p + 2.2 * r;
  float h = fbm(w);
  float e = 0.02;
  float hx = fbm(w + vec2(e, 0.0));
  float hy = fbm(w + vec2(0.0, e));
  vec3 n = normalize(vec3((h - hx) / e * 1.1, (h - hy) / e * 1.1, 1.0));

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
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl", {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      premultipliedAlpha: false,
      preserveDrawingBuffer: false,
    });
    if (!gl) return; // fallback CSS permanece visível

    const hp = gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT);
    const precision = hp && hp.precision > 0 ? "highp" : "mediump";
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
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      gl.deleteProgram(prog);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      return;
    }
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(prog, "a_pos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
    const uRes = gl.getUniformLocation(prog, "uRes");
    const uTime = gl.getUniformLocation(prog, "uTime");
    const uScroll = gl.getUniformLocation(prog, "uScroll");
    const uDetail = gl.getUniformLocation(prog, "uDetail");
    const uP = gl.getUniformLocation(prog, "uP");
    const uV = gl.getUniformLocation(prog, "uV");

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // ---------- tamanho / qualidade ----------
    let quality = 0;
    let cssW = 0;
    let cssH = 0;
    const resize = () => {
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
    };

    // ---------- rastro do cursor (posições em unidades do shader) ----------
    const trail = Array.from({ length: TRAIL }, () => ({ x: 0, y: 0, vx: 0, vy: 0, born: -99, amp: 0 }));
    let head = 0;
    let last = { x: 0, y: 0, t: 0, has: false };
    const P = new Float32Array(TRAIL * 4);
    const Vel = new Float32Array(TRAIL * 2);
    let t = reduce ? 22 : 0;

    const onPointer = (e: PointerEvent) => {
      if (reduce || !cssH) return;
      const x = (e.clientX - 0.5 * cssW) / cssH;
      const y = (cssH - e.clientY - 0.5 * cssH) / cssH;
      const now = t;
      if (!last.has) {
        last = { x, y, t: now, has: true };
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
      last = { x, y, t: now, has: true };
    };
    const onLeave = () => {
      last.has = false;
    };

    // ---------- desenho ----------
    let scrollU = 0;
    const draw = () => {
      for (let i = 0; i < TRAIL; i++) {
        const p = trail[i];
        const age = t - p.born;
        // sobe rápido, relaxa devagar e se espalha enquanto relaxa
        const s = age < 0 || age > 4 ? 0 : p.amp * Math.min(1, age / 0.12) * Math.exp(-age * 1.15);
        P[i * 4] = p.x;
        P[i * 4 + 1] = p.y;
        P[i * 4 + 2] = s * 0.15;
        P[i * 4 + 3] = 0.1 + age * 0.05;
        Vel[i * 2] = p.vx;
        Vel[i * 2 + 1] = p.vy;
      }
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, t);
      gl.uniform1f(uScroll, scrollU);
      gl.uniform1f(uDetail, quality >= 2 ? 0 : 1);
      gl.uniform4fv(uP, P);
      gl.uniform2fv(uV, Vel);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    let shown = false;
    const reveal = () => {
      if (shown) return;
      shown = true;
      canvas.dataset.ready = "true";
    };

    resize();
    const ro = new ResizeObserver(() => {
      resize();
      if (reduce) draw();
    });
    ro.observe(canvas);

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
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (lost || document.hidden) {
        prev = 0;
        return;
      }
      const dtMs = prev ? now - prev : 0;
      prev = now;
      adapt(dtMs);
      t += Math.min(dtMs, 100) / 1000;
      // leve paralaxe: a superfície acompanha 40% da rolagem
      scrollU = (window.scrollY / Math.max(cssH, 1)) * 1.35 * 0.4;
      draw();
      reveal();
    };

    const onLost = (e: Event) => {
      e.preventDefault();
      lost = true;
      delete canvas.dataset.ready; // volta ao fallback CSS
    };
    canvas.addEventListener("webglcontextlost", onLost);

    if (reduce) {
      draw();
      reveal();
    } else {
      window.addEventListener("pointermove", onPointer, { passive: true });
      window.addEventListener("pointerdown", onPointer, { passive: true });
      document.documentElement.addEventListener("pointerleave", onLeave);
      raf = requestAnimationFrame(loop);
    }

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("pointerdown", onPointer);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      canvas.removeEventListener("webglcontextlost", onLost);
      // libera os recursos da GPU (rota oculta pelo Activity ou desmontada)
      gl.deleteBuffer(buf);
      gl.deleteProgram(prog);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      canvas.width = 1;
      canvas.height = 1;
      delete canvas.dataset.ready;
    };
  }, []);

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0">
      <div className="lk-liquid-fallback absolute inset-0" />
      <canvas ref={ref} className="lk-liquid absolute inset-0 h-full w-full" />
    </div>
  );
}
