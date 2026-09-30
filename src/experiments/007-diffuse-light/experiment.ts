import type {
  ShadexExperiment,
} from "../experiment.types";

import vertexShader from "./vertex.glsl?raw";
import fragmentShader from "./fragment.glsl?raw";

export const diffuseLightExperiment: ShadexExperiment = {
  id: "007-diffuse-light",

  name: "Diffuse Light",

  description:
    "Lambert diffuse lighting calculates how directly each surface normal faces a light source.",

  vertexShader,
  fragmentShader,

  parameters: {
    radius: {
      value: 0.65,
      min: 0.2,
      max: 0.95,
      step: 0.01,
    },

    lightX: {
      value: -0.5,
      min: -2.0,
      max: 2.0,
      step: 0.01,
    },

    lightY: {
      value: 0.6,
      min: -2.0,
      max: 2.0,
      step: 0.01,
    },

    ambient: {
      value: 0.12,
      min: 0.0,
      max: 1.0,
      step: 0.01,
    },
  },
};