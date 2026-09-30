import {
  useEffect,
  useState,
} from "react";

import {
  Slider,
} from "./controls/Slider";
import {
  experiments,
} from "./experiments/experiments";

import {
  Viewport,
} from "./viewport/Viewport";

import "./Lab.css";

export function Lab() {
  const [
    activeExperimentIndex,
    setActiveExperimentIndex,
  ] = useState(1);

  const activeExperiment =
    experiments[
      activeExperimentIndex
    ];
const createValues = () => {
  const result: Record<
    string,
    number
  > = {};

  for (
    const [name, parameter]
    of Object.entries(
      activeExperiment.parameters ?? {},
    )
  ) {
    result[name] =
      parameter.value;
  }

  return result;
};

const [
  parameterValues,
  setParameterValues,
] = useState<
  Record<string, number>
>(() => createValues());
  return (
    <section className="lab">
      <header className="lab__header">
        <div className="lab__brand">
          <div className="lab__logo">
            <span />
          </div>

          <div>
            <strong>
              Pairtial Shadex
            </strong>

            <small>
              Generative Visual Engine
            </small>
          </div>
        </div>

        <nav className="lab__navigation">
          <button className="is-active">
            Experiment
          </button>

          <button>
            Gallery
          </button>

          <button>
            Render
          </button>

          <button>
            Presets
          </button>
        </nav>

        <div className="lab__status">
          <span className="lab__status-dot" />
          WebGL2
        </div>
      </header>

      <div className="lab__workspace">
        <aside className="lab__sidebar">
          <span className="lab__section-label">
            EXPERIMENTS
          </span>

          {experiments.map(
            (experiment, index) => (
              <button
                key={experiment.id}
                className={
                  "lab__experiment " +
                  (
                    index ===
                    activeExperimentIndex
                      ? "is-active"
                      : ""
                  )
                }
                onClick={() =>
                  setActiveExperimentIndex(
                    index,
                  )
                }
              >
                <span>
                  {String(
                    index + 1,
                  ).padStart(3, "0")}
                </span>

                {experiment.name}
              </button>
            ),
          )}
        </aside>

        <Viewport
  experiment={activeExperiment}
  values={parameterValues}
/>

        <aside className="lab__properties">
          <span className="lab__section-label">
            EXPERIMENT
          </span>

          <h2>
            {activeExperiment.name}
          </h2>

          <p>
            {
              activeExperiment.description
            }
          </p>

          {Object.entries(
  activeExperiment.parameters ?? {},
).map(
  ([name, parameter]) => (
    <Slider
      key={name}
      label={name}
      value={
        parameterValues[name] ??
        parameter.value
      }
      min={parameter.min}
      max={parameter.max}
      step={parameter.step}
      onChange={(value) => {
        setParameterValues(
          (current) => ({
            ...current,
            [name]: value,
          }),
        );
      }}
    />
  ),
)}

          <div className="lab__property">
            <span>Renderer</span>
            <strong>WebGL2</strong>
          </div>

          <div className="lab__property">
            <span>Shader</span>
            <strong>
              GLSL ES 3.0
            </strong>
          </div>
        </aside>
      </div>
    </section>
  );
}