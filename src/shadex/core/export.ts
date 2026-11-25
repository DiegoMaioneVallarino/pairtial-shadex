/**
 * Everything that leaves the editor: Shadertoy GLSL, JSON, share links and a copy-paste embed.
 * The embed is self-contained (no Shadex download): ~3 KB of runner + the compiled shader.
 */
import { migrate, type Scene } from './ir';
import { compile } from './compiler';
import { wrapFragment } from './runtime';

export const toShadertoy = (s: Scene) => compile(s, 'export').source;

export const toJSON = (s: Scene) => JSON.stringify(s, null, 2);

export function encodeScene(s: Scene): string {
  const bytes = new TextEncoder().encode(JSON.stringify(s));
  let bin = '';
  bytes.forEach(b => { bin += String.fromCharCode(b); });
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function decodeScene(code: string): Scene | null {
  try {
    const b64 = code.replace(/-/g, '+').replace(/_/g, '/');
    const bin = atob(b64 + '==='.slice((b64.length + 3) % 4));
    const json = new TextDecoder().decode(Uint8Array.from(bin, ch => ch.charCodeAt(0)));
    return validateScene(JSON.parse(json));
  } catch {
    return null;
  }
}

/** Light structural check so a bad link or paste never crashes the editor. */
export function validateScene(v: unknown): Scene | null {
  const s = v as Scene;
  if (!s || typeof s !== 'object' || !Array.isArray(s.layers) || !s.background || !s.finish) return null;
  if (!Array.isArray(s.background.points) || s.background.points.length !== 4) return null;
  return migrate(s); // scenes saved by older versions get the new fields
}

export function toEmbed(s: Scene, opts: { scale?: number } = {}): string {
  const frag = wrapFragment(toShadertoy(s));
  const scale = opts.scale ?? 0.6;
  const safeName = s.name.replace(/[<>&"]/g, '');
  return `<!-- Shadex · ${safeName} · https://shadex — MIT -->
<canvas style="display:block;width:100%;aspect-ratio:${+s.aspect.toFixed(3)};border-radius:${Math.round(s.radius)}px;background:${s.background.base}"></canvas>
<script>
(function(){
  var c=document.currentScript.previousElementSibling,gl=c.getContext("webgl2",{antialias:false});
  if(!gl)return;
  var FS=${JSON.stringify(frag)};
  function sh(t,s){var o=gl.createShader(t);gl.shaderSource(o,s);gl.compileShader(o);return o}
  var p=gl.createProgram();
  gl.attachShader(p,sh(gl.VERTEX_SHADER,"#version 300 es\\nin vec2 a;void main(){gl_Position=vec4(a,0.,1.);}"));
  gl.attachShader(p,sh(gl.FRAGMENT_SHADER,FS));
  gl.bindAttribLocation(p,0,"a");gl.linkProgram(p);gl.useProgram(p);
  gl.bindBuffer(gl.ARRAY_BUFFER,gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0);
  var ut=gl.getUniformLocation(p,"iTime"),ur=gl.getUniformLocation(p,"iResolution");
  var still=matchMedia("(prefers-reduced-motion: reduce)").matches,vis=true,t0=performance.now();
  function draw(t){
    var d=Math.min(window.devicePixelRatio||1,2)*${scale},w=Math.max(1,Math.round(c.clientWidth*d)),h=Math.max(1,Math.round(c.clientHeight*d));
    if(c.width!==w||c.height!==h){c.width=w;c.height=h}
    gl.viewport(0,0,w,h);gl.uniform1f(ut,t);gl.uniform3f(ur,w,h,1);gl.drawArrays(gl.TRIANGLES,0,3);
  }
  function frame(now){if(vis&&!document.hidden)draw((now-t0)/1000);requestAnimationFrame(frame)}
  if(still){draw(8);addEventListener("resize",function(){draw(8)})}
  else{new IntersectionObserver(function(e){vis=e[0].isIntersecting}).observe(c);requestAnimationFrame(frame)}
})();
</script>`;
}
