import type {
  ShadexExperiment,
} from "../../lab/experiments/experiment.types";

import vertexShader from "./vertex.glsl?raw";
import fragmentShader from "./fragment.glsl?raw";

export const liquidGlassExperiment: ShadexExperiment = {
  id: "012-liquid-glass",

  name: "Liquid Glass",

  description:
    "An animated organic glass body combining procedural deformation, refractive distortion and luminous edges.",

  vertexShader,
  fragmentShader,

  parameters: {
    distortion: {
      value: 1.4,
      min: 0.0,
      max: 4.0,
      step: 0.01,
    },

    refraction: {
      value: 0.08,
      min: 0.0,
      max: 0.3,
      step: 0.001,
    },

    edge: {
      value: 1.1,
      min: 0.0,
      max: 3.0,
      step: 0.01,
    },

    speed: {
      value: 0.12,
      min: -1.0,
      max: 1.0,
      step: 0.01,
    },
  },
};