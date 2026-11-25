import { newId, type Scene, type Layer, type Light, type ShapeType, type ShadeType, type Hex, type MeshPoint, type Finish } from './ir';
import { SHAPES, SHADES, defaults } from './primitives';

type LayerInit = Partial<Omit<Layer, 'shape' | 'shade'>> & {
  shape?: Record<string, number>;
  shade?: Record<string, number>;
  palette?: [Hex, Hex, Hex];
};

export function makeLayer(shape: ShapeType, shade: ShadeType, o: LayerInit = {}): Layer {
  return {
    id: newId(),
    name: o.name ?? `${SHAPES[shape].label} ${SHADES[shade].label.toLowerCase()}`,
    visible: o.visible ?? true,
    shape: { type: shape, params: { ...defaults(SHAPES[shape].params), ...o.shape } },
    shade: { type: shade, params: { ...defaults(SHADES[shade].params), ...o.shade }, palette: o.palette ?? ['#2f6bff', '#7fd4ff', '#ffffff'] },
    warp: o.warp ?? { amount: 0.04, scale: 1.5, speed: 0.15 },
    transform: { x: 0, y: 0, rotation: 0, scale: 1, blur: 0, ...o.transform },
    blend: o.blend ?? (shade === 'glow' ? 'add' : 'normal'),
    opacity: o.opacity ?? 1,
  };
}

export function makeLight(o: Partial<Light> = {}): Light {
  return {
    id: newId(), name: 'Luz', enabled: true, kind: 'radial',
    x: 0.3, y: 0.3, radius: 0.45, aspect: 1, rotation: 0, intensity: 1.2, color: '#bfe9ff',
    height: 0.35, orbit: 0.12, speed: 0.35, phase: 0, ...o,
  };
}

const pt = (x: number, y: number, radius: number, color: Hex): MeshPoint => ({ x, y, radius, color });
const off = pt(0, 0, 0, '#000000');
const finish = (f: Partial<Finish> = {}): Finish => ({
  exposure: 1, tonemap: 0.8, contrast: 1.04, saturation: 1.05, vignette: 0.18, grain: 0.22, ...f,
});
const scene = (name: string, aspect: number, bg: Scene['background'], layers: Layer[], f?: Partial<Finish>, speed = 1, lights: Light[] = []): Scene =>
  ({ shadex: '0.1', name, speed, aspect, radius: 22, background: bg, lights, layers, finish: finish(f) });

