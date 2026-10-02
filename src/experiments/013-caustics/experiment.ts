import type {
  ShadexExperiment,
} from "../../lab/experiments/experiment.types";

import vertexShader from "./vertex.glsl?raw";
import fragmentShader from "./fragment.glsl?raw";

export const causticsExperiment: ShadexExperiment = {
  id: "013-caustics",

  name: "Caustics",

  description:
    "Animated interference fields approximate the concentrated light patterns created by water and refractive surfaces.",

  vertexShader,
  fragmentShader,

  parameters: {
    scale: {
      value: 4.0,
      min: 1.0,
      max: 12.0,
      step: 0.1,
    },

    speed: {
      value: 0.7,
      min: 0.0,
      max: 3.0,
      step: 0.01,
    },

    intensity: {
      value: 0.9,
      min: 0.0,
      max: 3.0,
      step: 0.01,
    },

    sharpness: {
      value: 5.0,
      min: 1.0,
      max: 15.0,
      step: 0.1,
    },
  },
};