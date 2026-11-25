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

export interface Layer {
  id: string;
  name: string;
  visible: boolean;
  shape: { type: ShapeType; params: Record<string, number> };
  shade: { type: ShadeType; params: Record<string, number>; palette: [Hex, Hex, Hex] };
  warp: Warp;
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
  kind: 'radial' | 'linear';
  x: number;
  y: number;
  radius: number;    // reach of the light field
  aspect: number;    // radial: ellipse ratio
  rotation: number;  // radians
  intensity: number;
  color: Hex;
  height: number;    // elevation for bevel shading: low = grazing light, long shadows
  orbit: number;     // radius of the path the light travels (0 = still)
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
  layers: Layer[];
  finish: Finish;
}

export const MAX_INSTANCES = 8;
export const MAX_LIGHTS = 8;

export const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));

let counter = 0;
export const newId = () => `L${Date.now().toString(36).slice(-4)}${(counter++).toString(36)}`;
