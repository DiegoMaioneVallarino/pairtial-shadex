import {
  useEffect,
  useState,
} from "react";

import {
  Slider,
} from "./controls/Slider";

import {
  Toggle,
} from "./controls/Toggle";

import {
  ColorPicker,
} from "./controls/ColorPicker";

import {
  VectorInput,
} from "./controls/VectorInput";

import {
  Select,
} from "./controls/Select";

import {
  experiments,
} from "./experiments/experiments";

import {
  Viewport,
} from "./viewport/Viewport";

import type {
  ExperimentParameter,
  ExperimentParameterValue,
} from "../experiments/experiment.types";

import "./Lab.css";


type ParameterValues = Record<
  string,
  ExperimentParameterValue
>;


function createParameterValues(
  parameters:
    | Record<
        string,
        ExperimentParameter
      >
    | undefined,
): ParameterValues {
  const result: ParameterValues = {};

  for (
    const [name, parameter]
    of Object.entries(
      parameters ?? {},
    )
  ) {
    result[name] =
      parameter.value;
  }

  return result;
}


export function Lab() {
  const [
    activeExperimentIndex,
    setActiveExperimentIndex,
  ] = useState(1);


  const activeExperiment =
    experiments[
      activeExperimentIndex
    ];


  const [
    parameterValues,
    setParameterValues,
  ] = useState<ParameterValues>(
    () =>
      createParameterValues(
        activeExperiment.parameters,
      ),
  );


  /*
   * Cada experimento tiene sus
   * propios valores iniciales.
   *
   * Cuando cambiamos de experimento
   * reconstruimos el estado.
   */
  useEffect(() => {
    setParameterValues(
      createParameterValues(
        activeExperiment.parameters,
      ),
    );
  }, [activeExperiment]);


  function updateParameter(
    name: string,
    value: ExperimentParameterValue,
  ) {
    setParameterValues(
      (current) => ({
        ...current,
        [name]: value,
      }),
    );
  }


  function renderParameterControl(
    name: string,
    parameter: ExperimentParameter,
  ) {
    const value =
      parameterValues[name] ??
      parameter.value;

    const label =
      parameter.label ??
      name;


    /*
     * COLOR
     */
    if (
      parameter.type === "color"
    ) {
      return (
        <ColorPicker
          key={name}
          label={label}
          value={value as [
            number,
            number,
            number,
          ]}
          onChange={(nextValue) =>
            updateParameter(
              name,
              nextValue,
            )
          }
        />
      );
    }


    /*
     * VECTOR 2 / VECTOR 3
     */
    if (
      parameter.type === "vec2" ||
      parameter.type === "vec3"
    ) {
      return (
        <VectorInput
          key={name}
          label={label}
          value={
            value as
              | [number, number]
              | [
                  number,
                  number,
                  number,
                ]
          }
          step={parameter.step}
          onChange={(nextValue) =>
            updateParameter(
              name,
              nextValue,
            )
          }
        />
      );
    }


    /*
     * BOOLEAN
     */
    if (
      parameter.type === "boolean"
    ) {
      return (
        <Toggle
          key={name}
          label={label}
          value={
            value as boolean
          }
          onChange={(nextValue) =>
            updateParameter(
              name,
              nextValue,
            )
          }
        />
      );
    }


    /*
     * SELECT
     */
    if (
      parameter.type === "select"
    ) {
      return (
        <Select
          key={name}
          label={label}
          value={
            value as number
          }
          options={
            parameter.options
          }
          onChange={(nextValue) =>
            updateParameter(
              name,
              nextValue,
            )
          }
        />
      );
    }


    /*
     * FLOAT
     *
     * Si no existe "type",
     * consideramos que es float.
     *
     * Esto mantiene compatibles
     * los experimentos 001-024.
     */
    return (
      <Slider
        key={name}
        label={label}
        value={
          value as number
        }
        min={parameter.min}
        max={parameter.max}
        step={parameter.step}
        onChange={(nextValue) =>
          updateParameter(
            name,
            nextValue,
          )
        }
      />
    );
  }


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


          <div className="lab__experiment-list">
            {experiments.map(
              (
                experiment,
                index,
              ) => (
                <button
                  key={
                    experiment.id
                  }
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
                    ).padStart(
                      3,
                      "0",
                    )}
                  </span>

                  {experiment.name}
                </button>
              ),
            )}
          </div>
        </aside>


        <Viewport
          experiment={
            activeExperiment
          }
          values={
            parameterValues
          }
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


          <div className="lab__controls">
            {Object.entries(
              activeExperiment.parameters ??
                {},
            ).map(
              ([name, parameter]) =>
                renderParameterControl(
                  name,
                  parameter,
                ),
            )}
          </div>


          <div className="lab__property">
            <span>
              Renderer
            </span>

            <strong>
              WebGL2
            </strong>
          </div>


          <div className="lab__property">
            <span>
              Shader
            </span>

            <strong>
              GLSL ES 3.0
            </strong>
          </div>
        </aside>
      </div>
    </section>
  );
}