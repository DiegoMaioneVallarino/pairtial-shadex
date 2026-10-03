import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  blockDefinitions,
} from "../blocks/blocks";
import {
  ShaderGraphEditor,
} from "./graph/ShaderGraphEditor";

import {
  graph as initialBlockGraph,
} from "../experiments/034-block-graph/graph";

import type {
  ShaderGraph,
} from "../blocks/block.types";

import {
  compileShaderGraph,
} from "../compiler/ShaderCompiler";

import type {
  CompiledShaderGraph,
} from "../compiler/ShaderCompiler";

import {
  Slider,
} from "./controls/Slider";

import {
  Toggle,
} from "./controls/Toggle";

import {
  planBody,
} from "../scene/BodyPlanner";

import {
  VisualIRPanel,
} from "./components/VisualIRPanel/VisualIRPanel";


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
  ShadexExperiment,
} from "./experiments/experiment.types";

import "./Lab.css";

import {
  energyOrbBody,
  planetBody,
  auroraBody,
} from "../experiments/035-body-laboratory/bodies";

import {
  compileBody,
} from "../scene/BodyCompiler";

import type {
  ShadexBody,
} from "../scene/body.types";


type ParameterValues = Record<
  string,
  ExperimentParameterValue
>;
const laboratoryBodies = [
  energyOrbBody,
  planetBody,
  auroraBody,
];

function createParameterValues(
  parameters:
    | Record<
        string,
        ExperimentParameter
      >
    | undefined,
): ParameterValues {
  const result:
    ParameterValues = {};


  for (
    const [
      name,
      parameter,
    ] of Object.entries(
      parameters ?? {},
    )
  ) {
    result[name] =
      parameter.value;
  }


  return result;
}


function mergeParameterValues(
  current: ParameterValues,

  parameters:
    | Record<
        string,
        ExperimentParameter
      >
    | undefined,
): ParameterValues {
  const next:
    ParameterValues = {};


  for (
    const [
      name,
      parameter,
    ] of Object.entries(
      parameters ?? {},
    )
  ) {
    next[name] =
      current[name] ??
      parameter.value;
  }


  return next;
}


