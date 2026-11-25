/**
 * Primitive library. Every shape and shade is:
 *  - a parameter schema (human label, safe range, default) that the editor turns into controls
 *  - a GLSL function whose float arguments follow the schema order exactly
 * The compiler never needs to know what a primitive does, only its schema.
 */
import type { ShapeType, ShadeType } from './ir';

export interface ParamDef {
  key: string;
  label: string;
  min: number;
  max: number;
  step: number;
  default: number;
  int?: boolean;
  /** range used by "Aleatorio" (defaults to min..max). Keeps random results pretty. */
  safe?: [number, number];
  angle?: boolean;
  /** sub-heading in the inspector */
  group?: string;
}

export interface PrimitiveDef {
  label: string;
  hint: string;
  params: ParamDef[];
}

const p = (key: string, label: string, min: number, max: number, def: number, step = 0.01, extra: Partial<ParamDef> = {}): ParamDef =>
  ({ key, label, min, max, step, default: def, ...extra });

export const SHAPES: Record<ShapeType, PrimitiveDef & { instanced: boolean }> = {
  circle: {
    label: 'Círculo', hint: 'Disco plano 2D: la luz le da volumen', instanced: false,
    params: [p('radius', 'Radio', 0.03, 0.9, 0.32, 0.005, { safe: [0.2, 0.42] })],
  },
  box: {
    label: 'Rectángulo', hint: 'Rectángulo con esquinas redondeadas: tarjetas, botones, paneles', instanced: false,
    params: [
      p('width', 'Ancho', 0.02, 1.6, 0.5, 0.005, { safe: [0.3, 0.7] }),
      p('height', 'Alto', 0.02, 1, 0.32, 0.005, { safe: [0.2, 0.45] }),
      p('corner', 'Esquinas', 0, 0.5, 0.08, 0.005, { safe: [0.03, 0.15] }),
    ],
  },
  polygon: {
    label: 'Polígono', hint: 'Triángulo, rombo, hexágono… con esquinas suaves', instanced: false,
    params: [
      p('sides', 'Lados', 3, 12, 4, 1, { int: true, safe: [3, 8] }),
      p('radius', 'Tamaño', 0.03, 0.9, 0.34, 0.005, { safe: [0.22, 0.42] }),
      p('roundness', 'Redondeo', 0, 0.3, 0.04, 0.005, { safe: [0, 0.1] }),
    ],
  },
  ribbon: {
    label: 'Cinta', hint: 'Bandas onduladas que se tuercen: seda, luz, aurora', instanced: true,
    params: [
      p('count', 'Cantidad', 1, 8, 3, 1, { int: true, safe: [1, 5] }),
      p('width', 'Grosor', 0.005, 0.5, 0.08, 0.005, { safe: [0.02, 0.22] }),
      p('frequency', 'Ondulación', 0.1, 6, 1.6, 0.05, { safe: [0.6, 3] }),
      p('amplitude', 'Altura de onda', 0, 0.8, 0.18, 0.01, { safe: [0.05, 0.35] }),
      p('spread', 'Separación', 0, 0.5, 0.07, 0.005, { safe: [0.01, 0.15] }),
      p('twist', 'Torsión', 0, 1, 0.6, 0.01),
      p('speed', 'Velocidad', 0, 2, 0.25, 0.01, { safe: [0.05, 0.5] }),
      p('seed', 'Variante', 0, 100, 1, 1, { int: true }),
    ],
  },
  arc: {
    label: 'Arco', hint: 'Anillos y estelas de luz alrededor de un centro', instanced: true,
    params: [
      p('count', 'Cantidad', 1, 8, 3, 1, { int: true, safe: [1, 5] }),
      p('radius', 'Radio', 0.05, 1.5, 0.45, 0.01, { safe: [0.25, 0.8] }),
      p('thickness', 'Grosor', 0.001, 0.2, 0.012, 0.001, { safe: [0.004, 0.04] }),
      p('spacing', 'Separación', 0, 0.4, 0.06, 0.005, { safe: [0.02, 0.15] }),
      p('length', 'Longitud', 0.05, 1, 0.55, 0.01, { safe: [0.25, 0.9] }),
      p('speed', 'Giro', -2, 2, 0.08, 0.01, { safe: [-0.3, 0.3] }),
      p('seed', 'Variante', 0, 100, 3, 1, { int: true }),
    ],
  },
  orb: {
    label: 'Esfera', hint: 'Esferas con volumen: vidrio, perlas, burbujas', instanced: true,
    params: [
      p('count', 'Cantidad', 1, 6, 3, 1, { int: true, safe: [1, 4] }),
      p('radius', 'Tamaño', 0.03, 0.8, 0.24, 0.01, { safe: [0.12, 0.35] }),
      p('spacing', 'Separación', 0, 0.8, 0.3, 0.01, { safe: [0.15, 0.4] }),
      p('falloff', 'Reducción', 0.4, 1.3, 0.82, 0.01, { safe: [0.6, 1] }),
      p('float', 'Flotación', 0, 0.15, 0.02, 0.005, { safe: [0, 0.05] }),
      p('speed', 'Velocidad', 0, 2, 0.4, 0.01, { safe: [0.1, 0.8] }),
    ],
  },
  blob: {
    label: 'Gota', hint: 'Forma orgánica que respira', instanced: false,
    params: [
      p('radius', 'Tamaño', 0.05, 0.9, 0.3, 0.01, { safe: [0.15, 0.45] }),
      p('wobble', 'Deformación', 0, 0.6, 0.18, 0.01, { safe: [0.05, 0.3] }),
      p('lobes', 'Lóbulos', 1, 8, 3, 1, { int: true, safe: [2, 5] }),
      p('speed', 'Velocidad', 0, 2, 0.35, 0.01, { safe: [0.1, 0.7] }),
    ],
  },
  particles: {
    label: 'Partículas', hint: 'Polvo de estrellas y destellos', instanced: false,
    params: [
      p('density', 'Densidad', 4, 120, 40, 1, { int: true, safe: [20, 70] }),
      p('size', 'Tamaño', 0.1, 4, 1, 0.05, { safe: [0.5, 1.5] }),
      p('amount', 'Cantidad', 0, 1, 0.35, 0.01, { safe: [0.15, 0.5] }),
      p('twinkle', 'Destello', 0, 1, 0.6, 0.01),
      p('speed', 'Deriva', 0, 1, 0.05, 0.01, { safe: [0, 0.15] }),
      p('seed', 'Variante', 0, 100, 5, 1, { int: true }),
    ],
  },
};

