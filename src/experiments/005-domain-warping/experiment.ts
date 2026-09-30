import type {
  ShadexExperiment,
} from "../experiment.types";

import vertexShader from "./vertex.glsl?raw";
import fragmentShader from "./fragment.glsl?raw";

export const domainWarpingExperiment: ShadexExperiment = {
  id: "005-domain-warping",

  name: "Domain Warping",

  description:
    "Noise fields distort the coordinate space of other noise fields, producing fluid organic structures.",

  vertexShader,
  fragmentShader,

  parameters: {
    scale: {
      value: 2.2,
      min: 0.3,
      max: 8.0,
      step: 0.05,
    },

    speed: {
      value: 0.12,
      min: -1.0,
      max: 1.0,
      step: 0.01,
    },

    warp: {
      value: 2.2,
      min: 0.0,
      max: 8.0,
      step: 0.05,
    },

    detail: {
      value: 3.5,
      min: 0.0,
      max: 10.0,
      step: 0.05,
    },

    flow: {
      value: 0.18,
      min: -2.0,
      max: 2.0,
      step: 0.01,
    },
  },
};