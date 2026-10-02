import type {
  ShadexExperiment,
} from "../../lab/experiments/experiment.types";

import vertexShader from "./vertex.glsl?raw";
import fragmentShader from "./fragment.glsl?raw";

export const holographicGlassExperiment: ShadexExperiment = {
  id: "023-holographic-glass",

  name: "Holographic Glass",

  description:
    "A refractive glass body combines Fresnel reflection with angle-dependent spectral coloration.",

  vertexShader,
  fragmentShader,

  parameters: {
    distortion: {
      value: 0.8,
      min: 0.0,
      max: 3.0,
      step: 0.01,
    },

    fresnel: {
      value: 1.1,
      min: 0.0,
      max: 4.0,
      step: 0.01,
    },

    spectrum: {
      value: 0.85,
      min: 0.0,
      max: 3.0,
      step: 0.01,
    },

    speed: {
      value: 0.18,
      min: -2.0,
      max: 2.0,
      step: 0.01,
    },
  },
};