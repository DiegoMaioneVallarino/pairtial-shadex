import type {
  ShadexExperiment,
} from "../../lab/experiments/experiment.types";

import vertexShader from "./vertex.glsl?raw";
import fragmentShader from "./fragment.glsl?raw";

export const auroraExperiment: ShadexExperiment = {
  id: "018-aurora",
  name: "Aurora",

  description:
    "Layered animated light ribbons form an atmospheric procedural aurora.",

  vertexShader,
  fragmentShader,

  parameters: {
    waves: {
      value: 3.2,
      min: 0.5,
      max: 10.0,
      step: 0.01,
    },

    intensity: {
      value: 0.75,
      min: 0.0,
      max: 3.0,
      step: 0.01,
    },

    spread: {
      value: 9.0,
      min: 1.0,
      max: 30.0,
      step: 0.1,
    },

    speed: {
      value: 0.18,
      min: -2.0,
      max: 2.0,
      step: 0.01,
    },
  },
};