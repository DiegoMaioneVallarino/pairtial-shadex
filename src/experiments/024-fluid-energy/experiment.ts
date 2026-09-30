import type {
  ShadexExperiment,
} from "../experiment.types";

import vertexShader from "./vertex.glsl?raw";
import fragmentShader from "./fragment.glsl?raw";

export const fluidEnergyExperiment: ShadexExperiment = {
  id: "024-fluid-energy",

  name: "Fluid Energy",

  description:
    "Domain-warped fields generate animated luminous filaments resembling flowing energy.",

  vertexShader,
  fragmentShader,

  parameters: {
    scale: {
      value: 1.6,
      min: 0.2,
      max: 6.0,
      step: 0.01,
    },

    warp: {
      value: 3.5,
      min: 0.0,
      max: 10.0,
      step: 0.01,
    },

    energy: {
      value: 1.15,
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