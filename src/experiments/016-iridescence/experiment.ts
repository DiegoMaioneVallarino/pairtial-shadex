import type {
  ShadexExperiment,
} from "../../lab/experiments/experiment.types";

import vertexShader from "./vertex.glsl?raw";
import fragmentShader from "./fragment.glsl?raw";

export const iridescenceExperiment: ShadexExperiment = {
  id: "016-iridescence",
  name: "Iridescence",

  description:
    "View-angle dependent spectral colors approximate thin-film iridescent materials.",

  vertexShader,
  fragmentShader,

  parameters: {
    frequency: {
      value: 4.0,
      min: 0.5,
      max: 12.0,
      step: 0.01,
    },

    shift: {
      value: 0.0,
      min: -4.0,
      max: 4.0,
      step: 0.01,
    },

    fresnel: {
      value: 0.8,
      min: 0.0,
      max: 3.0,
      step: 0.01,
    },

    speed: {
      value: 0.15,
      min: -2.0,
      max: 2.0,
      step: 0.01,
    },
  },
};