export function Lab() {
  const [
    workspaceMode,
    setWorkspaceMode,
  ] = useState<
    "preview" | "graph"
  >("preview");


  const [
    shaderGraph,
    setShaderGraph,
  ] = useState<ShaderGraph>(
    () =>
      structuredClone(
        initialBlockGraph,
      ),
  );

const [
  activeBody,
  setActiveBody,
] = useState<ShadexBody>(
  () =>
    structuredClone(
      energyOrbBody,
    ),
);

  const [
  selectedBlockId,
  setSelectedBlockId,
] = useState<
  string | null
>(null);


  const [
    activeExperimentIndex,
    setActiveExperimentIndex,
  ] = useState(1);



  const baseExperiment =
    experiments[
      activeExperimentIndex
    ];

const activeVisualProgram =
  useMemo(() => {
    if (
      baseExperiment.id !==
      "035-body-laboratory"
    ) {
      return null;
    }

    return planBody(
      activeBody,
    );
  }, [
    baseExperiment.id,
    activeBody,
  ]);
  /*
   * Compilamos una primera versión válida.
   *
   * Esta referencia nos permitirá conservar
   * el último shader correcto si el usuario
   * rompe temporalmente el grafo.
   */
  const lastValidCompilation =
    useRef<CompiledShaderGraph>(
      compileShaderGraph(
        initialBlockGraph,
      ),
    );


  const compilation =
    useMemo(() => {
      try {
        const result =
          compileShaderGraph(
            shaderGraph,
          );


        lastValidCompilation.current =
          result;


        return {
          result,
          error: null,
        };
      } catch (error) {
        return {
          result:
            lastValidCompilation.current,

          error:
            error instanceof Error
              ? error.message
              : String(error),
        };
      }
    }, [shaderGraph]);


  /*
   * El experimento 034 se convierte aquí
   * en un experimento dinámico.
   *
   * Todos los demás experimentos siguen
   * funcionando exactamente como antes.
   */
const activeExperiment =
  useMemo<ShadexExperiment>(
    () => {
      if (
        baseExperiment.id ===
        "034-block-graph"
      ) {
        return {
          ...baseExperiment,

          fragmentShader:
            compilation.result
              .fragmentShader,

          parameters:
            compilation.result
              .parameters,
        };
      }


      if (
        baseExperiment.id ===
        "035-body-laboratory"
      ) {
        return compileBody(
          activeBody,
        );
      }


      return baseExperiment;
    },
    [
      baseExperiment,
      compilation.result,
      activeBody,
    ],
  );

const selectedBlock =
  shaderGraph.blocks.find(
    (block) =>
      block.id ===
      selectedBlockId,
  ) ?? null;


const selectedBlockDefinition =
  selectedBlock
    ? blockDefinitions[
        selectedBlock.type
      ] ?? null
    : null;



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
   * Al cambiar de experimento,
   * cargamos sus valores iniciales.
   */
  useEffect(() => {
    setParameterValues(
      createParameterValues(
        activeExperiment.parameters,
      ),
    );
  }, [
    activeExperimentIndex,
  ]);


  /*
   * Cuando cambia el grafo pueden aparecer
   * o desaparecer uniforms.
   *
   * Conservamos los valores existentes y
   * añadimos solamente los nuevos.
   */
  useEffect(() => {
    if (
      activeExperiment.id !==
      "034-block-graph"
    ) {
      return;
    }


    setParameterValues(
      (current) =>
        mergeParameterValues(
          current,
          activeExperiment.parameters,
        ),
    );
  }, [
    activeExperiment.id,
    activeExperiment.parameters,
  ]);


  /*
   * Graph solo existe actualmente
   * para el experimento 034.
   */
  useEffect(() => {
    if (
      activeExperiment.id !==
      "034-block-graph"
    ) {
      setWorkspaceMode(
        "preview",
      );
    }
  }, [
    activeExperiment.id,
  ]);


  function updateParameter(
    name: string,
    value:
      ExperimentParameterValue,
  ) {
    setParameterValues(
      (current) => ({
        ...current,

        [name]:
          value,
      }),
    );
  }

function sanitizeUniformName(
  value: string,
) {
  return value.replace(
    /[^a-zA-Z0-9_]/g,
    "_",
  );
}


function updateBlockParameter(
  blockId: string,
  parameterName: string,
  value: ExperimentParameterValue,
) {
  const block =
    shaderGraph.blocks.find(
      (candidate) =>
        candidate.id ===
        blockId,
    );


  if (!block) {
    return;
  }


  const definition =
    blockDefinitions[
      block.type
    ];


  const baseParameter =
    block.parameters?.[
      parameterName
    ] ??
    definition?.parameters?.[
      parameterName
    ];


  if (!baseParameter) {
    return;
  }


  /*
   * Guardamos el valor dentro
   * de la instancia del bloque.
   */
  setShaderGraph(
    (current) => ({
      ...current,

      blocks:
        current.blocks.map(
          (candidate) => {
            if (
              candidate.id !==
              blockId
            ) {
              return candidate;
            }


            return {
              ...candidate,

              parameters: {
                ...(
                  candidate.parameters ??
                  {}
                ),

                [parameterName]: {
                  ...baseParameter,

                  value,
                } as ExperimentParameter,
              },
            };
          },
        ),
    }),
  );


  /*
   * Y actualizamos inmediatamente
   * el uniform que usa WebGL.
   *
   * wave1 + frequency
   *
   * →
   *
   * wave1_frequency
   */
  const uniformName =
    `${sanitizeUniformName(
      blockId,
    )}_${sanitizeUniformName(
      parameterName,
    )}`;


  setParameterValues(
    (current) => ({
      ...current,

      [uniformName]:
        value,
    }),
  );
}
  function renderParameterControl(
    name: string,
    parameter:
      ExperimentParameter,
  ) {
    const value =
      parameterValues[name] ??
      parameter.value;


    const label =
      parameter.label ??
      name;


    if (
      parameter.type ===
      "color"
    ) {
      return (
        <ColorPicker
          key={name}
          label={label}
          value={
            value as [
              number,
              number,
              number,
            ]
          }
          onChange={(
            nextValue,
          ) =>
            updateParameter(
              name,
              nextValue,
            )
          }
        />
      );
    }


    if (
      parameter.type ===
        "vec2" ||
      parameter.type ===
        "vec3"
    ) {
      return (
        <VectorInput
          key={name}
          label={label}
          value={
            value as
              | [
                  number,
                  number,
                ]
              | [
                  number,
                  number,
                  number,
                ]
          }
          step={
            parameter.step
          }
          onChange={(
            nextValue,
          ) =>
            updateParameter(
              name,
              nextValue,
            )
          }
        />
      );
    }


    if (
      parameter.type ===
      "boolean"
    ) {
      return (
        <Toggle
          key={name}
          label={label}
          value={
            value as boolean
          }
          onChange={(
            nextValue,
          ) =>
            updateParameter(
              name,
              nextValue,
            )
          }
        />
      );
    }


    if (
      parameter.type ===
      "select"
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
          onChange={(
            nextValue,
          ) =>
            updateParameter(
              name,
              nextValue,
            )
          }
        />
      );
    }


    return (
      <Slider
        key={name}
        label={label}
        value={
          value as number
        }
        min={
          parameter.min
        }
        max={
          parameter.max
        }
        step={
          parameter.step
        }
        onChange={(
          nextValue,
        ) =>
          updateParameter(
            name,
            nextValue,
          )
        }
      />
    );
  }
