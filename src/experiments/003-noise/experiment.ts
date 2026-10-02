import type {
  ShadexExperiment,
} from "../../lab/experiments/experiment.types";

import vertexShader from "./vertex.glsl?raw";
import fragmentShader from "./fragment.glsl?raw";

export const noiseExperiment: ShadexExperiment = {
  id: "003-noise",

  name: "Noise",

  description:
    "Procedural value noise generated from deterministic pseudo-random values and smooth interpolation.",

  vertexShader,
  fragmentShader,

  parameters: {
    scale: {
      value: 5.0,
      min: 1.0,
      max: 20.0,
      step: 0.1,
    },

    speed: {
      value: 0.25,
      min: -2.0,
      max: 2.0,
      step: 0.01,
    },

    contrast: {
      value: 1.4,
      min: 0.1,
      max: 4.0,
      step: 0.05,
    },
  },
};