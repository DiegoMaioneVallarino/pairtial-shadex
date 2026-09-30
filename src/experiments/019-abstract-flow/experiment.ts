import type {
  ShadexExperiment,
} from "../experiment.types";

import vertexShader from "./vertex.glsl?raw";
import fragmentShader from "./fragment.glsl?raw";

export const abstractFlowExperiment: ShadexExperiment = {
  id: "019-abstract-flow",
  name: "Abstract Flow",

  description:
    "Domain-warped procedural fields generate luminous flowing ribbons for animated abstract backgrounds.",

  vertexShader,
  fragmentShader,

  parameters: {
    scale: {
      value: 1.7,
      min: 0.2,
      max: 6.0,
      step: 0.01,
    },

    warp: {
      value: 3.2,
      min: 0.0,
      max: 8.0,
      step: 0.01,
    },

    glow: {
      value: 1.1,
      min: 0.0,
      max: 4.0,
      step: 0.01,
    },

    speed: {
      value: 0.08,
      min: -1.0,
      max: 1.0,
      step: 0.01,
    },
  },
};