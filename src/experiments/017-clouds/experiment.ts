import type {
  ShadexExperiment,
} from "../../lab/experiments/experiment.types";

import vertexShader from "./vertex.glsl?raw";
import fragmentShader from "./fragment.glsl?raw";

export const cloudsExperiment: ShadexExperiment = {
  id: "017-clouds",
  name: "Procedural Clouds",

  description:
    "Layered procedural noise forms animated cloud masses with approximate internal illumination.",

  vertexShader,
  fragmentShader,

  parameters: {
    scale: {
      value: 3.0,
      min: 0.5,
      max: 10.0,
      step: 0.01,
    },

    density: {
      value: 0.65,
      min: 0.1,
      max: 1.0,
      step: 0.01,
    },

    detail: {
      value: 0.35,
      min: 0.0,
      max: 1.0,
      step: 0.01,
    },

    speed: {
      value: 0.025,
      min: -0.5,
      max: 0.5,
      step: 0.001,
    },
  },
};