function renderBlockParameterControl(
  name: string,
  parameter: ExperimentParameter,
) {
  if (
    !selectedBlock
  ) {
    return null;
  }


  const instanceParameter =
    selectedBlock.parameters?.[
      name
    ];


  const value =
    instanceParameter?.value ??
    parameter.value;


  const label =
    parameter.label ??
    name;


  const change = (
    nextValue:
      ExperimentParameterValue,
  ) => {
    updateBlockParameter(
      selectedBlock.id,
      name,
      nextValue,
    );
  };


  if (
    parameter.type ===
    "color"
  ) {
    return (
      <ColorPicker
        key={name}
        label={label}
        value={
          value as [
            number,
            number,
            number,
          ]
        }
        onChange={change}
      />
    );
  }


  if (
    parameter.type ===
      "vec2" ||
    parameter.type ===
      "vec3"
  ) {
    return (
      <VectorInput
        key={name}
        label={label}
        value={
          value as
            | [
                number,
                number,
              ]
            | [
                number,
                number,
                number,
              ]
        }
        step={
          parameter.step
        }
        onChange={change}
      />
    );
  }


  if (
    parameter.type ===
    "boolean"
  ) {
    return (
      <Toggle
        key={name}
        label={label}
        value={
          value as boolean
        }
        onChange={change}
      />
    );
  }


  if (
    parameter.type ===
    "select"
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
        onChange={change}
      />
    );
  }


  return (
    <Slider
      key={name}
      label={label}
      value={
        value as number
      }
      min={
        parameter.min
      }
      max={
        parameter.max
      }
      step={
        parameter.step
      }
      onChange={change}
    />
  );
}

function updateGeneratorRadius(
  radius: number,
) {
  setActiveBody(
    (current) => {
      if (
        current.generator.type !==
        "sphere"
      ) {
        return current;
      }

      return {
        ...current,

        generator: {
          ...current.generator,

          radius,
        },
      };
    },
  );
}


function updateAppearanceColor(
  color: [
    number,
    number,
    number,
  ],
) {
  setActiveBody(
    (current) => ({
      ...current,

      appearance: {
        ...current.appearance,

        color,
      },
    }),
  );
}


function updateEmissionIntensity(
  intensity: number,
) {
  setActiveBody(
    (current) => {
      if (
        current.appearance.type !==
        "emissive"
      ) {
        return current;
      }

      return {
        ...current,

        appearance: {
          ...current.appearance,

          intensity,
        },
      };
    },
  );
}


function updatePulse(
  property:
    | "speed"
    | "amount",

  value: number,
) {
  setActiveBody(
    (current) => ({
      ...current,

      dynamics:
        current.dynamics.map(
          (dynamic) =>
            dynamic.type ===
            "pulse"
              ? {
                  ...dynamic,

                  [property]:
                    value,
                }
              : dynamic,
        ),
    }),
  );
}


function updateDistortion(
  property:
    | "amount"
    | "scale",

  value: number,
) {
  setActiveBody(
    (current) => ({
      ...current,

      effects:
        current.effects.map(
          (effect) =>
            effect.type ===
            "distortion"
              ? {
                  ...effect,

                  [property]:
                    value,
                }
              : effect,
        ),
    }),
  );
}


