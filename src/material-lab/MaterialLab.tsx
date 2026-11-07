import { useEffect, useRef, useState } from 'react';
import './MaterialLab.css';

type Shape = 'circle' | 'sphere' | 'rounded' | 'diamond';
type EffectId = 'edge' | 'inner' | 'outer' | 'surface' | 'background';
type RGBA = { hex: string; alpha: number };
type Effect = { enabled: boolean; start: RGBA; end: RGBA; width: number; amplitude: number; frequency: number; phase: number; centerX: number; centerY: number; softness: number };
type Settings = Record<EffectId, Effect>;
const effects: { id: EffectId; name: string; subtitle: string }[] = [
  { id: 'edge', name: 'Borde', subtitle: 'Degradado longitudinal sobre el perímetro' },
  { id: 'inner', name: 'Resplandor interior', subtitle: 'Densidad desde el borde hacia dentro' },
  { id: 'outer', name: 'Resplandor exterior', subtitle: 'Campana gaussiana exterior' },
  { id: 'surface', name: 'Superficie interior', subtitle: 'Radial dentro de la máscara' },
  { id: 'background', name: 'Fondo · antimáscara', subtitle: 'Radial fuera del objeto' },
];
const makeEffect = (start: string, end: string, width: number, a = 0.3, f = 5): Effect => ({
  enabled: true, start: { hex: start, alpha: 1 }, end: { hex: end, alpha: 0.1 }, width,
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
function wave(a: number, e: Effect, t: number) {
  const p = e.frequency * a + e.phase + t * 0.24;
  return Math.sin(p) * 0.65 + Math.sin(p * 1.73 + 1.8) * 0.25 + Math.cos(p * 0.47 - 1.3) * 0.1;
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
function contourGradient(dst: number[], e: Effect, u: number, weight: number) {
  // Seamless, cyclic RGBA interpolation. Two endpoints correspond to opposite
  // halves of the perimeter, and the color returns to start at the seam.
  const v = 1 - Math.abs(2 * u - 1);
  const a = hexRgb(e.start.hex), b = hexRgb(e.end.hex);
  const alphaA = e.start.alpha * (1 - v);
  const alphaB = e.end.alpha * v;
  const alpha = clamp(weight * (alphaA + alphaB));
  const denom = Math.max(1e-6, alphaA + alphaB);
  for (let c = 0; c < 3; c++) {
    const source = (a[c] * alphaA + b[c] * alphaB) / denom;
    dst[c] = dst[c] * (1 - alpha) + source * alpha;
  }
}
function blend(dst: number[], color: RGBA, weight: number, fade: number) {
  const rgb = hexRgb(color.hex);
  const alpha = clamp(weight * fade * color.alpha);
  for (let c = 0; c < 3; c++) dst[c] = dst[c] * (1 - alpha) + rgb[c] * alpha;
}
function gradient(dst: number[], e: Effect, u: number, weight: number) {
  const v = clamp(u);
  blend(dst, e.end, weight, v);
  blend(dst, e.start, weight, 1 - v);
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
      const width = Math.max(1, background.width * (1 + background.amplitude * wave(angle, background, t)));
      gradient(color, background, r / width, Math.exp(-Math.pow(r / width, 2) * (1.5 - background.softness)));
    }
    if (!inside && outer.enabled) {
      const width = Math.max(1, outer.width * (1 + outer.amplitude * wave(angle, outer, t)));
      const r = d * scale;
      const sigma = width * (0.4 + outer.softness * 0.7);
      const weight = Math.exp(-0.5 * (r / sigma) ** 2);
      gradient(color, outer, clamp(r / (width * 2)), weight);
    }
    if (inside) {
      if (surface.enabled) {
        const sx = x - surface.centerX, sy = y - surface.centerY;
        const r = Math.hypot(sx, sy);
        const w = 1 + surface.amplitude * wave(Math.atan2(sy, sx), surface, t) * 0.25;
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
        const width = Math.max(1, inner.width * (1 + inner.amplitude * wave(angle, inner, t)));
        const r = -d * scale;
        const density = Math.exp(-0.5 * (r / (width * (0.45 + inner.softness * 0.75))) ** 2);
        gradient(color, inner, clamp(r / width), density);
      }
    }
    if (edge.enabled) {
      const width = Math.max(1, edge.width * (1 + edge.amplitude * wave(angle, edge, t)));
      const edgeD = Math.abs(d * scale);
      const opacity = 1 - clamp((edgeD - width * 0.12) / Math.max(1, width * (0.4 + edge.softness)));
      if (edgeD < width && opacity > 0) contourGradient(color, edge, perimeter, opacity * (inside ? 1 : 0.8));
    }
    const i = (py * size + px) * 4;
    for (let c = 0; c < 3; c++) data.data[i + c] = clamp(color[c] / 255) * 255;
    data.data[i + 3] = 255;
  }
  ctx.putImageData(data, 0, 0);
}
function NumberSlider({ label, value, min, max, step = 1, onChange }: { label: string; value: number; min: number; max: number; step?: number; onChange: (v: number) => void }) {
  return <label className="ml-slider"><span>{label}<strong>{Number(value.toFixed(2))}</strong></span><input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(Number(e.target.value))} /></label>;
}
function Curve({ effect }: { effect: Effect }) {
  const path = Array.from({ length: 161 }, (_, i) => {
    const a = i / 160 * Math.PI * 2;
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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const snapshot = useRef({ shape, settings, animate });
  snapshot.current = { shape, settings, animate };
  useEffect(() => {
    let frame = 0, raf = 0;
    const tick = () => {
      const canvas = canvasRef.current;
      if (canvas) render(canvas, snapshot.current.shape, snapshot.current.settings, snapshot.current.animate ? frame / 60 : 0);
      frame++;
      raf = window.setTimeout(tick, snapshot.current.animate ? 50 : 150) as unknown as number;
    };
    tick();
    return () => window.clearTimeout(raf);
  }, []);
  const update = (id: EffectId, patch: Partial<Effect>) => setSettings(prev => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  const effect = settings[selected];
  const exportPng = () => { const canvas = canvasRef.current; if (!canvas) return; const a = document.createElement('a'); a.download = 'shadex-material.png'; a.href = canvas.toDataURL('image/png'); a.click(); };
  const exportJson = () => { const blob = new Blob([JSON.stringify({ version: 1, shape, effects: settings }, null, 2)], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'shadex-material.json'; a.click(); URL.revokeObjectURL(a.href); };
  return <div className="ml-root">
    <header className="ml-header"><div className="ml-brand"><button onClick={onBack}>← Laboratorio</button><span className="ml-brandmark">◈</span><div><strong>Material Lab</strong><small>SHADEX · FIELD MATERIALS / BETA 0.1</small></div></div><div className="ml-header-actions"><button onClick={() => setAnimate(v => !v)}>{animate ? 'Ⅱ Pausar' : '▷ Animar'}</button><button onClick={exportJson}>Exportar JSON</button><button className="ml-primary" onClick={exportPng}>Exportar PNG</button></div></header>
    <div className="ml-workspace"><aside className="ml-sidebar"><h3>FORMA</h3><div className="ml-shapes">{(['circle','sphere','rounded','diamond'] as Shape[]).map(s => <button key={s} className={shape === s ? 'active' : ''} onClick={() => setShape(s)}><span>{s === 'sphere' ? '◉' : s === 'circle' ? '○' : s === 'rounded' ? '▢' : '◇'}</span>{({ circle: 'Círculo 2D', sphere: 'Esfera 3D*', rounded: 'Rectángulo', diamond: 'Rombo' })[s]}</button>)}</div><h3>CAPAS / EFECTOS</h3><div className="ml-effects">{effects.map(item => <div key={item.id} className={`ml-effect ${selected === item.id ? 'active' : ''}`}><input aria-label={`Activar ${item.name}`} type="checkbox" checked={settings[item.id].enabled} onChange={e => update(item.id, { enabled: e.target.checked })}/><button onClick={() => setSelected(item.id)}><strong>{item.name}</strong><small>{item.subtitle}</small></button></div>)}</div><div className="ml-sidebar-note">Las cinco capas usan máscaras del cuerpo. El fondo radial se limita a su antimáscara.</div></aside>
    <main className="ml-stage"><div className="ml-stage-toolbar"><span>VISTA PREVIA · CANVAS 2D</span><span>RGBA · MÁSCARA SDF</span></div><div className="ml-stage-center"><canvas ref={canvasRef} width={360} height={360}/></div><div className="ml-stage-footer"><span>Fondo negro · Curvas sinusoidales por contorno</span><span>*Esfera: sombreado 3D aproximado</span></div></main>
    <aside className="ml-properties"><div className="ml-properties-title"><h3>{effects.find(e => e.id === selected)?.name}</h3><span>PROPIEDADES</span></div><p>{effects.find(e => e.id === selected)?.subtitle}</p><div className="ml-section"><h4>{selected === 'edge' ? 'GRADIENTE DE CONTORNO · CÍCLICO' : 'GRADIENTE RGBA'}</h4><div className="ml-gradient" style={{ background: `linear-gradient(90deg, ${effect.start.hex}, ${effect.end.hex})` }}/>{selected === 'edge' && <p className="ml-contour-hint">El color sigue la longitud real del borde: inicio arriba, final en el lado opuesto y retorno suave al inicio. La anchura se controla por separado.</p>}<div className="ml-colors"><ColorEditor label="Inicio" value={effect.start} onChange={start => update(selected, { start })}/><ColorEditor label="Final" value={effect.end} onChange={end => update(selected, { end })}/></div></div><div className="ml-section"><h4>{selected === 'surface' || selected === 'background' ? 'CAMPO RADIAL' : 'ANCHURA Y DENSIDAD'}</h4><NumberSlider label={selected === 'outer' ? 'Extensión gaussiana' : selected === 'surface' || selected === 'background' ? 'Radio' : 'Anchura'} value={effect.width} min={2} max={220} onChange={width => update(selected, { width })}/><NumberSlider label="Suavidad" value={effect.softness} min={0} max={1} step={0.01} onChange={softness => update(selected, { softness })}/>{(selected === 'surface' || selected === 'background') && <><NumberSlider label="Centro X" value={effect.centerX} min={-1.5} max={1.5} step={0.01} onChange={centerX => update(selected, { centerX })}/><NumberSlider label="Centro Y" value={effect.centerY} min={-1.5} max={1.5} step={0.01} onChange={centerY => update(selected, { centerY })}/></>}</div><div className="ml-section"><h4>MODULACIÓN SINUSOIDAL</h4><Curve effect={effect}/><NumberSlider label="Amplitud" value={effect.amplitude} min={0} max={1} step={0.01} onChange={amplitude => update(selected, { amplitude })}/><NumberSlider label="Frecuencia" value={effect.frequency} min={1} max={16} step={1} onChange={frequency => update(selected, { frequency })}/><NumberSlider label="Fase" value={effect.phase} min={0} max={6.28} step={0.01} onChange={phase => update(selected, { phase })}/></div><button className="ml-reset" onClick={() => update(selected, initial[selected])}>Restablecer efecto</button></aside></div>
  </div>;
}
