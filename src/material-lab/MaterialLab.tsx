import { createContext, useContext, useEffect, useId, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import './MaterialLab.css';
import { NativeGLSLRenderer, makeShadertoyGLSL } from './glslNative';
import type { GLSLAnimations } from './glslNative';

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
// Spatial emitters are sampled in object coordinates, not angular sectors.
// A light is projected onto the actual silhouette and that SAME contour sample
// drives rim, inward scattering, outer halo and background bounce.
type SpatialLight = {
  id: number; kind: 'radial' | 'linear'; enabled: boolean;
  x: number; y: number; angle: number; radius: number; aspect: number;
  intensity: number; color: string;
};
const defaultLights: SpatialLight[] = [
  { id: 1, kind: 'radial', enabled: true, x: -0.65, y: -0.55, angle: 0, radius: 1.05, aspect: 0.85, intensity: 1.2, color: '#b8eaff' },
  { id: 2, kind: 'linear', enabled: true, x: 0.52, y: 0.05, angle: -0.55, radius: 0.42, aspect: 1, intensity: 0.75, color: '#8d8cff' },
];
function spatialSample(light: SpatialLight, x: number, y: number) {
  if (!light.enabled) return 0;
  const dx = x - light.x, dy = y - light.y;
  const ca = Math.cos(light.angle), sa = Math.sin(light.angle);
  const xx = dx * ca + dy * sa, yy = -dx * sa + dy * ca;
  const r = Math.max(0.025, light.radius);
  if (light.kind === 'radial') {
    const distance = Math.hypot(xx / r, yy / (r * Math.max(0.15, light.aspect)));
    return light.intensity * Math.exp(-2.3 * distance * distance);
  }
  // Linear emitter: infinitely long soft band, with an editable width and rotation.
  return light.intensity * Math.exp(-2.3 * (xx / r) ** 2);
}
function contourPoint(angle: number, shape: Shape): [number, number] {
  const dx = Math.cos(angle), dy = Math.sin(angle);
  let lo = 0, hi = 2.5;
  for (let j = 0; j < 13; j++) {
    const m = (lo + hi) / 2;
    if (signedDistance(dx * m, dy * m, shape) < 0) lo = m;
    else hi = m;
  }
  const r = (lo + hi) / 2;
  return [dx * r, dy * r];
}
type TwistSettings = { enabled: boolean; amount: number; bands: number; rotation: number; silhouette: number; attached: boolean };
const initialTwist: TwistSettings = { enabled: true, amount: 0.85, bands: 3, rotation: 0.45, silhouette: 0.12, attached: true };
// Inverse mapping of a twisted 2.5D surface. The silhouette and surface share
// the same angular displacement, while the surface UVs additionally swirl with
// depth. This is not a true 3D mesh or physically correct normal mapping.
function twistCoords(x: number, y: number, twist: TwistSettings, t: number) {
  if (!twist.enabled) return { x, y, radius: 1, nx: x, ny: y };
  const r = Math.hypot(x, y);
  const a = Math.atan2(y, x);
  const spin = twist.rotation + t * 0.19;
  const envelope = Math.max(0, 1 - Math.min(1, r));
  const bend = twist.amount * (0.25 + 0.75 * envelope * envelope);
  const warpedAngle = a - bend * Math.sin(twist.bands * a + spin + 2.2 * r);
  const radius = 1 + twist.silhouette * Math.sin(twist.bands * a + spin);
  const theta = warpedAngle - twist.amount * envelope * 1.2;
  return { x: r * Math.cos(theta), y: r * Math.sin(theta), radius, nx: Math.cos(a), ny: Math.sin(a) };
}
function twistDistance(x: number, y: number, shape: Shape, twist: TwistSettings, t: number) {
  if (!twist.enabled || shape !== 'sphere') return signedDistance(x, y, shape);
  const a = Math.atan2(y, x);
  const radius = 1 + twist.silhouette * Math.sin(twist.bands * a + twist.rotation + t * 0.19);
  return Math.hypot(x, y) - radius;
}
function renderSpatial(canvas: HTMLCanvasElement, shape: Shape, u: Unified, lights: SpatialLight[], enabled: Record<EffectId, boolean>, t: number, twist: TwistSettings) {
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) return;
  const size = canvas.width, image = ctx.createImageData(size, size), scale = size * 0.305;
  // Precompute projected contour light for each angular sample once per frame.
  const count = 1024, contourIllum = new Float32Array(count);
  const contourR = new Float32Array(count), contourG = new Float32Array(count), contourB = new Float32Array(count);
  const contour = contourArcTable(shape);
  for (let k = 0; k < count; k++) {
    const angle = k / count * Math.PI * 2 - Math.PI / 2;
    const [baseX, baseY] = contourPoint(angle, shape);
    const radius = twist.enabled && shape === 'sphere' ? 1 + twist.silhouette * Math.sin(twist.bands * angle + twist.rotation + t * 0.19) : 1;
    const cx = baseX * radius, cy = baseY * radius;
    const warped = twistCoords(cx, cy, twist, t);
    let sum = 0, rr = 0, gg = 0, bb = 0;
    for (const light of lights) {
      const weight = spatialSample(light, twist.attached ? warped.x : cx, twist.attached ? warped.y : cy);
      if (!weight) continue;
      const rgb = hexRgb(light.color);
      sum += weight; rr += rgb[0] * weight; gg += rgb[1] * weight; bb += rgb[2] * weight;
    }
    // The periodic master is a subtle shared gain, not a conic color source.
    const gain = 0.65 + 0.35 * masterLight(contourPosition(angle, contour), u, t);
    contourIllum[k] = sum * gain;
    if (sum > 0) { contourR[k] = rr / sum; contourG[k] = gg / sum; contourB[k] = bb / sum; }
  }
  for (let py = 0; py < size; py++) for (let px = 0; px < size; px++) {
    const x = (px - size * 0.5) / scale, y = (py - size * 0.5) / scale;
    const dist = twistDistance(x, y, shape, twist, t) * scale;
    const warped = twistCoords(x, y, twist, t);
    const angle = Math.atan2(y, x);
    const k = (((angle + Math.PI / 2) / (2 * Math.PI) + 1) % 1) * count;
    const i = Math.floor(k), f = k - i, j = (i + 1) % count;
    const field = contourIllum[i] * (1 - f) + contourIllum[j] * f;
    const edgeRgb: [number, number, number, number] = [
      contourR[i] * (1 - f) + contourR[j] * f,
      contourG[i] * (1 - f) + contourG[j] * f,
      contourB[i] * (1 - f) + contourB[j] * f, 1,
    ];
    const color = [4, 7, 17];
    // Surface receives the spatial field at each actual surface pixel.
    let local = 0, sr = 0, sg = 0, sb = 0;
    if (dist <= 0 && enabled.surface) {
      for (const light of lights) {
        const w = spatialSample(light, twist.attached ? warped.x : x, twist.attached ? warped.y : y);
        if (!w) continue;
        const rgb = hexRgb(light.color);
        local += w; sr += rgb[0] * w; sg += rgb[1] * w; sb += rgb[2] * w;
      }
      const palette = samplePalette(u.colorsSurface, clamp(local * u.surfaceResponse));
      const nx = twist.enabled && shape === 'sphere' ? warped.x : x;
      const ny = twist.enabled && shape === 'sphere' ? warped.y : y;
      const nz = shape === 'sphere' ? Math.sqrt(Math.max(0, 1 - clamp(nx*nx + ny*ny))) : 1;
      // Curved highlight bands approximate a twisted normal field in screen space.
      const twistShade = twist.enabled && shape === 'sphere'
        ? 0.78 + 0.22 * Math.cos(twist.bands * Math.atan2(ny, nx) + twist.rotation + t * 0.19 + twist.amount * nz * 3)
        : 1;
      const diffuse = shape === 'sphere' ? 0.55 + 0.45 * nz : 1;
      mixLight(color, palette, clamp(0.2 + local * u.surfaceResponse * diffuse * twistShade));
      if (local > 0) addLight(color, [sr/local, sg/local, sb/local, 1], local * u.surfaceResponse * 0.35);
    }
    const edgePalette = samplePalette(u.colorsEdge, clamp(field * u.edgeResponse));
    const reflected: [number, number, number, number] = [
      edgeRgb[0] * 0.72 + edgePalette[0] * 0.28,
      edgeRgb[1] * 0.72 + edgePalette[1] * 0.28,
      edgeRgb[2] * 0.72 + edgePalette[2] * 0.28, 1,
    ];
    const edgeStrength = field * u.edgeResponse;
    if (dist > 0) {
      const halo = Math.exp(-0.5 * (dist / Math.max(1, u.outerReach * (0.5 + u.softness))) ** 2);
      const bounce = Math.exp(-0.5 * (dist / Math.max(1, u.backgroundReach * (0.6 + u.softness))) ** 2);
      if (enabled.background) addLight(color, reflected, bounce * edgeStrength * u.emission * u.backgroundBounce * 0.42);
      if (enabled.outer) addLight(color, reflected, halo * edgeStrength * u.emission * 0.85);
    } else if (enabled.inner) {
      const near = Math.exp(-0.5 * (dist / Math.max(1, u.innerReach * (0.45 + u.softness))) ** 2);
      addLight(color, reflected, near * edgeStrength * u.emission * 0.5);
    }
    if (enabled.edge) {
      const rim = Math.exp(-0.5 * (dist / Math.max(1, u.edgeWidth * (0.3 + u.softness * 0.45))) ** 2);
      addLight(color, reflected, rim * edgeStrength);
    }
    const idx = (py * size + px) * 4;
    for (let c = 0; c < 3; c++) image.data[idx + c] = Math.round(clamp(color[c] / 255) * 255);
    image.data[idx + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);
}
// Crystal Chamber: compose the original 2D glass material with an independently
// rasterized parametric surface. Both renderers sample the SAME spatial lights.
type CrystalSettings = { enabled:boolean; transparency:number; innerScale:number; innerOpacity:number; lens:number; tint:number; rimBoost:number };
const initialCrystal: CrystalSettings = { enabled:true, transparency:.68, innerScale:.78, innerOpacity:.92, lens:.16, tint:.18, rimBoost:.4 };
function renderCrystal(canvas:HTMLCanvasElement, base:HTMLCanvasElement, sheet:HTMLCanvasElement, c:CrystalSettings) {
  const ctx=canvas.getContext('2d',{alpha:false});
  const bc=base.getContext('2d'); const sc=sheet.getContext('2d');
  if(!ctx||!bc||!sc)return;
  const n=canvas.width, original=bc.getImageData(0,0,n,n), internal=sc.getImageData(0,0,n,n);
  const out=ctx.createImageData(n,n), dst=out.data, a=original.data, b=internal.data;
  const center=n*.5, radius=n*.305, inv=1/radius;
  // The surface is already rendered in screen space. Its pixels are remapped
  // inside the orb, then refracted near the glass boundary.
  for(let y=0;y<n;y++)for(let x=0;x<n;x++){
    const o=(y*n+x)*4, dx=(x-center)*inv,dy=(y-center)*inv,r=Math.hypot(dx,dy);
    for(let k=0;k<3;k++)dst[o+k]=a[o+k];
    dst[o+3]=255;
    if(r>=1)continue;
    const edge=Math.max(0,1-r*r);
    const refraction=c.lens*(1-edge)*(.4+.6*Math.sqrt(edge));
    const shrink=Math.max(.12,c.innerScale);
    const ix=center+(dx*(1+refraction)*radius)/shrink;
    const iy=center+(dy*(1+refraction)*radius)/shrink;
    const sx=Math.round(ix),sy=Math.round(iy);
    if(sx<0||sy<0||sx>=n||sy>=n)continue;
    const si=(sy*n+sx)*4;
    // The sheet renderer uses #040711 as its background. Reject background
    // pixels without deleting low-light portions of the actual sheet.
    const peak=Math.max(b[si]-4,b[si+1]-7,b[si+2]-17);
    const sheetMask=Math.min(1,Math.max(0,(peak-5)/25));
    const containment=Math.min(1,Math.max(0,(1-r)*radius/3));
    const opacity=c.transparency*c.innerOpacity*sheetMask*containment;
    const glassTransmission=.38+.62*Math.sqrt(edge);
    for(let k=0;k<3;k++){
      const inner=b[si+k]*(1-c.tint)+a[o+k]*c.tint;
      const transmitted=inner*glassTransmission+a[o+k]*(1-glassTransmission);
      dst[o+k]=Math.min(255,Math.round(a[o+k]*(1-opacity)+transmitted*opacity));
    }
    // Keep the original bright surface highlights visible over the chamber.
    const shine=Math.min(1,Math.max(0,(Math.max(a[o],a[o+1],a[o+2])-110)/130));
    const front=shine*(.3+.45*(1-c.transparency));
    for(let k=0;k<3;k++)dst[o+k]=Math.round(dst[o+k]*(1-front)+a[o+k]*front);
    // Thin glass Fresnel rim: boosts existing color, never a fixed blue ring.
    const rim=Math.pow(Math.max(0,r),22)*c.rimBoost*containment;
    for(let k=0;k<3;k++)dst[o+k]=Math.min(255,Math.round(dst[o+k]+a[o+k]*rim));
  }
  ctx.putImageData(out,0,0);
}
// Geometry is displaced BEFORE lighting. This is a projected height-field mesh,
// not a texture-coordinate warp. No 3D light transport is calculated.
type SurfaceMode = 'twist-sheet' | 'bessel' | 'waves';
type SurfaceSettings = {
  enabled: boolean; mode: SurfaceMode; amplitude: number; folds: number;
  twist: number; tilt: number; spin: number; wireframe: boolean; animate: boolean;
};
const initialSurface: SurfaceSettings = {
  enabled: false, mode: 'bessel', amplitude: 0.7, folds: 3,
  twist: 1.1, tilt: 0.7, spin: 0.35, wireframe: false, animate: true,
};
function surfaceHeight(x: number, y: number, v: SurfaceSettings, t: number): number {
  const r = Math.hypot(x, y), a = Math.atan2(y, x);
  const phase = v.animate ? t * 0.65 : 0;
  if (v.mode === 'twist-sheet') {
    // Sheet folded around a moving axis; envelope tapers at the boundary.
    const theta = a + v.twist * (1 - r) + phase;
    return v.amplitude * Math.sin(v.folds * theta) * Math.pow(Math.max(0, 1-r*r), 0.55);
  }
  if (v.mode === 'waves') {
    return v.amplitude * (0.55 * Math.sin(v.folds * 2.3 * x + v.twist * y + phase)
      + 0.45 * Math.sin(v.folds * 2.0 * y - v.twist * x - phase * 0.75)) * (1 - 0.25*r*r);
  }
  // Bessel-like clamped circular membrane: radial nodes plus azimuthal lobes.
  // The inexpensive polynomial radial approximation is NOT an exact Bessel J_m.
  const m = Math.max(0, Math.round(v.folds));
  const radial = Math.pow(Math.max(0, 1-r*r), 1.1) * Math.cos(Math.PI * v.twist * r);
  return v.amplitude * radial * Math.cos(m * a + phase);
}
type MeshVertex = { x:number; y:number; sx:number; sy:number; z:number; nx:number; ny:number; nz:number };
// Rasterize the projected sheet into a per-pixel geometry buffer, then apply
// the SAME spatial-light/material response as the undeformed 2D object.
// This is a screen-space 2.5D approximation, not physical 3D illumination.
function renderSurface(canvas: HTMLCanvasElement, v: SurfaceSettings, u: Unified, lights: SpatialLight[], enabled: Record<EffectId,boolean>, t: number) {
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) return;
  const size = canvas.width, total = size * size, center = size * .5, scale = size * .305;
  const rings = 32, sectors = 96, ca = Math.cos(v.spin), sa = Math.sin(v.spin);
  const tiltCos = Math.cos(v.tilt), tiltSin = Math.sin(v.tilt);
  const verts: MeshVertex[][] = [];
  function project(x:number,y:number,z:number):[number,number] {
    const rx=x*ca-y*sa, ry=x*sa+y*ca;
    return [center+rx*scale, center+(ry*tiltCos-z*tiltSin)*scale];
  }
  for(let j=0;j<=rings;j++) {
    const ring:MeshVertex[]=[];
    const radius=j/rings;
    for(let k=0;k<=sectors;k++) {
      const a=k/sectors*Math.PI*2, x=radius*Math.cos(a), y=radius*Math.sin(a);
      const z=surfaceHeight(x,y,v,t), h=.008;
      const dzdx=(surfaceHeight(x+h,y,v,t)-surfaceHeight(x-h,y,v,t))/(2*h);
      const dzdy=(surfaceHeight(x,y+h,v,t)-surfaceHeight(x,y-h,v,t))/(2*h);
      const inv=1/Math.hypot(dzdx,dzdy,1);
      const [sx,sy]=project(x,y,z);
      ring.push({x,y,z,sx,sy,nx:-dzdx*inv,ny:-dzdy*inv,nz:inv});
    }
    verts.push(ring);
  }
  const uvx=new Float32Array(total), uvy=new Float32Array(total);
  const normalX=new Float32Array(total),normalY=new Float32Array(total),normalZ=new Float32Array(total);
  const depth=new Float32Array(total).fill(-Infinity);
  const covered=new Uint8Array(total);
  const image=ctx.createImageData(size,size);
  // Pixel barycentric interpolation removes the old per-triangle flat colors.
  function triangle(a:MeshVertex,b:MeshVertex,c:MeshVertex) {
    const den=(b.sy-c.sy)*(a.sx-c.sx)+(c.sx-b.sx)*(a.sy-c.sy);
    if(Math.abs(den)<1e-8)return;
    const minX=Math.max(0,Math.floor(Math.min(a.sx,b.sx,c.sx)));
    const maxX=Math.min(size-1,Math.ceil(Math.max(a.sx,b.sx,c.sx)));
    const minY=Math.max(0,Math.floor(Math.min(a.sy,b.sy,c.sy)));
    const maxY=Math.min(size-1,Math.ceil(Math.max(a.sy,b.sy,c.sy)));
    // Camera depth: projected rotated Y and height Z, not just world Z.
    const da=(a.x*sa+a.y*ca)*tiltSin+a.z*tiltCos;
    const db=(b.x*sa+b.y*ca)*tiltSin+b.z*tiltCos;
    const dc=(c.x*sa+c.y*ca)*tiltSin+c.z*tiltCos;
    for(let py=minY;py<=maxY;py++)for(let px=minX;px<=maxX;px++) {
      const x=px+.5,y=py+.5;
      const w0=((b.sy-c.sy)*(x-c.sx)+(c.sx-b.sx)*(y-c.sy))/den;
      const w1=((c.sy-a.sy)*(x-c.sx)+(a.sx-c.sx)*(y-c.sy))/den;
      const w2=1-w0-w1;
      if(w0<-.00001||w1<-.00001||w2<-.00001)continue;
      const i=py*size+px,d=w0*da+w1*db+w2*dc;
      if(d<=depth[i])continue;
      depth[i]=d;covered[i]=1;
      uvx[i]=w0*a.x+w1*b.x+w2*c.x;
      uvy[i]=w0*a.y+w1*b.y+w2*c.y;
      normalX[i]=w0*a.nx+w1*b.nx+w2*c.nx;
      normalY[i]=w0*a.ny+w1*b.ny+w2*c.ny;
      normalZ[i]=w0*a.nz+w1*b.nz+w2*c.nz;
    }
  }
  for(let j=0;j<rings;j++)for(let k=0;k<sectors;k++) {
    const a=verts[j][k],b=verts[j+1][k],c=verts[j+1][k+1],d=verts[j][k+1];
    triangle(a,b,c);triangle(a,c,d);
  }
  // Find the visible silhouette, including folds that project outside the
  // original circular rim. Propagate the nearest silhouette seed to both sides.
  const nearest=new Int32Array(total).fill(-1);
  const distance=new Float32Array(total).fill(1e8);
  for(let y=1;y<size-1;y++)for(let x=1;x<size-1;x++) {
    const i=y*size+x,inside=covered[i];
    if(covered[i-1]!==inside||covered[i+1]!==inside||covered[i-size]!==inside||covered[i+size]!==inside){
      nearest[i]=inside?i:(covered[i-1]?i-1:covered[i+1]?i+1:covered[i-size]?i-size:i+size);
      distance[i]=0;
    }
  }
  // Chamfer nearest-boundary propagation. This is deliberately screen-space:
  // the edge glows follow the *visible projected silhouette* of the sheet.
  function relax(i:number,j:number,cost:number){
    const d=distance[j]+cost;
    if(d<distance[i]){distance[i]=d;nearest[i]=nearest[j];}
  }
  for(let y=1;y<size-1;y++)for(let x=1;x<size-1;x++){
    const i=y*size+x;relax(i,i-1,1);relax(i,i-size,1);relax(i,i-size-1,1.4142);relax(i,i-size+1,1.4142);
  }
  for(let y=size-2;y>=1;y--)for(let x=size-2;x>=1;x--){
    const i=y*size+x;relax(i,i+1,1);relax(i,i+size,1);relax(i,i+size+1,1.4142);relax(i,i+size-1,1.4142);
  }
  const activeLights=lights.filter(l=>l.enabled).map(l=>({light:l,rgb:hexRgb(l.color)}));
  // Cache light evaluation on boundary seeds, shared by edge, inner glow,
  // outer glow and background. All derive from the same source lights.
  const field=new Float32Array(total), red=new Float32Array(total),green=new Float32Array(total),blue=new Float32Array(total);
  for(let i=0;i<total;i++)if(distance[i]===0&&covered[i]){
    let sum=0,rr=0,gg=0,bb=0;
    for(const {light,rgb} of activeLights){
      const w=spatialSample(light,uvx[i],uvy[i]);sum+=w;rr+=w*rgb[0];gg+=w*rgb[1];bb+=w*rgb[2];
    }
    const a=Math.atan2(uvy[i],uvx[i]);
    const gain=.65+.35*masterLight(((a+Math.PI/2)/(Math.PI*2)+1)%1,u,t);
    field[i]=sum*gain;
    if(sum>1e-6){red[i]=rr/sum;green[i]=gg/sum;blue[i]=bb/sum;}
  }
  for(let py=0;py<size;py++)for(let px=0;px<size;px++){
    const i=py*size+px, inside=covered[i]===1, dist=distance[i]*(inside?-1:1);
    const color=[4,7,17];
    if(inside&&enabled.surface){
      let power=0,rr=0,gg=0,bb=0;
      for(const {light,rgb} of activeLights){
        const w=spatialSample(light,uvx[i],uvy[i]);power+=w;rr+=rgb[0]*w;gg+=rgb[1]*w;bb+=rgb[2]*w;
      }
      // Normal-based modulation is subtle: it shapes the reflected light but
      // never replaces the original continuous 2D spatial gradients.
      const shade=clamp(.78+.16*normalZ[i]-.08*normalX[i]-.07*normalY[i],.5,1.08);
      const pal=samplePalette(u.colorsSurface,clamp(power*u.surfaceResponse));
      mixLight(color,pal,clamp((.2+power*u.surfaceResponse)*shade));
      if(power>1e-6)addLight(color,[rr/power,gg/power,bb/power,1],power*u.surfaceResponse*.35*shade);
    }
    const seed=nearest[i];
    if(seed>=0){
      const strength=field[seed]*u.edgeResponse;
      const pal=samplePalette(u.colorsEdge,clamp(strength));
      const reflected:[number,number,number,number]=[
        red[seed]*.72+pal[0]*.28,green[seed]*.72+pal[1]*.28,blue[seed]*.72+pal[2]*.28,1
      ];
      if(!inside){
        const halo=Math.exp(-.5*(dist/Math.max(1,u.outerReach*(.5+u.softness)))**2);
        const bounce=Math.exp(-.5*(dist/Math.max(1,u.backgroundReach*(.6+u.softness)))**2);
        if(enabled.background)addLight(color,reflected,bounce*strength*u.emission*u.backgroundBounce*.42);
        if(enabled.outer)addLight(color,reflected,halo*strength*u.emission*.85);
      }else if(enabled.inner){
        const near=Math.exp(-.5*(dist/Math.max(1,u.innerReach*(.45+u.softness)))**2);
        addLight(color,reflected,near*strength*u.emission*.5);
      }
      if(enabled.edge){
        const rim=Math.exp(-.5*(dist/Math.max(1,u.edgeWidth*(.3+u.softness*.45)))**2);
        addLight(color,reflected,rim*strength);
      }
    }
    const o=i*4;
    image.data[o]=Math.round(clamp(color[0]/255)*255);
    image.data[o+1]=Math.round(clamp(color[1]/255)*255);
    image.data[o+2]=Math.round(clamp(color[2]/255)*255);
    image.data[o+3]=255;
  }
  ctx.putImageData(image,0,0);
  if(v.wireframe){
    ctx.save();ctx.strokeStyle='rgba(190,232,255,.19)';ctx.lineWidth=.45;
    for(let j=0;j<rings;j+=2)for(let k=0;k<sectors;k+=3){
      const a=verts[j][k],b=verts[j+1][k],c=verts[j+1][k+1];
      ctx.beginPath();ctx.moveTo(a.sx,a.sy);ctx.lineTo(b.sx,b.sy);ctx.lineTo(c.sx,c.sy);ctx.stroke();
    }
    ctx.restore();
  }
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
function SpatialLightsControls({ lights, selected, onSelect, onChange }: {
  lights: SpatialLight[]; selected: number; onSelect: (id: number) => void; onChange: React.Dispatch<React.SetStateAction<SpatialLight[]>>;
}) {
  const current = lights.find(l => l.id === selected) ?? lights[0];
  const patch = (changes: Partial<SpatialLight>) => { const id = current?.id; onChange(prev => prev.map(l => l.id === id ? { ...l, ...changes } : l)); };
  const add = (kind: SpatialLight['kind']) => {
    const id = Math.max(0, ...lights.map(l => l.id)) + 1;
    onChange(prev => [...prev, { id, kind, enabled: true, x: 0, y: 0, angle: 0, radius: 0.7, aspect: 1, intensity: 1, color: '#a8ddff' }]);
    onSelect(id);
  };
  return <div className="ml-section ml-light-editor"><h4>FUENTES ESPACIALES · ILUMINACIÓN COMPARTIDA</h4>
    <p>Cada fuente ilumina superficie y contorno; el contorno propaga el reflejo a las cinco regiones. Coordenadas relativas al objeto.</p>
    <div className="ml-light-actions"><button onClick={() => add('radial')}>+ Radial</button><button onClick={() => add('linear')}>+ Lineal</button></div>
    <div className="ml-light-list">{lights.map(l => <div key={l.id} className={l.id === current?.id ? 'active' : ''}>
      <input aria-label={`Activar luz ${l.id}`} type="checkbox" checked={l.enabled} onChange={e => onChange(prev => prev.map(item => item.id === l.id ? {...item, enabled: e.target.checked} : item))}/>
      <button onClick={() => onSelect(l.id)}>{l.kind === 'radial' ? '◉' : '▥'} Luz {l.id}</button>
      <span style={{background:l.color}} className="ml-light-swatch"/>
    </div>)}</div>
    {current && <><div className="ml-light-actions"><button onClick={() => patch({kind: current.kind === 'radial' ? 'linear' : 'radial'})}>Tipo: {current.kind}</button><button disabled={lights.length <= 1} onClick={() => {onChange(prev => prev.filter(l => l.id !== current.id));onSelect(lights.find(l => l.id !== current.id)?.id ?? 0);}}>Eliminar</button></div>
      <label className="ml-light-color">Color <input type="color" value={current.color} onChange={e => patch({color:e.target.value})}/></label>
      <NumberSlider label="Posición X" automationId={`light:${current.id}:x`} value={current.x} min={-2} max={2} step={0.01} onChange={x => patch({x})}/>
      <NumberSlider label="Posición Y" automationId={`light:${current.id}:y`} value={current.y} min={-2} max={2} step={0.01} onChange={y => patch({y})}/>
      <NumberSlider label={current.kind === 'radial' ? 'Radio' : 'Anchura de banda'} automationId={`light:${current.id}:radius`} value={current.radius} min={0.05} max={2.5} step={0.01} onChange={radius => patch({radius})}/>
      {current.kind === 'radial' && <NumberSlider label="Proporción elíptica" automationId={`light:${current.id}:aspect`} value={current.aspect} min={0.2} max={2.5} step={0.01} onChange={aspect => patch({aspect})}/>}
      <NumberSlider label="Rotación (radianes)" automationId={`light:${current.id}:angle`} value={current.angle} min={-3.14} max={3.14} step={0.01} onChange={angle => patch({angle})}/>
      <NumberSlider label="Intensidad" automationId={`light:${current.id}:intensity`} value={current.intensity} min={0} max={2.5} step={0.01} onChange={intensity => patch({intensity})}/>
    </>}
  </div>;
}
function MasterCurve({ value }: { value: Unified }) {
  const path = Array.from({ length: 201 }, (_, i) => {
    const s = i / 200;
    return `${i ? 'L' : 'M'} ${s * 320} ${96 - masterLight(s, value, 0) * 80}`;
  }).join(' ');
  return <svg className="ml-curve" viewBox="0 0 320 108" preserveAspectRatio="none" aria-label="Curva maestra periódica"><path d="M0 96 H320" stroke="#3b4761" strokeDasharray="4 4"/><path d={path} stroke="#69c6ff" strokeWidth="2.5" fill="none"/><circle cx="0" cy={96-masterLight(0,value,0)*80} r="3" fill="#ffffff"/><circle cx="320" cy={96-masterLight(1,value,0)*80} r="3" fill="#ffffff"/></svg>;
}
function UnifiedControls({ value, onChange }: { value: Unified; onChange: (patch: Partial<Unified>) => void }) {
  const slider = (label: string, key: keyof Unified, min: number, max: number, step = 0.01) => <NumberSlider label={label} automationId={`unified:${key}`} value={value[key] as number} min={min} max={max} step={step} onChange={v => onChange({ [key]: v })}/>;
  const palette = (key: 'colorsSurface' | 'colorsEdge', title: string) => <div className="ml-section"><h4>{title}</h4><div className="ml-gradient" style={{ background: `linear-gradient(90deg, ${value[key].map((c,i) => `${c.hex} ${i*25}%`).join(', ')})` }}/><div className="ml-colors">{value[key].map((c,i) => <ColorEditor key={i} label={`Color ${i+1} · ${i*25}%`} value={c} onChange={next => onChange({ [key]: value[key].map((old,j) => j === i ? next : old) })}/>)}</div></div>;
  return <><p>Una sola función periódica alimenta las cinco regiones. Dos paletas describen la respuesta de la superficie y el borde.</p><div className="ml-section"><h4>CAMPO MAESTRO · UNA SOLA CURVA</h4><MasterCurve value={value}/>{slider('Ciclos completos', 'cycles', 1, 12, 1)}{slider('Amplitud', 'amplitude', 0, 1)}{slider('Fase', 'phase', 0, 6.28)}{slider('Velocidad', 'animateSpeed', 0, 2)}{slider('Luz ambiente', 'ambient', 0, 0.5)}</div>{palette('colorsSurface','REFLECTANCIA · SUPERFICIE')}{palette('colorsEdge','REFLECTANCIA · BORDE')}<div className="ml-section"><h4>RESPUESTA MATERIAL</h4>{slider('Reflectancia superficial', 'surfaceResponse', 0, 2)}{slider('Reflectancia de borde', 'edgeResponse', 0, 2)}{slider('Emisión / dispersión', 'emission', 0, 2)}{slider('Rebote al fondo', 'backgroundBounce', 0, 2)}</div><div className="ml-section"><h4>PROPAGACIÓN DESDE EL CONTORNO</h4>{slider('Grosor de borde', 'edgeWidth', 2, 35, 1)}{slider('Alcance interior', 'innerReach', 1, 110, 1)}{slider('Alcance exterior', 'outerReach', 1, 130, 1)}{slider('Alcance del fondo', 'backgroundReach', 1, 200, 1)}{slider('Suavidad', 'softness', 0, 1)}</div><button className="ml-reset" onClick={() => onChange(unifiedInitial)}>Restablecer campo</button></>;
}
// Per-slider automation: each mounted slider registers its current setter.
// Animation uses elapsed time, not frame count, and bounces at both endpoints.
type SliderAutomation = {
  active: Record<string, boolean>;
  toggle: (id: string) => void;
  register: (id: string, spec: SliderDriver) => void;
  unregister: (id: string) => void;
};
type SliderDriver = { value: number; min: number; max: number; step: number; onChange: (value: number) => void };
const SliderAutomationContext = createContext<SliderAutomation | null>(null);

function NumberSlider({ label, value, min, max, step = 1, onChange, automationId }: { label: string; value: number; min: number; max: number; step?: number; onChange: (v: number) => void; canAutomate?: boolean; automationId?: string }) {
  const automation = useContext(SliderAutomationContext);
  const generatedId = useId();
  const id = automationId ?? generatedId;
  const latest = useRef<SliderDriver>({ value, min, max, step, onChange });
  latest.current = { value, min, max, step, onChange };
  useEffect(() => {
    if (!automation || automationId?.startsWith('light:')) return;
    // Keep a stable driver object; its values and callback always stay current.
    const driver: SliderDriver = {
      get value() { return latest.current.value; },
      get min() { return latest.current.min; },
      get max() { return latest.current.max; },
      get step() { return latest.current.step; },
      onChange: next => latest.current.onChange(next),
    };
    automation.register(id, driver);
    return () => automation.unregister(id);
  }, [automation?.register, automation?.unregister, id, automationId]);
  const active = !!automation?.active[id];
  return <div className={`ml-slider ${active ? 'ml-slider-automated' : ''}`}>
    <div className="ml-slider-heading"><span>{label}</span><div className="ml-slider-actions"><strong>{Number(value.toFixed(2))}</strong>{automation && <button type="button" className="ml-slider-auto" aria-label={`${active ? 'Desactivar' : 'Activar'} animación automática de ${label}`} aria-pressed={active} title={active ? 'Detener animación de este slider' : 'Animar de izquierda a derecha y regresar'} onClick={() => automation.toggle(id)}>{active ? '◆' : '↔'}</button>}</div></div>
    <input aria-label={label} type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(Number(e.target.value))} />
  </div>;
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
  const [nativeGPU, setNativeGPU] = useState(true);
  const [gpuError, setGpuError] = useState('');
  const gpuCanvasRef = useRef<HTMLCanvasElement>(null);
  const gpuRenderer = useRef<NativeGLSLRenderer | null>(null);
  const [settings, setSettings] = useState<Settings>(initial);
  const [selected, setSelected] = useState<EffectId>('edge');
  const [animate, setAnimate] = useState(true);
  const [unifiedMode, setUnifiedMode] = useState(true);
  const [unified, setUnified] = useState<Unified>(unifiedInitial);
  const [spatialMode, setSpatialMode] = useState(true);
  const [lights, setLights] = useState<SpatialLight[]>(defaultLights);
  const [selectedLight, setSelectedLight] = useState(1);
  const [twist, setTwist] = useState<TwistSettings>(initialTwist);
  const [surface, setSurface] = useState<SurfaceSettings>(initialSurface);
  const [crystal, setCrystal] = useState<CrystalSettings>(initialCrystal);
  const [autoSliders, setAutoSliders] = useState<Record<string, boolean>>({});
  const [fpsStats, setFpsStats] = useState({ fps: 0, renderMs: 0 });
  const [videoSeconds, setVideoSeconds] = useState(5);
  const [videoStatus, setVideoStatus] = useState('');
  const [videoExporting, setVideoExporting] = useState(false);
  const exportBusy = useRef(false);
  const [autoSpeed, setAutoSpeed] = useState(0.25); // full slider ranges per second
  const drivers = useRef(new Map<string, SliderDriver>());
  const motion = useRef(new Map<string, { position: number; direction: 1 | -1 }>());
  const automationRunning = useRef({ active: autoSliders, speed: autoSpeed, playing: animate });
  automationRunning.current = { active: autoSliders, speed: autoSpeed, playing: animate };
  const registerSlider = useRef((id: string, driver: SliderDriver) => { drivers.current.set(id, driver); });
  const unregisterSlider = useRef((id: string) => { drivers.current.delete(id); });
  const toggleSlider = useRef((id: string) => {
    setAutoSliders(prev => {
      if (!prev[id]) {
        const driver = drivers.current.get(id);
        if (driver) motion.current.set(id, { position: driver.value, direction: 1 });
      } else motion.current.delete(id);
      return { ...prev, [id]: !prev[id] };
    });
  });
  // All light drivers stay registered even when another light is selected.
  // IDs are based on light identity + property, never the mounted slider position.
  const lightsLatest = useRef(lights);
  lightsLatest.current = lights;
  useEffect(() => {
    const fields: Array<[keyof SpatialLight, number, number, number]> = [
      ['x', -2, 2, 0.01], ['y', -2, 2, 0.01],
      ['radius', 0.05, 2.5, 0.01], ['aspect', 0.2, 2.5, 0.01],
      ['angle', -3.14, 3.14, 0.01], ['intensity', 0, 2.5, 0.01],
    ];
    const valid = new Set<string>();
    for (const light of lights) for (const [field, min, max, step] of fields) {
      const id = `light:${light.id}:${field}`;
      valid.add(id);
      if (drivers.current.has(id)) continue;
      drivers.current.set(id, {
        get value() { return Number(lightsLatest.current.find(l => l.id === light.id)?.[field] ?? min); },
        min, max, step,
        onChange: value => setLights(prev => prev.map(l => l.id === light.id ? { ...l, [field]: value } : l)),
      });
    }
    for (const id of drivers.current.keys()) {
      if (id.startsWith('light:') && !valid.has(id)) {
        drivers.current.delete(id);
        motion.current.delete(id);
      }
    }
  }, [lights]);
  const gpuSupported = unifiedMode && spatialMode && shape === 'sphere';
  const gpuActive = nativeGPU && gpuSupported;
  const gpuUnsupportedReasons = [
    !unifiedMode && 'Campo unificado desactivado',
    !spatialMode && 'Luces espaciales desactivadas',
    shape !== 'sphere' && 'La forma seleccionada no es Esfera 3D',
  ].filter(Boolean) as string[];
  const gpuReady = gpuActive && !!gpuRenderer.current && !gpuError;
  const selectCompatibleGpuView = () => {
    setUnifiedMode(true); setSpatialMode(true); setShape('sphere');
    setSurface(v => ({...v, enabled:false}));
    setTwist(v => ({...v, enabled:false}));
    setNativeGPU(true); setGpuError('');
  };
  const isGpuParameter = (id:string) => id.startsWith('light:') || id.startsWith('unified:');
  const animationsForShader = ():GLSLAnimations => {
    const out:GLSLAnimations = {};
    for (const [id, driver] of drivers.current) {
      if (!autoSliders[id] || !isGpuParameter(id)) continue;
      const m=motion.current.get(id) ?? {position:driver.value,direction:1 as const};
      out[id]={min:driver.min,max:driver.max,start:m.position,direction:m.direction,speed:autoSpeed};
    }
    return out;
  };
  const [gpuAnimationRevision, setGpuAnimationRevision] = useState(0);
  const animationClock = useRef({elapsed:0,last:0});
  const automationContext: SliderAutomation = {
    active: autoSliders, toggle: toggleSlider.current,
    register: registerSlider.current, unregister: unregisterSlider.current,
  };
  useEffect(() => {
    let previous = performance.now();
    const timer = window.setInterval(() => {
      const now = performance.now();
      const dt = Math.min(0.15, (now - previous) / 1000);
      previous = now;
      const { active, speed, playing } = automationRunning.current;
      if (!playing || exportBusy.current) return;
      for (const [id, driver] of drivers.current) {
        if (!active[id] || driver.max <= driver.min || (gpuActiveRef.current && isGpuParameter(id))) continue;
        const range = driver.max - driver.min;
        const state = motion.current.get(id) ?? { position: driver.value, direction: 1 as const };
        let position = state.position + state.direction * range * speed * dt;
        let direction: 1 | -1 = state.direction;
        while (position > driver.max || position < driver.min) {
          if (position > driver.max) { position = 2 * driver.max - position; direction = -1; }
          else { position = 2 * driver.min - position; direction = 1; }
        }
        const step = driver.step > 0 ? driver.step : 0.01;
        const quantized = Math.max(driver.min, Math.min(driver.max, driver.min + Math.round((position - driver.min) / step) * step));
        motion.current.set(id, { position, direction });
        if (Math.abs(quantized - driver.value) > step * 0.001) driver.onChange(Number(quantized.toFixed(6)));
      }
    }, 50);
    return () => window.clearInterval(timer);
  }, []);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gpuActiveRef=useRef(false);
  gpuActiveRef.current=gpuActive;
  useEffect(()=>{ animationClock.current.elapsed=0; setGpuAnimationRevision(v=>v+1); },[autoSliders,autoSpeed]);
  const glslSource = useMemo(()=>makeShadertoyGLSL(unified, lights, { edge:settings.edge.enabled, inner:settings.inner.enabled, outer:settings.outer.enabled, surface:settings.surface.enabled, background:settings.background.enabled },animationsForShader(), {twist,surface,crystal}),[unified,lights,settings,autoSliders,autoSpeed,gpuAnimationRevision,twist,surface,crystal]);
  useEffect(() => {
    gpuRenderer.current?.dispose();gpuRenderer.current=null;
    if (!nativeGPU || !gpuSupported || !gpuCanvasRef.current) return;
    try {gpuRenderer.current=new NativeGLSLRenderer(gpuCanvasRef.current,glslSource);setGpuError('');}
    catch(err){setGpuError(err instanceof Error?err.message:String(err));}
    return ()=>{gpuRenderer.current?.dispose();gpuRenderer.current=null;};
  },[nativeGPU,gpuSupported,glslSource]);
  const exportGLSL=()=>{
    if (!gpuReady) {
      setGpuError('Exportación bloqueada: el visor actual no está ejecutando este shader GLSL. No se exportará otro material distinto. Activa la vista compatible GPU o espera a portar los efectos Canvas.');
      return;
    }
    const blob=new Blob([glslSource],{type:'text/plain'});const url=URL.createObjectURL(blob);
    const a=document.createElement('a');a.href=url;a.download='shadex-material-v15-shadertoy.glsl';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  };

  const snapshot = useRef({ shape, settings, animate, unifiedMode, unified, spatialMode, lights, twist, surface, crystal });
  snapshot.current = { shape, settings, animate, unifiedMode, unified, spatialMode, lights, twist, surface, crystal };
  // One render path for preview and video, so exports include the exact same layers.
  const buffers = useRef<{ base: HTMLCanvasElement; sheet: HTMLCanvasElement } | null>(null);
  function drawScene(canvas: HTMLCanvasElement, v: typeof snapshot.current, time: number) {
    if (!buffers.current) {
      const base = document.createElement('canvas'), sheet = document.createElement('canvas');
      base.width = sheet.width = 360; base.height = sheet.height = 360;
      buffers.current = { base, sheet };
    }
    const { base, sheet } = buffers.current;
    const enabled = { edge:v.settings.edge.enabled, inner:v.settings.inner.enabled, outer:v.settings.outer.enabled, surface:v.settings.surface.enabled, background:v.settings.background.enabled };
    if (v.unifiedMode && v.spatialMode && v.surface.enabled && v.crystal.enabled && v.shape === 'sphere') {
      renderSpatial(base,v.shape,v.unified,v.lights,enabled,time,{...v.twist,enabled:false});
      renderSurface(sheet,v.surface,v.unified,v.lights,enabled,time);
      renderCrystal(canvas,base,sheet,v.crystal);
    } else if (v.unifiedMode && v.spatialMode && v.surface.enabled) renderSurface(canvas,v.surface,v.unified,v.lights,enabled,time);
    else if (v.unifiedMode && v.spatialMode) renderSpatial(canvas,v.shape,v.unified,v.lights,enabled,time,v.twist);
    else if (v.unifiedMode) renderUnified(canvas,v.shape,v.unified,enabled,time);
    else render(canvas,v.shape,v.settings,time);
  }
  const nativeGpuState = useRef(false);
  nativeGpuState.current = gpuReady;
  useEffect(() => {
    let raf = 0;
    let sampleStart = performance.now(), sampleFrames = 0, renderSum = 0;
    let last = performance.now();
    const tick = (now:number) => {
      const dt=Math.min(0.1,(now-last)/1000);last=now;
      if (!exportBusy.current) {
        if (snapshot.current.animate) animationClock.current.elapsed+=dt;
        const renderStart=performance.now();
        const canvas=canvasRef.current;
        if (nativeGpuState.current && gpuRenderer.current) gpuRenderer.current.draw(animationClock.current.elapsed);
        else if (canvas) drawScene(canvas,snapshot.current,animationClock.current.elapsed);
        sampleFrames++;
        renderSum+=performance.now()-renderStart;
        const elapsed=performance.now()-sampleStart;
        if(elapsed>=1000){setFpsStats({fps:sampleFrames*1000/elapsed,renderMs:renderSum/Math.max(1,sampleFrames)});sampleFrames=0;renderSum=0;sampleStart=now;}
      } else {sampleStart=now;sampleFrames=0;renderSum=0;}
      raf=requestAnimationFrame(tick);
    };
    raf=requestAnimationFrame(tick);
    return ()=>cancelAnimationFrame(raf);
  }, []);
  // Offline frame generation followed by real-time encoding. MediaRecorder timestamps
  // are wall-clock based, so expensive rendering must NEVER occur during recording.
  const exportVideo = async () => {
    if (exportBusy.current) return;
    if (typeof MediaRecorder === 'undefined' || !HTMLCanvasElement.prototype.captureStream || typeof createImageBitmap === 'undefined') {
      setVideoStatus('Este navegador no permite exportar video desde Canvas.'); return;
    }
    const mime = ['video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm'].find(t => MediaRecorder.isTypeSupported(t));
    if (!mime) { setVideoStatus('No hay un codificador WebM compatible.'); return; }
    exportBusy.current = true; setVideoExporting(true);
    const oldPlaying = automationRunning.current.playing;
    const oldMotion = new Map([...motion.current].map(([id,m]) => [id,{...m}] as const));
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 360;
    const renderCanvas = document.createElement('canvas'); renderCanvas.width = renderCanvas.height = 360;
    const ctx = canvas.getContext('2d', { alpha:false });
    let stream: MediaStream | undefined;
    let recorder: MediaRecorder | undefined;
    const frames: ImageBitmap[] = [];
    try {
      if (!ctx) throw new Error('No se pudo crear el lienzo de exportación.');
      const fps = 24, total = Math.round(videoSeconds * fps);
      automationRunning.current.playing = false;
      // Phase 1: calculate each frame at a deterministic animation time.
      // Rendering may take minutes; it has no influence on the resulting duration.
      for (let i=0; i<total; i++) {
        flushSync(() => {
          for (const [id, driver] of drivers.current) {
            if (!automationRunning.current.active[id] || driver.max <= driver.min) continue;
            const range = driver.max - driver.min;
            const m = motion.current.get(id) ?? {position:driver.value,direction:1 as const};
            let position = m.position + m.direction * range * automationRunning.current.speed / fps;
            let direction:1|-1 = m.direction;
            while (position > driver.max || position < driver.min) {
              if (position > driver.max) {position=2*driver.max-position; direction=-1;}
              else {position=2*driver.min-position; direction=1;}
            }
            motion.current.set(id,{position,direction});
            const step=driver.step>0?driver.step:0.01;
            const value=Math.max(driver.min,Math.min(driver.max,driver.min+Math.round((position-driver.min)/step)*step));
            driver.onChange(Number(value.toFixed(6)));
          }
        });
        drawScene(renderCanvas,snapshot.current,i/fps);
        frames.push(await createImageBitmap(renderCanvas));
        if (i%6===0) {
          setVideoStatus(`Renderizando fotogramas: ${i+1}/${total} (sin límite de tiempo)`);
          await new Promise<void>(resolve => window.setTimeout(resolve,0));
        }
      }
      // Phase 2: only cheap bitmap blits happen while the recorder is running.
      // MediaRecorder has no explicit frame timestamps; real-time pacing is required.
      stream = canvas.captureStream(0);
      const track = stream.getVideoTracks()[0] as MediaStreamTrack & {requestFrame?:()=>void};
      if (!track?.requestFrame) throw new Error('El navegador no permite capturar fotogramas manualmente.');
      recorder = new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:5_000_000});
      const chunks:Blob[]=[];
      const finished = new Promise<Blob>((resolve,reject)=>{
        recorder!.ondataavailable=e=>{if(e.data.size) chunks.push(e.data);};
        recorder!.onstop=()=>resolve(new Blob(chunks,{type:mime}));
        recorder!.onerror=()=>reject(new Error('Error del codificador de video.'));
      });
      recorder.start();
      const start=performance.now();
      for(let i=0;i<total;i++) {
        const due=start+i*1000/fps;
        const wait=due-performance.now();
        if(wait>0) await new Promise<void>(resolve=>window.setTimeout(resolve,wait));
        ctx.drawImage(frames[i],0,0);
        track.requestFrame();
        if(i%12===0) setVideoStatus(`Codificando: ${i+1}/${total} · 24 FPS`);
      }
      const remaining=start+videoSeconds*1000-performance.now();
      if(remaining>0) await new Promise<void>(resolve=>window.setTimeout(resolve,remaining));
      recorder.stop();
      const blob=await finished;
      if(!blob.size) throw new Error('La grabación no produjo datos.');
      const url=URL.createObjectURL(blob), a=document.createElement('a');
      a.href=url; a.download='shadex-crystal-chamber-24fps.webm'; a.click();
      window.setTimeout(()=>URL.revokeObjectURL(url),30000);
      setVideoStatus(`Video exportado · ${videoSeconds} s · 24 FPS solicitados`);
    } catch(error) {
      setVideoStatus(error instanceof Error?error.message:'Error al exportar video.');
      if(recorder?.state==='recording') recorder.stop();
    } finally {
      frames.forEach(frame=>frame.close());
      stream?.getTracks().forEach(track=>track.stop());
      motion.current=oldMotion;
      automationRunning.current.playing=oldPlaying;
      exportBusy.current=false; setVideoExporting(false);
    }
  };
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
  const exportPng = () => { const canvas = gpuReady ? gpuCanvasRef.current : canvasRef.current; if (!canvas) return; const a = document.createElement('a'); a.download = 'shadex-material.png'; a.href = canvas.toDataURL('image/png'); a.click(); };
  const exportJson = () => { const blob = new Blob([JSON.stringify({ version: 3, shape, mode: unifiedMode ? (spatialMode ? 'spatial' : 'unified') : 'legacy', unified, lights, twist, surface, crystal, effects: settings }, null, 2)], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'shadex-material.json'; a.click(); URL.revokeObjectURL(a.href); };
  return <SliderAutomationContext.Provider value={automationContext}><div className="ml-root">
    <header className="ml-header"><div className="ml-brand"><button onClick={onBack}>← Laboratorio</button><span className="ml-brandmark">◈</span><div><strong>Material Lab</strong><small>SHADEX · FIELD MATERIALS / BETA 0.1</small></div></div><div className="ml-header-actions"><button onClick={() => setUnifiedMode(v => !v)}>{unifiedMode ? '◈ Campo unificado' : '▤ Cinco efectos'}</button>{unifiedMode && <button onClick={() => setSpatialMode(v => !v)}>{spatialMode ? '◉ Luces espaciales' : '◌ Sectores anteriores'}</button>}<button onClick={() => setAnimate(v => !v)}>{animate ? 'Ⅱ Pausar' : '▷ Animar'}</button><span className="ml-auto-count" title="Sliders con animación automática activada">↔ {Object.values(autoSliders).filter(Boolean).length}</span><button onClick={exportJson}>Exportar JSON</button><button onClick={exportGLSL} title={gpuReady ? "Exportar exactamente el shader GLSL que se muestra" : "Solo disponible si el visor está ejecutando GLSL"}>Exportar GLSL</button><button disabled={videoExporting} onClick={exportVideo}>{videoExporting ? "● Grabando…" : "◉ Exportar video"}</button><button className="ml-primary" onClick={exportPng}>Exportar PNG</button></div></header>
    <div className="ml-workspace"><aside className="ml-sidebar"><h3>FORMA</h3><div className="ml-shapes">{(['circle','sphere','rounded','diamond'] as Shape[]).map(s => <button key={s} className={shape === s ? 'active' : ''} onClick={() => setShape(s)}><span>{s === 'sphere' ? '◉' : s === 'circle' ? '○' : s === 'rounded' ? '▢' : '◇'}</span>{({ circle: 'Círculo 2D', sphere: 'Esfera 3D*', rounded: 'Rectángulo', diamond: 'Rombo' })[s]}</button>)}</div><h3>{unifiedMode ? 'REGIONES DERIVADAS · UNA FUENTE' : 'CAPAS / EFECTOS'}</h3><div className="ml-effects">{effects.map(item => <div key={item.id} className={`ml-effect ${selected === item.id ? 'active' : ''}`}><input aria-label={`Activar ${item.name}`} type="checkbox" checked={settings[item.id].enabled} onChange={e => update(item.id, { enabled: e.target.checked })}/><button onClick={() => setSelected(item.id)}><strong>{item.name}</strong><small>{item.subtitle}</small></button></div>)}</div><div className="ml-sidebar-note">{unifiedMode ? 'Cada región usa la misma curva maestra. Los interruptores permiten aislar su contribución para comparar.' : 'Las cinco capas usan máscaras del cuerpo. El fondo radial se limita a su antimáscara.'}</div></aside>
    <main className="ml-stage"><div className="ml-stage-toolbar"><span>{gpuReady ? "VISTA PREVIA · WEBGL2 / GLSL" : "VISTA PREVIA · CANVAS 2D"}</span><span>{unifiedMode ? (spatialMode ? (surface.enabled ? (crystal.enabled && shape === 'sphere' ? 'CRYSTAL CHAMBER · 2.5D' : 'PARAMETRIC SURFACE · MESH 2.5D') : 'SPATIAL LIGHT FIELD · SDF') : 'UNIFIED LIGHT FIELD · SDF') : 'RGBA · MÁSCARA SDF'}</span></div><div className="ml-stage-center"><canvas ref={canvasRef} width={360} height={360} style={{display:gpuReady ? "none":"block"}}/><canvas ref={gpuCanvasRef} width={360} height={360} style={{display:gpuReady ? "block":"none"}}/></div><div className="ml-stage-footer"><span>{unifiedMode ? 'Una curva → cinco respuestas acopladas' : 'Fondo negro · Curvas sinusoidales por contorno'}</span><span className="ml-fps-meter" title="FPS observados y tiempo promedio de renderizado por fotograma">{fpsStats.fps.toFixed(1)} FPS · {fpsStats.renderMs.toFixed(0)} ms/render</span><span>*Esfera: sombreado 3D aproximado</span></div></main>
    <aside className="ml-properties"><div className="ml-section"><h4>GLSL NATIVE · v1.5</h4><label><input type="checkbox" checked={nativeGPU} onChange={e=>setNativeGPU(e.target.checked)}/> Vista previa GLSL · WebGL2</label><p>Esfera, torsión, superficies paramétricas y Crystal Chamber se calculan en GLSL. La superficie usa una aproximación analítica en lugar de la antigua malla Canvas.</p><p role="status"><strong>Motor visible: {gpuReady ? "GPU · GLSL" : "Canvas 2D"}</strong></p>{!gpuReady && <><p>El material visible todavía no es exportable como GLSL. {gpuUnsupportedReasons.join(" · ") || (gpuError || "Activa la vista GPU.")}</p><button type="button" onClick={selectCompatibleGpuView}>Mostrar versión compatible GLSL</button><p>Este botón selecciona la esfera y activa el renderizador GLSL.</p></>}<button type="button" disabled={!gpuReady} onClick={exportGLSL}>Exportar shader visible a Shadertoy</button>{gpuError && <p role="alert">{gpuError}</p>}</div><div className="ml-section ml-video-panel"><h4>EXPORTACIÓN DE VIDEO · 24 FPS</h4><p>Primero calcula todos los fotogramas sin grabar; después los codifica a 24 FPS. El renderizado puede tardar, pero no alarga la grabación.</p><label>Duración <select value={videoSeconds} disabled={videoExporting} onChange={e=>setVideoSeconds(Number(e.target.value))}><option value={3}>3 segundos</option><option value={5}>5 segundos</option><option value={10}>10 segundos</option><option value={15}>15 segundos</option></select></label><button className="ml-primary" disabled={videoExporting} onClick={exportVideo}>{videoExporting ? "Grabando…" : "Exportar WebM · 24 FPS"}</button><p role="status">{videoStatus}</p></div><div className="ml-section ml-automation-panel"><h4>AUTOMATIZACIÓN DE SLIDERS</h4><p>Pulsa ↔ junto a cualquier slider para animarlo. Puedes activar varios a la vez; rebotan al llegar a los extremos. El botón Pausar detiene todas las animaciones.</p><NumberSlider label="Velocidad global (rangos/seg)" value={autoSpeed} min={0.05} max={1.5} step={0.05} onChange={setAutoSpeed}/><button type="button" className="ml-auto-clear" onClick={() => {setAutoSliders({}); motion.current.clear();}}>Detener sliders seleccionados</button></div>{unifiedMode ? <>{spatialMode && <div className="ml-section"><h4>PARAMETRIC SURFACES · v0.7</h4>
      <label><input type="checkbox" checked={surface.enabled} onChange={e=>setSurface(v=>({...v,enabled:e.target.checked}))}/> Activar geometría de lámina</label>
      {surface.enabled && <>
      <label>Deformador <select value={surface.mode} onChange={e=>setSurface(v=>({...v,mode:e.target.value as SurfaceMode}))}><option value="twist-sheet">Twist Sheet</option><option value="bessel">Membrana Bessel (aprox.)</option><option value="waves">Wave Surface</option></select></label>
      <NumberSlider label="Altura / amplitud" value={surface.amplitude} min={0} max={1.4} step={0.02} onChange={amplitude=>setSurface(v=>({...v,amplitude}))}/>
      <NumberSlider label="Lóbulos / ondas" value={surface.folds} min={0} max={8} step={1} onChange={folds=>setSurface(v=>({...v,folds}))}/>
      <NumberSlider label="Torsión / nodos radiales" value={surface.twist} min={0} max={4} step={0.05} onChange={twist=>setSurface(v=>({...v,twist}))}/>
      <NumberSlider label="Inclinación cámara" value={surface.tilt} min={0.15} max={1.4} step={0.02} onChange={tilt=>setSurface(v=>({...v,tilt}))}/>
      <NumberSlider label="Giro de cámara" value={surface.spin} min={-3.14} max={3.14} step={0.02} onChange={spin=>setSurface(v=>({...v,spin}))}/>
      <label><input type="checkbox" checked={surface.wireframe} onChange={e=>setSurface(v=>({...v,wireframe:e.target.checked}))}/> Mostrar malla</label>
      <label><input type="checkbox" checked={surface.animate} onChange={e=>setSurface(v=>({...v,animate:e.target.checked}))}/> Animar deformación</label>
      <p>Disco con altura geométrica proyectada, iluminado con las luces espaciales 2D existentes. La membrana es una aproximación visual, no una solución Bessel exacta.</p>
      </>}</div>}{spatialMode && surface.enabled && <div className="ml-section"><h4>CRYSTAL CHAMBER · v0.9</h4>
      <label><input type="checkbox" checked={crystal.enabled} onChange={e=>setCrystal(v=>({...v,enabled:e.target.checked}))}/> Encapsular lámina dentro de esfera</label>
      <p>Selecciona Esfera 3D*. Conserva el vidrio 2D original, su borde y sus glows; la lámina comparte las mismas luces espaciales.</p>
      {crystal.enabled && <>
        <NumberSlider label="Transparencia del vidrio" value={crystal.transparency} min={0} max={1} step={.01} onChange={transparency=>setCrystal(v=>({...v,transparency}))}/>
        <NumberSlider label="Escala interior" value={crystal.innerScale} min={.3} max={1.2} step={.01} onChange={innerScale=>setCrystal(v=>({...v,innerScale}))}/>
        <NumberSlider label="Visibilidad de lámina" value={crystal.innerOpacity} min={0} max={1} step={.01} onChange={innerOpacity=>setCrystal(v=>({...v,innerOpacity}))}/>
        <NumberSlider label="Distorsión de lente" value={crystal.lens} min={-.5} max={.8} step={.01} onChange={lens=>setCrystal(v=>({...v,lens}))}/>
        <NumberSlider label="Absorción cromática" value={crystal.tint} min={0} max={1} step={.01} onChange={tint=>setCrystal(v=>({...v,tint}))}/>
        <NumberSlider label="Realce del borde" value={crystal.rimBoost} min={0} max={1} step={.01} onChange={rimBoost=>setCrystal(v=>({...v,rimBoost}))}/>
      </>}</div>}
      {spatialMode && <div className="ml-section"><h4>TWISTED SPHERE · 2.5D</h4><label><input type="checkbox" checked={twist.enabled} onChange={e => setTwist(v => ({...v, enabled:e.target.checked}))}/> Activar torsión</label><NumberSlider label="Torsión" value={twist.amount} min={0} max={2.5} step={0.05} onChange={amount => setTwist(v => ({...v, amount}))}/><NumberSlider label="Bandas" value={twist.bands} min={1} max={8} step={1} onChange={bands => setTwist(v => ({...v, bands}))}/><NumberSlider label="Rotación / fase" value={twist.rotation} min={-3.14} max={3.14} step={0.05} onChange={rotation => setTwist(v => ({...v, rotation}))}/><NumberSlider label="Deformación silueta" value={twist.silhouette} min={0} max={0.3} step={0.01} onChange={silhouette => setTwist(v => ({...v, silhouette}))}/><label><input type="checkbox" checked={twist.attached} onChange={e => setTwist(v => ({...v, attached:e.target.checked}))}/> Luces adheridas a superficie (desmarcar = luces fijas)</label><p>Prueba 2.5D: deforma coordenadas de superficie y silueta sin malla 3D. Selecciona Esfera 3D*.</p></div>}{spatialMode && <SpatialLightsControls lights={lights} selected={selectedLight} onSelect={setSelectedLight} onChange={setLights}/>}<div className="ml-properties-title"><h3>Unified Light Field</h3><span>EXPERIMENTAL</span></div><UnifiedControls value={unified} onChange={patch => setUnified(prev => ({ ...prev, ...patch }))}/></> : <><div className="ml-properties-title"><h3>{effects.find(e => e.id === selected)?.name}</h3><span>PROPIEDADES</span></div><p>{effects.find(e => e.id === selected)?.subtitle}</p><div className="ml-section"><h4>{selected === 'edge' ? 'GRADIENTE DE CONTORNO · CÍCLICO' : 'GRADIENTE RGBA'}</h4><div className="ml-gradient" style={{ background: `linear-gradient(90deg, ${effect.colors.map((c,i) => `${c.hex} ${i*25}%`).join(', ')})` }}/>{selected === 'edge' && <p className="ml-contour-hint">Cinco stops RGBA distribuidos por longitud de arco. El quinto se sincroniza con el primero para cerrar el contorno sin costuras.</p>}<div className="ml-colors">{effect.colors.map((color, i) => <ColorEditor key={i} label={`Color ${i + 1} · ${i * 25}%${selected === 'edge' && i === 4 ? ' (cierre)' : ''}`} value={color} onChange={c => updateColor(i, c)}/>)}</div></div><div className="ml-section"><h4>{selected === 'surface' || selected === 'background' ? 'CAMPO RADIAL' : 'ANCHURA Y DENSIDAD'}</h4><NumberSlider label={selected === 'outer' ? 'Extensión gaussiana' : selected === 'surface' || selected === 'background' ? 'Radio' : 'Anchura'} value={effect.width} min={2} max={220} onChange={width => update(selected, { width })}/><NumberSlider label="Suavidad" value={effect.softness} min={0} max={1} step={0.01} onChange={softness => update(selected, { softness })}/>{(selected === 'surface' || selected === 'background') && <><NumberSlider label="Centro X" value={effect.centerX} min={-1.5} max={1.5} step={0.01} onChange={centerX => update(selected, { centerX })}/><NumberSlider label="Centro Y" value={effect.centerY} min={-1.5} max={1.5} step={0.01} onChange={centerY => update(selected, { centerY })}/></>}</div><div className="ml-section"><h4>MODULACIÓN SINUSOIDAL</h4><Curve effect={effect}/><NumberSlider label="Amplitud" value={effect.amplitude} min={0} max={1} step={0.01} onChange={amplitude => update(selected, { amplitude })}/><NumberSlider label="Frecuencia" value={effect.frequency} min={1} max={16} step={1} onChange={frequency => update(selected, { frequency })}/><NumberSlider label="Fase" value={effect.phase} min={0} max={6.28} step={0.01} onChange={phase => update(selected, { phase })}/></div><button className="ml-reset" onClick={() => update(selected, initial[selected])}>Restablecer efecto</button></>}</aside></div>
  </div></SliderAutomationContext.Provider>;
}
