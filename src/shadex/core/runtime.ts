/**
 * WebGL2 runtime. One canvas, one program per structure, uniforms per frame.
 * Used by the editor preview; the embed snippet ships an even smaller copy (see export.ts).
 */
import type { Scene } from './ir';
import { compile, structureKey, type Compiled } from './compiler';

const VERT = `#version 300 es
in vec2 a;void main(){gl_Position=vec4(a,0.,1.);}`;

export const wrapFragment = (src: string) => `#version 300 es
precision highp float;
uniform vec3 iResolution;
uniform float iTime;
out vec4 sx_out;
${src}
void main(){ mainImage(sx_out, gl_FragCoord.xy); }`;

export class ShadexRenderer {
  readonly gl: WebGL2RenderingContext;
  private program: WebGLProgram | null = null;
  private compiled: Compiled | null = null;
  private locations = new Map<string, WebGLUniformLocation | null>();
  private uTime: WebGLUniformLocation | null = null;
  private uRes: WebGLUniformLocation | null = null;
  private vao: WebGLVertexArrayObject | null;
  lastError: string | null = null;

  constructor(readonly canvas: HTMLCanvasElement) {
    const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
    if (!gl) throw new Error('WebGL2 no está disponible en este navegador.');
    this.gl = gl;
    this.vao = gl.createVertexArray();
    gl.bindVertexArray(this.vao);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);
  }

  /** Recompiles only when the structure changed. Returns the current compiled program info. */
  sync(scene: Scene): Compiled | null {
    if (this.compiled && this.program && this.compiled.key === structureKey(scene)) return this.compiled;
    const next = compile(scene, 'runtime');
    const gl = this.gl;
    const sh = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        const log = gl.getShaderInfoLog(s) || 'Error GLSL';
        gl.deleteShader(s);
        throw new Error(log);
      }
      return s;
    };
    try {
      const vs = sh(gl.VERTEX_SHADER, VERT);
      const fs = sh(gl.FRAGMENT_SHADER, wrapFragment(next.source));
      const prog = gl.createProgram()!;
      gl.bindAttribLocation(prog, 0, 'a');
      gl.attachShader(prog, vs); gl.attachShader(prog, fs);
      gl.linkProgram(prog);
      gl.deleteShader(vs); gl.deleteShader(fs);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog) || 'Error al enlazar');
      if (this.program) gl.deleteProgram(this.program);
      this.program = prog;
      this.compiled = next;
      this.locations.clear();
      for (const u of next.uniforms) this.locations.set(u.name, gl.getUniformLocation(prog, u.name));
      this.uTime = gl.getUniformLocation(prog, 'iTime');
      this.uRes = gl.getUniformLocation(prog, 'iResolution');
      this.lastError = null;
    } catch (e) {
      this.lastError = (e as Error).message;
      console.error('[shadex] compile error\n', this.lastError);
    }
    return this.compiled;
  }

  draw(scene: Scene, time: number) {
    const gl = this.gl;
    if (!this.program || !this.compiled) return;
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.useProgram(this.program);
    for (const u of this.compiled.uniforms) {
      const loc = this.locations.get(u.name);
      if (!loc) continue;
      const v = u.get(scene);
      if (u.type === 'f') gl.uniform1f(loc, v as number);
      else gl.uniform3fv(loc, v as number[]);
    }
    gl.uniform1f(this.uTime, time);
    gl.uniform3f(this.uRes, gl.drawingBufferWidth, gl.drawingBufferHeight, 1);
    gl.bindVertexArray(this.vao);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.bindVertexArray(null);
  }

  dispose() {
    if (this.program) this.gl.deleteProgram(this.program);
    this.gl.deleteVertexArray(this.vao);
  }
}
