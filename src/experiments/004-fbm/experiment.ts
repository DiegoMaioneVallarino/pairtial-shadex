import type {
  ShadexExperiment,
} from "../experiment.types";

import vertexShader from "./vertex.glsl?raw";
import fragmentShader from "./fragment.glsl?raw";

export const fbmExperiment: ShadexExperiment = {
  id: "004-fbm",

  name: "FBM",

  description:
    "Fractal Brownian Motion combines multiple layers of noise at different frequencies to create natural-looking complexity.",

  vertexShader,
  fragmentShader,

  parameters: {
    scale: {
      value: 2.5,
      min: 0.5,
      max: 10.0,
      step: 0.1,
    },

    speed: {
      value: 0.12,
      min: -1.0,
      max: 1.0,
      step: 0.01,
    },

    octaves: {
      value: 5,
      min: 1,
      max: 8,
      step: 1,
    },

    persistence: {
      value: 0.5,
      min: 0.1,
      max: 0.9,
      step: 0.01,
    },

    lacunarity: {
      value: 2.0,
      min: 1.1,
      max: 4.0,
      step: 0.05,
    },
  },
};