import type {
  Uniform,
  UniformType,
  UniformValue,
} from "../shaders/uniforms";


export class Renderer {
  private readonly canvas:
    HTMLCanvasElement;

  private readonly gl:
    WebGL2RenderingContext;

  private program:
    WebGLProgram | null = null;

  private animationFrame:
    number | null = null;

  private startTime =
    performance.now();


  private uniforms: Record<
    string,
    Uniform
  > = {};


  constructor(
    canvas: HTMLCanvasElement,
  ) {
    this.canvas = canvas;

    const gl =
      canvas.getContext(
        "webgl2",
        {
          antialias: true,
          alpha: true,
        },
      );

    if (!gl) {
      throw new Error(
        "WebGL2 is not supported by this browser.",
      );
    }

    this.gl = gl;
  }


  setUniform(
    name: string,
    value: UniformValue,
    type: UniformType = "float",
  ) {
    this.uniforms[name] = {
      type,
      value,
    };
  }


  setShader(
    vertexSource: string,
    fragmentSource: string,
  ) {
    const vertexShader =
      this.createShader(
        this.gl.VERTEX_SHADER,
        vertexSource,
        "vertex",
      );

    const fragmentShader =
      this.createShader(
        this.gl.FRAGMENT_SHADER,
        fragmentSource,
        "fragment",
      );

    const program =
      this.gl.createProgram();

    if (!program) {
      throw new Error(
        "Could not create WebGL program.",
      );
    }

    this.gl.attachShader(
      program,
      vertexShader,
    );

    this.gl.attachShader(
      program,
      fragmentShader,
    );

    this.gl.linkProgram(
      program,
    );


    if (
      !this.gl.getProgramParameter(
        program,
        this.gl.LINK_STATUS,
      )
    ) {
      const message =
        this.gl.getProgramInfoLog(
          program,
        );

      this.gl.deleteProgram(
        program,
      );

      this.gl.deleteShader(
        vertexShader,
      );

      this.gl.deleteShader(
        fragmentShader,
      );

      throw new Error(
        `Could not link shader program:\n${message}`,
      );
    }


    this.gl.deleteShader(
      vertexShader,
    );

    this.gl.deleteShader(
      fragmentShader,
    );


    if (this.program) {
      this.gl.deleteProgram(
        this.program,
      );
    }


    this.program =
      program;

    this.createFullscreenTriangle();
  }


  start() {
    this.startTime =
      performance.now();


    const frame = () => {
      this.render();

      this.animationFrame =
        requestAnimationFrame(
          frame,
        );
    };


    frame();
  }


  stop() {
    if (
      this.animationFrame !== null
    ) {
      cancelAnimationFrame(
        this.animationFrame,
      );

      this.animationFrame =
        null;
    }
  }


  private render() {
    if (!this.program) {
      return;
    }


    this.resize();


    const gl =
      this.gl;


    gl.viewport(
      0,
      0,
      this.canvas.width,
      this.canvas.height,
    );


    gl.clearColor(
      0,
      0,
      0,
      0,
    );

    gl.clear(
      gl.COLOR_BUFFER_BIT,
    );


    gl.useProgram(
      this.program,
    );


    /*
     * Experiment uniforms.
     */
    for (
      const [name, uniform]
      of Object.entries(
        this.uniforms,
      )
    ) {
      const location =
        gl.getUniformLocation(
          this.program,
          `u_${name}`,
        );


      if (
        location === null
      ) {
        continue;
      }


      this.applyUniform(
        location,
        uniform,
      );
    }


    /*
     * Built-in Shadex uniforms.
     */
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
      (
        performance.now() -
        this.startTime
      ) / 1000;


    if (
      timeLocation !== null
    ) {
      gl.uniform1f(
        timeLocation,
        elapsed,
      );
    }


    if (
      resolutionLocation !== null
    ) {
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


  private applyUniform(
    location:
      WebGLUniformLocation,

    uniform:
      Uniform,
  ) {
    const gl =
      this.gl;


    switch (
      uniform.type
    ) {
      case "float": {
        gl.uniform1f(
          location,
          uniform.value as number,
        );

        break;
      }


      case "int": {
        gl.uniform1i(
          location,
          uniform.value as number,
        );

        break;
      }


      case "bool": {
        gl.uniform1i(
          location,
          (
            uniform.value as boolean
          )
            ? 1
            : 0,
        );

        break;
      }


      case "vec2": {
        const value =
          uniform.value as [
            number,
            number,
          ];

        gl.uniform2f(
          location,
          value[0],
          value[1],
        );

        break;
      }


      case "vec3": {
        const value =
          uniform.value as [
            number,
            number,
            number,
          ];

        gl.uniform3f(
          location,
          value[0],
          value[1],
          value[2],
        );

        break;
      }
    }
  }


  private createFullscreenTriangle() {
    const gl =
      this.gl;

    const vao =
      gl.createVertexArray();

    gl.bindVertexArray(
      vao,
    );
  }


  private createShader(
    type: number,
    source: string,
    label: string,
  ) {
    const shader =
      this.gl.createShader(
        type,
      );


    if (!shader) {
      throw new Error(
        `Could not create ${label} shader.`,
      );
    }


    this.gl.shaderSource(
      shader,
      source,
    );


    this.gl.compileShader(
      shader,
    );


    if (
      !this.gl.getShaderParameter(
        shader,
        this.gl.COMPILE_STATUS,
      )
    ) {
      const message =
        this.gl.getShaderInfoLog(
          shader,
        );


      console.error(
        `${label} shader source:\n`,
        source,
      );


      this.gl.deleteShader(
        shader,
      );


      throw new Error(
        `${label} shader compilation failed:\n${message}`,
      );
    }


    return shader;
  }


  private resize() {
    const dpr =
      window.devicePixelRatio ||
      1;


    const width =
      Math.floor(
        this.canvas.clientWidth *
        dpr,
      );


    const height =
      Math.floor(
        this.canvas.clientHeight *
        dpr,
      );


    if (
      this.canvas.width !==
        width ||
      this.canvas.height !==
        height
    ) {
      this.canvas.width =
        width;

      this.canvas.height =
        height;
    }
  }


  destroy() {
    this.stop();


    if (
      this.program
    ) {
      this.gl.deleteProgram(
        this.program,
      );

      this.program =
        null;
    }
  }
}