export const PRESETS: Record<string, () => Scene> = {
  materiallab: () => scene('Esfera de luz', 1, {
    base: '#020309', drift: 0.08,
    points: [pt(0.3, 0.35, 0.45, '#081430'), pt(-0.4, -0.35, 0.4, '#060a1a'), off, off],
  }, [
    makeLayer('circle', 'lit', {
      name: 'Esfera', palette: ['#060a1e', '#2a62ff', '#d4f3ff'],
      shape: { radius: 0.3 },
      shade: { surface: 1.5, ambient: 0.16, bevel: 0.0, depth: 0, volume: 0.85, texture: 0, specular: 0.7, gloss: 24,
        edge: 1.2, edgeWidth: 0.011, bands: 0, emission: 0.85, inner: 0.2, outer: 0.07, bounce: 0.45, shadow: 0, shadowDist: 0.05, flow: 0, opacity: 1 },
      warp: { amount: 0, scale: 1, speed: 0 },
    }),
  ], { tonemap: 0.9, vignette: 0.25, grain: 0.18 }, 1, [
    makeLight({ name: 'Luz principal', x: 0.22, y: 0.24, radius: 0.42, intensity: 1.4, color: '#cfeeff', height: 0.3, orbit: 0.12, speed: 0.3 }),
    makeLight({ name: 'Franja verde', kind: 'linear', x: 0.05, y: -0.05, radius: 0.06, rotation: 0.85, intensity: 0.9, color: '#2cff6e', height: 0.25, orbit: 0.08, speed: 0.22, phase: 2 }),
    makeLight({ name: 'Rosa', x: -0.28, y: 0.12, radius: 0.22, aspect: 0.7, intensity: 0.8, color: '#ff3fa8', height: 0.3, orbit: 0.1, speed: 0.4, phase: 4 }),
  ]),

  bisel: () => scene('Emblema biselado', 1.35, {
    base: '#0b0a10', drift: 0.06,
    points: [pt(0.35, 0.3, 0.5, '#241a30'), pt(-0.5, -0.3, 0.5, '#111424'), off, off],
  }, [
    makeLayer('box', 'lit', {
      name: 'Placa', palette: ['#14121c', '#3b3550', '#9e95c7'],
      shape: { width: 1.05, height: 0.66, corner: 0.09 },
      shade: { surface: 0.6, ambient: 0.22, bevel: 0.035, depth: 1.4, volume: 0, texture: 0.25, texScale: 40, specular: 0.5, gloss: 30,
        edge: 0.7, edgeWidth: 0.008, bands: 0, emission: 0.5, inner: 0.06, outer: 0.05, bounce: 0.4, shadow: 0.5, shadowDist: 0.04, flow: 0, opacity: 1 },
      warp: { amount: 0, scale: 1, speed: 0 },
    }),
    makeLayer('polygon', 'lit', {
      name: 'Hexágono', palette: ['#3a1a08', '#d9822b', '#ffe2a8'],
      shape: { sides: 6, radius: 0.22, roundness: 0.025 },
      shade: { surface: 1, ambient: 0.25, bevel: 0.06, depth: 2.2, volume: 0.15, texture: 0.35, texScale: 22, specular: 1.3, gloss: 40,
        edge: 1.3, edgeWidth: 0.007, bands: 0, emission: 0.9, inner: 0.05, outer: 0.06, bounce: 0.6, shadow: 0.6, shadowDist: 0.05, flow: 0, opacity: 1 },
      transform: { x: 0, y: 0, rotation: 0.26, scale: 1, blur: 0 },
      warp: { amount: 0, scale: 1, speed: 0 },
    }),
  ], { tonemap: 0.85, vignette: 0.3, grain: 0.2, contrast: 1.06 }, 1, [
    makeLight({ name: 'Cálida', x: -0.35, y: 0.32, radius: 0.5, intensity: 1.3, color: '#ffd29a', height: 0.28, orbit: 0.22, speed: 0.35 }),
    makeLight({ name: 'Fría', x: 0.42, y: -0.25, radius: 0.4, intensity: 0.9, color: '#7fb4ff', height: 0.22, orbit: 0.18, speed: -0.28, phase: 3 }),
  ]),

  silvana: () => scene('Silvana', 1.9, {
    base: '#010512', drift: 0.12,
    points: [pt(0.6, 0.3, 0.6, '#0838c8'), pt(-0.7, -0.3, 0.5, '#041046'), pt(0.3, -0.45, 0.4, '#0a52ff'), pt(0.95, 0.1, 0.35, '#1a6dff')],
  }, [
    makeLayer('ribbon', 'glow', {
      name: 'Velo de luz', palette: ['#0624d8', '#1d6bff', '#5cc8ff'],
      shape: { count: 2, width: 0.16, frequency: 1.1, amplitude: 0.22, spread: 0.18, twist: 0.7, speed: 0.18, seed: 4 },
      shade: { intensity: 0.75, core: 0.3, fill: 0.3, halo: 0.55, edge: 1.0, flow: 0.05 },
      transform: { x: 0.1, y: 0.02, rotation: 0.38, scale: 1, blur: 0.004 }, opacity: 0.9,
    }),
    makeLayer('ribbon', 'glow', {
      name: 'Hilos brillantes', palette: ['#1f5bff', '#4ab4ff', '#c9efff'],
      shape: { count: 4, width: 0.006, frequency: 1.25, amplitude: 0.2, spread: 0.035, twist: 0.4, speed: 0.22, seed: 9 },
      shade: { intensity: 1.1, core: 1.1, fill: 0.2, halo: 0.4, edge: 0.4, flow: 0.08 },
      transform: { x: 0.12, y: -0.02, rotation: 0.42, scale: 1, blur: 0 },
    }),
  ], { vignette: 0.25 }),

  hyprant: () => scene('Hyprant OS', 1.9, {
    base: '#eef2fc', drift: 0.1,
    points: [pt(0.6, 0.3, 0.6, '#d8e2ff'), pt(-0.5, -0.4, 0.5, '#f7f3ff'), pt(0.8, -0.35, 0.35, '#cbd8ff'), off],
  }, [
    makeLayer('ribbon', 'silk', {
      name: 'Seda translúcida', palette: ['#4d6bff', '#9566ff', '#55c6ff'],
      shape: { count: 3, width: 0.13, frequency: 1.3, amplitude: 0.2, spread: 0.11, twist: 0.85, speed: 0.15, seed: 12 },
      shade: { light: 1.2, sheen: 1.3, gloss: 22, shadow: 0.5, rim: 0.9, opacity: 0.75, flow: 0.06 },
      transform: { x: 0.35, y: 0.05, rotation: 0.3, scale: 1, blur: 0.003 },
    }),
    makeLayer('ribbon', 'solid', {
      name: 'Líneas finas', palette: ['#4f6dff', '#8c6bff', '#38b6ff'],
      shape: { count: 5, width: 0.0035, frequency: 1.35, amplitude: 0.2, spread: 0.028, twist: 0.2, speed: 0.17, seed: 12 },
      shade: { shading: 0, sheen: 0, opacity: 0.55, flow: 0.05 },
      transform: { x: 0.35, y: 0.02, rotation: 0.3, scale: 1, blur: 0 },
    }),
  ], { tonemap: 0.3, vignette: 0, grain: 0.15, contrast: 1 }),

  paix: () => scene('Paix Studio', 1.9, {
    base: '#2a0748', drift: 0.15,
    points: [pt(0.35, 0.25, 0.55, '#c41f8f'), pt(0.85, 0.35, 0.4, '#ff7a3d'), pt(-0.7, -0.2, 0.6, '#4b14a8'), pt(0.1, -0.5, 0.4, '#e0368f')],
  }, [
    makeLayer('ribbon', 'silk', {
      name: 'Pliegue grande', palette: ['#5a0a5e', '#e01f7c', '#ff6f6a'],
      shape: { count: 1, width: 0.3, frequency: 0.9, amplitude: 0.28, spread: 0, twist: 0.9, speed: 0.12, seed: 21 },
      shade: { light: 0.7, sheen: 0.9, gloss: 16, shadow: 0.9, rim: 0.35, opacity: 0.95, flow: 0.04 },
      transform: { x: 0.35, y: 0.05, rotation: 0.35, scale: 1, blur: 0.004 },
    }),
    makeLayer('ribbon', 'silk', {
      name: 'Pliegue claro', palette: ['#b0157a', '#ff4f9a', '#ff9a5c'],
      shape: { count: 1, width: 0.16, frequency: 1.1, amplitude: 0.22, spread: 0, twist: 0.85, speed: 0.15, seed: 34 },
      shade: { light: 1.0, sheen: 1.1, gloss: 22, shadow: 0.85, rim: 0.4, opacity: 0.85, flow: 0.06 },
      transform: { x: 0.45, y: -0.12, rotation: 0.55, scale: 1, blur: 0.002 },
    }),
  ], { tonemap: 0.6, saturation: 1.12 }),

  pairtial: () => scene('Pairtial', 1.35, {
    base: '#030206', drift: 0.08,
    points: [pt(0.2, 0.0, 0.45, '#3a1203'), pt(-0.4, 0.3, 0.5, '#0d0814'), pt(0.5, -0.3, 0.3, '#2a0c02'), off],
  }, [
    makeLayer('arc', 'glow', {
      name: 'Arcos de luz', palette: ['#ff3d00', '#ff7a1a', '#ffc27a'],
      shape: { count: 3, radius: 0.62, thickness: 0.01, spacing: 0.08, length: 0.62, speed: 0.06, seed: 11 },
      shade: { intensity: 1.4, core: 1.2, fill: 0.25, halo: 0.8, edge: 0.3, flow: 0.04 },
      transform: { x: -0.25, y: -0.38, rotation: 0.2, scale: 1, blur: 0.002 },
    }),
    makeLayer('arc', 'glow', {
      name: 'Arco cruzado', palette: ['#ff4a00', '#ff9a3c', '#ffe3b8'],
      shape: { count: 2, radius: 0.5, thickness: 0.008, spacing: 0.06, length: 0.5, speed: -0.05, seed: 27 },
      shade: { intensity: 1.2, core: 1.1, fill: 0.2, halo: 0.7, edge: 0.2, flow: 0.03 },
      transform: { x: 0.45, y: 0.35, rotation: 3.6, scale: 1, blur: 0.002 },
    }),
    makeLayer('blob', 'solid', {
      name: 'Núcleo', palette: ['#ff6a10', '#ffa850', '#ffe2b0'],
      shape: { radius: 0.06, wobble: 0.1, lobes: 3, speed: 0.4 },
      shade: { shading: 0, sheen: 0, opacity: 0.8 },
      transform: { x: 0.2, y: 0.05, rotation: 0, scale: 1, blur: 0.12 }, blend: 'add',
    }),
    makeLayer('particles', 'glow', {
      name: 'Polvo', palette: ['#ff8a3c', '#ffc890', '#ffffff'],
      shape: { density: 60, size: 0.8, amount: 0.12, twinkle: 0.7, speed: 0.03, seed: 4 },
      shade: { intensity: 1.2, core: 1, fill: 0.6, halo: 0.25, edge: 0, flow: 0 },
      warp: { amount: 0, scale: 1, speed: 0 }, opacity: 0.7,
    }),
  ], { vignette: 0.35, contrast: 1.08 }),

  glass: () => scene('Glass', 1.9, {
    base: '#060607', drift: 0.06,
    points: [pt(0.55, 0.3, 0.55, '#3b3d44'), pt(-0.5, 0.35, 0.45, '#1b1c21'), pt(0.1, -0.5, 0.4, '#101013'), off],
  }, [
    makeLayer('orb', 'glass', {
      name: 'Esferas de cristal', palette: ['#25262c', '#b4b8c2', '#ffffff'],
      shape: { count: 3, radius: 0.3, spacing: 0.34, falloff: 0.85, float: 0.015, speed: 0.35 },
      shade: { transparency: 0.55, refraction: 0.16, fresnel: 2.0, highlight: 0.8, iridescence: 0.05, tint: 0.05, flow: 0 },
      transform: { x: 0.38, y: -0.05, rotation: -0.15, scale: 1, blur: 0 },
      warp: { amount: 0, scale: 1, speed: 0 },
    }),
  ], { saturation: 0.2, vignette: 0.3, tonemap: 0.7 }),

  lazo: () => scene('Lazo iridiscente', 1.6, {
    base: '#f7f7fa', drift: 0.1,
    points: [pt(0.3, 0.25, 0.45, '#ffe9f6'), pt(-0.4, -0.3, 0.45, '#eef0ff'), off, off],
  }, [
    makeLayer('ribbon', 'silk', {
      name: 'Lazo', palette: ['#ff7a1a', '#ff4fd8', '#4a6bff'],
      shape: { count: 2, width: 0.17, frequency: 2.0, amplitude: 0.2, spread: 0.12, twist: 0.95, speed: 0.15, seed: 7 },
      shade: { light: 1.3, sheen: 1.8, gloss: 30, shadow: 0.45, rim: 1.2, opacity: 0.8, flow: 0.12 },
      warp: { amount: 0.08, scale: 1.2, speed: 0.12 },
    }),
  ], { tonemap: 0.4, vignette: 0, grain: 0.12, saturation: 1.1 }),

  blank: () => scene('Sin título', 1.6, {
    base: '#07080f', drift: 0.1,
    points: [pt(0.4, 0.3, 0.5, '#1b2a6b'), pt(-0.5, -0.3, 0.45, '#2a0f4a'), off, off],
  }, [
    makeLayer('ribbon', 'glow', { name: 'Cinta de luz' }),
  ]),
};

export const PRESET_LABELS: Record<string, string> = {
  materiallab: 'Esfera de luz (Material Lab)', bisel: 'Emblema biselado',
  silvana: 'Silvana', hyprant: 'Hyprant OS', paix: 'Paix Studio', pairtial: 'Pairtial', glass: 'Glass', lazo: 'Lazo iridiscente (2D)', blank: 'Vacía',
};
