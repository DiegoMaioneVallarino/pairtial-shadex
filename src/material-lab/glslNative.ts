/** Shadex native GLSL core — same source for WebGL2 preview and Shadertoy export.
 * Scope v1.5.1: fixed outer sphere and independently deformable internal geometry.
 */
export type GLSLLight = {id?:number;kind:'radial'|'linear';enabled:boolean;x:number;y:number;angle:number;radius:number;aspect:number;intensity:number;color:string};
export type GLSLStop = {hex:string;alpha:number};
export type GLSLMaterial = {colorsSurface:GLSLStop[];colorsEdge:GLSLStop[];cycles:number;phase:number;amplitude:number;animateSpeed:number;edgeWidth:number;innerReach:number;outerReach:number;backgroundReach:number;surfaceResponse:number;edgeResponse:number;emission:number;backgroundBounce:number;ambient:number;softness:number};
export type GLSLEffects = {edge:boolean;inner:boolean;outer:boolean;surface:boolean;background:boolean};
const n=(x:number)=>Number.isFinite(x)?Number(x.toFixed(7)).toString().includes('.')?Number(x.toFixed(7)).toString():`${x}.0`:'0.0';
const rgb=(hex:string)=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255);
const vec3=(hex:string)=>`vec3(${rgb(hex).map(n).join(',')})`;
const palette=(name:string,stops:GLSLStop[])=>{
  const s=[...stops];while(s.length<5)s.push(s[s.length-1]??{hex:'#000000',alpha:1});
  return `vec4 ${name}(float x){\n  float v=clamp(x,0.0,1.0)*4.0;\n  vec4 c[5]=vec4[5](${s.slice(0,5).map(c=>`vec4(${rgb(c.hex).map(n).join(',')},${n(c.alpha)})`).join(',')});\n  int i=min(3,int(floor(v)));return mix(c[i],c[i+1],fract(v));\n}`;
};
export type GLSLAnimation = { min:number; max:number; start:number; direction:number; speed:number };
export type GLSLAnimations = Record<string, GLSLAnimation>;
export type GLSLTwist = {enabled:boolean;amount:number;bands:number;rotation:number;silhouette:number;attached:boolean};
export type GLSLSurface = {enabled:boolean;mode:'twist-sheet'|'bessel'|'waves';amplitude:number;folds:number;twist:number;tilt:number;spin:number;wireframe:boolean;animate:boolean};
export type GLSLCrystal = {enabled:boolean;transparency:number;innerScale:number;innerOpacity:number;lens:number;tint:number;rimBoost:number};
export type GLSLGeometry = {twist:GLSLTwist;surface:GLSLSurface;crystal:GLSLCrystal};
export function makeShadertoyGLSL(u:GLSLMaterial,lights:GLSLLight[],effects:GLSLEffects, animations:GLSLAnimations = {}, geometry?:GLSLGeometry):string {
 const param=(id:string,value:number)=>{
   const a=animations[id];
   if(!a || a.max<=a.min || a.speed<=0) return n(value);
   const span=a.max-a.min;
   const phase=(a.start-a.min)/span;
   // Triangle wave, initialized from the slider's current position and direction.
   const origin=a.direction<0 ? 2-phase : phase;
   return `mix(${n(a.min)},${n(a.max)},1.0-abs(2.0*fract((${n(origin)}+iTime*${n(a.speed)})*0.5)-1.0))`;
 };

 const tw=geometry?.twist, sf=geometry?.surface, cr=geometry?.crystal;
 const isTw=!!tw?.enabled, isSf=!!sf?.enabled, isCrystal=isSf && !!cr?.enabled;
 const heightCode = !isSf ? '' : sf!.mode==='twist-sheet' ?
   `return ${n(sf!.amplitude)}*sin(${n(sf!.folds)}*(a+${n(sf!.twist)}*(1.0-r)+${sf!.animate?'iTime*.65':'0.0'}))*pow(max(0.0,1.0-r*r),.55);` :
   sf!.mode==='waves' ?
   `return ${n(sf!.amplitude)}*(.55*sin(${n(sf!.folds)}*2.3*q.x+${n(sf!.twist)}*q.y+${sf!.animate?'iTime*.65':'0.0'})+.45*sin(${n(sf!.folds)}*2.0*q.y-${n(sf!.twist)}*q.x-${sf!.animate?'iTime*.4875':'0.0'}))*(1.0-.25*r*r);` :
   `return ${n(sf!.amplitude)}*pow(max(0.0,1.0-r*r),1.1)*cos(3.14159265*${n(sf!.twist)}*r)*cos(${n(sf!.folds)}*a+${sf!.animate?'iTime*.65':'0.0'});`;
 const shapeCode = isTw ? `float twistRadius(float a){return 1.0;} // Outer glass silhouette stays spherical
 vec2 twistUV(vec2 p){float r=length(p),a=atan(p.y,p.x);float theta=a+${n(tw!.amount)}*(1.0-smoothstep(0.0,1.0,r))*sin(${n(tw!.bands)}*a+${n(tw!.rotation)}+iTime*.19);return r*vec2(cos(theta),sin(theta));}` :
 `float twistRadius(float a){return 1.0;} vec2 twistUV(vec2 p){return p;}`;
 const sheetCode = isSf ? `
 float surfaceHeight(vec2 q){float r=length(q),a=atan(q.y,q.x);${heightCode}}
 // Analytic 2.5D height field. The old CPU triangle mesh is intentionally not used.
 vec4 internalSheet(vec2 p){
   float spin=${n(sf!.spin)},cs=cos(spin),sn=sin(spin);
   vec2 q=mat2(cs,-sn,sn,cs)*p;
   float tilt=${n(sf!.tilt)};
   // Inverse projected coordinate with two fixed-point iterations.
   q.y/=max(.17,cos(tilt));
   for(int i=0;i<3;i++){float z=surfaceHeight(q);q.y=(p.y+z*sin(tilt))/max(.17,cos(tilt));}
   float r=length(q);if(r>1.0)return vec4(0.0);
   float h=.009;vec2 slope=vec2(surfaceHeight(q+vec2(h,0.0))-surfaceHeight(q-vec2(h,0.0)),surfaceHeight(q+vec2(0.0,h))-surfaceHeight(q-vec2(0.0,h)))/(2.0*h);
   vec3 normal=normalize(vec3(-slope,1.0));
   vec4 light=field(q);
   vec4 pal=surfacePalette(clamp(light.a*${param('unified:surfaceResponse',u.surfaceResponse)},0.0,1.0));
   float diffuse=clamp(.58+.38*normal.z-.18*normal.x-.16*normal.y,.15,1.2);
   vec3 col=mix(vec3(.025,.04,.10),pal.rgb,clamp((.22+light.a*${param('unified:surfaceResponse',u.surfaceResponse)})*diffuse*pal.a,0.0,1.0));
   col+=light.rgb*light.a*${param('unified:surfaceResponse',u.surfaceResponse)}*.3*diffuse;
   float fresnel=pow(1.0-max(0.0,normal.z),2.0);
   col+=edgePalette(clamp(light.a*${param('unified:edgeResponse',u.edgeResponse)},0.0,1.0)).rgb*(fresnel*.7+.08)*light.a;
   ${sf!.wireframe?'vec2 g=abs(fract(q*18.0)-.5);float grid=1.0-smoothstep(.01,.035,min(g.x,g.y));col=mix(col,vec3(.75,.9,1.0),grid*.15);':''}
   return vec4(clamp(col,0.0,1.0),smoothstep(1.0,.97,r));
 }` : '';
 const lightCode=lights.filter(l=>l.enabled).slice(0,16).map((l)=>{
 const id = `light:${l.id ?? 0}:`;
 const x=param(id+'x',l.x),y=param(id+'y',l.y),radius=param(id+'radius',l.radius),aspect=param(id+'aspect',l.aspect),angle=param(id+'angle',l.angle),intensity=param(id+'intensity',l.intensity);
 const ca=`cos(${angle})`,sa=`sin(${angle})`;
 const expr=l.kind==='radial'?`dot(q/vec2(max(.025,${radius}),max(.025,(${radius})*max(.15,${aspect}))),q/vec2(max(.025,${radius}),max(.025,(${radius})*max(.15,${aspect}))))`:`pow(q.x/max(.025,${radius}),2.0)`;
 return `  {vec2 d=p-vec2(${x},${y});vec2 q=vec2(dot(d,vec2(${ca},${sa})),dot(d,vec2(-(${sa}),${ca})));float w=(${intensity})*exp(-2.3*${expr});sum+=w;rgb+=w*${vec3(l.color)};}`;
 }).join('\n');
 const master=`float a=6.28318530718*${param('unified:cycles',u.cycles)}*s+${param('unified:phase',u.phase)}+iTime*${param('unified:animateSpeed',u.animateSpeed)};float w=.72*cos(a)+.20*cos(2.0*a-.7)+.08*sin(3.0*a+.3);return clamp(${param('unified:ambient',u.ambient)}+(1.0-${param('unified:ambient',u.ambient)})*(.5+.5*${param('unified:amplitude',u.amplitude)}*w),0.0,1.0);`;
 return `// Shadex Material Lab v1.5.1 — spherical container / independent inner geometry\n// Paste directly into Shadertoy Image. iTime / iResolution are built-ins.\n// Generated from the same source used by the WebGL2 preview.
// Parametric surfaces use an analytic height field (not the legacy Canvas triangle rasterizer).\n${palette('surfacePalette',u.colorsSurface)}\n${palette('edgePalette',u.colorsEdge)}\n${shapeCode}
float masterLight(float s){${master}}\nvec4 field(vec2 p){float sum=0.0;vec3 rgb=vec3(0.0);\n${lightCode}\nreturn vec4(sum>0.000001?rgb/sum:vec3(0.0),sum);}\n${sheetCode}\nvoid mainImage(out vec4 fragColor,in vec2 fragCoord){\n  vec2 p=(fragCoord-.5*iResolution.xy)/(min(iResolution.x,iResolution.y)*.305);\n  float a0=atan(p.y,p.x);
  float radius=1.0; // Independent outer sphere: never deform its silhouette
  float r=length(p),dist=(r-radius)*min(iResolution.x,iResolution.y)*.305;\n  float angle=atan(p.y,p.x);float s=fract((angle+1.57079632679)/6.28318530718+1.0);\n  vec4 boundary=field(p/max(r,.0001));\n  float gain=.65+.35*masterLight(s);float power=boundary.a*gain;\n  vec4 ep=edgePalette(clamp(power*${param('unified:edgeResponse',u.edgeResponse)},0.0,1.0));\n  vec3 reflected=mix(boundary.rgb,ep.rgb,.28);\n  float strength=power*${param('unified:edgeResponse',u.edgeResponse)};\n  vec3 color=vec3(4.0,7.0,17.0)/255.0;\n  if(dist<=0.0 && ${effects.surface?'true':'false'}){\n    vec4 local=field(p);vec4 pal=surfacePalette(local.a*${param('unified:surfaceResponse',u.surfaceResponse)});\n    float nz=sqrt(max(0.0,1.0-min(1.0,dot(p,p)/(radius*radius))));\n    float diffuse=.55+.45*nz;float weight=clamp((.2+local.a*${param('unified:surfaceResponse',u.surfaceResponse)}*diffuse)*pal.a,0.0,1.0);\n    color=mix(color,pal.rgb,weight);color+=local.rgb*local.a*${param('unified:surfaceResponse',u.surfaceResponse)}*.35;\n  }\n  if(dist>0.0){\n    float halo=exp(-.5*pow(dist/max(1.0,${param('unified:outerReach',u.outerReach)}*(.5+${param('unified:softness',u.softness)})),2.0));\n    float bounce=exp(-.5*pow(dist/max(1.0,${param('unified:backgroundReach',u.backgroundReach)}*(.6+${param('unified:softness',u.softness)})),2.0));\n    ${effects.background?`color+=reflected*bounce*strength*${param('unified:emission',u.emission)}*${param('unified:backgroundBounce',u.backgroundBounce)}*.42;`:''}\n    ${effects.outer?`color+=reflected*halo*strength*${param('unified:emission',u.emission)}*.85;`:''}\n  }else{\n    ${effects.inner?`float nearGlow=exp(-.5*pow(dist/max(1.0,${param('unified:innerReach',u.innerReach)}*(.45+${param('unified:softness',u.softness)})),2.0));color+=reflected*nearGlow*strength*${param('unified:emission',u.emission)}*.5;`:''}\n  }\n  ${effects.edge?`float rim=exp(-.5*pow(dist/max(1.0,${param('unified:edgeWidth',u.edgeWidth)}*(.3+${param('unified:softness',u.softness)}*.45)),2.0));color+=reflected*rim*strength;`:''}\n  ${isSf ? `
  // Crystal Chamber: shade the interior through the sphere without changing the exterior rim.
  if(${isCrystal?'true':'false'} && dist<0.0){
    float inside=max(0.0,1.0-r*r);
    vec2 uv=p/max(.12,${n(cr?.innerScale ?? 1)});
    uv*=1.0+${n(cr?.lens ?? 0)}*(1.0-inside)*(.4+.6*sqrt(inside));
    vec4 sheet=internalSheet(${isTw ? 'twistUV(uv)' : 'uv'});
    float containment=smoothstep(0.0,.03,radius-r);
    float opacity=${n(cr?.transparency ?? 1)}*${n(cr?.innerOpacity ?? 1)}*sheet.a*containment;
    float transmission=.38+.62*sqrt(inside);
    vec3 inner=mix(sheet.rgb,color,${n(cr?.tint ?? 0)});
    vec3 transmitted=mix(color,inner,transmission);
    float shine=clamp((max(color.r,max(color.g,color.b))-.43)/.51,0.0,1.0);
    float front=shine*(.3+.45*(1.0-${n(cr?.transparency ?? 1)}));
    color=mix(color,transmitted,opacity*(1.0-front));
    color+=color*pow(clamp(r/max(radius,.0001),0.0,1.0),22.0)*${n(cr?.rimBoost ?? 0)}*containment;
  } else if(!${isCrystal?'true':'false'} && dist<0.0){
    // Standalone internal surface is still contained by the spherical glass.
    vec2 uv=p/max(.12,${n(cr?.innerScale ?? 0.78)});
    vec4 sheet=internalSheet(${isTw ? 'twistUV(uv)' : 'uv'});
    float containment=smoothstep(0.0,.035,1.0-r);
    color=mix(color,sheet.rgb,sheet.a*containment*${n(cr?.innerOpacity ?? 1)});
  }` : ''}
  fragColor=vec4(clamp(color,0.0,1.0),1.0);\n}\n`;
}
const VERT=`#version 300 es\nin vec2 a_position;void main(){gl_Position=vec4(a_position,0.,1.);}`;
export class NativeGLSLRenderer {
 private gl:WebGL2RenderingContext;private program:WebGLProgram;private vao:WebGLVertexArrayObject|null;
 private time:WebGLUniformLocation|null;private resolution:WebGLUniformLocation|null;
 constructor(canvas:HTMLCanvasElement,source:string){
  const gl=canvas.getContext('webgl2',{preserveDrawingBuffer:true,alpha:false});if(!gl)throw Error('WebGL2 no disponible');this.gl=gl;
  const compile=(type:number,src:string)=>{const shader=gl.createShader(type);if(!shader)throw Error('Shader no disponible');gl.shaderSource(shader,src);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(shader)||'Error GLSL');return shader;};
  const vs=compile(gl.VERTEX_SHADER,VERT),fs=compile(gl.FRAGMENT_SHADER,`#version 300 es\nprecision highp float;uniform vec3 iResolution;uniform float iTime;out vec4 outColor;\n${source}\nvoid main(){mainImage(outColor,gl_FragCoord.xy);}`);
  const program=gl.createProgram();if(!program)throw Error('Programa no disponible');gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);gl.deleteShader(vs);gl.deleteShader(fs);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program)||'Error al enlazar');this.program=program;
  this.time=gl.getUniformLocation(program,'iTime');this.resolution=gl.getUniformLocation(program,'iResolution');
  this.vao=gl.createVertexArray();gl.bindVertexArray(this.vao);const buf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buf);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);const loc=gl.getAttribLocation(program,'a_position');gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);gl.bindVertexArray(null);
 }
 draw(t:number){const gl=this.gl;gl.viewport(0,0,gl.drawingBufferWidth,gl.drawingBufferHeight);gl.useProgram(this.program);gl.uniform1f(this.time,t);gl.uniform3f(this.resolution,gl.drawingBufferWidth,gl.drawingBufferHeight,1);gl.bindVertexArray(this.vao);gl.drawArrays(gl.TRIANGLES,0,6);gl.bindVertexArray(null);}
 dispose(){this.gl.deleteProgram(this.program);this.gl.deleteVertexArray(this.vao);}
}