const flow = p('flow', 'Flujo de color', 0, 1, 0.08, 0.01, { safe: [0, 0.2] });

export const SHADES: Record<ShadeType, PrimitiveDef> = {
  lit: {
    label: 'Luz espacial', hint: 'La forma lee las luces de la escena: bisel, reflejos de borde, resplandores y sombra',
    params: [
      { ...flow, group: 'Superficie' },
      p('opacity', 'Opacidad del cuerpo', 0, 1, 1, 0.01, { safe: [0.7, 1], group: 'Superficie' }),
      p('surface', 'Reflectancia superficial', 0, 3, 0.9, 0.01, { safe: [0.5, 1.4], group: 'Superficie' }),
      p('ambient', 'Luz ambiente', 0, 1, 0.2, 0.01, { safe: [0.1, 0.35], group: 'Superficie' }),
      p('bevel', 'Tamaño del bisel', 0, 0.3, 0.06, 0.002, { safe: [0.02, 0.12], group: 'Bisel y relieve' }),
      p('depth', 'Profundidad', 0, 4, 1.2, 0.01, { safe: [0.6, 2], group: 'Bisel y relieve' }),
      p('volume', 'Volumen esférico', 0, 1, 0.3, 0.01, { safe: [0, 0.8], group: 'Bisel y relieve' }),
      p('texture', 'Textura', 0, 2, 0, 0.01, { safe: [0, 0.5], group: 'Bisel y relieve' }),
      p('texScale', 'Escala de textura', 1, 80, 18, 0.5, { safe: [8, 40], group: 'Bisel y relieve' }),
      p('specular', 'Brillo especular', 0, 3, 0.9, 0.01, { safe: [0.4, 1.4], group: 'Bisel y relieve' }),
      p('gloss', 'Pulido', 2, 128, 28, 1, { safe: [12, 60], group: 'Bisel y relieve' }),
      p('edge', 'Reflectancia de borde', 0, 3, 1, 0.01, { safe: [0.6, 1.6], group: 'Borde y resplandores' }),
      p('edgeWidth', 'Grosor de borde', 0.001, 0.1, 0.012, 0.001, { safe: [0.005, 0.025], group: 'Borde y resplandores' }),
      p('bands', 'Ciclos en el borde', 0, 16, 0, 1, { int: true, safe: [0, 9], group: 'Borde y resplandores' }),
      p('emission', 'Emisión', 0, 3, 0.85, 0.01, { safe: [0.5, 1.3], group: 'Borde y resplandores' }),
      p('inner', 'Alcance interior', 0.005, 0.6, 0.12, 0.005, { safe: [0.05, 0.25], group: 'Borde y resplandores' }),
      p('outer', 'Alcance exterior', 0.005, 0.6, 0.08, 0.005, { safe: [0.03, 0.16], group: 'Borde y resplandores' }),
      p('bounce', 'Rebote al fondo', 0, 2, 0.5, 0.01, { safe: [0.2, 0.9], group: 'Borde y resplandores' }),
      p('shadow', 'Sombra proyectada', 0, 1, 0.35, 0.01, { safe: [0.15, 0.6], group: 'Sombra' }),
      p('shadowDist', 'Distancia de sombra', 0, 0.3, 0.05, 0.002, { safe: [0.02, 0.1], group: 'Sombra' }),
    ],
  },
  glow: {
    label: 'Luz', hint: 'Emite luz: núcleo brillante y halo suave',
    params: [
      flow,
      p('intensity', 'Intensidad', 0, 4, 1.2, 0.01, { safe: [0.7, 2] }),
      p('core', 'Núcleo', 0, 3, 1, 0.01, { safe: [0.4, 1.6] }),
      p('fill', 'Relleno', 0, 1, 0.3, 0.01, { safe: [0.05, 0.5] }),
      p('halo', 'Halo', 0, 2, 0.5, 0.01, { safe: [0.2, 0.9] }),
      p('edge', 'Borde', 0, 2, 0.6, 0.01, { safe: [0.2, 1.2] }),
    ],
  },
  silk: {
    label: 'Seda', hint: 'Superficie satinada con sombra y brillo',
    params: [
      flow,
      p('light', 'Dirección de luz', 0, 6.283, 0.9, 0.01, { angle: true }),
      p('sheen', 'Brillo', 0, 3, 1, 0.01, { safe: [0.4, 1.6] }),
      p('gloss', 'Pulido', 2, 96, 18, 1, { safe: [8, 40] }),
      p('shadow', 'Sombra', 0, 1, 0.55, 0.01, { safe: [0.3, 0.8] }),
      p('rim', 'Borde', 0, 2, 0.5, 0.01, { safe: [0.2, 1] }),
      p('opacity', 'Opacidad', 0, 1, 1, 0.01, { safe: [0.7, 1] }),
    ],
  },
  glass: {
    label: 'Vidrio', hint: 'Refracta el fondo, refleja el entorno, brillo especular',
    params: [
      flow,
      p('transparency', 'Transparencia', 0, 1, 0.75, 0.01, { safe: [0.5, 0.95] }),
      p('refraction', 'Refracción', 0, 0.4, 0.1, 0.005, { safe: [0.04, 0.2] }),
      p('fresnel', 'Reflejo de borde', 0, 3, 1.2, 0.01, { safe: [0.7, 1.8] }),
      p('highlight', 'Brillo especular', 0, 3, 1, 0.01, { safe: [0.5, 1.5] }),
      p('iridescence', 'Iridiscencia', 0, 1, 0.15, 0.01, { safe: [0, 0.6] }),
      p('tint', 'Tinte', 0, 1, 0.3, 0.01, { safe: [0.1, 0.6] }),
    ],
  },
  solid: {
    label: 'Sólido', hint: 'Relleno plano con volumen sutil',
    params: [
      flow,
      p('shading', 'Volumen', 0, 1, 0.35, 0.01),
      p('sheen', 'Brillo', 0, 2, 0.3, 0.01, { safe: [0, 0.8] }),
      p('opacity', 'Opacidad', 0, 1, 1, 0.01, { safe: [0.6, 1] }),
    ],
  },
};

