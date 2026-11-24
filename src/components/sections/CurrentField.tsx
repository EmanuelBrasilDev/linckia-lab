"use client";

import { useEffect, useRef } from "react";

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

export default function CurrentField() {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    const wrap = canvas?.parentElement;
    if (!canvas || !wrap) return;

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
    if (!gl) return;
    const uintIndex = !!gl2 || !!gl.getExtension("OES_element_index_uint");

    // ---------- programa ----------
    const compile = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return s;
    };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, VS));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
    gl.useProgram(prog);
    const aPos = gl.getAttribLocation(prog, "a_pos");
    const aCol = gl.getAttribLocation(prog, "a_col");
    const aExt = gl.getAttribLocation(prog, "a_ext");
    const uRes = gl.getUniformLocation(prog, "u_res");
    const uDpr = gl.getUniformLocation(prog, "u_dpr");
    const uPoints = gl.getUniformLocation(prog, "u_points");
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
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

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
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

    const measure = () => {
      vw = canvas.clientWidth;
      vh = canvas.clientHeight;
      mobile = vw < 1024;
      dpr = Math.min(window.devicePixelRatio || 1, mobile ? 1.25 : 1.5);
      canvas.width = Math.max(1, Math.round(vw * dpr));
      canvas.height = Math.max(1, Math.round(vh * dpr));
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
    let cap = 0;
    let SX = new Float32Array(0);
    let SY = new Float32Array(0);
    let NX = new Float32Array(0);
    let NY = new Float32Array(0);
    let KA = new Float32Array(0); // curvatura suavizada (com sinal)
    let KT = new Float32Array(0);
    let count = 0;
    let total = 0;
    const raw: number[] = [];

    const ensure = (n: number) => {
      if (n <= cap) return;
      cap = Math.ceil(n * 1.3);
      SX = new Float32Array(cap);
      SY = new Float32Array(cap);
      NX = new Float32Array(cap);
      NY = new Float32Array(cap);
      KA = new Float32Array(cap);
      KT = new Float32Array(cap);
    };

    const buildSpine = (t: number) => {
      const path = mobile ? PATH_MOBILE : PATH_DESKTOP;
      const n = path.length;
      const cx: number[] = [];
      const cy: number[] = [];
      for (let i = 0; i < n; i++) {
        // deformação lenta e própria de cada ponto (não é um deslize global)
        cx.push(path[i][0] * W + Math.sin(t * 0.07 + i * 1.9) * 0.022 * W);
        cy.push(mapY(path[i][1]) + Math.cos(t * 0.055 + i * 2.7) * 22 * unit);
      }
      // extremidades refletidas para a spline começar e terminar suave
      cx.unshift(2 * cx[0] - cx[1]);
      cy.unshift(2 * cy[0] - cy[1]);
      cx.push(2 * cx[n] - cx[n - 1]);
      cy.push(2 * cy[n] - cy[n - 1]);

      raw.length = 0;
      for (let j = 1; j < cx.length - 2; j++) {
        const x0 = cx[j - 1], y0 = cy[j - 1];
        const x1 = cx[j], y1 = cy[j];
        const x2 = cx[j + 1], y2 = cy[j + 1];
        const x3 = cx[j + 2], y3 = cy[j + 2];
        const t0 = 0;
        const t1 = t0 + Math.max(1e-3, Math.sqrt(Math.hypot(x1 - x0, y1 - y0)));
        const t2 = t1 + Math.max(1e-3, Math.sqrt(Math.hypot(x2 - x1, y2 - y1)));
        const t3 = t2 + Math.max(1e-3, Math.sqrt(Math.hypot(x3 - x2, y3 - y2)));
        const m = Math.max(4, Math.ceil(Math.hypot(x2 - x1, y2 - y1) / 3));
        for (let k = 0; k < m; k++) {
          const tt = t1 + ((t2 - t1) * k) / m;
          const a1x = ((t1 - tt) * x0 + (tt - t0) * x1) / (t1 - t0);
          const a1y = ((t1 - tt) * y0 + (tt - t0) * y1) / (t1 - t0);
          const a2x = ((t2 - tt) * x1 + (tt - t1) * x2) / (t2 - t1);
          const a2y = ((t2 - tt) * y1 + (tt - t1) * y2) / (t2 - t1);
          const a3x = ((t3 - tt) * x2 + (tt - t2) * x3) / (t3 - t2);
          const a3y = ((t3 - tt) * y2 + (tt - t2) * y3) / (t3 - t2);
          const b1x = ((t2 - tt) * a1x + (tt - t0) * a2x) / (t2 - t0);
          const b1y = ((t2 - tt) * a1y + (tt - t0) * a2y) / (t2 - t0);
          const b2x = ((t3 - tt) * a2x + (tt - t1) * a3x) / (t3 - t1);
          const b2y = ((t3 - tt) * a2y + (tt - t1) * a3y) / (t3 - t1);
          raw.push(
            ((t2 - tt) * b1x + (tt - t1) * b2x) / (t2 - t1),
            ((t2 - tt) * b1y + (tt - t1) * b2y) / (t2 - t1),
          );
        }
      }
      raw.push(cx[cx.length - 2], cy[cy.length - 2]);

      // reamostragem por comprimento de arco (espaçamento uniforme = ds)
      let len = 0;
      for (let i = 2; i < raw.length; i += 2) {
        len += Math.hypot(raw[i] - raw[i - 2], raw[i + 1] - raw[i - 1]);
      }
      total = len;
      count = Math.max(2, Math.floor(len / ds) + 1);
      ensure(count);
      const segs = raw.length / 2 - 1;
      let seg = 0;
      let segStart = 0;
      let segLen = Math.hypot(raw[2] - raw[0], raw[3] - raw[1]);
      for (let i = 0; i < count; i++) {
        const target = i * ds;
        while (segStart + segLen < target && seg < segs - 1) {
          segStart += segLen;
          seg++;
          segLen = Math.hypot(raw[seg * 2 + 2] - raw[seg * 2], raw[seg * 2 + 3] - raw[seg * 2 + 1]);
        }
        const f = segLen > 0 ? Math.min(1, (target - segStart) / segLen) : 0;
        SX[i] = raw[seg * 2] + (raw[seg * 2 + 2] - raw[seg * 2]) * f;
        SY[i] = raw[seg * 2 + 1] + (raw[seg * 2 + 3] - raw[seg * 2 + 1]) * f;
      }

      // normais e curvatura com sinal (κ > 0 = curva para o lado da normal)
      for (let i = 0; i < count; i++) {
        const a = Math.max(0, i - 1);
        const b = Math.min(count - 1, i + 1);
        const tx = SX[b] - SX[a];
        const ty = SY[b] - SY[a];
        const l = Math.hypot(tx, ty) || 1;
        NX[i] = -ty / l;
        NY[i] = tx / l;
      }
      for (let i = 0; i < count; i++) {
        const a = Math.max(0, i - 1);
        const b = Math.min(count - 1, i + 1);
        const ta = Math.atan2(SY[i] - SY[a], SX[i] - SX[a]);
        const tb = Math.atan2(SY[b] - SY[i], SX[b] - SX[i]);
        let d = tb - ta;
        if (d > Math.PI) d -= TAU;
        if (d < -Math.PI) d += TAU;
        KT[i] = i === a || i === b ? 0 : d / ds;
      }
      const R = 12;
      for (let i = 0; i < count; i++) {
        let s = 0;
        let c = 0;
        for (let j = Math.max(0, i - R); j <= Math.min(count - 1, i + R); j++) {
          s += KT[j];
          c++;
        }
        KA[i] = s / c;
      }
    };

    /** limita o deslocamento pela curvatura: nunca alcança o centro da curva */
    const clampO = (o: number, k: number) => {
      const x = o * k;
      if (x <= 1e-4) return o;
      const lim = 0.7;
      return (lim * Math.tanh(x / lim)) / k;
    };

    // ---------- buffers ----------
    let vbuf = new Float32Array(FLOATS * 40000);
    let vcount = 0;
    let tri: number[] = [];
    let lin: number[] = [];
    let maxV = uintIndex ? Infinity : 65000;

    const pushV = (
      x: number, y: number, r: number, g: number, b: number, a: number,
      across: number, profile: number, size: number,
    ) => {
      if (vcount >= maxV) return -1;
      if ((vcount + 1) * FLOATS > vbuf.length) {
        const nb = new Float32Array(vbuf.length * 2);
        nb.set(vbuf);
        vbuf = nb;
      }
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

    // ---------- atributos por amostra (apenas a janela visível) ----------
    let A = new Float32Array(0);
    let CR = new Float32Array(0);
    let CG = new Float32Array(0);
    let CB = new Float32Array(0);
    let ARC = new Float32Array(0);
    const ensureAttr = (n: number) => {
      if (A.length >= n) return;
      const m = Math.ceil(n * 1.3);
      A = new Float32Array(m);
      CR = new Float32Array(m);
      CG = new Float32Array(m);
      CB = new Float32Array(m);
      ARC = new Float32Array(m);
    };

    // atenuação suave perto de textos: distância ao retângulo com falloff
    // largo — a forma do retângulo nunca aparece como borda
    const textDim = (x: number, y: number, list: typeof texts) => {
      let f = 1;
      const fall = 120 * unit;
      for (const r of list) {
        const dx = Math.max(r.x - x, 0, x - (r.x + r.w));
        const dy = Math.max(r.y - y, 0, y - (r.y + r.h));
        if (dx > fall || dy > fall) continue;
        f = Math.min(f, 0.22 + 0.78 * smooth(0, fall, Math.hypot(dx, dy)));
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

    // ---------- quadro ----------
    const frame = (t: number) => {
      if (!vw || !vh || !secTop.length) return;
      buildSpine(t);

      const scroll = window.scrollY - wrapTop; // topo da viewport em coords da Home
      const y0 = scroll - 380;
      const y1 = scroll + vh + 380;
      let i0 = -1;
      let i1 = -1;
      for (let i = 0; i < count; i++) {
        if (SY[i] >= y0 && SY[i] <= y1) {
          if (i0 < 0) i0 = i;
          i1 = i;
        }
      }

      vcount = 0;
      tri = [];
      lin = [];
      const points: number[] = [];
      const pt = (x: number, y: number, r: number, g: number, b: number, a: number, prof: number, size: number) => {
        if (a > 0.004) points.push(x, y, r, g, b, a, prof, size);
      };
      const px = mouse.x * 10;
      const py = mouse.y * 7;

      if (i0 >= 0 && i1 > i0) {
        const n = i1 - i0 + 1;
        ensureAttr(n);
        const near = texts.filter((r) => r.y + r.h > y0 - 150 && r.y < y1 + 150);
        const fade = 320 * unit;
        for (let j = 0; j < n; j++) {
          const i = i0 + j;
          const arc = i * ds;
          ARC[j] = arc;
          const env = smooth(0, fade, arc) * smooth(total, total - fade, arc);
          // energia luminosa viajando ao longo da corrente
          const energy =
            0.7 + 0.5 * Math.pow(0.5 + 0.5 * Math.sin((arc / 900) * TAU - t * 0.42), 4);
          const edge = smooth(H, H - 300 * unit, SY[i]);
          A[j] = intensityAt(SY[i]) * textDim(SX[i], SY[i], near) * env * edge * energy;
          const m = Math.pow(0.5 + 0.5 * Math.sin((arc / 1600) * TAU - t * 0.08 + 0.8), 1.5);
          CR[j] = BLUE[0] + (CYAN[0] - BLUE[0]) * m;
          CG[j] = BLUE[1] + (CYAN[1] - BLUE[1]) * m;
          CB[j] = BLUE[2] + (CYAN[2] - BLUE[2]) * m;
        }

        // onda serpentina que percorre a corrente (contínua, sem loop visível)
        const snake = (arc: number, lag: number) =>
          22 * unit *
          Math.sin((arc / 700) * TAU - t * 0.31 + lag) *
          (0.7 + 0.3 * Math.sin((arc / 2170) * TAU + t * 0.05));
        // largura sempre positiva: varia suavemente, mas nunca torce/inverte
        const spread = (arc: number, w: number, ph: number) =>
          w * unit * (0.55 + 0.45 * Math.sin((arc / 1100) * TAU - t * 0.18 + ph));

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

        /** faixa (triângulos) entre dois deslocamentos, cor/alpha por vértice */
        const strip = (
          oL: (j: number) => number,
          oR: (j: number) => number,
          alpha: number, profile: number, l: number, depth: number,
        ) => {
          let prevL = -1;
          let prevR = -1;
          for (let j = 0; j < n; j++) {
            const i = i0 + j;
            const a = A[j] * alpha;
            lift(j, l);
            pos(i, oL(j), depth);
            const L = pushV(qx, qy, lr, lg, lb, a, -1, profile, 0);
            pos(i, oR(j), depth);
            const R = pushV(qx, qy, lr, lg, lb, a, 1, profile, 0);
            if (L < 0 || R < 0) return;
            if (prevL >= 0) tri.push(prevL, prevR, L, prevR, R, L);
            prevL = L;
            prevR = R;
          }
        };

        /** linha fina (1px de dispositivo) */
        const line = (off: (j: number) => number, alpha: number, l: number, depth: number) => {
          let prev = -1;
          for (let j = 0; j < n; j++) {
            pos(i0 + j, off(j), depth);
            lift(j, l);
            const v = pushV(qx, qy, lr, lg, lb, A[j] * alpha, 0, 1, 0);
            if (v < 0) return;
            if (prev >= 0) lin.push(prev, v);
            prev = v;
          }
        };

        // 1) halo difuso — glow variável da corrente
        const hw = 150 * unit;
        strip((j) => snake(ARC[j], 0) - hw, (j) => snake(ARC[j], 0) + hw, 0.065, 2.2, 0, 0.4);

        // 2) malha de linhas paralelas (camada secundária)
        const meshLines = mobile ? 12 : 24;
        for (let k = 0; k < meshLines; k++) {
          const kk = -1 + (2 * k) / (meshLines - 1);
          line(
            (j) => 64 * unit + snake(ARC[j], 1.3) + spread(ARC[j], 36, 0.5) * kk,
            0.36 * (0.45 + 0.55 * Math.abs(kk)),
            0.3,
            0.6,
          );
        }

        // 3) malha de pontos (camada secundária)
        const rows = mobile ? 8 : 12;
        for (let k = 0; k < rows; k++) {
          const kk = -1 + (2 * k) / (rows - 1);
          for (let j = k % 2; j < n; j += 2) {
            pos(i0 + j, -66 * unit + snake(ARC[j], 2.5) + spread(ARC[j], 44, 2.1) * kk, 0.8);
            lift(j, 0.2);
            pt(qx, qy, lr, lg, lb, A[j] * 0.6, 0.7, 1.8);
          }
        }

        // 4) fita principal de seda
        const sc = (j: number) => snake(ARC[j], 0);
        const sw = (j: number) => spread(ARC[j], 64, 0);
        strip((j) => sc(j) - sw(j), (j) => sc(j) + sw(j), 0.13, 0, 0, 1);
        if (!mobile) {
          for (const k of [-0.55, 0, 0.55]) {
            const h = 9 * unit;
            strip((j) => sc(j) + sw(j) * k - h, (j) => sc(j) + sw(j) * k + h, 0.055, 1.5, 0, 1);
          }
        }
        for (const k of [-1, 1]) {
          strip((j) => sc(j) + sw(j) * k - 5, (j) => sc(j) + sw(j) * k + 5, 0.13, 2, 0.25, 1);
          strip((j) => sc(j) + sw(j) * k - 1.1, (j) => sc(j) + sw(j) * k + 1.1, 0.85, 1, 0.25, 1);
        }

        // 5) partículas viajando ao longo da própria curva
        const pc = Math.min(particles.length, Math.floor(total / (mobile ? 320 : 230)));
        for (let q = 0; q < pc; q++) {
          const p = particles[q];
          const arc = (((p.a0 * total + t * p.sp) % total) + total) % total;
          const i = Math.round(arc / ds);
          if (i < i0 || i > i1) continue;
          const j = i - i0;
          pos(i, p.off * 110 * unit + Math.sin(t * 0.5 + p.ph) * 10, 1.4);
          const tw = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * 0.7 + p.ph * 2));
          const a = tw * A[j];
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
          const arcs = [
            { r: 1, a0: Math.PI * 1.02, a1: Math.PI * 1.9, dots: false, nodes: 2, spd: 0.035 },
            { r: 1.14, a0: Math.PI * 0.5, a1: Math.PI * 1.15, dots: true, nodes: 1, spd: 0.025 },
            { r: 0.86, a0: Math.PI * 0.05, a1: Math.PI * 0.7, dots: false, nodes: 1, spd: 0.04 },
          ];
          for (const o of arcs) {
            const span = o.a1 - o.a0;
            const steps = Math.ceil((span * rx * o.r) / 6);
            if (o.dots) {
              for (let s = 0; s <= steps; s += 2) {
                const f = s / steps;
                at(o.r, o.a0 + span * f);
                pt(qx, qy, CYAN[0], CYAN[1], CYAN[2], 0.4 * Math.sin(f * Math.PI), 0.8, 1.8);
              }
            } else {
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
                if (prevL >= 0) tri.push(prevL, prevR, L, prevR, R, L);
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
      for (let k = 0; k < points.length; k += 8) {
        const p = points;
        if (pushV(p[k], p[k + 1], p[k + 2], p[k + 3], p[k + 4], p[k + 5], 0, p[k + 6], p[k + 7]) < 0) break;
      }
      const pCount = vcount - pStart;

      // ---------- desenho ----------
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clear(gl.COLOR_BUFFER_BIT);
      if (!vcount) return;
      gl.uniform2f(uRes, vw, vh);
      gl.uniform1f(uDpr, dpr);
      gl.bufferData(gl.ARRAY_BUFFER, vbuf.subarray(0, vcount * FLOATS), gl.DYNAMIC_DRAW);
      const total_i = tri.length + lin.length;
      const idx = uintIndex ? new Uint32Array(total_i) : new Uint16Array(total_i);
      idx.set(tri, 0);
      idx.set(lin, tri.length);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.DYNAMIC_DRAW);
      const type = uintIndex ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT;
      const bytes = uintIndex ? 4 : 2;
      gl.uniform1f(uPoints, 0);
      if (tri.length) gl.drawElements(gl.TRIANGLES, tri.length, type, 0);
      if (lin.length) gl.drawElements(gl.LINES, lin.length, type, tri.length * bytes);
      if (pCount) {
        gl.uniform1f(uPoints, 1);
        gl.drawArrays(gl.POINTS, pStart, pCount);
      }
    };

    // ---------- ciclo de vida ----------
    let t = 14; // tempo do quadro estático (reduced motion)
    let running = !reduce;
    let visible = true;
    const redraw = () => frame(t);

    measure();
    const ro = new ResizeObserver(() => {
      measure();
      if (!running) redraw();
    });
    ro.observe(wrap);
    ro.observe(canvas);

    // só trabalha enquanto a Home estiver na tela
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (!visible) gl.clear(gl.COLOR_BUFFER_BIT);
      else if (!running) redraw();
    });
    io.observe(wrap);

    // com reduced motion não há loop: redesenha o quadro estático no scroll
    let scrollRaf = 0;
    const onScroll = () => {
      if (running) return;
      cancelAnimationFrame(scrollRaf);
      scrollRaf = requestAnimationFrame(redraw);
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    const onMove = (e: PointerEvent) => {
      mouse.tx = (e.clientX / window.innerWidth - 0.5) * 2;
      mouse.ty = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    if (fine && !reduce) window.addEventListener("pointermove", onMove, { passive: true });

    const onLost = (e: Event) => {
      e.preventDefault();
      running = false;
      maxV = 0;
    };
    canvas.addEventListener("webglcontextlost", onLost);

    let raf = 0;
    const start = performance.now();
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (!running || !visible || document.hidden) return;
      mouse.x += (mouse.tx - mouse.x) * 0.04;
      mouse.y += (mouse.ty - mouse.y) * 0.04;
      t = (now - start) / 1000;
      frame(t);
    };
    if (running) raf = requestAnimationFrame(loop);
    else redraw();

    return () => {
      cancelAnimationFrame(raf);
      cancelAnimationFrame(scrollRaf);
      ro.disconnect();
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("webglcontextlost", onLost);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 h-full w-full"
    />
  );
}
