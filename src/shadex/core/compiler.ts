/**
 * IR → GLSL. Output is a Shadertoy-style `mainImage` so the same source runs in the editor,
 * in embeds and pasted into Shadertoy.
 *  - mode 'runtime': every number/colour is a uniform → moving a slider never recompiles.
 *  - mode 'export' : values are inlined as constants → one self-contained shader.
 * Only structural changes (layers added/removed/reordered, shape/shade/blend type) recompile.
 */
import { MAX_INSTANCES, MAX_LIGHTS, type Scene, type Layer } from './ir';
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

/** Anything that changes the shape of the program. Values are not part of it. */
export function structureKey(s: Scene): string {
  const lights = (s.lights ?? []).slice(0, MAX_LIGHTS).map(l => l.enabled ? l.kind[0] : '-').join('');
  return `${lights}#` + s.layers
    .map(l => l.visible ? `${l.shape.type}/${l.shade.type}/${l.blend}` : '-')
    .join('|');
}

export function compile(scene: Scene, mode: 'runtime' | 'export' = 'runtime'): Compiled {
  const uniforms: UniformBinding[] = [];
  const f = (name: string, get: (s: Scene) => number): string => {
    if (mode === 'export') return num(get(scene));
    uniforms.push({ name, type: 'f', get });
    return name;
  };
  const c = (name: string, get: (s: Scene) => string): string => {
    if (mode === 'export') return `vec3(${hexToLinear(get(scene)).map(num).join(',')})`;
    uniforms.push({ name, type: 'v3', get: s => hexToLinear(get(s)) });
    return name;
  };

  /* background ----------------------------------------------------------------------------- */
  const drift = f('u_bg_drift', s => s.background.drift);
  const pts = [0, 1, 2, 3].map(k => {
    const px = f(`u_bg_p${k}x`, s => s.background.points[k].x);
    const py = f(`u_bg_p${k}y`, s => s.background.points[k].y);
    const pr = f(`u_bg_p${k}r`, s => s.background.points[k].radius);
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
    const g = (k: string, get: (s: Scene) => number) => f(`u_li${i}_${k}`, get);
    const L = (s: Scene) => s.lights[i];
    const x = g('x', s => L(s).x), y = g('y', s => L(s).y), r = g('r', s => L(s).radius), asp = g('asp', s => L(s).aspect);
    const rot = g('rot', s => L(s).rotation), it = g('int', s => L(s).intensity), hh = g('h', s => L(s).height);
    const orb = g('orb', s => L(s).orbit), sp = g('sp', s => L(s).speed), ph = g('ph', s => L(s).phase);
    const col = c(`u_li${i}_col`, s => L(s).color);
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
  const layerFns: string[] = [];
  const layerCalls: string[] = [];
  scene.layers.forEach((layer: Layer, idx: number) => {
    if (!layer.visible) return;
    const L = (s: Scene) => s.layers[idx];
    const u = (k: string) => `u_l${idx}_${k}`;
    const shape = SHAPES[layer.shape.type];
    const shade = SHADES[layer.shade.type];
    const shapeArgs = shape.params.map(d => f(u(`s_${d.key}`), s => L(s).shape.params[d.key] ?? d.default));
    const shadeArgs = shade.params.map(d => f(u(`m_${d.key}`), s => L(s).shade.params[d.key] ?? d.default));
    const shadeArg = Object.fromEntries(shade.params.map((d, k) => [d.key, shadeArgs[k]]));
    const [pa, pb, pc] = [0, 1, 2].map(k => c(u(`pal${k}`), s => L(s).shade.palette[k]));
    const tx = f(u('tx'), s => L(s).transform.x), ty = f(u('ty'), s => L(s).transform.y);
    const rot = f(u('rot'), s => L(s).transform.rotation), sc = f(u('sc'), s => L(s).transform.scale);
    const blur = f(u('blur'), s => L(s).transform.blur);
    const wa = f(u('wa'), s => L(s).warp.amount), ws = f(u('ws'), s => L(s).warp.scale), wsp = f(u('wsp'), s => L(s).warp.speed);
    const additive = layer.blend === 'add' || layer.blend === 'screen';
    const accumulate = additive ? 'acc+=s;' : 'acc=acc*(1.-s.a)+s;';
    const shapeCall = (i: string) => `${SHAPE_FN[layer.shape.type]}(p,${i},t,lpx${shapeArgs.length ? ',' + shapeArgs.join(',') : ''})`;
    const shadeCall = `${SHADE_FN[layer.shade.type]}(h,wp,cw,${pa},${pb},${pc},t,${shadeArgs.join(',')})`;
    // drop shadow (lit material, non-additive blends): the shape again, pushed away from the lights
    const castsShadow = layer.shade.type === 'lit' && !additive;
    const shadowPre = castsShadow
      ? `  vec3 lc=sx_lightCenter(t);
  vec2 lcl=sx_rot(-${rot})*(lc.xy-vec2(${tx},${ty}))/sc;
  vec2 so=-normalize(lcl+vec2(1e-4))*${shadeArg.shadowDist}/sc;
`
      : '';
    const shadowOf = (i: string) => castsShadow
      ? `{ Hit hs=${shapeCall(i).replace('(p,', '(p-so,')};
      float sa=${shadeArg.shadow}*(1.-smoothstep(-${shadeArg.shadowDist}*.5-.004,${shadeArg.shadowDist}*.9+.01,hs.sd*sc))*hs.m;
      acc=acc*(1.-sa)+vec4(0.,0.,0.,sa); }`
      : '';
    const hitAndShade = (i: string) => `${shadowOf(i)}
    Hit h=${shapeCall(i)};
    vec2 cw=wp-(sx_rot(${rot})*h.g)*h.sd*sc;
    vec4 s=${shadeCall};
    ${accumulate}`;
    const body = SHAPES[layer.shape.type].instanced
      ? `${shadowPre}  for(int i=0;i<${MAX_INSTANCES};i++){
    if(float(i)>=${shapeArgs[0]}) break;
    ${hitAndShade('float(i)')}
  }`
      : `${shadowPre}  {${hitAndShade('0.')}
  }`;
    layerFns.push(`
// ${layer.name.replace(/[^\w áéíóúñÁÉÍÓÚÑ-]/g, '')} — ${shape.label} · ${shade.label}
vec4 sx_layer${idx}(vec2 wp,float t,float px){
  float sc=max(${sc},.01);
  vec2 p=sx_rot(-${rot})*(wp-vec2(${tx},${ty}))/sc;
  float lpx=(px+${blur})/sc;
  p=sx_warp(p,${wa},${ws},${wsp},t);
  vec4 acc=vec4(0.);
${body}
  return acc;
}`);
    const op = f(u('op'), s => L(s).opacity);
    const blend = {
      normal: `col=col*(1.-L.a*${op})+L.rgb*${op};`,
      add: `col+=L.rgb*${op};`,
      screen: `{ vec3 a=L.rgb*${op}; col=col+a-col*min(a,vec3(1.)); }`,
      multiply: `col=mix(col,col*(L.rgb/max(L.a,1e-4)),clamp(L.a*${op},0.,1.));`,
    }[layer.blend];
    layerCalls.push(`  { vec4 L=sx_layer${idx}(p,t,px); ${blend} }`);
  });

  /* finish --------------------------------------------------------------------------------- */
  const F = (k: keyof Scene['finish']) => f(`u_fin_${k}`, s => s.finish[k]);
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
  const speed = f('u_speed', s => s.speed);

  const decls = mode === 'runtime'
    ? uniforms.map(b => `uniform ${b.type === 'f' ? 'float' : 'vec3'} ${b.name};`).join('\n')
    : '';

  const source = `// Shadex 0.1 — "${scene.name.replace(/[^\w áéíóúñÁÉÍÓÚÑ-]/g, '')}"
// Generated shader. Shadertoy-compatible: paste into the Image tab.
${decls}
${GLSL_COMMON}
${background}
${lights}
${[...new Set(scene.layers.filter(l => l.visible).map(l => GLSL_SHAPES[l.shape.type]))].join('\n')}
${[...new Set(scene.layers.filter(l => l.visible).map(l => GLSL_SHADES[l.shade.type]))].join('\n')}
${layerFns.join('\n')}
${finish}
void mainImage(out vec4 fragColor,in vec2 fragCoord){
  vec2 p=(fragCoord-.5*iResolution.xy)/iResolution.y;
  float t=iTime*${speed};
  float px=1.25/iResolution.y;
  vec3 col=sx_background(p,t);
${layerCalls.join('\n')}
  fragColor=vec4(sx_finish(col,fragCoord),1.);
}
`;
  return { source, uniforms, key: structureKey(scene) };
}