export const defaults = (defs: ParamDef[]) => Object.fromEntries(defs.map(d => [d.key, d.default]));

/* ------------------------------------------------------------------------------------------ */
/* GLSL                                                                                         */
/* Shape fns:  Hit shapeX(vec2 p, float i, float t, float px, <schema params...>)              */
/* Shade fns:  vec4 shadeX(Hit h, vec2 wp, vec3 pa, vec3 pb, vec3 pc, float t, <schema...>)    */
/*             returns premultiplied linear colour + alpha                                      */
/* ------------------------------------------------------------------------------------------ */

export const GLSL_COMMON = /* glsl */ `
#define PI 3.14159265359
#define TAU 6.28318530718
struct Hit { float cov; float dc; float w; float v; float t; vec3 n; float m; float sd; vec2 g; };
// sd: signed distance to the outline (<0 inside) · g: unit direction away from the outline
float sx_hash(vec2 p){ vec3 p3=fract(vec3(p.xyx)*.1031); p3+=dot(p3,p3.yzx+33.33); return fract((p3.x+p3.y)*p3.z); }
vec2 sx_hash2(vec2 p){ vec3 p3=fract(vec3(p.xyx)*vec3(.1031,.1030,.0973)); p3+=dot(p3,p3.yzx+33.33); return fract((p3.xx+p3.yz)*p3.zy); }
float sx_noise(vec2 p){ vec2 i=floor(p),f=fract(p); vec2 u=f*f*(3.-2.*f);
  return mix(mix(sx_hash(i),sx_hash(i+vec2(1,0)),u.x),mix(sx_hash(i+vec2(0,1)),sx_hash(i+vec2(1,1)),u.x),u.y); }
vec2 sx_warp(vec2 p,float amt,float sc,float sp,float t){
  if(amt<=0.) return p;
  vec2 q=p*sc;
  vec2 o=vec2(sx_noise(q+vec2(0.,t*sp))+.5*sx_noise(q*2.03+vec2(3.1,-t*sp*1.3)),
              sx_noise(q+vec2(5.2,1.3)-t*sp*.8)+.5*sx_noise(q*1.97+vec2(-1.7,t*sp)))/1.5-.5;
  return p+amt*o*2.;
}
mat2 sx_rot(float a){ float c=cos(a),s=sin(a); return mat2(c,s,-s,c); }
vec3 sx_lin(vec3 c){ return pow(c,vec3(2.2)); }
float sx_pp(float t){ return 1.-abs(fract(t*.5)*2.-1.); } // ping-pong 0..1..0
vec3 sx_pal(vec3 a,vec3 b,vec3 c,float t){ t=sx_pp(t); t=t*t*(3.-2.*t); return t<.5?mix(a,b,t*2.):mix(b,c,t*2.-1.); }
`;

