/**
 * Shadex IR v0.1 — the single source of truth.
 * The editor mutates it, the compiler turns it into GLSL, share links carry it in the URL.
 * Plain JSON: no classes, no functions, so it can be serialized, diffed and mutated by tools.
 */

export type Hex = string; // "#rrggbb"

export type ShapeType = 'circle' | 'box' | 'polygon' | 'ribbon' | 'arc' | 'orb' | 'blob' | 'particles';
export type ShadeType = 'lit' | 'glow' | 'silk' | 'glass' | 'solid';
export type BlendMode = 'normal' | 'add' | 'screen' | 'multiply';

export interface Transform {
  x: number;        // scene units, 1.0 = canvas height
  y: number;
  rotation: number; // radians
  scale: number;
  blur: number;     // extra edge softness (depth of field feel)
}

export interface Warp {
  amount: number;
  scale: number;
  speed: number;
}

/** Domain deformations applied to the layer before its shape is evaluated (like Photoshop's Distort filters). */
export interface Deform {
  twist: number;        // radians of swirl at the centre
  twistRadius: number;  // swirl fades to 0 at this radius
  bend: number;         // curves the shape along a parabola
  wave: number;         // amplitude of a sine displacement
  waveFreq: number;
  waveSpeed: number;
  pinch: number;        // <0 inflate, >0 pinch
}

/** Show this layer only inside (or outside) the outline of another layer, which may be hidden. */
export interface Mask {
  source: string | null; // layer id
  invert: boolean;
  feather: number;
}

/**
 * Symbol: a group of layers that transforms as one and can repeat itself
 * (radially around its centre or in a row). Layers keep their own transform inside it.
 */
export interface Group {
  id: string;
  name: string;
  x: number;
  y: number;
  rotation: number;
  scale: number;
  spin: number;       // rad/s, continuous rotation
  count: number;      // instances
  mode: 'radial' | 'linear';
  spacing: number;    // linear mode: distance between instances
  scaleStep: number;  // each instance scaled by this factor
}

export type Ease = 'linear' | 'smooth' | 'apple' | 'spring' | 'bounce';
export const EASES: Ease[] = ['linear', 'smooth', 'apple', 'spring', 'bounce'];

/** Ping-pong animation of any numeric parameter, addressed by path (e.g. "L1x.deform.twist"). */
export interface Anim {
  min: number;
  max: number;
  speed: number;  // cycles per second (min→max→min = 1 cycle at speed 0.5)
  phase: number;  // 0..2 where the cycle starts
  ease: Ease;     // curve of each min→max and max→min stretch
  hold: number;   // 0..0.9 share of each stretch spent resting at the ends
}

/** Turn this layer's outline into another shape: the distance fields are blended by `amount`. */
export interface Morph {
  to: ShapeType | null;
  params: Record<string, number>;
  amount: number;
}

/** Liquid merging: smooth union of the layer's copies and/or with another layer's outline. */
export interface Fusion {
  copies: boolean;       // instanced shapes: copies melt into one surface
  with: string | null;   // layer id whose outline merges into this one (hide it to see one shape)
  smooth: number;        // blend radius, scene units
}

export interface Layer {
  id: string;
  name: string;
  visible: boolean;
  shape: { type: ShapeType; params: Record<string, number> };
  shade: { type: ShadeType; params: Record<string, number>; palette: [Hex, Hex, Hex] };
  warp: Warp;
  deform: Deform;
  morph: Morph;
  fusion: Fusion;
  mask: Mask;
  group: string | null;
  transform: Transform;
  blend: BlendMode;
  opacity: number;
}

export interface MeshPoint {
  x: number;
  y: number;
  radius: number; // 0 disables the point
  color: Hex;
}

export interface Background {
  base: Hex;
  points: [MeshPoint, MeshPoint, MeshPoint, MeshPoint];
  drift: number;
}

/**
 * Spatial light: lives in scene space (not inside a layer). Every 'lit' surface reads it
 * through its contour, so moving or orbiting a light makes reflections travel along the shapes.
 */
export interface Light {
  id: string;
  name: string;
  enabled: boolean;
  kind: 'radial' | 'linear' | 'sweep'; // sweep: a band that crosses the scene once per cycle, then waits
  x: number;
  y: number;
  radius: number;    // reach of the light field
  aspect: number;    // radial: ellipse ratio · sweep: fraction of the cycle spent waiting
  rotation: number;  // radians
  intensity: number;
  color: Hex;
  height: number;    // elevation for bevel shading: low = grazing light, long shadows
  orbit: number;     // radius of the path the light travels (0 = still) · sweep: half the distance it crosses
  speed: number;
  phase: number;
}

export interface Finish {
  exposure: number;
  tonemap: number;    // 0..1 amount of soft highlight roll-off
  contrast: number;
  saturation: number;
  vignette: number;
  grain: number;
}

export interface Scene {
  shadex: '0.1';
  name: string;
  speed: number;      // global time multiplier
  aspect: number;     // width / height of the piece
  radius: number;     // corner radius in CSS px for previews and embeds
  background: Background;
  lights: Light[];
  groups: Group[];
  layers: Layer[];
  anims: Record<string, Anim>;
  finish: Finish;
}

export const MAX_INSTANCES = 8;
export const MAX_LIGHTS = 8;
export const MAX_REPEAT = 12;

export const defaultDeform = (): Deform => ({ twist: 0, twistRadius: 0.5, bend: 0, wave: 0, waveFreq: 6, waveSpeed: 1, pinch: 0 });
export const defaultMask = (): Mask => ({ source: null, invert: false, feather: 0 });
export const defaultMorph = (): Morph => ({ to: null, params: {}, amount: 0 });
export const defaultFusion = (): Fusion => ({ copies: false, with: null, smooth: 0.08 });

/** Bring scenes saved by older versions up to date (adds missing fields, never removes). */
export function migrate(s: Scene): Scene {
  s.lights ??= [];
  s.groups ??= [];
  s.anims ??= {};
  for (const l of s.layers) {
    l.deform = { ...defaultDeform(), ...l.deform };
    l.mask = { ...defaultMask(), ...l.mask };
    l.morph = { ...defaultMorph(), ...l.morph };
    l.fusion = { ...defaultFusion(), ...l.fusion };
    if (l.group === undefined) l.group = null;
    if (l.group && !s.groups.some(g => g.id === l.group)) l.group = null;
  }
  for (const a of Object.values(s.anims)) { a.ease ??= 'linear'; a.hold ??= 0; } // v0.3 anims were linear
  return s;
}

export const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));

let counter = 0;
export const newId = () => `L${Date.now().toString(36).slice(-4)}${(counter++).toString(36)}`;
