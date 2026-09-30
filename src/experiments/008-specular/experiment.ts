import type {
  ShadexExperiment,
} from "../experiment.types";

import vertexShader from "./vertex.glsl?raw";
import fragmentShader from "./fragment.glsl?raw";

export const specularExperiment: ShadexExperiment = {
  id: "008-specular",

  name: "Specular",

  description:
    "Adds view-dependent reflected light to diffuse illumination, producing shiny material highlights.",

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
      value: 0.1,
      min: 0.0,
      max: 1.0,
      step: 0.01,
    },

    shininess: {
      value: 32.0,
      min: 1.0,
      max: 128.0,
      step: 1.0,
    },

    specular: {
      value: 0.8,
      min: 0.0,
      max: 2.0,
      step: 0.01,
    },
  },
};