import {
  useEffect,
  useRef,
} from "react";

import {
  Renderer,
} from "../../engine/core/Renderer";

import "./Viewport.css";

interface ViewportExperiment {
  id: string;
  name: string;

  vertexShader: string;
  fragmentShader: string;

  uniforms?: Record<
    string,
    number
  >;
}

interface ViewportProps {
  experiment: ViewportExperiment;
}

export function Viewport({
  experiment,
}: ViewportProps) {
  const canvasRef =
    useRef<HTMLCanvasElement | null>(
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

    if (experiment.uniforms) {
      for (
        const [name, value]
        of Object.entries(
          experiment.uniforms,
        )
      ) {
        renderer.setUniform(
          name,
          value,
        );
      }
    }

    renderer.start();

    return () => {
      renderer.destroy();
    };
  }, [experiment]);

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
          {experiment.id} /{" "}
          {experiment.name}
        </strong>
      </div>
    </section>
  );
}