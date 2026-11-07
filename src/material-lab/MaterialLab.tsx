import { useEffect, useRef, useState } from 'react';
import './MaterialLab.css';

type Shape = 'circle' | 'sphere' | 'rounded' | 'diamond';
type EffectId = 'edge' | 'inner' | 'outer' | 'surface' | 'background';
type RGBA = { hex: string; alpha: number };
type Effect = { enabled: boolean; colors: RGBA[]; width: number; amplitude: number; frequency: number; phase: number; centerX: number; centerY: number; softness: number };
type Settings = Record<EffectId, Effect>;
const effects: { id: EffectId; name: string; subtitle: string }[] = [
  { id: 'edge', name: 'Borde', subtitle: 'Degradado longitudinal sobre el perímetro' },
  { id: 'inner', name: 'Resplandor interior', subtitle: 'Densidad desde el borde hacia dentro' },
  { id: 'outer', name: 'Resplandor exterior', subtitle: 'Campana gaussiana exterior' },
  { id: 'surface', name: 'Superficie interior', subtitle: 'Radial dentro de la máscara' },
  { id: 'background', name: 'Fondo · antimáscara', subtitle: 'Radial fuera del objeto' },
];
const makeEffect = (start: string, end: string, width: number, a = 0.3, f = 5): Effect => ({
  enabled: true, colors: [
    { hex: start, alpha: 1 }, { hex: '#ffffff', alpha: 0.85 },
    { hex: end, alpha: 0.7 }, { hex: '#5478b5', alpha: 0.5 },
    { hex: start, alpha: 1 },
  ], width,
  amplitude: a, frequency: f, phase: 0, centerX: 0, centerY: 0, softness: 0.55,
});
const initial: Settings = {
  edge: makeEffect('#a9efff', '#124cbb', 9, 0.45, 7),
  inner: makeEffect('#71d7ff', '#10236c', 29, 0.4, 5),
  outer: makeEffect('#4eafff', '#081f70', 48, 0.6, 6),
  surface: makeEffect('#83dfff', '#071137', 98, 0.25, 4),
  background: makeEffect('#16449a', '#000000', 145, 0.35, 3),
};
const clamp = (v: number, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v));
function hexRgb(hex: string): [number, number, number] { return [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number]; }
function wave(s: number, e: Effect, t: number) {
  // Whole cycles in normalized contour space: value AND derivative match at seam.
  const n = Math.max(1, Math.round(e.frequency));
  const p = 2 * Math.PI * n * s + e.phase + t * 0.24;
  return Math.sin(p) * 0.65 + Math.sin(2 * p + 1.8) * 0.25 + Math.cos(3 * p - 1.3) * 0.1;
}
function signedDistance(x: number, y: number, shape: Shape) {
  if (shape === 'rounded') {
    const qx = Math.abs(x) - 0.68, qy = Math.abs(y) - 0.68;
    return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - 0.22;
  }
  if (shape === 'diamond') return (Math.abs(x) + Math.abs(y) - 1.1) * 0.7071;
  return Math.hypot(x, y) - 1;
}
// Convex/star-shaped silhouettes: sample the actual boundary, then parameterize
// its accumulated arc length. Unlike atan2-based conic gradients, equal portions
// of the gradient cover equal *distances along the contour*, even on diamonds
// and rounded rectangles. Cache by shape; never rebuild per pixel/frame.
const CONTOUR_STEPS = 1024;
const contourCache = new Map<Shape, Float32Array>();
function contourArcTable(shape: Shape): Float32Array {
  const cached = contourCache.get(shape);
  if (cached) return cached;
  const arc = new Float32Array(CONTOUR_STEPS + 1);
  let prevX = 0, prevY = 0;
  for (let i = 0; i <= CONTOUR_STEPS; i++) {
    const angle = i / CONTOUR_STEPS * Math.PI * 2 - Math.PI / 2;
    const dx = Math.cos(angle), dy = Math.sin(angle);
    let lo = 0, hi = 2.5;
    for (let j = 0; j < 16; j++) {
      const mid = (lo + hi) * 0.5;
      if (signedDistance(dx * mid, dy * mid, shape) < 0) lo = mid;
      else hi = mid;
    }
    const radius = (lo + hi) * 0.5;
    const px = dx * radius, py = dy * radius;
    if (i > 0) arc[i] = arc[i - 1] + Math.hypot(px - prevX, py - prevY);
    prevX = px; prevY = py;
  }
  const total = arc[CONTOUR_STEPS];
  for (let i = 0; i <= CONTOUR_STEPS; i++) arc[i] /= total;
  contourCache.set(shape, arc);
  return arc;
}
function contourPosition(angle: number, arc: Float32Array): number {
  // Seam at top, clockwise; 0 and 1 represent the same point.
  const turns = ((angle + Math.PI / 2) / (Math.PI * 2) + 1) % 1;
  const index = turns * CONTOUR_STEPS;
  const i = Math.floor(index);
  const f = index - i;
  return arc[i] * (1 - f) + arc[i + 1] * f;
}
function gradient(dst: number[], e: Effect, u: number, weight: number, cyclic = false) {
  const stops = e.colors;
  const v = cyclic ? ((u % 1) + 1) % 1 : clamp(u);
  const scaled = v * (stops.length - 1);
  const i = Math.min(stops.length - 2, Math.floor(scaled));
  const f = scaled - i;
  const a = stops[i], b = stops[i + 1];
  const ca = hexRgb(a.hex), cb = hexRgb(b.hex);
  const wa = (1 - f) * a.alpha, wb = f * b.alpha;
  const alpha = clamp(weight * (wa + wb));
  const denom = Math.max(1e-6, wa + wb);
  for (let c = 0; c < 3; c++) {
    const source = (ca[c] * wa + cb[c] * wb) / denom;
    dst[c] = dst[c] * (1 - alpha) + source * alpha;
  }
}
function render(canvas: HTMLCanvasElement, shape: Shape, settings: Settings, t: number) {
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) return;
  const size = canvas.width;
  const data = ctx.createImageData(size, size);
  const scale = size * 0.305;
  const { edge, inner, outer, surface, background } = settings;
  const contour = contourArcTable(shape);
  for (let py = 0; py < size; py++) for (let px = 0; px < size; px++) {
    const x = (px - size * 0.5) / scale;
    const y = (py - size * 0.5) / scale;
    const d = signedDistance(x, y, shape);
    const angle = Math.atan2(y, x);
    const perimeter = contourPosition(angle, contour);
    const inside = d <= 0;
    const color = [0, 0, 0];
    if (!inside && background.enabled) {
      const bx = x - background.centerX * 1.5, by = y - background.centerY * 1.5;
      const r = Math.hypot(bx, by) * scale;
      const width = Math.max(1, background.width * (1 + background.amplitude * wave(perimeter, background, t)));
      gradient(color, background, r / width, Math.exp(-Math.pow(r / width, 2) * (1.5 - background.softness)));
    }
    if (!inside && outer.enabled) {
      const width = Math.max(1, outer.width * (1 + outer.amplitude * wave(perimeter, outer, t)));
      const r = d * scale;
      const sigma = width * (0.4 + outer.softness * 0.7);
      const weight = Math.exp(-0.5 * (r / sigma) ** 2);
      gradient(color, outer, clamp(r / (width * 2)), weight);
    }
    if (inside) {
      if (surface.enabled) {
        const sx = x - surface.centerX, sy = y - surface.centerY;
        const r = Math.hypot(sx, sy);
        const w = 1 + surface.amplitude * wave(perimeter, surface, t) * 0.25;
        const u = clamp(r / Math.max(0.1, w * surface.width / 90));
        gradient(color, surface, u, 1);
      }
      if (shape === 'sphere') {
        const rr = clamp(x * x + y * y);
        const nz = Math.sqrt(Math.max(0, 1 - rr));
        const diffuse = 0.52 + 0.48 * clamp(-x * 0.42 - y * 0.48 + nz * 0.78);
        const spec = Math.pow(clamp(-x * 0.5 - y * 0.5 + nz * 0.65), 18) * 0.22;
        for (let c = 0; c < 3; c++) color[c] = color[c] * diffuse + 255 * spec;
      }
      if (inner.enabled) {
        const width = Math.max(1, inner.width * (1 + inner.amplitude * wave(perimeter, inner, t)));
        const r = -d * scale;
        const density = Math.exp(-0.5 * (r / (width * (0.45 + inner.softness * 0.75))) ** 2);
        gradient(color, inner, clamp(r / width), density);
      }
    }
    if (edge.enabled) {
      const width = Math.max(1, edge.width * (1 + edge.amplitude * wave(perimeter, edge, t)));
      const edgeD = Math.abs(d * scale);
      const opacity = 1 - clamp((edgeD - width * 0.12) / Math.max(1, width * (0.4 + edge.softness)));
      if (edgeD < width && opacity > 0) gradient(color, edge, perimeter, opacity * (inside ? 1 : 0.8), true);
    }
    const i = (py * size + px) * 4;
    for (let c = 0; c < 3; c++) data.data[i + c] = clamp(color[c] / 255) * 255;
    data.data[i + 3] = 255;
  }
  ctx.putImageData(data, 0, 0);
}
// Experimental unified illumination: ONE periodic master curve drives all five regions.
// Surface and contour are material response palettes, not five independent light sources.
type Unified = {
  colorsSurface: RGBA[]; colorsEdge: RGBA[];
  cycles: number; phase: number; amplitude: number; animateSpeed: number;
  edgeWidth: number; innerReach: number; outerReach: number; backgroundReach: number;
  surfaceResponse: number; edgeResponse: number; emission: number; backgroundBounce: number;
  ambient: number; softness: number;
};
const unifiedInitial: Unified = {
  colorsSurface: [
    { hex: '#09102a', alpha: 1 }, { hex: '#204d91', alpha: 1 },
    { hex: '#61b5e7', alpha: 1 }, { hex: '#b7efff', alpha: 1 },
    { hex: '#ffffff', alpha: 1 },
  ],
  colorsEdge: [
    { hex: '#101b4c', alpha: 1 }, { hex: '#3865b5', alpha: 1 },
    { hex: '#77d3ff', alpha: 1 }, { hex: '#d0f7ff', alpha: 1 },
    { hex: '#ffffff', alpha: 1 },
  ],
  cycles: 3, phase: 0, amplitude: 0.95, animateSpeed: 0.3,
  edgeWidth: 10, innerReach: 36, outerReach: 45, backgroundReach: 85,
  surfaceResponse: 0.82, edgeResponse: 1, emission: 0.85, backgroundBounce: 0.52,
  ambient: 0.12, softness: 0.65,
};
function masterLight(s: number, u: Unified, t: number) {
  // Integer harmonics guarantee matching value AND tangent at the seam.
  const a = Math.PI * 2 * u.cycles * s + u.phase + t * u.animateSpeed;
  const w = 0.72 * Math.cos(a) + 0.20 * Math.cos(2 * a - 0.7) + 0.08 * Math.sin(3 * a + 0.3);
  return clamp(u.ambient + (1 - u.ambient) * (0.5 + 0.5 * u.amplitude * w));
}
function samplePalette(stops: RGBA[], value: number): [number, number, number, number] {
  const v = clamp(value) * (stops.length - 1);
  const i = Math.min(stops.length - 2, Math.floor(v));
  const k = v - i;
  const a = stops[i], b = stops[i + 1];
  const ca = hexRgb(a.hex), cb = hexRgb(b.hex);
  return [ca[0] * (1-k) + cb[0] * k, ca[1] * (1-k) + cb[1] * k, ca[2] * (1-k) + cb[2] * k, a.alpha * (1-k) + b.alpha * k];
}
function mixLight(dst: number[], src: [number, number, number, number], strength: number) {
  const a = clamp(src[3] * strength);
  for (let i = 0; i < 3; i++) dst[i] = dst[i] * (1 - a) + src[i] * a;
}
function addLight(dst: number[], src: [number, number, number, number], strength: number) {
  const a = Math.max(0, src[3] * strength);
  for (let i = 0; i < 3; i++) dst[i] += src[i] * a;
}
function renderUnified(canvas: HTMLCanvasElement, shape: Shape, u: Unified, enabled: Record<EffectId, boolean>, t: number) {
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) return;
  const size = canvas.width;
  const image = ctx.createImageData(size, size);
  const scale = size * 0.305;
  const contour = contourArcTable(shape);
  for (let py = 0; py < size; py++) for (let px = 0; px < size; px++) {
    const x = (px - size * 0.5) / scale, y = (py - size * 0.5) / scale;
    const d = signedDistance(x, y, shape), dist = d * scale;
    const s = contourPosition(Math.atan2(y, x), contour);
    // A single sample feeds surface, edge, inner, outer and background.
    const light = masterLight(s, u, t);
    const edge = samplePalette(u.colorsEdge, light);
    const surface = samplePalette(u.colorsSurface, light);
    const color = [4, 7, 17];
    const edgeStrength = light * u.edgeResponse;
    const surfaceStrength = light * u.surfaceResponse;
    if (dist > 0) {
      // The outer field and bounced light share the same source and direction.
      const halo = Math.exp(-0.5 * Math.pow(dist / Math.max(1, u.outerReach * (0.5 + u.softness)), 2));
      const bounce = Math.exp(-0.5 * Math.pow(dist / Math.max(1, u.backgroundReach * (0.6 + u.softness)), 2));
      if (enabled.background) addLight(color, surface, bounce * edgeStrength * u.emission * u.backgroundBounce * 0.52);
      if (enabled.outer) addLight(color, edge, halo * edgeStrength * u.emission * 0.9);
    } else {
      if (enabled.surface) {
        const nx = x, ny = y;
        const nz = shape === 'sphere' ? Math.sqrt(Math.max(0, 1 - clamp(nx * nx + ny * ny))) : 1;
        const diffuse = shape === 'sphere' ? 0.48 + 0.52 * clamp(-nx * 0.38 - ny * 0.42 + nz * 0.88) : 0.9;
        mixLight(color, surface, clamp(0.22 + surfaceStrength * diffuse * 0.85));
      }
      if (enabled.inner) {
        const near = Math.exp(-0.5 * Math.pow(dist / Math.max(1, u.innerReach * (0.45 + u.softness)), 2));
        addLight(color, edge, near * edgeStrength * u.emission * 0.53);
      }
    }
    if (enabled.edge) {
      const rim = Math.exp(-0.5 * Math.pow(dist / Math.max(1, u.edgeWidth * (0.3 + u.softness * 0.45)), 2));
      addLight(color, edge, rim * edgeStrength * 1.05);
    }
    const idx = (py * size + px) * 4;
    for (let i = 0; i < 3; i++) image.data[idx + i] = Math.round(clamp(color[i] / 255) * 255);
    image.data[idx + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);
}
function MasterCurve({ value }: { value: Unified }) {
  const path = Array.from({ length: 201 }, (_, i) => {
    const s = i / 200;
    return `${i ? 'L' : 'M'} ${s * 320} ${96 - masterLight(s, value, 0) * 80}`;
  }).join(' ');
  return <svg className="ml-curve" viewBox="0 0 320 108" preserveAspectRatio="none" aria-label="Curva maestra periódica"><path d="M0 96 H320" stroke="#3b4761" strokeDasharray="4 4"/><path d={path} stroke="#69c6ff" strokeWidth="2.5" fill="none"/><circle cx="0" cy={96-masterLight(0,value,0)*80} r="3" fill="#ffffff"/><circle cx="320" cy={96-masterLight(1,value,0)*80} r="3" fill="#ffffff"/></svg>;
}
function UnifiedControls({ value, onChange }: { value: Unified; onChange: (patch: Partial<Unified>) => void }) {
  const slider = (label: string, key: keyof Unified, min: number, max: number, step = 0.01) => <NumberSlider label={label} value={value[key] as number} min={min} max={max} step={step} onChange={v => onChange({ [key]: v })}/>;
  const palette = (key: 'colorsSurface' | 'colorsEdge', title: string) => <div className="ml-section"><h4>{title}</h4><div className="ml-gradient" style={{ background: `linear-gradient(90deg, ${value[key].map((c,i) => `${c.hex} ${i*25}%`).join(', ')})` }}/><div className="ml-colors">{value[key].map((c,i) => <ColorEditor key={i} label={`Color ${i+1} · ${i*25}%`} value={c} onChange={next => onChange({ [key]: value[key].map((old,j) => j === i ? next : old) })}/>)}</div></div>;
  return <><p>Una sola función periódica alimenta las cinco regiones. Dos paletas describen la respuesta de la superficie y el borde.</p><div className="ml-section"><h4>CAMPO MAESTRO · UNA SOLA CURVA</h4><MasterCurve value={value}/>{slider('Ciclos completos', 'cycles', 1, 12, 1)}{slider('Amplitud', 'amplitude', 0, 1)}{slider('Fase', 'phase', 0, 6.28)}{slider('Velocidad', 'animateSpeed', 0, 2)}{slider('Luz ambiente', 'ambient', 0, 0.5)}</div>{palette('colorsSurface','REFLECTANCIA · SUPERFICIE')}{palette('colorsEdge','REFLECTANCIA · BORDE')}<div className="ml-section"><h4>RESPUESTA MATERIAL</h4>{slider('Reflectancia superficial', 'surfaceResponse', 0, 2)}{slider('Reflectancia de borde', 'edgeResponse', 0, 2)}{slider('Emisión / dispersión', 'emission', 0, 2)}{slider('Rebote al fondo', 'backgroundBounce', 0, 2)}</div><div className="ml-section"><h4>PROPAGACIÓN DESDE EL CONTORNO</h4>{slider('Grosor de borde', 'edgeWidth', 2, 35, 1)}{slider('Alcance interior', 'innerReach', 1, 110, 1)}{slider('Alcance exterior', 'outerReach', 1, 130, 1)}{slider('Alcance del fondo', 'backgroundReach', 1, 200, 1)}{slider('Suavidad', 'softness', 0, 1)}</div><button className="ml-reset" onClick={() => onChange(unifiedInitial)}>Restablecer campo</button></>;
}
function NumberSlider({ label, value, min, max, step = 1, onChange }: { label: string; value: number; min: number; max: number; step?: number; onChange: (v: number) => void }) {
  return <label className="ml-slider"><span>{label}<strong>{Number(value.toFixed(2))}</strong></span><input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(Number(e.target.value))} /></label>;
}
function Curve({ effect }: { effect: Effect }) {
  const path = Array.from({ length: 161 }, (_, i) => {
    const a = i / 160;
    return `${i ? 'L' : 'M'} ${i * 2} ${54 - 34 * effect.amplitude * wave(a, effect, 0)}`;
  }).join(' ');
  return <svg className="ml-curve" viewBox="0 0 320 108" preserveAspectRatio="none" aria-label="Previsualización de modulación sinusoidal"><path d="M0 54 H320" stroke="#3b4761" strokeDasharray="4 4"/><path d={path} fill="none" stroke="#69c6ff" strokeWidth="2.5"/></svg>;
}
function ColorEditor({ label, value, onChange }: { label: string; value: RGBA; onChange: (c: RGBA) => void }) {
  return <div className="ml-color"><label>{label}<input type="color" value={value.hex} onChange={e => onChange({ ...value, hex: e.target.value })}/></label><NumberSlider label="Alpha" min={0} max={1} step={0.01} value={value.alpha} onChange={alpha => onChange({ ...value, alpha })}/></div>;
}
export function MaterialLab({ onBack }: { onBack: () => void }) {
  const [shape, setShape] = useState<Shape>('sphere');
  const [settings, setSettings] = useState<Settings>(initial);
  const [selected, setSelected] = useState<EffectId>('edge');
  const [animate, setAnimate] = useState(true);
  const [unifiedMode, setUnifiedMode] = useState(true);
  const [unified, setUnified] = useState<Unified>(unifiedInitial);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const snapshot = useRef({ shape, settings, animate, unifiedMode, unified });
  snapshot.current = { shape, settings, animate, unifiedMode, unified };
  useEffect(() => {
    let frame = 0, raf = 0;
    const tick = () => {
      const canvas = canvasRef.current;
      if (canvas) {
        const v = snapshot.current;
        if (v.unifiedMode) renderUnified(canvas, v.shape, v.unified, { edge: v.settings.edge.enabled, inner: v.settings.inner.enabled, outer: v.settings.outer.enabled, surface: v.settings.surface.enabled, background: v.settings.background.enabled }, v.animate ? frame / 60 : 0);
        else render(canvas, v.shape, v.settings, v.animate ? frame / 60 : 0);
      }
      frame++;
      raf = window.setTimeout(tick, snapshot.current.animate ? 50 : 150) as unknown as number;
    };
    tick();
    return () => window.clearTimeout(raf);
  }, []);
  const update = (id: EffectId, patch: Partial<Effect>) => setSettings(prev => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  const effect = settings[selected];
  const updateColor = (index: number, color: RGBA) => {
    const colors = effect.colors.map((c, i) => i === index ? color : c);
    if (selected === 'edge' && (index === 0 || index === 4)) {
      colors[0] = color;
      colors[4] = { ...color };
    }
    update(selected, { colors });
  };
  const exportPng = () => { const canvas = canvasRef.current; if (!canvas) return; const a = document.createElement('a'); a.download = 'shadex-material.png'; a.href = canvas.toDataURL('image/png'); a.click(); };
  const exportJson = () => { const blob = new Blob([JSON.stringify({ version: 2, shape, mode: unifiedMode ? 'unified' : 'legacy', unified, effects: settings }, null, 2)], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'shadex-material.json'; a.click(); URL.revokeObjectURL(a.href); };
  return <div className="ml-root">
    <header className="ml-header"><div className="ml-brand"><button onClick={onBack}>← Laboratorio</button><span className="ml-brandmark">◈</span><div><strong>Material Lab</strong><small>SHADEX · FIELD MATERIALS / BETA 0.1</small></div></div><div className="ml-header-actions"><button onClick={() => setUnifiedMode(v => !v)}>{unifiedMode ? '◈ Campo unificado' : '▤ Cinco efectos'}</button><button onClick={() => setAnimate(v => !v)}>{animate ? 'Ⅱ Pausar' : '▷ Animar'}</button><button onClick={exportJson}>Exportar JSON</button><button className="ml-primary" onClick={exportPng}>Exportar PNG</button></div></header>
    <div className="ml-workspace"><aside className="ml-sidebar"><h3>FORMA</h3><div className="ml-shapes">{(['circle','sphere','rounded','diamond'] as Shape[]).map(s => <button key={s} className={shape === s ? 'active' : ''} onClick={() => setShape(s)}><span>{s === 'sphere' ? '◉' : s === 'circle' ? '○' : s === 'rounded' ? '▢' : '◇'}</span>{({ circle: 'Círculo 2D', sphere: 'Esfera 3D*', rounded: 'Rectángulo', diamond: 'Rombo' })[s]}</button>)}</div><h3>{unifiedMode ? 'REGIONES DERIVADAS · UNA FUENTE' : 'CAPAS / EFECTOS'}</h3><div className="ml-effects">{effects.map(item => <div key={item.id} className={`ml-effect ${selected === item.id ? 'active' : ''}`}><input aria-label={`Activar ${item.name}`} type="checkbox" checked={settings[item.id].enabled} onChange={e => update(item.id, { enabled: e.target.checked })}/><button onClick={() => setSelected(item.id)}><strong>{item.name}</strong><small>{item.subtitle}</small></button></div>)}</div><div className="ml-sidebar-note">{unifiedMode ? 'Cada región usa la misma curva maestra. Los interruptores permiten aislar su contribución para comparar.' : 'Las cinco capas usan máscaras del cuerpo. El fondo radial se limita a su antimáscara.'}</div></aside>
    <main className="ml-stage"><div className="ml-stage-toolbar"><span>VISTA PREVIA · CANVAS 2D</span><span>{unifiedMode ? 'UNIFIED LIGHT FIELD · SDF' : 'RGBA · MÁSCARA SDF'}</span></div><div className="ml-stage-center"><canvas ref={canvasRef} width={360} height={360}/></div><div className="ml-stage-footer"><span>{unifiedMode ? 'Una curva → cinco respuestas acopladas' : 'Fondo negro · Curvas sinusoidales por contorno'}</span><span>*Esfera: sombreado 3D aproximado</span></div></main>
    <aside className="ml-properties">{unifiedMode ? <><div className="ml-properties-title"><h3>Unified Light Field</h3><span>EXPERIMENTAL</span></div><UnifiedControls value={unified} onChange={patch => setUnified(prev => ({ ...prev, ...patch }))}/></> : <><div className="ml-properties-title"><h3>{effects.find(e => e.id === selected)?.name}</h3><span>PROPIEDADES</span></div><p>{effects.find(e => e.id === selected)?.subtitle}</p><div className="ml-section"><h4>{selected === 'edge' ? 'GRADIENTE DE CONTORNO · CÍCLICO' : 'GRADIENTE RGBA'}</h4><div className="ml-gradient" style={{ background: `linear-gradient(90deg, ${effect.colors.map((c,i) => `${c.hex} ${i*25}%`).join(', ')})` }}/>{selected === 'edge' && <p className="ml-contour-hint">Cinco stops RGBA distribuidos por longitud de arco. El quinto se sincroniza con el primero para cerrar el contorno sin costuras.</p>}<div className="ml-colors">{effect.colors.map((color, i) => <ColorEditor key={i} label={`Color ${i + 1} · ${i * 25}%${selected === 'edge' && i === 4 ? ' (cierre)' : ''}`} value={color} onChange={c => updateColor(i, c)}/>)}</div></div><div className="ml-section"><h4>{selected === 'surface' || selected === 'background' ? 'CAMPO RADIAL' : 'ANCHURA Y DENSIDAD'}</h4><NumberSlider label={selected === 'outer' ? 'Extensión gaussiana' : selected === 'surface' || selected === 'background' ? 'Radio' : 'Anchura'} value={effect.width} min={2} max={220} onChange={width => update(selected, { width })}/><NumberSlider label="Suavidad" value={effect.softness} min={0} max={1} step={0.01} onChange={softness => update(selected, { softness })}/>{(selected === 'surface' || selected === 'background') && <><NumberSlider label="Centro X" value={effect.centerX} min={-1.5} max={1.5} step={0.01} onChange={centerX => update(selected, { centerX })}/><NumberSlider label="Centro Y" value={effect.centerY} min={-1.5} max={1.5} step={0.01} onChange={centerY => update(selected, { centerY })}/></>}</div><div className="ml-section"><h4>MODULACIÓN SINUSOIDAL</h4><Curve effect={effect}/><NumberSlider label="Amplitud" value={effect.amplitude} min={0} max={1} step={0.01} onChange={amplitude => update(selected, { amplitude })}/><NumberSlider label="Frecuencia" value={effect.frequency} min={1} max={16} step={1} onChange={frequency => update(selected, { frequency })}/><NumberSlider label="Fase" value={effect.phase} min={0} max={6.28} step={0.01} onChange={phase => update(selected, { phase })}/></div><button className="ml-reset" onClick={() => update(selected, initial[selected])}>Restablecer efecto</button></>}</aside></div>
  </div>;
}
