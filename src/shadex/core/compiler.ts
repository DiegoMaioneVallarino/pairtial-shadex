/**
 * IR → GLSL. Output is a Shadertoy-style `mainImage` so the same source runs in the editor,
 * in embeds and pasted into Shadertoy.
 *  - mode 'runtime': every number/colour is a uniform → moving a slider never recompiles.
 *  - mode 'export' : values are inlined as constants → one self-contained shader.
 * Only structural changes recompile: layers added/removed/reordered, shape/shade/blend type,
 * lights added/removed, masks, symbol membership, and which parameters are animated.
 *
 * Coordinate chain for a layer:  world ─(symbol instance)→ symbol space ─(layer transform)→ layer space
 *                                  ─(deform: twist/bend/wave/pinch)→ ─(organic warp)→ shape
 */
import { MAX_INSTANCES, MAX_LIGHTS, MAX_REPEAT, EASES, type Scene, type Layer, type Anim, type Ease } from './ir';
import { SHAPES, SHADES, GLSL_COMMON, GLSL_SHAPES, GLSL_SHADES, SHAPE_FN, SHADE_FN } from './primitives';

export type Vec3 = [number, number, number];
export interface UniformBinding {
  name: string;
  type: 'f' | 'v3';
  get: (s: Scene) => number | Vec3;
}
export interface Compiled {
  source: string;
  uniforms: UniformBinding[];
  key: string;
}

export const num = (x: number) => {
  if (!Number.isFinite(x)) return '0.0';
  const s = Number(x.toFixed(5)).toString();
  return s.includes('.') || s.includes('e') ? s : `${s}.0`;
};

export const hexToLinear = (hex: string): Vec3 => {
  const h = /^#?([0-9a-f]{6})$/i.exec(hex.trim())?.[1] ?? '000000';
  return [0, 2, 4].map(i => Math.pow(parseInt(h.slice(i, i + 2), 16) / 255, 2.2)) as Vec3;
};

/* JS twins of sx_ease / sx_anim, so the editor's sliders move exactly like the shader */
export const easeIndex = (e: Ease | undefined) => Math.max(0, EASES.indexOf(e ?? 'linear'));
export function ease(x: number, m: number): number {
  if (m < 0.5) return x;
  if (m < 1.5) return x * x * (3 - 2 * x);
  if (m < 2.5) return x < 0.5 ? 16 * x ** 5 : 1 - Math.pow(-2 * x + 2, 5) * 0.5;
  if (m < 3.5) return 1 - Math.exp(-6 * x) * Math.cos(9 * x) * (1 - x);
  const n = 7.5625, d = 2.75;
  if (x < 1 / d) return n * x * x;
  if (x < 2 / d) { x -= 1.5 / d; return n * x * x + 0.75; }
  if (x < 2.5 / d) { x -= 2.25 / d; return n * x * x + 0.9375; }
  x -= 2.625 / d; return n * x * x + 0.984375;
}
export function animCurve(ph: number, hold: number, m: number): number {
  const c = ((((ph * 0.5) % 1) + 1) % 1) * 2;
  const up = c < 1;
  let x = up ? c : c - 1;
  x = Math.min(1, Math.max(0, (x - hold * 0.5) / Math.max(1 - hold, 1e-3)));
  const e = ease(x, m);
  return up ? e : 1 - e;
}
export const animValue = (a: Anim, t: number) =>
  a.min + (a.max - a.min) * animCurve(a.phase + t * a.speed, a.hold ?? 0, easeIndex(a.ease));

/** Anything that changes the shape of the program. Values are not part of it. */
export function structureKey(s: Scene): string {
  const lights = (s.lights ?? []).slice(0, MAX_LIGHTS).map(l => l.enabled ? l.kind[0] : '-').join('');
  const groups = (s.groups ?? []).map(g => `${g.id}:${g.mode}`).join(',');
  const layers = s.layers
    .map(l => l.visible ? `${l.id}/${l.shape.type}/${l.shade.type}/${l.blend}/${l.group ?? ''}/${l.mask?.source ?? ''}/${l.morph?.to ?? ''}/${l.fusion?.copies ? 1 : 0}/${l.fusion?.with ?? ''}` : '-')
    .join('|');
  const anims = Object.keys(s.anims ?? {}).sort().join(',');
  return `${lights}#${groups}#${layers}#${anims}`;
}