const flat2D = (cov: string) => `
  Hit h;
  h.sd=sd; h.g=g; h.cov=${cov};
  h.dc=abs(sd); h.w=.004; h.v=clamp(-sd/.1,0.,1.);
  h.n=vec3(0.,0.,1.); h.m=1.;`;

export const GLSL_SHAPES: Record<ShapeType, string> = {
  circle: /* glsl */ `
Hit shapeCircle(vec2 p,float i,float t,float px,float radius){
  float l=length(p);
  float sd=l-radius; vec2 g=p/max(l,1e-5);${flat2D('1.-smoothstep(-px,px,sd)')}
  h.t=.5-.5*p.y/radius;
  return h;
}`,
  box: /* glsl */ `
float sx_sdBox(vec2 p,vec2 b,float r){ r=min(r,min(b.x,b.y)); vec2 q=abs(p)-b+r; return length(max(q,0.))+min(max(q.x,q.y),0.)-r; }
Hit shapeBox(vec2 p,float i,float t,float px,float wd,float ht,float corner){
  vec2 b=vec2(wd,ht)*.5;
  float sd=sx_sdBox(p,b,corner);
  float e=.0015;
  vec2 g=normalize(vec2(sx_sdBox(p+vec2(e,0.),b,corner)-sx_sdBox(p-vec2(e,0.),b,corner),
                        sx_sdBox(p+vec2(0.,e),b,corner)-sx_sdBox(p-vec2(0.,e),b,corner))+1e-6);${flat2D('1.-smoothstep(-px,px,sd)')}
  h.t=.5-.5*p.y/max(b.y,1e-3);
  return h;
}`,
  polygon: /* glsl */ `
float sx_sdPoly(vec2 p,float r,float n,float rr){
  float an=PI/n; vec2 acs=vec2(cos(an),sin(an));
  r=max(r-rr,.001);
  float bn=mod(atan(p.x,p.y),2.*an)-an;
  p=length(p)*vec2(cos(bn),abs(sin(bn)));
  p-=r*acs; p.y+=clamp(-p.y,0.,r*acs.y);
  return length(p)*sign(p.x)-rr;
}
Hit shapePolygon(vec2 p,float i,float t,float px,float sides,float radius,float roundness){
  float n=max(3.,floor(sides+.5));
  float sd=sx_sdPoly(p,radius,n,roundness);
  float e=.0015;
  vec2 g=normalize(vec2(sx_sdPoly(p+vec2(e,0.),radius,n,roundness)-sx_sdPoly(p-vec2(e,0.),radius,n,roundness),
                        sx_sdPoly(p+vec2(0.,e),radius,n,roundness)-sx_sdPoly(p-vec2(0.,e),radius,n,roundness))+1e-6);${flat2D('1.-smoothstep(-px,px,sd)')}
  h.t=.5-.5*p.y/radius;
  return h;
}`,
  ribbon: /* glsl */ `
Hit shapeRibbon(vec2 p,float i,float t,float px,float cnt,float width,float freq,float amp,float spread,float twist,float speed,float seed){
  float o=(i-(cnt-1.)*.5)*spread;
  float ph=seed*1.37+i*.83;
  float a1=freq*p.x+ph+t*speed, a2=freq*1.73*p.x-ph*.7-t*speed*.63;
  float y=amp*(sin(a1)+.35*sin(a2))+o*(1.+.25*sin(p.x*1.3+ph));
  float dy=amp*freq*(cos(a1)+.35*1.73*cos(a2));
  float ta=freq*.55*p.x+ph*1.3+t*speed*.45;
  float ct=cos(ta), st=sin(ta);
  float w=width*mix(1.,.08+.92*abs(ct),twist);
  float d=(p.y-y)/sqrt(1.+dy*dy);
  Hit h;
  h.dc=abs(d); h.w=w; h.v=clamp(d/max(w,1e-4),-1.,1.);
  h.cov=1.-smoothstep(w-px,w+px,abs(d));
  h.t=.15+.7*(.5+.5*sin(p.x*.8+ph+t*speed*.3))+(cnt>1.?(i/(cnt-1.)-.5)*.3:0.);
  h.n=normalize(vec3(-dy*.35, st*twist+h.v*.75, abs(ct)*twist+(1.-twist)+.12));
  h.m=1.;
  h.sd=abs(d)-w; h.g=(d<0.?-1.:1.)*vec2(-dy,1.)/sqrt(1.+dy*dy);
  return h;
}`,
  arc: /* glsl */ `
Hit shapeArc(vec2 p,float i,float t,float px,float cnt,float radius,float th,float spacing,float len,float speed,float seed){
  float r=radius+i*spacing;
  float ang=fract((atan(p.y,p.x)+PI)/TAU - t*speed*(1.+i*.37)*.15 + sx_hash(vec2(seed,i))+i*.21);
  float u=clamp(ang/max(len,.001),0.,1.);
  float taper=ang<len?pow(sin(PI*u),.7):0.;
  float l=length(p);
  float w=th*taper;
  Hit h;
  h.dc=abs(l-r); h.w=max(w,1e-5);
  h.v=clamp((l-r)/max(w,1e-4),-1.,1.);
  h.cov=(1.-smoothstep(w-px,w+px,abs(l-r)))*step(.001,taper);
  h.t=u;
  vec2 dir=p/max(l,1e-4);
  h.n=normalize(vec3(dir*h.v*.85, sqrt(max(0.,1.-h.v*h.v))+.1));
  h.m=taper;
  h.sd=abs(l-r)-w; h.g=(l<r?-1.:1.)*dir;
  return h;
}`,
  orb: /* glsl */ `
Hit shapeOrb(vec2 p,float i,float t,float px,float cnt,float radius,float spacing,float falloff,float flt,float speed){
  float k=i-(cnt-1.)*.5;
  float r=radius*pow(falloff,abs(k)+i*.15);
  vec2 c=vec2(k*spacing, sin(t*speed+i*1.7)*flt+ cos(i*2.3)*spacing*.12);
  vec2 q=(p-c)/r;
  float l=length(q);
  Hit h;
  h.dc=abs(l-1.)*r; h.w=r*.035; h.v=l;
  h.cov=1.-smoothstep(1.-px/r,1.+px/r,l);
  h.t=.5-.5*q.y;
  h.n=vec3(q*min(1.,1./max(l,1e-4)), sqrt(max(0.,1.-l*l)));
  h.m=1.;
  h.sd=(l-1.)*r; h.g=q/max(l,1e-5);
  return h;
}`,
  blob: /* glsl */ `
Hit shapeBlob(vec2 p,float i,float t,float px,float radius,float wobble,float lobes,float speed){
  float a=atan(p.y,p.x);
  float def=1.+wobble*(.6*sin(lobes*a+t*speed*1.3)+.4*(sx_noise(vec2(a*1.5+t*speed*.4, t*speed*.3))*2.-1.));
  float r=radius*def;
  float l=length(p)/r;
  Hit h;
  h.dc=abs(l-1.)*r; h.w=r*.035; h.v=l;
  h.cov=1.-smoothstep(1.-px/r,1.+px/r,l);
  h.t=.5-.5*p.y/r;
  vec2 q=p/r;
  h.n=vec3(q*min(1.,1./max(l,1e-4)), sqrt(max(0.,1.-l*l)));
  h.m=1.;
  h.sd=(l-1.)*r; h.g=p/max(length(p),1e-5);
  return h;
}`,
  particles: /* glsl */ `
Hit shapeParticles(vec2 p,float i,float t,float px,float density,float size,float amount,float twinkle,float speed,float seed){
  vec2 g=p*density+vec2(t*speed*density*.2,0.);
  vec2 cell=floor(g);
  vec2 rnd=sx_hash2(cell+seed*7.13);
  vec2 f=fract(g)-.5-(rnd-.5)*.7;
  float on=step(1.-amount,sx_hash(cell*1.37+seed));
  float dd=length(f)/density;
  float w=size*.0018*(.35+rnd.x*1.3);
  float tw=mix(1.,.5+.5*sin(t*4.+rnd.y*40.),twinkle);
  Hit h;
  h.dc=dd; h.w=w; h.v=clamp(dd/max(w,1e-5),0.,1.);
  h.cov=(1.-smoothstep(w-px,w+px,dd))*on;
  h.t=rnd.y;
  h.n=vec3(0.,0.,1.);
  float win=1.-smoothstep(.12,.42,length(f));
  h.m=on*tw*win;
  h.sd=dd-w; h.g=f/max(length(f),1e-5);
  return h;
}`,
};

