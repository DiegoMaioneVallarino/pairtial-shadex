import type {
  ShadexExperiment,
} from "../experiment.types";

import vertexShader from "./vertex.glsl?raw";
import fragmentShader from "./fragment.glsl?raw";

export const glassExperiment: ShadexExperiment = {
  id: "011-glass",

  name: "Glass",

  description:
    "Combines normal-based distortion, Fresnel edges and specular highlights to approximate a transparent glass surface.",

  vertexShader,
  fragmentShader,

  parameters: {
    radius: {
      value: 0.65,
      min: 0.2,
      max: 0.95,
      step: 0.01,
    },

    refraction: {
      value: 0.06,
      min: 0.0,
      max: 0.25,
      step: 0.001,
    },

    fresnel: {
      value: 1.0,
      min: 0.0,
      max: 3.0,
      step: 0.01,
    },

    glow: {
      value: 0.8,
      min: 0.0,
      max: 3.0,
      step: 0.01,
    },
  },
};