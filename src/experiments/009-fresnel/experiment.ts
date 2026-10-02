import type {
  ShadexExperiment,
} from "../../lab/experiments/experiment.types";

import vertexShader from "./vertex.glsl?raw";
import fragmentShader from "./fragment.glsl?raw";

export const fresnelExperiment: ShadexExperiment = {
  id: "009-fresnel",

  name: "Fresnel",

  description:
    "Visualizes view-dependent edge reflection using the angle between the surface normal and the camera.",

  vertexShader,
  fragmentShader,

  parameters: {
    radius: {
      value: 0.65,
      min: 0.2,
      max: 0.95,
      step: 0.01,
    },

    power: {
      value: 3.0,
      min: 0.5,
      max: 10.0,
      step: 0.1,
    },

    intensity: {
      value: 1.2,
      min: 0.0,
      max: 3.0,
      step: 0.01,
    },
  },
};