"use client";

import { useEffect, useRef, useState } from "react";
import { mountWebGLCanvas, releaseWebGLCanvas } from "@/components/graphics/webglCanvas";

/**
 * Corrente digital global da Home.
 *
 * - Um único contexto WebGL numa superfície do tamanho da viewport (fixed).
 *   A geometria vive em coordenadas globais da Home e é deslocada pelo scroll;
 *   não existe framebuffer com a altura inteira da página.
 * - Espinha: spline Catmull-Rom centrípeta (contínua em posição e tangente,
 *   sem cúspides nem laços), reamostrada por comprimento de arco — vértices
 *   igualmente espaçados também nas curvas.
 * - Fitas, linhas e pontos são deslocados ao longo da normal. O deslocamento
 *   é limitado pela curvatura local (d·κ < 0,7), o que impede a fita de se
 *   dobrar sobre si mesma; o limite é monotônico, então as linhas paralelas
 *   nunca trocam de ordem nem se cruzam.
 * - Cor e alpha são por vértice (sem trechos de valor constante), com blending
 *   aditivo e sem depth test: não há emendas nem ordenação de transparência.
 *
 * Desempenho:
 * - Um único loop rAF; nenhuma renderização React por quadro.
 * - Espinha, atributos, vértices e índices vivem em typed arrays reaproveitados;
 *   buffers da GPU só crescem (bufferSubData).
 * - Ondulações (serpentina/largura) são calculadas uma vez por amostra e
 *   compartilhadas por todas as linhas da camada, não por vértice.
 * - Tempo acumulado por deltaTime limitado: velocidade independente do FPS e
 *   sem saltos ao voltar de aba oculta, rolagem fora da Home ou travadas.
 * - Partículas interpoladas entre amostras (movimento contínuo, sem degraus).
 * - Qualidade adaptativa: se o quadro ficar lento de forma sustentada, reduz
 *   a resolução interna (e depois a densidade da malha) — só para baixo,
 *   nunca oscila.
 */

const TAU = Math.PI * 2;
const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

type P = [number, number];

/** x: fração da largura · y: índice da seção + posição dentro dela (0–1) */
const PATH_DESKTOP: P[] = [
  [1.15, -0.06],
  [0.84, 0.22],
  [0.66, 0.58],
  [0.78, 0.95],
  [0.9, 1.15],
  [0.76, 1.36],
  [0.42, 1.52],
  [0.1, 1.72],
  [0.05, 1.98],
  [0.06, 2.5],
  [0.28, 2.9],
  [0.7, 3.08],
  [0.93, 3.36],
  [0.86, 3.72],
  [0.5, 3.93],
  [0.14, 4.12],
  [0.05, 4.48],
  [0.2, 4.82],
  [0.56, 4.98],
  [0.9, 5.14],
  [0.97, 5.42],
  [0.8, 5.66],
  [0.4, 5.76],
  [-0.2, 5.72],
];

const PATH_MOBILE: P[] = [
  [1.25, 0.45],
  [0.82, 0.62],
  [0.25, 0.85],
  [0.12, 1.08],
  [0.75, 1.3],
  [0.88, 1.6],
  [0.25, 1.88],
  [0.1, 2.15],
  [0.78, 2.45],
  [0.9, 2.8],
  [0.25, 3.1],
  [0.1, 3.45],
  [0.8, 3.75],
  [0.9, 4.1],
  [0.2, 4.45],
  [0.12, 4.8],
  [0.82, 5.1],
  [0.9, 5.5],
  [0.3, 5.74],
  [-0.25, 5.8],
];

/** Hero, Soluções, Projeto, Como trabalhamos, Filosofia, CTA */
const INTENSITY = [1, 0.7, 0.4, 0.65, 0.35, 0.85];

const BLUE = [0.267, 0.408, 0.949];
const CYAN = [0.0, 0.851, 0.757];
const ICE = [0.62, 0.7, 1.0];

/** órbitas sutis do Hero (constantes — não são recriadas por quadro) */
const ORBITS = [
  { r: 1, a0: Math.PI * 1.02, a1: Math.PI * 1.9, dots: false, nodes: 2, spd: 0.035 },
  { r: 1.14, a0: Math.PI * 0.5, a1: Math.PI * 1.15, dots: true, nodes: 1, spd: 0.025 },
  { r: 0.86, a0: Math.PI * 0.05, a1: Math.PI * 0.7, dots: false, nodes: 1, spd: 0.04 },
];

/** fases da serpentina e da largura de cada camada (seno/cosseno pré-calculados) */
const LAG = [0, 1.3, 2.5].map((l) => [Math.cos(l), Math.sin(l)]);
const PH = [0, 0.5, 2.1].map((p) => [Math.cos(p), Math.sin(p)]);

/** níveis de qualidade: teto de DPR e densidade da malha */
const DPR_CAP = { desktop: [1.5, 1.25, 1], mobile: [1.25, 1, 1] };