export const GLSL_SHADES: Record<ShadeType, string> = {
  /*
   * Spatial-light material. Nothing here is 3D: the outline (sd, g) is enough.
   *  - edge, inner and outer glows read the light field AT THE CONTOUR POINT nearest to the pixel,
   *    so a light passing by lights up the part of the rim it is close to, and the glow spreads from there
   *  - bevel: a height profile along -sd gives a normal → classic emboss lighting from every light
   *  - texture: noise bump on that normal, so highlights break and travel over the surface
   */
  lit: /* glsl */ `
vec4 shadeLit(Hit h,vec2 wp,vec2 cw,vec3 pa,vec3 pb,vec3 pc,float t,
  float flow,float opacity,float surface,float ambient,float bevel,float depth,float volume,float tex,float texScale,
  float specular,float gloss,float edge,float edgeW,float bands,float emission,float inner,float outer,float bounce,
  float shadowAmt,float shadowDist){
  float sd=h.sd;
  vec4 Lc=sx_lights(cw,t);
  vec4 Lp=sx_lights(wp,t);
  float s=atan(h.g.y,h.g.x);
  float nb=floor(bands+.5);
  float wave=nb>0.?.55+.45*(.72*cos(nb*s+t*.6)+.28*cos(2.*nb*s-.7+t*.4)):1.;
  float power=(1.-exp(-Lc.a*1.1))*1.15*wave; // saturating: many lights never wash the frame
  // normal: shape normal → optional dome → bevel along the outline → texture bump
  float din=max(-sd,0.);
  vec3 n=normalize(h.n+vec3(h.g*volume*(1.-smoothstep(0.,.35,din))*1.2,0.));
  if(bevel>0.){ float x=clamp(din/bevel,0.,1.); float dh=6.*x*(1.-x); n=normalize(n+vec3(h.g*dh*depth*.5,0.)); }
  if(tex>0.){
    vec2 q=wp*texScale; float e=.35; float n0=sx_noise(q)+.5*sx_noise(q*2.1);
    vec2 gr=vec2(sx_noise(q+vec2(e,0.))+.5*sx_noise((q+vec2(e,0.))*2.1)-n0, sx_noise(q+vec2(0.,e))+.5*sx_noise((q+vec2(0.,e))*2.1)-n0)/e;
    n=normalize(n+vec3(-gr*tex*.35,0.));
  }
  vec3 dif,spc; sx_litLights(wp,n,gloss,t,dif,spc);
  // body: gradient overlay driven by how much light reaches this point
  float k=clamp(Lp.a*surface,0.,1.);
  vec3 pal=sx_pal(pa,pb,pc,k*.92+t*flow);
  vec3 body=mix(pa*.35,pal,clamp(ambient+k,0.,1.))*(ambient+dif*1.1)+Lp.rgb*Lp.a*surface*.25+spc*specular;
  // contour-driven light
  vec3 rc=mix(Lc.rgb,mix(pc,vec3(1.),.4),.35);
  float rim=exp(-.5*pow(sd/max(edgeW,1e-4),2.))*edge*power;
  float ig=step(sd,0.)*exp(-.5*pow(din/max(inner,1e-4),2.))*emission*.55*power;
  float dout=max(sd,0.);
  float og=step(0.,sd)*exp(-.5*pow(dout/max(outer,1e-4),2.))*emission*.6*power;
  float bg=step(0.,sd)*exp(-.5*pow(dout/max(outer*3.,1e-4),2.))*bounce*.22*(1.-exp(-Lc.a));
  float a=h.cov*opacity*h.m;
  vec3 c=a*body+rc*(rim+ig+og+bg)*h.m;
  return vec4(c,a);
}`,
  glow: /* glsl */ `
vec4 shadeGlow(Hit h,vec2 wp,vec2 cw,vec3 pa,vec3 pb,vec3 pc,float t,float flow,float intensity,float core,float fill,float halo,float edge){
  vec3 col=sx_pal(pa,pb,pc,h.t+t*flow);
  vec3 hi=mix(pc,vec3(1.),.3);
  float line=exp(-h.dc/(h.w*.3+.0015))*core;
  float body=h.cov*fill;
  float hal=exp(-h.dc/(h.w*1.2+halo*.12+.002))*halo*.6;
  float e=h.cov*pow(abs(h.v),8.)*edge;
  vec3 c=(col*(body+hal)+mix(col,hi,.65)*line+hi*e)*intensity*h.m;
  float a=clamp(max(max(body,line*.9),hal+e)*h.m,0.,1.);
  return vec4(c,a);
}`,
  silk: /* glsl */ `
vec4 shadeSilk(Hit h,vec2 wp,vec2 cw,vec3 pa,vec3 pb,vec3 pc,float t,float flow,float light,float sheen,float gloss,float shadow,float rim,float opacity){
  vec3 base=sx_pal(pa,pb,pc,h.t+h.n.y*.25+t*flow);
  vec3 L=normalize(vec3(cos(light),sin(light),1.1));
  float diff=max(dot(h.n,L),0.);
  float lam=mix(1.,.25+.95*diff,shadow);
  vec3 H=normalize(L+vec3(0.,0.,1.));
  float sp=pow(max(dot(h.n,H),0.),gloss)*sheen;
  float fr=pow(1.-max(h.n.z,0.),3.)*rim;
  vec3 hi=mix(pc,vec3(1.),.4);
  vec3 c=base*lam+hi*(sp+fr*.6);
  float a=h.cov*opacity*h.m;
  return vec4(c*a,a);
}`,
  glass: /* glsl */ `
vec4 shadeGlass(Hit h,vec2 wp,vec2 cw,vec3 pa,vec3 pb,vec3 pc,float t,float flow,float transp,float refr,float fres,float highlight,float irid,float tint){
  vec3 n=h.n; float nz=max(n.z,0.);
  vec3 bg=sx_background(wp-n.xy*refr*(1.2-nz),t);
  bg=mix(bg,bg*mix(vec3(1.),pb*2.,.8),tint);
  float F=clamp(.04+pow(1.-nz,3.)*fres,0.,1.);
  vec3 R=reflect(vec3(0.,0.,-1.),n);
  vec3 env=sx_pal(pa,pb,pc,.5+.5*R.y+t*flow);
  env*=.55+.9*smoothstep(-.2,.9,R.y);
  vec3 film=.5+.5*cos(TAU*(vec3(0.,.33,.67)+(1.-nz)*1.8+t*flow*.5));
  env=mix(env,env*film*1.8,irid);
  vec3 L=normalize(vec3(-.55,.65,1.));
  vec3 H=normalize(L+vec3(0.,0.,1.));
  float nh=max(dot(n,H),0.);
  float spec=(pow(nh,120.)*2.5+pow(nh,10.)*.12)*highlight;
  float caustic=pow(max(0.,dot(n.xy,-L.xy)),3.)*nz*.35*highlight;
  vec3 body=bg*(.8+.2*nz)+pc*caustic;
  // transparency = how much of the layers below shows through un-refracted
  float k=h.cov*h.m;
  float a=k*clamp(mix(1.,F+spec,transp),0.,1.);
  vec3 c=k*(body*(1.-F)*(1.-transp)+env*F+vec3(spec));
  return vec4(c,a);
}`,
  solid: /* glsl */ `
vec4 shadeSolid(Hit h,vec2 wp,vec2 cw,vec3 pa,vec3 pb,vec3 pc,float t,float flow,float shading,float sheen,float opacity){
  vec3 col=sx_pal(pa,pb,pc,h.t+t*flow);
  col*=mix(1.,.45+.55*h.n.z,shading);
  col+=mix(pc,vec3(1.),.6)*pow(max(dot(h.n,normalize(vec3(-.4,.5,1.))),0.),24.)*sheen;
  float a=h.cov*opacity*h.m;
  return vec4(col*a,a);
}`,
};

export const SHAPE_FN: Record<ShapeType, string> = {
  circle: 'shapeCircle', box: 'shapeBox', polygon: 'shapePolygon',
  ribbon: 'shapeRibbon', arc: 'shapeArc', orb: 'shapeOrb', blob: 'shapeBlob', particles: 'shapeParticles',
};
export const SHADE_FN: Record<ShadeType, string> = {
  lit: 'shadeLit',
  glow: 'shadeGlow', silk: 'shadeSilk', glass: 'shadeGlass', solid: 'shadeSolid',
};
