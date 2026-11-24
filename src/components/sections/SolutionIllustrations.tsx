/**
 * Ilustrações originais dos cards de Soluções: painéis de vidro em SVG,
 * levemente inclinados em perspectiva pelo card.
 */

function PanelDefs({ id }: { id: string }) {
  return (
    <defs>
      <linearGradient id={`${id}-panel`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#4468f2" stopOpacity="0.42" />
        <stop offset="0.55" stopColor="#1a2770" stopOpacity="0.45" />
        <stop offset="1" stopColor="#0b1233" stopOpacity="0.6" />
      </linearGradient>
      <linearGradient id={`${id}-edge`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#ffffff" stopOpacity="0.55" />
        <stop offset="0.5" stopColor="#4468f2" stopOpacity="0.5" />
        <stop offset="1" stopColor="#00d9c1" stopOpacity="0.9" />
      </linearGradient>
      <linearGradient id={`${id}-img`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#2a3f9e" stopOpacity="0.75" />
        <stop offset="1" stopColor="#121c52" stopOpacity="0.85" />
      </linearGradient>
      <linearGradient id={`${id}-mount`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#4468f2" />
        <stop offset="1" stopColor="#4468f2" stopOpacity="0.2" />
      </linearGradient>
      <linearGradient id={`${id}-cta`} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#00d9c1" />
        <stop offset="1" stopColor="#4468f2" />
      </linearGradient>
      <radialGradient id={`${id}-sun`}>
        <stop offset="0" stopColor="#bfe9ff" />
        <stop offset="0.6" stopColor="#6fb8ff" />
        <stop offset="1" stopColor="#4468f2" stopOpacity="0" />
      </radialGradient>
    </defs>
  );
}

function Panel({ id }: { id: string }) {
  return (
    <>
      <rect
        x="8"
        y="8"
        width="224"
        height="154"
        rx="14"
        fill={`url(#${id}-panel)`}
        stroke={`url(#${id}-edge)`}
        strokeWidth="1.5"
      />
      <path
        d="M22 9 H218"
        stroke="#ffffff"
        strokeOpacity="0.35"
        strokeWidth="1"
      />
      {[24, 34, 44].map((cx) => (
        <circle key={cx} cx={cx} cy="24" r="3" fill="#9db4ff" fillOpacity="0.9" />
      ))}
    </>
  );
}

function ImageCard({
  id,
  x,
  y,
  w,
  h,
}: {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
}) {
  return (
    <g>
      <clipPath id={`${id}-clip`}>
        <rect x={x} y={y} width={w} height={h} rx="8" />
      </clipPath>
      <rect x={x} y={y} width={w} height={h} rx="8" fill={`url(#${id}-img)`} />
      <g clipPath={`url(#${id}-clip)`}>
        <path
          d={`M${x} ${y + h} L${x + w * 0.24} ${y + h * 0.52} L${x + w * 0.4} ${y + h * 0.74} L${x + w * 0.6} ${y + h * 0.34} L${x + w} ${y + h} Z`}
          fill={`url(#${id}-mount)`}
          fillOpacity="0.85"
        />
        <circle
          cx={x + w * 0.82}
          cy={y + h * 0.3}
          r={Math.min(w, h) * 0.2}
          fill={`url(#${id}-sun)`}
        />
      </g>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx="8"
        fill="none"
        stroke="#ffffff"
        strokeOpacity="0.12"
      />
    </g>
  );
}

export function SiteIllustration() {
  const id = "il-site";
  return (
    <svg viewBox="0 0 240 170" className="h-full w-full overflow-visible">
      <PanelDefs id={id} />
      <Panel id={id} />
      <ImageCard id={id} x={22} y={38} w={196} h={78} />
      {[22, 89, 156].map((x) => (
        <rect
          key={x}
          x={x}
          y="126"
          width="62"
          height="22"
          rx="6"
          fill="#4468f2"
          fillOpacity="0.45"
          stroke="#ffffff"
          strokeOpacity="0.1"
        />
      ))}
    </svg>
  );
}

export function LandingIllustration() {
  const id = "il-landing";
  return (
    <svg viewBox="0 0 240 170" className="h-full w-full overflow-visible">
      <PanelDefs id={id} />
      <Panel id={id} />
      <rect x="22" y="46" width="84" height="7" rx="3.5" fill="#c9d5ff" fillOpacity="0.85" />
      <rect x="22" y="60" width="96" height="6" rx="3" fill="#8ea6ff" fillOpacity="0.55" />
      <rect x="22" y="72" width="70" height="6" rx="3" fill="#8ea6ff" fillOpacity="0.4" />
      <rect
        x="22"
        y="98"
        width="74"
        height="20"
        rx="10"
        fill={`url(#${id}-cta)`}
        style={{ filter: "drop-shadow(0 0 8px rgba(0,217,193,0.55))" }}
      />
      <ImageCard id={id} x={124} y={40} w={94} h={100} />
    </svg>
  );
}

export function SystemsIllustration() {
  // camadas isométricas empilhadas; topo com o símbolo </>
  const slab = (dy: number, top: boolean, i: number) => {
    const T = (x: number, y: number) => `${x},${y + dy}`;
    return (
      <g key={i} opacity={top ? 1 : 0.55 + i * 0.15}>
        <polygon
          points={`${T(40, 70)} ${T(120, 108)} ${T(120, 122)} ${T(40, 84)}`}
          fill="#1b2b8a"
          fillOpacity="0.85"
          stroke="#4468f2"
          strokeOpacity="0.6"
        />
        <polygon
          points={`${T(120, 108)} ${T(200, 70)} ${T(200, 84)} ${T(120, 122)}`}
          fill="#13206a"
          fillOpacity="0.9"
          stroke="#00d9c1"
          strokeOpacity="0.55"
        />
        <polygon
          points={`${T(120, 32)} ${T(200, 70)} ${T(120, 108)} ${T(40, 70)}`}
          fill="url(#il-sys-top)"
          stroke="url(#il-sys-edge)"
          strokeWidth="1.4"
        />
      </g>
    );
  };

  return (
    <svg viewBox="0 0 240 190" className="h-full w-full overflow-visible">
      <defs>
        <linearGradient id="il-sys-top" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#5a7cff" stopOpacity="0.9" />
          <stop offset="1" stopColor="#2a3fae" stopOpacity="0.85" />
        </linearGradient>
        <linearGradient id="il-sys-edge" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.6" />
          <stop offset="1" stopColor="#00d9c1" stopOpacity="0.9" />
        </linearGradient>
      </defs>
      {slab(52, false, 0)}
      {slab(26, false, 1)}
      {slab(0, true, 2)}
      {/* </> achatado para assentar no plano do topo */}
      <g
        transform="translate(120 70) scale(1 0.62)"
        fill="none"
        stroke="#7ff3e6"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ filter: "drop-shadow(0 0 4px rgba(0,217,193,0.8))" }}
      >
        <polyline points="-28,-15 -44,0 -28,15" vectorEffect="non-scaling-stroke" />
        <line x1="9" y1="-20" x2="-9" y2="20" vectorEffect="non-scaling-stroke" />
        <polyline points="28,-15 44,0 28,15" vectorEffect="non-scaling-stroke" />
      </g>
    </svg>
  );
}
