import {
  useEffect,
  useRef,
} from "react";

import {
  Renderer,
} from "../../engine/core/Renderer";

import type {
  ShadexExperiment,
} from "../../experiments/experiment.types";

import "./Viewport.css";

interface ViewportProps {
  experiment: ShadexExperiment;

  values: Record<
    string,
    number
  >;
}

export function Viewport({
  experiment,
  values,
}: ViewportProps) {
  const canvasRef =
    useRef<HTMLCanvasElement | null>(
      null,
    );

  const rendererRef =
    useRef<Renderer | null>(
      null,
    );

  useEffect(() => {
    const canvas =
      canvasRef.current;

    if (!canvas) {
      return;
    }

    const renderer =
      new Renderer(canvas);

    renderer.setShader(
      experiment.vertexShader,
      experiment.fragmentShader,
    );

    renderer.start();

    rendererRef.current =
      renderer;

    return () => {
      renderer.destroy();

      rendererRef.current =
        null;
    };
  }, [experiment]);

  useEffect(() => {
    const renderer =
      rendererRef.current;

    if (!renderer) {
      return;
    }

    for (
      const [name, value]
      of Object.entries(values)
    ) {
      renderer.setUniform(
        name,
        value,
      );
    }
  }, [values]);

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
          {experiment.id}
          {" / "}
          {experiment.name}
        </strong>
      </div>
    </section>
  );
}