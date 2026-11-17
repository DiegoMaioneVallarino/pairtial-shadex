/** Legacy five-layer material, computed entirely on GPU and exported unchanged to Shadertoy. */
import type { GLSLShape } from './glslNative';
type Stop={hex:string;alpha:number};
type Layer={enabled:boolean;colors:Stop[];width:number;amplitude:number;frequency:number;phase:number;centerX:number;centerY:number;softness:number};
export type LegacyLayers=Record<'edge'|'inner'|'outer'|'surface'|'background',Layer>;
const num=(v:number)=>Number.isFinite(v)?Number(v.toFixed(6)).toFixed(6):'0.0';
const palette=(name:string,stops:Stop[])=>{
 const colors=stops.slice(0,5).map(c=>{const rgb=[1,3,5].map(i=>num(parseInt(c.hex.slice(i,i+2),16)/255));return `vec4(${rgb.join(',')},${num(c.alpha)})`;});
 return `vec4 ${name}(float v){float x=clamp(v,0.0,.999999)*4.0;vec4 c[5]=vec4[5](${colors.join(',')});int i=int(floor(x));return mix(c[i],c[i+1],fract(x));}`;
};
export function makeLegacyGLSL(shape:GLSLShape, layers:LegacyLayers):string {
 const ids=['edge','inner','outer','surface','background'] as const;
 const pal=ids.map(k=>palette(`${k}Palette`,layers[k].colors)).join('\n');
 const shapeDist=shape==='diamond'?'(abs(p.x)+abs(p.y)-1.1)*.70710678':shape==='rounded'?'(length(max(abs(p)-vec2(.68),0.0))+min(max(abs(p.x)-.68,abs(p.y)-.68),0.0)-.22)':'length(p)-1.0';
 const layer=(k:typeof ids[number])=>{
  const e=layers[k];if(!e.enabled)return '';
  const v=(x:number)=>num(x);
  const period=`(6.28318530718*${v(Math.round(e.frequency))}*arc+${v(e.phase)}+iTime*.24)`;
  const mod=`clamp(.5+.5*${v(e.amplitude)}*(.65*sin(${period})+.25*sin(2.0*${period}+1.8)+.1*cos(3.0*${period}-1.3)),0.0,1.0)`;
  const palName=`${k}Palette`;
  const reach=`max(1.0,${v(e.width)}*(.5+${v(e.softness)}))`;
  let weight='0.0';
  if(k==='edge')weight=`exp(-.5*pow(dist/${reach},2.0))`;
  if(k==='inner')weight=`(dist<0.0?exp(-.5*pow(dist/${reach},2.0)):0.0)`;
  if(k==='outer')weight=`(dist>0.0?exp(-.5*pow(dist/${reach},2.0)):0.0)`;
  if(k==='surface')weight=`(dist<0.0?exp(-.5*pow(length(p-vec2(${v(e.centerX)},${v(e.centerY)}))*110.0/${reach},2.0)):0.0)`;
  if(k==='background')weight=`(dist>0.0?exp(-.5*pow(length(p-vec2(${v(e.centerX)},${v(e.centerY)}))*110.0/${reach},2.0)):0.0)`;
  return `{vec4 c=${palName}(${mod});float w=clamp(${weight}*c.a,0.0,1.0);color=mix(color,c.rgb,w);}`;
 };
 return `// Shadex v2.0 - GPU five-layer material. Preview and Shadertoy share this source.
${pal}
void mainImage(out vec4 fragColor,in vec2 fragCoord){
 vec2 p=(fragCoord-.5*iResolution.xy)/(min(iResolution.x,iResolution.y)*.305);
 float sd=${shapeDist};float dist=sd*min(iResolution.x,iResolution.y)*.305;
 float angle=atan(p.y,p.x);
 // For circles, arc angle is exact. For other silhouettes, use an angular approximation.
 float arc=fract((angle+1.57079632679)/6.28318530718+1.0);
 vec3 color=vec3(4.0,7.0,17.0)/255.0;
 ${layer('background')}
 ${layer('surface')}
 ${layer('outer')}
 ${layer('inner')}
 ${layer('edge')}
 fragColor=vec4(clamp(color,0.0,1.0),1.0);
}`;
}