const safeComment = (s: string) => s.replace(/[^\w áéíóúñÁÉÍÓÚÑ-]/g, '');

export function compile(scene: Scene, mode: 'runtime' | 'export' = 'runtime'): Compiled {
  const uniforms: UniformBinding[] = [];
  const anims = scene.anims ?? {};
  const used = new Set<string>();
  const uni = (name: string, type: 'f' | 'v3', get: UniformBinding['get']) => {
    if (!used.has(name)) { used.add(name); uniforms.push({ name, type, get }); }
    return name;
  };
  /** a number; if `path` is animated it becomes a ping-pong between min and max over scene time */
  const f = (name: string, get: (s: Scene) => number, path?: string): string => {
    const a = path ? anims[path] : undefined;
    if (a && path) {
      const A = (k: 'min' | 'max' | 'speed' | 'phase' | 'hold') =>
        mode === 'export' ? num(a[k] ?? 0) : uni(`${name}_a${k[0]}${k[1]}`, 'f', s => s.anims[path]?.[k] ?? 0);
      const E = mode === 'export' ? num(easeIndex(a.ease)) : uni(`${name}_aea`, 'f', s => easeIndex(s.anims[path]?.ease));
      return `mix(${A('min')},${A('max')},sx_anim(${A('phase')}+sx_T*${A('speed')},${A('hold')},${E}))`;
    }
    if (mode === 'export') return num(get(scene));
    return uni(name, 'f', get);
  };
  const c = (name: string, get: (s: Scene) => string): string => {
    if (mode === 'export') return `vec3(${hexToLinear(get(scene)).map(num).join(',')})`;
    return uni(name, 'v3', s => hexToLinear(get(s)));
  };

  /* background ----------------------------------------------------------------------------- */
  const drift = f('u_bg_drift', s => s.background.drift, 'bg.drift');
  const pts = [0, 1, 2, 3].map(k => {
    const P = `bg.p${k}`;
    const px = f(`u_bg_p${k}x`, s => s.background.points[k].x, `${P}.x`);
    const py = f(`u_bg_p${k}y`, s => s.background.points[k].y, `${P}.y`);
    const pr = f(`u_bg_p${k}r`, s => s.background.points[k].radius, `${P}.radius`);
    const pc = c(`u_bg_p${k}c`, s => s.background.points[k].color);
    return `  { vec2 c=vec2(${px},${py})+vec2(sin(t*${drift}+${num(k * 1.7)}),cos(t*${drift}*.8+${num(k * 2.3)}))*.09;
    float r=max(${pr},1e-4); vec2 d=p-c; col=mix(col,${pc},exp(-dot(d,d)/(r*r))*step(.0005,${pr})); }`;
  }).join('\n');
  const background = `
vec3 sx_background(vec2 p,float t){
  vec3 col=${c('u_bg_base', s => s.background.base)};
  p+=(vec2(sx_noise(p*1.3+t*${drift}*.3),sx_noise(p*1.3-t*${drift}*.3+4.1))-.5)*.18;
${pts}
  return col;
}`;

  /* spatial lights ------------------------------------------------------------------------- */
  const lightIdx = (scene.lights ?? []).slice(0, MAX_LIGHTS).map((l, i) => ({ l, i })).filter(x => x.l.enabled);
  const lightFns = lightIdx.map(({ l, i }) => {
    const g = (k: keyof typeof l & string, short: string) => f(`u_li${i}_${short}`, s => s.lights[i][k] as number, `${l.id}.${k}`);
    const x = g('x', 'x'), y = g('y', 'y'), r = g('radius', 'r'), asp = g('aspect', 'asp');
    const rot = g('rotation', 'rot'), it = g('intensity', 'int'), hh = g('height', 'h');
    const orb = g('orbit', 'orb'), sp = g('speed', 'sp'), ph = g('phase', 'ph');
    const col = c(`u_li${i}_col`, s => s.lights[i].color);
    if (l.kind === 'sweep') {
      // crosses once per cycle with an Apple ease, fades in and out, then rests
      return `void sx_L${i}(float t,vec2 p,out vec2 pos,out float w,out vec3 col,out float H,out float I){
  float cyc=fract(t*${sp}+${ph}/6.2831853);
  float x=clamp(cyc/max(1.-clamp(${asp},0.,.9),.05),0.,1.);
  float e=sx_ease(x,2.);
  pos=vec2(${x},${y})+sx_rot(${rot})*vec2(0.,mix(-1.,1.,e)*${orb});
  vec2 d=p-pos; float cr=cos(${rot}),sr=sin(${rot}); vec2 q=vec2(dot(d,vec2(cr,sr)),dot(d,vec2(-sr,cr)));
  float r=max(${r},.01);
  I=${it}*sin(3.14159265*x); w=I*exp(-2.3*pow(q.y/r,2.)); col=${col}; H=${hh};
}`;
    }
    const e = l.kind === 'radial'
      ? `vec2 k=q/vec2(r,r*max(.15,${asp})); float e=dot(k,k);`
      : `float e=pow(q.y/r,2.);`;
    return `void sx_L${i}(float t,vec2 p,out vec2 pos,out float w,out vec3 col,out float H,out float I){
  pos=vec2(${x},${y})+vec2(cos(t*${sp}+${ph}),sin(t*${sp}+${ph})*.75)*${orb};
  vec2 d=p-pos; float cr=cos(${rot}),sr=sin(${rot}); vec2 q=vec2(dot(d,vec2(cr,sr)),dot(d,vec2(-sr,cr)));
  float r=max(${r},.02); ${e}
  I=${it}; w=I*exp(-2.3*e); col=${col}; H=${hh};
}`;
  });
  const callEach = (body: string) => lightIdx.map(({ i }) => `  sx_L${i}(t,p,pos,w,col,H,I); ${body}`).join('\n');
  const lights = `
${lightFns.join('\n')}
vec4 sx_lights(vec2 p,float t){
  float sum=0.; vec3 rgb=vec3(0.); vec2 pos; float w,H,I; vec3 col;
${callEach('sum+=w; rgb+=w*col;')}
  return vec4(sum>1e-5?rgb/sum:vec3(0.),sum);
}
void sx_litLights(vec2 p,vec3 n,float gloss,float t,out vec3 dif,out vec3 spc){
  dif=vec3(0.); spc=vec3(0.); vec2 pos; float w,H,I; vec3 col;
${callEach('{ vec3 L=normalize(vec3(pos-p,max(H,.01))); float att=w+.15*I; dif+=col*max(dot(n,L),0.)*att; vec3 hv=normalize(L+vec3(0.,0.,1.)); spc+=col*pow(max(dot(n,hv),0.),gloss)*att; }')}
}
vec3 sx_lightCenter(float t){
  vec2 p=vec2(0.); vec3 acc=vec3(0.); vec2 pos; float w,H,I; vec3 col;
${callEach('acc+=vec3(pos*I,I);')}
  return acc.z>1e-5?vec3(acc.xy/acc.z,acc.z):vec3(-.6,.8,0.);
}`;

  /* layers --------------------------------------------------------------------------------- */
  /** shared by the colour pass and the mask pass: world → layer space, deform, warp */
  const layerSpace = (layer: Layer, idx: number, prefix: string) => {
    const L = (s: Scene) => s.layers[idx];
    const id = layer.id;
    const u = (k: string) => `${prefix}${idx}_${k}`;
    const T = (k: keyof Layer['transform']) => f(u(`t${k}`), s => L(s).transform[k], `${id}.transform.${k}`);
    const D = (k: keyof Layer['deform']) => f(u(`d${k}`), s => L(s).deform[k], `${id}.deform.${k}`);
    const W = (k: keyof Layer['warp']) => f(u(`w${k}`), s => L(s).warp[k], `${id}.warp.${k}`);
    const shapeArgs = SHAPES[layer.shape.type].params.map(d => f(u(`s_${d.key}`), s => L(s).shape.params[d.key] ?? d.default, `${id}.shape.${d.key}`));
    const tx = T('x'), ty = T('y'), rot = T('rotation'), scl = T('scale'), blur = T('blur');
    const morphTo = layer.morph?.to ?? null;
    const morphArgs = morphTo ? SHAPES[morphTo].params.map(d => f(u(`g_${d.key}`), s => L(s).morph.params[d.key] ?? d.default, `${id}.morph.${d.key}`)) : [];
    const morphAmt = morphTo ? f(u('mamt'), s => L(s).morph.amount, `${id}.morph.amount`) : '0.';
    const fuseK = f(u('fk'), s => L(s).fusion.smooth, `${id}.fusion.smooth`);
    const code = `  float sc=max(${scl},.01);
  vec2 q=sx_rot(-gr)*(wp-go)/gs;
  vec2 p=sx_rot(-${rot})*(q-vec2(${tx},${ty}))/sc;
  float S=sc*gs, R=${rot}+gr;
  float lpx=(px+${blur})/S;
  p=sx_deform(p,t,${D('twist')},${D('twistRadius')},${D('bend')},${D('wave')},${D('waveFreq')},${D('waveSpeed')},${D('pinch')});
  p=sx_warp(p,${W('amount')},${W('scale')},${W('speed')},t);`;
    const raw = (i: string, at: string) => `${SHAPE_FN[layer.shape.type]}(${at},${i},t,lpx${shapeArgs.length ? ',' + shapeArgs.join(',') : ''})`;
    const shapeCall = (i: string, at = 'p') => morphTo
      ? `sx_morph(${raw(i, at)},${SHAPE_FN[morphTo]}(${at},${i},t,lpx${morphArgs.length ? ',' + morphArgs.join(',') : ''}),${morphAmt},lpx)`
      : raw(i, at);
    const inst = SHAPES[layer.shape.type].instanced;
    /** declares Hit `name`: every copy merged (smoothly when k>0) */
    const unionInto = (name: string, at: string, k: string) => inst
      ? `Hit ${name}; for(int i=0;i<${MAX_INSTANCES};i++){ if(float(i)>=${shapeArgs[0]}) break; Hit hi=${shapeCall('float(i)', at)}; if(i==0) ${name}=hi; else ${name}=sx_smin(${name},hi,${k},lpx); }`
      : `Hit ${name}=${shapeCall('0.', at)};`;
    return { code, shapeCall, shapeArgs, tx, ty, rot, scl, unionInto, fuseK, inst };
  };

  // outline of another layer, evaluated in the caller's symbol space: used by masks and fusion
  const hitSources = new Set<string>();
  for (const l of scene.layers) {
    if (!l.visible) continue;
    if (l.mask?.source) hitSources.add(l.mask.source);
    if (l.fusion?.with && l.fusion.with !== l.id) hitSources.add(l.fusion.with);
  }
  const hitFns: string[] = [];
  scene.layers.forEach((layer, idx) => {
    if (!hitSources.has(layer.id)) return;
    const sp = layerSpace(layer, idx, 'u_k');
    hitFns.push(`
// outline of "${safeComment(layer.name)}" (for masks and fusion)
Hit sx_hit${idx}(vec2 wp,float t,float px,vec2 go,float gr,float gs,out float SO,out float RO){
${sp.code}
  ${sp.unionInto('h', 'p', layer.fusion?.copies ? sp.fuseK : '0.')}
  SO=S; RO=R;
  return h;
}`);
  });

  const layerFns: string[] = [];
  const layerCall = new Map<string, (go: string, gr: string, gs: string) => string>();
  scene.layers.forEach((layer: Layer, idx: number) => {
    if (!layer.visible) return;
    const L = (s: Scene) => s.layers[idx];
    const id = layer.id;
    const u = (k: string) => `u_l${idx}_${k}`;
    const shape = SHAPES[layer.shape.type];
    const shade = SHADES[layer.shade.type];
    const sp = layerSpace(layer, idx, 'u_l');
    const shadeArgs = shade.params.map(d => f(u(`m_${d.key}`), s => L(s).shade.params[d.key] ?? d.default, `${id}.shade.${d.key}`));
    const shadeArg = Object.fromEntries(shade.params.map((d, k) => [d.key, shadeArgs[k]]));
    const [pa, pb, pc] = [0, 1, 2].map(k => c(u(`pal${k}`), s => L(s).shade.palette[k]));
    const additive = layer.blend === 'add' || layer.blend === 'screen';
    const accumulate = additive ? 'acc+=s;' : 'acc=acc*(1.-s.a)+s;';
    const shadeCall = `${SHADE_FN[layer.shade.type]}(h,wp,cw,${pa},${pb},${pc},t,${shadeArgs.join(',')})`;
    const castsShadow = layer.shade.type === 'lit' && !additive;
    const shadowPre = castsShadow
      ? `  vec3 lc=sx_lightCenter(t);
  vec2 lcl=sx_rot(-${sp.rot})*((sx_rot(-gr)*(lc.xy-go)/gs)-vec2(${sp.tx},${sp.ty}))/sc;
  vec2 so=-normalize(lcl+vec2(1e-4))*${shadeArg.shadowDist}/S;\n`
      : '';
    const shadowOf = (i: string) => castsShadow
      ? `{ Hit hs=${sp.shapeCall(i, 'p-so')};
      float sa=${shadeArg.shadow}*(1.-smoothstep(-${shadeArg.shadowDist}*.5-.004,${shadeArg.shadowDist}*.9+.01,hs.sd*S))*hs.m;
      acc=acc*(1.-sa)+vec4(0.,0.,0.,sa); }`
      : '';
    const withIdx = layer.fusion?.with ? scene.layers.findIndex(l => l.id === layer.fusion.with) : -1;
    const fuseWith = (hn: string) => withIdx >= 0 && withIdx !== idx
      ? `{ float S2,R2; Hit o=sx_hit${withIdx}(wp,t,px,go,gr,gs,S2,R2); ${hn}=sx_smin(${hn},sx_rebase(o,S2,R2,S,R),${sp.fuseK},lpx); }`
      : '';
    const shadeHit = `vec2 cw=wp-(sx_rot(R)*h.g)*h.sd*S;
    vec4 s=${shadeCall};
    ${accumulate}`;
    const hitAndShade = (i: string) => `${shadowOf(i)}
    Hit h=${sp.shapeCall(i)};
    ${fuseWith('h')}
    ${shadeHit}`;
    const fusedCopies = shape.instanced && !!layer.fusion?.copies;
    const body = fusedCopies
      ? `${shadowPre}  {
    ${castsShadow ? `{ ${sp.unionInto('hs', 'p-so', sp.fuseK)}
      float sa=${shadeArg.shadow}*(1.-smoothstep(-${shadeArg.shadowDist}*.5-.004,${shadeArg.shadowDist}*.9+.01,hs.sd*S))*hs.m;
      acc=acc*(1.-sa)+vec4(0.,0.,0.,sa); }` : ''}
    ${sp.unionInto('h', 'p', sp.fuseK)}
    ${fuseWith('h')}
    ${shadeHit}
  }`
      : shape.instanced
        ? `${shadowPre}  for(int i=0;i<${MAX_INSTANCES};i++){
    if(float(i)>=${sp.shapeArgs[0]}) break;
    ${hitAndShade('float(i)')}
  }`
        : `${shadowPre}  {${hitAndShade('0.')}
  }`;
    const srcIdx = layer.mask?.source ? scene.layers.findIndex(l => l.id === layer.mask.source) : -1;
    const masking = srcIdx >= 0 && srcIdx !== idx
      ? `  { float S2,R2; float mk=sx_hit${srcIdx}(wp,t,px+${f(u('mf'), s => L(s).mask.feather, `${id}.mask.feather`)},go,gr,gs,S2,R2).cov;
    acc*=mix(mk,1.-mk,${f(u('mi'), s => (L(s).mask.invert ? 1 : 0))}); }`
      : '';
    layerFns.push(`
// ${safeComment(layer.name)} — ${shape.label} · ${shade.label}
vec4 sx_layer${idx}(vec2 wp,float t,float px,vec2 go,float gr,float gs){
${sp.code}
  vec4 acc=vec4(0.);
${body}
${masking}
  return acc;
}`);
    const op = f(u('op'), s => L(s).opacity, `${id}.opacity`);
    const blend = {
      normal: `col=col*(1.-L.a*${op})+L.rgb*${op};`,
      add: `col+=L.rgb*${op};`,
      screen: `{ vec3 a=L.rgb*${op}; col=col+a-col*min(a,vec3(1.)); }`,
      multiply: `col=mix(col,col*(L.rgb/max(L.a,1e-4)),clamp(L.a*${op},0.,1.));`,
    }[layer.blend];
    layerCall.set(layer.id, (go, gr, gs) => `{ vec4 L=sx_layer${idx}(p,t,px,${go},${gr},${gs}); ${blend} }`);
  });

  /* symbols: a symbol is drawn where its lowest layer sits in the stack, all its layers per instance */
  const calls: string[] = [];
  const emitted = new Set<string>();
  for (const layer of scene.layers) {
    if (!layer.visible || !layerCall.has(layer.id)) continue;
    const gi = layer.group ? scene.groups.findIndex(g => g.id === layer.group) : -1;
    if (gi < 0) { calls.push(`  ${layerCall.get(layer.id)!('vec2(0.)', '0.', '1.')}`); continue; }
    const g = scene.groups[gi];
    if (emitted.has(g.id)) continue;
    emitted.add(g.id);
    const G = (k: 'x' | 'y' | 'rotation' | 'scale' | 'spin' | 'count' | 'spacing' | 'scaleStep', short: string) =>
      f(`u_g${gi}_${short}`, s => s.groups[gi][k], `${g.id}.${k}`);
    const members = scene.layers.filter(l => l.group === g.id && l.visible && layerCall.has(l.id));
    const count = G('count', 'n');
    const place = g.mode === 'radial'
      ? `vec2 go=vec2(${G('x', 'x')},${G('y', 'y')}); float gr=${G('rotation', 'r')}+t*${G('spin', 'sp')}+fk*TAU/max(${count},1.);`
      : `float gr=${G('rotation', 'r')}+t*${G('spin', 'sp')}; vec2 go=vec2(${G('x', 'x')},${G('y', 'y')})+sx_rot(${G('rotation', 'r')})*vec2((fk-(max(${count},1.)-1.)*.5)*${G('spacing', 'gap')},0.);`;
    calls.push(`  // symbol "${safeComment(g.name)}"
  for(int k=0;k<${MAX_REPEAT};k++){
    float fk=float(k);
    if(fk>=floor(${count}+.5)) break;
    ${place}
    float gs=${G('scale', 's')}*pow(${G('scaleStep', 'ss')},fk);
${members.map(m => `    ${layerCall.get(m.id)!('go', 'gr', 'gs')}`).join('\n')}
  }`);
  }

  /* finish --------------------------------------------------------------------------------- */
  const F = (k: keyof Scene['finish']) => f(`u_fin_${k}`, s => s.finish[k], `finish.${k}`);
  const finish = `
vec3 sx_finish(vec3 c,vec2 fc){
  c*=${F('exposure')};
  vec3 tm=c*(1.+c/4.)/(1.+c);
  c=mix(min(c,vec3(1.)),tm,${F('tonemap')});
  c=pow(max(c,0.),vec3(1./2.2));
  c=(c-.5)*${F('contrast')}+.5;
  float l=dot(c,vec3(.2126,.7152,.0722));
  c=mix(vec3(l),c,${F('saturation')});
  vec2 uv=fc/iResolution.xy-.5;
  c*=1.-${F('vignette')}*dot(uv,uv)*1.8;
  c+=(sx_hash(fc+fract(iTime*7.)*91.)-.5)*(${F('grain')}*.12+1.5/255.);
  return clamp(c,0.,1.);
}`;
  // global speed is never animated (it defines the clock the animations run on)
  const speed = mode === 'export' ? num(scene.speed) : uni('u_speed', 'f', s => s.speed);

  const decls = mode === 'runtime'
    ? uniforms.map(b => `uniform ${b.type === 'f' ? 'float' : 'vec3'} ${b.name};`).join('\n')
    : '';
  const visible = scene.layers.filter(l => l.visible || hitSources.has(l.id));
  const shapeTypes = new Set(visible.flatMap(l => l.morph?.to ? [l.shape.type, l.morph.to] : [l.shape.type]));

  const source = `// Shadex 0.2 — "${safeComment(scene.name)}"
// Generated shader. Shadertoy-compatible: paste into the Image tab.
${decls}
float sx_T; // scene time, drives ping-pong animations
${GLSL_COMMON}
${background}
${lights}
${[...shapeTypes].map(t => GLSL_SHAPES[t]).join('\n')}
${[...new Set(scene.layers.filter(l => l.visible).map(l => GLSL_SHADES[l.shade.type]))].join('\n')}
${hitFns.join('\n')}
${layerFns.join('\n')}
${finish}
void mainImage(out vec4 fragColor,in vec2 fragCoord){
  vec2 p=(fragCoord-.5*iResolution.xy)/iResolution.y;
  float t=iTime*${speed};
  sx_T=t;
  float px=1.25/iResolution.y;
  vec3 col=sx_background(p,t);
${calls.join('\n')}
  fragColor=vec4(sx_finish(col,fragCoord),1.);
}
`;
  return { source, uniforms, key: structureKey(scene) };
}
