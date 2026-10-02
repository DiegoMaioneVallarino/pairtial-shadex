import type {
  ShadexExperiment,
} from "../../lab/experiments/experiment.types";

import vertexShader from "./vertex.glsl?raw";
import fragmentShader from "./fragment.glsl?raw";

export const multipleLightsExperiment: ShadexExperiment = {
  id: "010-multiple-lights",

  name: "Multiple Lights",

  description:
    "Combines multiple colored light sources to illuminate the same procedural surface.",

  vertexShader,
  fragmentShader,

  parameters: {
    radius: {
      value: 0.65,
      min: 0.2,
      max: 0.95,
      step: 0.01,
    },

    lightAX: {
      value: -1.0,
      min: -2.0,
      max: 2.0,
      step: 0.01,
    },

    lightAY: {
      value: 0.7,
      min: -2.0,
      max: 2.0,
      step: 0.01,
    },

    lightBX: {
      value: 1.0,
      min: -2.0,
      max: 2.0,
      step: 0.01,
    },

    lightBY: {
      value: -0.3,
      min: -2.0,
      max: 2.0,
      step: 0.01,
    },

    ambient: {
      value: 0.08,
      min: 0.0,
      max: 1.0,
      step: 0.01,
    },
  },
};