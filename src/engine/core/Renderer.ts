export class Renderer {
  private readonly canvas: HTMLCanvasElement;
  private readonly gl: WebGL2RenderingContext;

  private program: WebGLProgram | null = null;
  private animationFrame: number | null = null;

  private startTime = performance.now();

private uniforms: Record<string, number> = {};

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;

    const gl = canvas.getContext("webgl2", {
      antialias: true,
      alpha: true,
    });

    if (!gl) {
      throw new Error(
        "WebGL2 is not supported by this browser.",
      );
    }

    this.gl = gl;
  }
setUniform(
  name: string,
  value: number,
) {
  this.uniforms[name] = value;
}
  setShader(
    vertexSource: string,
    fragmentSource: string,
  ) {
    const vertexShader = this.createShader(
      this.gl.VERTEX_SHADER,
      vertexSource,
    );

    const fragmentShader = this.createShader(
      this.gl.FRAGMENT_SHADER,
      fragmentSource,
    );

    const program = this.gl.createProgram();

    if (!program) {
      throw new Error(
        "Could not create WebGL program.",
      );
    }

    this.gl.attachShader(program, vertexShader);
    this.gl.attachShader(program, fragmentShader);

    this.gl.linkProgram(program);

    if (
      !this.gl.getProgramParameter(
        program,
        this.gl.LINK_STATUS,
      )
    ) {
      const message =
        this.gl.getProgramInfoLog(program);

      throw new Error(
        `Could not link shader program:\n${message}`,
      );
    }

    this.gl.deleteShader(vertexShader);
    this.gl.deleteShader(fragmentShader);

    if (this.program) {
      this.gl.deleteProgram(this.program);
    }

    this.program = program;

    this.createFullscreenTriangle();
  }

  start() {
    this.startTime = performance.now();

    const frame = () => {
      this.render();

      this.animationFrame =
        requestAnimationFrame(frame);
    };

    frame();
  }

  stop() {
    if (this.animationFrame !== null) {
      cancelAnimationFrame(this.animationFrame);

      this.animationFrame = null;
    }
  }

  private render() {
    if (!this.program) {
      return;
    }

    this.resize();

    const gl = this.gl;

    gl.viewport(
      0,
      0,
      this.canvas.width,
      this.canvas.height,
    );

    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(this.program);
for (
  const [name, value]
  of Object.entries(this.uniforms)
) {
  const location =
    gl.getUniformLocation(
      this.program,
      `u_${name}`,
    );

  if (location !== null) {
    gl.uniform1f(
      location,
      value,
    );
  }
}
    const timeLocation =
      gl.getUniformLocation(
        this.program,
        "u_time",
      );

    const resolutionLocation =
      gl.getUniformLocation(
        this.program,
        "u_resolution",
      );

    const elapsed =
      (performance.now() - this.startTime) /
      1000;

if (timeLocation !== null) {
          gl.uniform1f(
        timeLocation,
        elapsed,
      );
    }

   if (resolutionLocation !== null) {
      gl.uniform2f(
        resolutionLocation,
        this.canvas.width,
        this.canvas.height,
      );
    }

    gl.drawArrays(
      gl.TRIANGLES,
      0,
      3,
    );
  }

  private createFullscreenTriangle() {
    const gl = this.gl;

    const vao = gl.createVertexArray();

    gl.bindVertexArray(vao);
  }

  private createShader(
    type: number,
    source: string,
  ) {
    const shader =
      this.gl.createShader(type);

    if (!shader) {
      throw new Error(
        "Could not create shader.",
      );
    }

    this.gl.shaderSource(
      shader,
      source,
    );

    this.gl.compileShader(shader);

    if (
      !this.gl.getShaderParameter(
        shader,
        this.gl.COMPILE_STATUS,
      )
    ) {
      const message =
        this.gl.getShaderInfoLog(shader);

      this.gl.deleteShader(shader);

      throw new Error(
        `Shader compilation failed:\n${message}`,
      );
    }

    return shader;
  }

  private resize() {
    const dpr =
      window.devicePixelRatio || 1;

    const width = Math.floor(
      this.canvas.clientWidth * dpr,
    );

    const height = Math.floor(
      this.canvas.clientHeight * dpr,
    );

    if (
      this.canvas.width !== width ||
      this.canvas.height !== height
    ) {
      this.canvas.width = width;
      this.canvas.height = height;
    }
  }

  destroy() {
    this.stop();

    if (this.program) {
      this.gl.deleteProgram(
        this.program,
      );

      this.program = null;
    }
  }
}