const VS = `
attribute vec2 a_pos;
attribute vec4 a_col;
attribute vec3 a_ext;
uniform vec2 u_res;
uniform float u_dpr;
varying vec4 v_col;
varying vec2 v_ext;
void main() {
  vec2 c = a_pos / u_res * 2.0 - 1.0;
  gl_Position = vec4(c.x, -c.y, 0.0, 1.0);
  gl_PointSize = a_ext.z * u_dpr;
  v_col = a_col;
  v_ext = a_ext.xy;
}`;

const FS = `
precision mediump float;
uniform float u_points;
varying vec4 v_col;
varying vec2 v_ext;
void main() {
  float a = v_col.a;
  if (u_points > 0.5) {
    float d = length(gl_PointCoord - 0.5) * 2.0;
    a *= pow(max(1.0 - d, 0.0), v_ext.y);
  } else {
    float x = abs(v_ext.x);
    if (v_ext.y <= 0.0) a *= smoothstep(1.0, 0.7, x);
    else a *= pow(max(1.0 - x, 0.0), v_ext.y);
  }
  gl_FragColor = vec4(v_col.rgb * a, a);
}`;

const FLOATS = 9; // x, y, r, g, b, a, across, profile, size

/** typed array que só cresce (reaproveitado entre quadros) */
function grow<T extends Float32Array | Float64Array | Uint32Array | Uint16Array>(
  a: T,
  n: number,
  make: (n: number) => T,
): T {
  if (a.length >= n) return a;
  const b = make(Math.ceil(n * 1.5));
  b.set(a);
  return b;
}
const f32 = (n: number) => new Float32Array(n);
const f64 = (n: number) => new Float64Array(n);
const u32 = (n: number) => new Uint32Array(n);
const u16 = (n: number) => new Uint16Array(n);
const distance = (dx: number, dy: number) => Math.sqrt(dx * dx + dy * dy);