function updateGlow(
  property:
    | "intensity"
    | "radius",

  value: number,
) {
  setActiveBody(
    (current) => ({
      ...current,

      effects:
        current.effects.map(
          (effect) =>
            effect.type ===
            "glow"
              ? {
                  ...effect,

                  [property]:
                    value,
                }
              : effect,
        ),
    }),
  );
}


  return (
    <section
      className="lab"
    >
      <header
        className="lab__header"
      >
        <div
          className="lab__brand"
        >
          <div
            className="lab__logo"
          >
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


        <nav
          className="lab__navigation"
        >
          <button
            className="is-active"
          >
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


        <div
          className="lab__status"
        >
          <span
            className="lab__status-dot"
          />

          WebGL2
        </div>
      </header>


      <div
        className="lab__workspace"
      >
        <aside
          className="lab__sidebar"
        >
          <span
            className="lab__section-label"
          >
            EXPERIMENTS
          </span>


          <div
            className="lab__experiment-list"
          >
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

                  {
                    experiment.name
                  }
                </button>
              ),
            )}
          </div>
        </aside>


        <main
          className="lab__stage"
        >
          <div
            className="lab__stage-tabs"
          >
            <button
              className={
                workspaceMode ===
                "preview"
                  ? "lab__stage-tab lab__stage-tab--active"
                  : "lab__stage-tab"
              }
              onClick={() =>
                setWorkspaceMode(
                  "preview",
                )
              }
            >
              Preview
            </button>


            {activeExperiment.id ===
              "034-block-graph" && (
              <button
                className={
                  workspaceMode ===
                  "graph"
                    ? "lab__stage-tab lab__stage-tab--active"
                    : "lab__stage-tab"
                }
                onClick={() =>
                  setWorkspaceMode(
                    "graph",
                  )
                }
              >
                Graph
              </button>
            )}



            
          </div>


          <div
            className="lab__stage-content"
          >
            {workspaceMode ===
            "preview" ? (
              <Viewport
                experiment={
                  activeExperiment
                }
                values={
                  parameterValues
                }
              />
            ) : (
             <ShaderGraphEditor
  graph={
    shaderGraph
  }
  onChange={
    setShaderGraph
  }
  selectedBlockId={
    selectedBlockId
  }
  onSelectBlock={
    setSelectedBlockId
  }
/>
            )}
          </div>
        </main>


        <aside
          className="lab__properties"
        >
          <span
            className="lab__section-label"
          >
            EXPERIMENT
          </span>
{activeExperiment.id ===
"035-body-laboratory" ? (
  <>
<span className="lab__section-label">
  BODY
</span>

<h2>
  {activeBody.name}
</h2>

<p>
  {activeBody.domain}
</p>

<div className="lab__controls">
  <Select
    label="Body"
    value={
      laboratoryBodies.findIndex(
        (body) =>
          body.id ===
          activeBody.id,
      )
    }
    options={
      laboratoryBodies.map(
        (body, index) => ({
          label: body.name,
          value: index,
        }),
      )
    }
    onChange={(index) => {
      const body =
        laboratoryBodies[index];

      if (!body) {
        return;
      }

      setActiveBody(
        structuredClone(body),
      );
    }}
  />
</div>





    <span
      className="lab__section-label"
    >
      GENERATOR
    </span>

    <div
      className="lab__controls"
    >
      <div
        className="lab__property"
      >
        <span>
          Type
        </span>

        <strong>
          {activeBody.generator.type}
        </strong>
      </div>


      {activeBody.generator.type ===
        "sphere" && (
        <Slider
          label="Radius"
          value={
            activeBody.generator
              .radius
          }
          min={0.2}
          max={1.5}
          step={0.01}
          onChange={
            updateGeneratorRadius
          }
        />
      )}
    </div>


    <span
      className="lab__section-label"
    >
      APPEARANCE
    </span>

    <div
      className="lab__controls"
    >
      <ColorPicker
        label="Color"
        value={
          activeBody.appearance
            .color
        }
        onChange={
          updateAppearanceColor
        }
      />


      {activeBody.appearance.type ===
        "emissive" && (
        <Slider
          label="Emission"
          value={
            activeBody.appearance
              .intensity
          }
          min={0}
          max={4}
          step={0.01}
          onChange={
            updateEmissionIntensity
          }
        />
      )}
    </div>


    <span
      className="lab__section-label"
    >
      DYNAMICS
    </span>

    <div
      className="lab__controls"
    >
      {activeBody.dynamics.map(
        (dynamic, index) => {
          if (
            dynamic.type !==
            "pulse"
          ) {
            return null;
          }

          return (
            <div
              key={index}
            >
              <div
                className="lab__property"
              >
                <span>
                  Dynamic
                </span>

                <strong>
                  Pulse
                </strong>
              </div>

              <Slider
                label="Speed"
                value={
                  dynamic.speed
                }
                min={0}
                max={5}
                step={0.01}
                onChange={(
                  value,
                ) =>
                  updatePulse(
                    "speed",
                    value,
                  )
                }
              />

              <Slider
                label="Amount"
                value={
                  dynamic.amount
                }
                min={0}
                max={0.5}
                step={0.01}
                onChange={(
                  value,
                ) =>
                  updatePulse(
                    "amount",
                    value,
                  )
                }
              />
            </div>
          );
        },
      )}
    </div>


    <span
      className="lab__section-label"
    >
      EFFECTS
    </span>

    <div
      className="lab__controls"
    >
      {activeBody.effects.map(
        (effect, index) => {
          if (
            effect.type ===
            "distortion"
          ) {
            return (
              <div
                key={index}
              >
                <div
                  className="lab__property"
                >
                  <span>
                    Effect
                  </span>

                  <strong>
                    Distortion
                  </strong>
                </div>

                <Slider
                  label="Amount"
                  value={
                    effect.amount
                  }
                  min={0}
                  max={0.5}
                  step={0.01}
                  onChange={(
                    value,
                  ) =>
                    updateDistortion(
                      "amount",
                      value,
                    )
                  }
                />

                <Slider
                  label="Scale"
                  value={
                    effect.scale
                  }
                  min={0.5}
                  max={12}
                  step={0.1}
                  onChange={(
                    value,
                  ) =>
                    updateDistortion(
                      "scale",
                      value,
                    )
                  }
                />
              </div>
            );
          }


          if (
            effect.type ===
            "glow"
          ) {
            return (
              <div
                key={index}
              >
                <div
                  className="lab__property"
                >
                  <span>
                    Effect
                  </span>

                  <strong>
                    Glow
                  </strong>
                </div>

                <Slider
                  label="Intensity"
                  value={
                    effect.intensity
                  }
                  min={0}
                  max={4}
                  step={0.01}
                  onChange={(
                    value,
                  ) =>
                    updateGlow(
                      "intensity",
                      value,
                    )
                  }
                />

                <Slider
                  label="Radius"
                  value={
                    effect.radius
                  }
                  min={0.05}
                  max={1}
                  step={0.01}
                  onChange={(
                    value,
                  ) =>
                    updateGlow(
                      "radius",
                      value,
                    )
                  }
                />
              </div>
            );
          }


          return null;
        },
      )}
    </div>
    {activeVisualProgram && (
  <div
    style={{
      marginTop: 20,
      borderTop:
        "1px solid rgba(255,255,255,.08)",
      minHeight: 320,
    }}
  >
    <VisualIRPanel
      program={
        activeVisualProgram
      }
    />
  </div>
)}
  </>
) : activeExperiment.id ===
    "034-block-graph" &&
  selectedBlock &&
  selectedBlockDefinition ? (

  <>
    <span
      className="lab__section-label"
    >
      BLOCK
    </span>


    <h2>
      {
        selectedBlockDefinition.name
      }
    </h2>


    <p>
      {selectedBlock.id}
    </p>


    <div
      className="lab__controls"
    >
      {Object.entries(
        selectedBlockDefinition.parameters ??
          {},
      ).map(
        ([
          name,
          parameter,
        ]) =>
          renderBlockParameterControl(
            name,
            parameter,
          ),
      )}


      {Object.keys(
        selectedBlockDefinition.parameters ??
          {},
      ).length === 0 && (
        <div
          className="lab__property"
        >
          <span>
            Parameters
          </span>

          <strong>
            None
          </strong>
        </div>
      )}
    </div>
  </>
) : (
  <>
    <span
      className="lab__section-label"
    >
      EXPERIMENT
    </span>


    <h2>
      {
        activeExperiment.name
      }
    </h2>


    <p>
      {
        activeExperiment.description
      }
    </p>


    <div
      className="lab__controls"
    >
      {Object.entries(
        activeExperiment.parameters ??
          {},
      ).map(
        ([
          name,
          parameter,
        ]) =>
          renderParameterControl(
            name,
            parameter,
          ),
      )}
    </div>
  </>
)}


          {activeExperiment.id ===
            "034-block-graph" &&
            compilation.error && (
              <div
                className="lab__compile-error"
              >
                <strong>
                  Graph error
                </strong>

                <span>
                  {
                    compilation.error
                  }
                </span>
              </div>
            )}


          <div
            className="lab__controls"
          >
            {Object.entries(
              activeExperiment.parameters ??
                {},
            ).map(
              ([
                name,
                parameter,
              ]) =>
                renderParameterControl(
                  name,
                  parameter,
                ),
            )}
          </div>


          <div
            className="lab__property"
          >
            <span>
              Renderer
            </span>

            <strong>
              WebGL2
            </strong>
          </div>


          <div
            className="lab__property"
          >
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