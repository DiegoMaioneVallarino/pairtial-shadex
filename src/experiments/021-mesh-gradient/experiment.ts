import type {
  ShadexExperiment,
} from "../../lab/experiments/experiment.types";

import vertexShader from "./vertex.glsl?raw";
import fragmentShader from "./fragment.glsl?raw";

export const meshGradientExperiment: ShadexExperiment = {
  id: "021-mesh-gradient",

  name: "Mesh Gradient",

  description:
    "Animated color nodes interpolate across a warped field to form a procedural mesh gradient.",

  vertexShader,
  fragmentShader,

  parameters: {
    spread: {
      value: 1.6,
      min: 0.2,
      max: 6.0,
      step: 0.01,
    },

    motion: {
      value: 0.15,
      min: -1.0,
      max: 1.0,
      step: 0.01,
    },

    brightness: {
      value: 1.0,
      min: 0.1,
      max: 2.5,
      step: 0.01,
    },

    warp: {
      value: 0.8,
      min: 0.0,
      max: 4.0,
      step: 0.01,
    },
  },
};