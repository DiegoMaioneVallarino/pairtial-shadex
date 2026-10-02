import type {
  ShadexExperiment,
} from "../../lab/experiments/experiment.types";

import vertexShader from "./vertex.glsl?raw";


export const blockGraphExperiment:
  ShadexExperiment = {
    id: "034-block-graph",

    name: "Block Graph",

    description:
      "Visual shader graph compiled dynamically from connected Shadex blocks.",

    vertexShader,

    /*
     * El fragment shader real será generado
     * dinámicamente por Lab.tsx.
     *
     * Dejamos uno mínimo válido para que
     * el experimento pueda existir por sí solo.
     */
    fragmentShader: `#version 300 es

precision highp float;

in vec2 v_uv;

out vec4 outColor;

void main() {
  outColor =
    vec4(
      v_uv,
      0.0,
      1.0
    );
}
`,

    parameters: {},
  };