export default function CurrentField() {
  const ref = useRef<HTMLDivElement>(null);
  const timeline = useRef<{ time: number; particleClock: number | null } | null>(null);
  const [contextVersion, setContextVersion] = useState(0);

  useEffect(() => {
    const host = ref.current;
    const wrap = host?.parentElement;
    if (!host || !wrap) return;
    const canvas = mountWebGLCanvas(host, "pointer-events-none fixed inset-0 h-full w-full");

    const opts: WebGLContextAttributes = {
      alpha: true,
      antialias: true,
      premultipliedAlpha: true,
      depth: false,
      stencil: false,
      powerPreference: "low-power",
    };
    const gl2 = canvas.getContext("webgl2", opts);
    const gl: WebGLRenderingContext | WebGL2RenderingContext | null =
      gl2 ?? canvas.getContext("webgl", opts);
    if (!gl) {
      releaseWebGLCanvas(canvas, gl);
      return;
    }
    const uintIndex = !!gl2 || !!gl.getExtension("OES_element_index_uint");

    // ---------- programa ----------
    const compile = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return s;
    };
    const prog = gl.createProgram()!;
    const vertexShader = compile(gl.VERTEX_SHADER, VS);
    const fragmentShader = compile(gl.FRAGMENT_SHADER, FS);
    gl.attachShader(prog, vertexShader);
    gl.attachShader(prog, fragmentShader);
    gl.linkProgram(prog);
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      gl.deleteProgram(prog);
      releaseWebGLCanvas(canvas, gl);
      return;
    }
    gl.useProgram(prog);
    const aPos = gl.getAttribLocation(prog, "a_pos");
    const aCol = gl.getAttribLocation(prog, "a_col");
    const aExt = gl.getAttribLocation(prog, "a_ext");
    const uRes = gl.getUniformLocation(prog, "u_res");
    const uDpr = gl.getUniformLocation(prog, "u_dpr");
    const uPoints = gl.getUniformLocation(prog, "u_points");
    const vbo = gl.createBuffer();
    const ibo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
    const stride = FLOATS * 4;
    gl.enableVertexAttribArray(aPos);
    gl.enableVertexAttribArray(aCol);
    gl.enableVertexAttribArray(aExt);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, stride, 0);
    gl.vertexAttribPointer(aCol, 4, gl.FLOAT, false, stride, 8);
    gl.vertexAttribPointer(aExt, 3, gl.FLOAT, false, stride, 24);
    gl.disable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE); // aditivo; o shader já entrega cor pré-multiplicada
    gl.clearColor(0, 0, 0, 0);
    let vboBytes = 0; // capacidade alocada na GPU (só cresce)
    let iboBytes = 0;

    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let reduced = motion.matches;
    const fine = window.matchMedia("(pointer: fine)").matches;

    // ---------- layout ----------
    let vw = 0;
    let vh = 0;
    let dpr = 1;
    let mobile = false;
    let unit = 1;
    let wrapTop = 0; // topo da Home no documento
    let W = 0;
    let H = 0; // altura da Home
    let secTop: number[] = [];
    let secH: number[] = [];
    let secMid: number[] = [];
    let texts: { x: number; y: number; w: number; h: number }[] = [];
    let ds = 6;
    let quality = 0; // 0 = máxima; sobe (piora) apenas sob lentidão sustentada

    const measure = () => {
      vw = canvas.clientWidth;
      vh = canvas.clientHeight;
      mobile = vw < 1024;
      const caps = mobile ? DPR_CAP.mobile : DPR_CAP.desktop;
      dpr = Math.min(window.devicePixelRatio || 1, caps[quality]);
      const cw = Math.max(1, Math.round(vw * dpr));
      const ch = Math.max(1, Math.round(vh * dpr));
      if (canvas.width !== cw) canvas.width = cw;
      if (canvas.height !== ch) canvas.height = ch;
      gl.viewport(0, 0, cw, ch);
      gl.uniform2f(uRes, vw, vh);
      gl.uniform1f(uDpr, dpr);
      unit = mobile ? 0.62 : Math.max(0.75, Math.min(1.15, vw / 1440));
      ds = mobile ? 9 : 6;

      const wr = wrap.getBoundingClientRect();
      wrapTop = wr.top + window.scrollY;
      W = wr.width;
      H = wr.height;
      const secs = Array.from(wrap.querySelectorAll<HTMLElement>(":scope > section"));
      secTop = secs.map((s) => s.getBoundingClientRect().top - wr.top);
      secH = secs.map((s) => s.offsetHeight);
      secMid = secTop.map((t, i) => t + secH[i] / 2);
      texts = Array.from(
        wrap.querySelectorAll<HTMLElement>("h1, h2, h3, p, [data-wave-avoid]"),
      ).map((el) => {
        const b = el.getBoundingClientRect();
        return { x: b.left - wr.left, y: b.top - wr.top, w: b.width, h: b.height };
      });
      particleCount = -1;
    };

    const mapY = (y: number) => {
      const n = secTop.length;
      if (!n) return 0;
      const i = Math.max(0, Math.min(n - 1, Math.floor(y)));
      return secTop[i] + (y - i) * secH[i];
    };

    const intensityAt = (y: number) => {
      const n = Math.min(secMid.length, INTENSITY.length);
      if (!n) return 1;
      if (y <= secMid[0]) return INTENSITY[0];
      for (let i = 0; i < n - 1; i++) {
        if (y < secMid[i + 1]) {
          const f = smooth(secMid[i], secMid[i + 1], y);
          return INTENSITY[i] + (INTENSITY[i + 1] - INTENSITY[i]) * f;
        }
      }
      return INTENSITY[n - 1];
    };

    // ---------- espinha ----------
    let SX = f32(0);
    let SY = f32(0);
    let NX = f32(0);
    let NY = f32(0);
    let KA = f32(0); // curvatura suavizada (com sinal)
    let KT = f64(0); // curvatura bruta → soma prefixada
    let CX = f64(0);
    let CY = f64(0);
    let RAW = f64(0);
    let lengths = f64(0);
    let count = 0;
    let total = 0;
    let particleCount = -1;
    let particleClock = timeline.current?.particleClock ?? null;

    const buildSpine = (t: number) => {
      const path = mobile ? PATH_MOBILE : PATH_DESKTOP;
      const n = path.length;
      CX = grow(CX, n + 2, f64);
      CY = grow(CY, n + 2, f64);
      for (let i = 0; i < n; i++) {
        // deformação lenta e própria de cada ponto (não é um deslize global)
        CX[i + 1] = path[i][0] * W + Math.sin(t * 0.07 + i * 1.9) * 0.022 * W;
        CY[i + 1] = mapY(path[i][1]) + Math.cos(t * 0.055 + i * 2.7) * 22 * unit;
      }
      // extremidades refletidas para a spline começar e terminar suave
      CX[0] = 2 * CX[1] - CX[2];
      CY[0] = 2 * CY[1] - CY[2];
      CX[n + 1] = 2 * CX[n] - CX[n - 1];
      CY[n + 1] = 2 * CY[n] - CY[n - 1];
      const m = n + 2;

      let r = 0;
      for (let j = 1; j < m - 2; j++) {
        const x0 = CX[j - 1], y0 = CY[j - 1];
        const x1 = CX[j], y1 = CY[j];
        const x2 = CX[j + 1], y2 = CY[j + 1];
        const x3 = CX[j + 2], y3 = CY[j + 2];
        const dx = x2 - x1;
        const dy = y2 - y1;
        const chord = distance(dx, dy);
        const d01 = Math.max(1e-3, Math.sqrt(distance(x1 - x0, y1 - y0)));
        const d12 = Math.max(1e-3, Math.sqrt(chord));
        const d23 = Math.max(1e-3, Math.sqrt(distance(x3 - x2, y3 - y2)));
        // A mesma Catmull-Rom centrípeta em forma cúbica. Calcula as
        // tangentes uma vez por trecho e avalia as amostras por Horner.
        const startX = dx + d12 * ((x1 - x0) / d01 - (x2 - x0) / (d01 + d12));
        const startY = dy + d12 * ((y1 - y0) / d01 - (y2 - y0) / (d01 + d12));
        const endX = dx + d12 * ((x3 - x2) / d23 - (x3 - x1) / (d12 + d23));
        const endY = dy + d12 * ((y3 - y2) / d23 - (y3 - y1) / (d12 + d23));
        const bx = 3 * dx - 2 * startX - endX;
        const by = 3 * dy - 2 * startY - endY;
        const ax = startX + endX - 2 * dx;
        const ay = startY + endY - 2 * dy;
        const steps = Math.max(4, Math.ceil(chord / 3));
        RAW = grow(RAW, r + steps * 2 + 4, f64);
        for (let k = 0; k < steps; k++) {
          const u = k / steps;
          RAW[r++] = ((ax * u + bx) * u + startX) * u + x1;
          RAW[r++] = ((ay * u + by) * u + startY) * u + y1;
        }
      }
      RAW = grow(RAW, r + 2, f64);
      RAW[r++] = CX[m - 2];
      RAW[r++] = CY[m - 2];

      // reamostragem por comprimento de arco (espaçamento uniforme = ds)
      const segs = r / 2 - 1;
      lengths = grow(lengths, segs, f64);
      let len = 0;
      for (let i = 0; i < segs; i++) {
        const j = i * 2;
        const segment = distance(RAW[j + 2] - RAW[j], RAW[j + 3] - RAW[j + 1]);
        lengths[i] = segment;
        len += segment;
      }
      total = len;
      count = Math.max(2, Math.floor(len / ds) + 1);
      SX = grow(SX, count, f32);
      SY = grow(SY, count, f32);
      NX = grow(NX, count, f32);
      NY = grow(NY, count, f32);
      KA = grow(KA, count, f32);
      KT = grow(KT, count + 1, f64);
      let seg = 0;
      let segStart = 0;
      let segLen = lengths[0];
      for (let i = 0; i < count; i++) {
        const target = i * ds;
        while (segStart + segLen < target && seg < segs - 1) {
          segStart += segLen;
          seg++;
          segLen = lengths[seg];
        }
        const f = segLen > 0 ? Math.min(1, (target - segStart) / segLen) : 0;
        SX[i] = RAW[seg * 2] + (RAW[seg * 2 + 2] - RAW[seg * 2]) * f;
        SY[i] = RAW[seg * 2 + 1] + (RAW[seg * 2 + 3] - RAW[seg * 2 + 1]) * f;
      }

      // normais e curvatura com sinal (κ > 0 = curva para o lado da normal)
      for (let i = 0; i < count; i++) {
        const a = Math.max(0, i - 1);
        const b = Math.min(count - 1, i + 1);
        const tx = SX[b] - SX[a];
        const ty = SY[b] - SY[a];
        const l = distance(tx, ty) || 1;
        NX[i] = -ty / l;
        NY[i] = tx / l;
      }
      // KT[i + 1] = soma prefixada da curvatura bruta → média móvel em O(n)
      KT[0] = 0;
      for (let i = 0; i < count; i++) {
        let k = 0;
        if (i > 0 && i < count - 1) {
          const ax = SX[i] - SX[i - 1], ay = SY[i] - SY[i - 1];
          const bx = SX[i + 1] - SX[i], by = SY[i + 1] - SY[i];
          k = Math.atan2(ax * by - ay * bx, ax * bx + ay * by) / ds;
        }
        KT[i + 1] = KT[i] + k;
      }
      const R = 12;
      for (let i = 0; i < count; i++) {
        const lo = Math.max(0, i - R);
        const hi = Math.min(count - 1, i + R);
        KA[i] = (KT[hi + 1] - KT[lo]) / (hi - lo + 1);
      }
    };

    /** limita o deslocamento pela curvatura: nunca alcança o centro da curva */
    const clampO = (o: number, k: number) => {
      const x = o * k;
      if (x <= 1e-4) return o;
      const lim = 0.7;
      return (lim * Math.tanh(x / lim)) / k;
    };

    // ---------- buffers reaproveitados ----------
    let vbuf = f32(FLOATS * 12000);
    let vcount = 0;
    let tri = u32(30000); // índices de triângulos
    let ti = 0;
    let lin = u32(12000); // índices de linhas
    let li = 0;
    let pbuf = f32(FLOATS * 2400); // pontos (vão para o fim do buffer de vértices)
    let pn = 0;
    const maxV = uintIndex ? Infinity : 65000;
    let indices16 = u16(0);

    const pushV = (
      x: number, y: number, r: number, g: number, b: number, a: number,
      across: number, profile: number, size: number,
    ) => {
      if (vcount >= maxV) return -1;
      vbuf = grow(vbuf, (vcount + 1) * FLOATS, f32);
      const o = vcount * FLOATS;
      vbuf[o] = x;
      vbuf[o + 1] = y;
      vbuf[o + 2] = r;
      vbuf[o + 3] = g;
      vbuf[o + 4] = b;
      vbuf[o + 5] = a;
      vbuf[o + 6] = across;
      vbuf[o + 7] = profile;
      vbuf[o + 8] = size;
      return vcount++;
    };
    const pt = (x: number, y: number, r: number, g: number, b: number, a: number, prof: number, size: number) => {
      if (a <= 0.004) return;
      pbuf = grow(pbuf, (pn + 1) * FLOATS, f32);
      const o = pn * FLOATS;
      pbuf[o] = x;
      pbuf[o + 1] = y;
      pbuf[o + 2] = r;
      pbuf[o + 3] = g;
      pbuf[o + 4] = b;
      pbuf[o + 5] = a;
      pbuf[o + 6] = 0;
      pbuf[o + 7] = prof;
      pbuf[o + 8] = size;
      pn++;
    };

    // ---------- atributos por amostra (apenas a janela visível) ----------
    let A = f32(0);
    let CR = f32(0);
    let CG = f32(0);
    let CB = f32(0);
    // ondulações por amostra, compartilhadas por todas as linhas da camada
    let SN0 = f32(0); // serpentina da fita principal / halo
    let SN1 = f32(0); // serpentina da malha de linhas
    let SN2 = f32(0); // serpentina da malha de pontos
    let SW0 = f32(0); // largura da fita principal
    let SW1 = f32(0); // largura da malha de linhas
    let SW2 = f32(0); // largura da malha de pontos
    const ensureAttr = (n: number) => {
      if (A.length >= n) return;
      const m = Math.ceil(n * 1.5);
      A = f32(m); CR = f32(m); CG = f32(m); CB = f32(m);
      SN0 = f32(m); SN1 = f32(m); SN2 = f32(m);
      SW0 = f32(m); SW1 = f32(m); SW2 = f32(m);
    };

    // atenuação suave perto de textos: distância ao retângulo com falloff
    // largo — a forma do retângulo nunca aparece como borda
    const near: typeof texts = [];
    const textDim = (x: number, y: number, fall: number) => {
      let f = 1;
      for (let k = 0; k < near.length; k++) {
        const r = near[k];
        const dx = Math.max(r.x - x, 0, x - (r.x + r.w));
        if (dx > fall) continue;
        const dy = Math.max(r.y - y, 0, y - (r.y + r.h));
        if (dy > fall) continue;
        const d = distance(dx, dy);
        if (d < fall) f = Math.min(f, 0.22 + 0.78 * smooth(0, fall, d));
      }
      return f;
    };

    const particles = (() => {
      let s = 11;
      const rnd = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
      return Array.from({ length: 48 }, () => ({
        a0: rnd(),
        off: (rnd() - 0.5) * 2,
        sp: 18 + rnd() * 26,
        size: 7 + rnd() * 9,
        ph: rnd() * TAU,
        bio: rnd() > 0.5,
      }));
    })();

    const mouse = { x: 0, y: 0, tx: 0, ty: 0 };

    // saídas temporárias (evita alocar arrays por vértice)
    let qx = 0;
    let qy = 0;
    let lr = 0;
    let lg = 0;
    let lb = 0;
    let scroll = 0;
    let px = 0;
    let py = 0;
    let i0 = -1;
    let i1 = -1;
    let n = 0;

    const pos = (i: number, o: number, depth: number) => {
      const oo = clampO(o, KA[i]);
      qx = SX[i] + NX[i] * oo + px * depth;
      qy = SY[i] + NY[i] * oo - scroll + py * depth;
    };
    const lift = (j: number, l: number) => {
      lr = CR[j] + (ICE[0] - CR[j]) * l;
      lg = CG[j] + (ICE[1] - CG[j]) * l;
      lb = CB[j] + (ICE[2] - CB[j]) * l;
    };

    /**
     * Faixa (triângulos) entre dois deslocamentos, cor/alpha por vértice.
     * Borda = c[j] + w[j]·k + h (w nulo → só c + h).
     */
    const strip = (
      c: Float32Array, w: Float32Array | null,
      kL: number, hL: number, kR: number, hR: number,
      alpha: number, profile: number, l: number, depth: number,
    ) => {
      tri = grow(tri, ti + n * 6, u32);
      let prevL = -1;
      let prevR = -1;
      for (let j = 0; j < n; j++) {
        const i = i0 + j;
        const a = A[j] * alpha;
        lift(j, l);
        const wj = w ? w[j] : 0;
        pos(i, c[j] + wj * kL + hL, depth);
        const L = pushV(qx, qy, lr, lg, lb, a, -1, profile, 0);
        pos(i, c[j] + wj * kR + hR, depth);
        const R = pushV(qx, qy, lr, lg, lb, a, 1, profile, 0);
        if (L < 0 || R < 0) return;
        if (prevL >= 0) {
          tri[ti++] = prevL; tri[ti++] = prevR; tri[ti++] = L;
          tri[ti++] = prevR; tri[ti++] = R; tri[ti++] = L;
        }
        prevL = L;
        prevR = R;
      }
    };

    // partícula: posição interpolada entre as amostras i e i+1 (sem degraus)
    const posLerp = (i: number, f: number, o: number, depth: number) => {
      const sx = SX[i] + (SX[i + 1] - SX[i]) * f;
      const sy = SY[i] + (SY[i + 1] - SY[i]) * f;
      let nx = NX[i] + (NX[i + 1] - NX[i]) * f;
      let ny = NY[i] + (NY[i + 1] - NY[i]) * f;
      const nl = Math.hypot(nx, ny) || 1;
      nx /= nl;
      ny /= nl;
      const oo = clampO(o, KA[i] + (KA[i + 1] - KA[i]) * f);
      qx = sx + nx * oo + px * depth;
      qy = sy + ny * oo - scroll + py * depth;
    };

    // ---------- quadro ----------
    const frame = (t: number, dt: number) => {
      if (!vw || !vh || !secTop.length) return;
      buildSpine(t);
      if (total > 0) particleClock = particleClock === null ? t / total : particleClock + dt / total;
      if (particleCount < 0) {
        particleCount = Math.min(particles.length, Math.floor(total / (mobile ? 320 : 230)));
      }

      scroll = window.scrollY - wrapTop; // topo da viewport em coords da Home
      const y0 = scroll - 380;
      const y1 = scroll + vh + 380;
      i0 = -1;
      i1 = -1;
      for (let i = 0; i < count; i++) {
        if (SY[i] >= y0 && SY[i] <= y1) {
          if (i0 < 0) i0 = i;
          i1 = i;
        }
      }

      vcount = 0;
      ti = 0;
      li = 0;
      pn = 0;
      px = mouse.x * 10;
      py = mouse.y * 7;

      if (i0 >= 0 && i1 > i0) {
        n = i1 - i0 + 1;
        ensureAttr(n);
        near.length = 0;
        for (const r of texts) if (r.y + r.h > y0 - 150 && r.y < y1 + 150) near.push(r);
        const fade = 320 * unit;
        const fall = 120 * unit;
        const amp = 22 * unit;
        for (let j = 0; j < n; j++) {
          const i = i0 + j;
          const arc = i * ds;
          const env = smooth(0, fade, arc) * smooth(total, total - fade, arc);
          // energia luminosa viajando ao longo da corrente
          const energy =
            0.7 + 0.5 * Math.pow(0.5 + 0.5 * Math.sin((arc / 900) * TAU - t * 0.42), 4);
          const edge = smooth(H, H - 300 * unit, SY[i]);
          A[j] = intensityAt(SY[i]) * textDim(SX[i], SY[i], fall) * env * edge * energy;
          const mm = Math.pow(0.5 + 0.5 * Math.sin((arc / 1600) * TAU - t * 0.08 + 0.8), 1.5);
          CR[j] = BLUE[0] + (CYAN[0] - BLUE[0]) * mm;
          CG[j] = BLUE[1] + (CYAN[1] - BLUE[1]) * mm;
          CB[j] = BLUE[2] + (CYAN[2] - BLUE[2]) * mm;

          // onda serpentina que percorre a corrente (contínua, sem loop visível):
          // sin(a + lag) = sin a·cos lag + cos a·sin lag → um seno por amostra
          const a = (arc / 700) * TAU - t * 0.31;
          const sa = Math.sin(a);
          const ca = Math.cos(a);
          const mod = amp * (0.7 + 0.3 * Math.sin((arc / 2170) * TAU + t * 0.05));
          SN0[j] = mod * (sa * LAG[0][0] + ca * LAG[0][1]);
          SN1[j] = mod * (sa * LAG[1][0] + ca * LAG[1][1]);
          SN2[j] = mod * (sa * LAG[2][0] + ca * LAG[2][1]);
          // largura sempre positiva: varia suavemente, mas nunca torce/inverte
          const b = (arc / 1100) * TAU - t * 0.18;
          const sb = Math.sin(b);
          const cb = Math.cos(b);
          SW0[j] = 64 * unit * (0.55 + 0.45 * (sb * PH[0][0] + cb * PH[0][1]));
          SW1[j] = 36 * unit * (0.55 + 0.45 * (sb * PH[1][0] + cb * PH[1][1]));
          SW2[j] = 44 * unit * (0.55 + 0.45 * (sb * PH[2][0] + cb * PH[2][1]));
        }

        // 1) halo difuso — glow variável da corrente
        const hw = 150 * unit;
        strip(SN0, null, 0, -hw, 0, hw, 0.065, 2.2, 0, 0.4);

        // 2) malha de linhas paralelas (camada secundária)
        const meshLines = quality >= 2 ? (mobile ? 8 : 16) : mobile ? 12 : 24;
        const base1 = 64 * unit;
        for (let k = 0; k < meshLines; k++) {
          const kk = -1 + (2 * k) / (meshLines - 1);
          const alpha = 0.36 * (0.45 + 0.55 * Math.abs(kk));
          lin = grow(lin, li + n * 2, u32);
          let prev = -1;
          for (let j = 0; j < n; j++) {
            pos(i0 + j, base1 + SN1[j] + SW1[j] * kk, 0.6);
            lift(j, 0.3);
            const v = pushV(qx, qy, lr, lg, lb, A[j] * alpha, 0, 1, 0);
            if (v < 0) break;
            if (prev >= 0) {
              lin[li++] = prev;
              lin[li++] = v;
            }
            prev = v;
          }
        }

        // 3) malha de pontos (camada secundária) — a alternância segue o
        // índice GLOBAL da amostra, então o padrão não salta durante o scroll
        const rows = mobile ? 8 : 12;
        const base2 = -66 * unit;
        for (let k = 0; k < rows; k++) {
          const kk = -1 + (2 * k) / (rows - 1);
          for (let j = (i0 + k) % 2; j < n; j += 2) {
            pos(i0 + j, base2 + SN2[j] + SW2[j] * kk, 0.8);
            lift(j, 0.2);
            pt(qx, qy, lr, lg, lb, A[j] * 0.6, 0.7, 1.8);
          }
        }

        // 4) fita principal de seda
        strip(SN0, SW0, -1, 0, 1, 0, 0.13, 0, 0, 1);
        if (!mobile) {
          const h = 9 * unit;
          for (const k of [-0.55, 0, 0.55]) strip(SN0, SW0, k, -h, k, h, 0.055, 1.5, 0, 1);
        }
        for (const k of [-1, 1]) {
          strip(SN0, SW0, k, -5, k, 5, 0.13, 2, 0.25, 1);
          strip(SN0, SW0, k, -1.1, k, 1.1, 0.85, 1, 0.25, 1);
        }

        // 5) partículas viajando ao longo da própria curva. A fase é uma fração
        // do comprimento (estável quando a curva respira) e a posição é
        // interpolada entre amostras — deslocamento contínuo, sem degraus.
        for (let q = 0; q < particleCount; q++) {
          const p = particles[q];
          const u = (p.a0 + p.sp * (particleClock ?? 0)) % 1;
          const fi = (u * total) / ds;
          const i = Math.floor(fi);
          if (i < i0 || i + 1 > i1) continue;
          const f = fi - i;
          const j = i - i0;
          posLerp(i, f, p.off * 110 * unit + Math.sin(t * 0.5 + p.ph) * 10, 1.4);
          const tw = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * 0.7 + p.ph * 2));
          const a = tw * (A[j] + (A[j + 1] - A[j]) * f);
          const c = p.bio ? CYAN : BLUE;
          pt(qx, qy, c[0], c[1], c[2], a * 0.9, 2.4, p.size);
          pt(qx, qy, 0.9, 0.95, 1, a * 0.8, 1, p.size * 0.28);
        }
      }

      // 6) órbitas sutis no Hero
      {
        const oy = secTop[0] + secH[0] * (mobile ? 0.8 : 0.42);
        const rx = mobile ? vw * 0.55 : Math.min(W * 0.22, 340);
        if (oy + rx > y0 && oy - rx < y1) {
          const ox = W * (mobile ? 0.7 : 0.73);
          const ry = rx * 0.92;
          const rot = -0.35;
          const cr = Math.cos(rot);
          const sr = Math.sin(rot);
          const at = (r: number, a: number) => {
            qx = ox + rx * r * Math.cos(a) * cr - ry * r * Math.sin(a) * sr - mouse.x * 6;
            qy = oy + rx * r * Math.cos(a) * sr + ry * r * Math.sin(a) * cr - scroll - mouse.y * 4;
          };
          for (const o of ORBITS) {
            const span = o.a1 - o.a0;
            const steps = Math.ceil((span * rx * o.r) / 6);
            if (o.dots) {
              for (let s = 0; s <= steps; s += 2) {
                const f = s / steps;
                at(o.r, o.a0 + span * f);
                pt(qx, qy, CYAN[0], CYAN[1], CYAN[2], 0.4 * Math.sin(f * Math.PI), 0.8, 1.8);
              }
            } else {
              tri = grow(tri, ti + (steps + 1) * 6, u32);
              let prevL = -1;
              let prevR = -1;
              for (let s = 0; s <= steps; s++) {
                const f = s / steps;
                const a = o.a0 + span * f;
                at(o.r, a + 0.002);
                const x2 = qx;
                const y2 = qy;
                at(o.r, a);
                const l = Math.hypot(x2 - qx, y2 - qy) || 1;
                const nx = -(y2 - qy) / l;
                const ny = (x2 - qx) / l;
                const al = 0.45 * Math.sin(f * Math.PI);
                const L = pushV(qx - nx * 1.1, qy - ny * 1.1, CYAN[0], CYAN[1], CYAN[2], al, -1, 1, 0);
                const R = pushV(qx + nx * 1.1, qy + ny * 1.1, CYAN[0], CYAN[1], CYAN[2], al, 1, 1, 0);
                if (L < 0 || R < 0) break;
                if (prevL >= 0) {
                  tri[ti++] = prevL; tri[ti++] = prevR; tri[ti++] = L;
                  tri[ti++] = prevR; tri[ti++] = R; tri[ti++] = L;
                }
                prevL = L;
                prevR = R;
              }
            }
            for (let k = 0; k < o.nodes; k++) {
              const f = (((t * o.spd + k / o.nodes) % 1) + 1) % 1;
              at(o.r, o.a0 + span * f);
              const c = k % 2 ? BLUE : CYAN;
              const a = Math.sin(f * Math.PI);
              pt(qx, qy, c[0], c[1], c[2], 0.85 * a, 2.4, 16);
              pt(qx, qy, 0.9, 0.95, 1, 0.8 * a, 1, 4);
            }
          }
        }
      }

      // pontos por último, num bloco contíguo do buffer
      const pStart = vcount;
      const pCount = Math.max(0, Math.min(pn, maxV - vcount));
      if (pCount) {
        vbuf = grow(vbuf, (vcount + pCount) * FLOATS, f32);
        vbuf.set(pbuf.subarray(0, pCount * FLOATS), vcount * FLOATS);
        vcount += pCount;
      }

      // ---------- desenho ----------
      gl.clear(gl.COLOR_BUFFER_BIT);
      if (!vcount) return;

      // buffers da GPU só crescem; o conteúdo é atualizado no lugar
      const vBytes = vcount * FLOATS * 4;
      if (vBytes > vboBytes) {
        vboBytes = Math.ceil(vBytes * 1.5);
        gl.bufferData(gl.ARRAY_BUFFER, vboBytes, gl.DYNAMIC_DRAW);
      }
      if (gl2) gl2.bufferSubData(gl.ARRAY_BUFFER, 0, vbuf, 0, vcount * FLOATS);
      else gl.bufferSubData(gl.ARRAY_BUFFER, 0, vbuf.subarray(0, vcount * FLOATS));

      const totalIdx = ti + li;
      if (totalIdx) {
        tri = grow(tri, totalIdx, u32);
        tri.set(lin.subarray(0, li), ti); // linhas logo após os triângulos
        const bytes = uintIndex ? 4 : 2;
        if (totalIdx * bytes > iboBytes) {
          iboBytes = Math.ceil(totalIdx * bytes * 1.5);
          gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, iboBytes, gl.DYNAMIC_DRAW);
        }
        if (gl2) {
          gl2.bufferSubData(gl.ELEMENT_ARRAY_BUFFER, 0, tri, 0, totalIdx);
        } else {
          const source = tri.subarray(0, totalIdx);
          if (uintIndex) gl.bufferSubData(gl.ELEMENT_ARRAY_BUFFER, 0, source);
          else {
            indices16 = grow(indices16, totalIdx, u16);
            indices16.set(source);
            gl.bufferSubData(gl.ELEMENT_ARRAY_BUFFER, 0, indices16.subarray(0, totalIdx));
          }
        }
        const type = uintIndex ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT;
        gl.uniform1f(uPoints, 0);
        if (ti) gl.drawElements(gl.TRIANGLES, ti, type, 0);
        if (li) gl.drawElements(gl.LINES, li, type, ti * bytes);
      }
      if (pCount) {
        gl.uniform1f(uPoints, 1);
        gl.drawArrays(gl.POINTS, pStart, pCount);
      }
    };

    // ---------- ciclo de vida ----------
    let t = timeline.current?.time ?? (reduced ? 14 : 0);
    let visible = false;
    let lost = false;
    let needsMeasure = true;

    // qualidade adaptativa: janelas de 2 s; só piora (nunca oscila) e ignora
    // quadros de navegador estrangulado (> 100 ms) e telas de alta frequência
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
      needsMeasure = true;
    };

    let raf = 0;
    let last = 0;
    const syncFrame = () => {
      if (!visible || document.hidden || lost) {
        cancelAnimationFrame(raf);
        raf = 0;
        last = 0;
        winFrames = winSlow = winTime = 0;
      } else if (!raf) {
        raf = requestAnimationFrame(loop);
      }
    };
    const loop = (now: number) => {
      raf = 0;
      if (!visible || document.hidden || lost) return;
      if (needsMeasure) {
        measure();
        needsMeasure = false;
      }
      if (reduced) {
        frame(t, 0);
        return;
      }
      const dtMs = last ? now - last : 0;
      last = now;
      // deltaTime limitado: travadas longas não viram saltos na animação
      const dt = Math.min(dtMs, 100) / 1000;
      adapt(dtMs);
      const k = 1 - Math.pow(0.96, dt * 60); // suavização do mouse independente do FPS
      mouse.x += (mouse.tx - mouse.x) * k;
      mouse.y += (mouse.ty - mouse.y) * k;
      t += dt;
      frame(t, dt);
      syncFrame();
    };

    const ro = new ResizeObserver(() => {
      needsMeasure = true;
      syncFrame();
    });
    ro.observe(wrap);
    ro.observe(canvas);
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (!visible && !lost) gl.clear(gl.COLOR_BUFFER_BIT);
      syncFrame();
    });
    io.observe(wrap);

    const onMove = (e: PointerEvent) => {
      mouse.tx = (e.clientX / window.innerWidth - 0.5) * 2;
      mouse.ty = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    const syncMotion = () => {
      last = 0;
      reduced = motion.matches;
      if (reduced) {
        window.addEventListener("scroll", syncFrame, { passive: true });
        window.removeEventListener("pointermove", onMove);
      } else {
        window.removeEventListener("scroll", syncFrame);
        if (fine) window.addEventListener("pointermove", onMove, { passive: true });
      }
      syncFrame();
    };
    const onLost = (event: Event) => {
      event.preventDefault();
      lost = true;
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
      timeline.current = { time: t, particleClock };
      ro.disconnect();
      io.disconnect();
      window.removeEventListener("scroll", syncFrame);
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("visibilitychange", syncFrame);
      motion.removeEventListener("change", syncMotion);
      canvas.removeEventListener("webglcontextlost", onLost);
      canvas.removeEventListener("webglcontextrestored", onRestored);
      gl.deleteBuffer(vbo);
      gl.deleteBuffer(ibo);
      gl.deleteProgram(prog);
      releaseWebGLCanvas(canvas, gl);
    };
  }, [contextVersion]);

  return <div ref={ref} aria-hidden="true" className="contents" />;
}
