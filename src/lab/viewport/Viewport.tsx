import {
  useEffect,
  useRef,
} from "react";

import { Renderer } from "../../engine/core/Renderer";

import {
  gradientExperiment,
} from "../../experiments/001-gradient/experiment";

import "./Viewport.css";

export function Viewport() {
  const canvasRef =
    useRef<HTMLCanvasElement | null>(
      null,
    );

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    const renderer =
      new Renderer(canvas);

    renderer.setShader(
      gradientExperiment.vertexShader,
      gradientExperiment.fragmentShader,
    );

    renderer.start();

    return () => {
      renderer.destroy();
    };
  }, []);

  return (
    <section className="viewport">
      <canvas
        ref={canvasRef}
        className="viewport__canvas"
      />

      <div className="viewport__info">
        <div>
          <span className="viewport__live" />

          LIVE
        </div>

        <strong>
          001 / Gradient
        </strong>
      </div>
    </section>
  );
}