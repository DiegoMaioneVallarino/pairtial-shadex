import type {
  ShadexExperiment,
} from "../experiment.types";

import vertexShader from "./vertex.glsl?raw";
import fragmentShader from "./fragment.glsl?raw";

export const silkExperiment: ShadexExperiment = {
  id: "022-silk",

  name: "Silk / Satin",

  description:
    "Procedural folds and elongated highlights simulate a flowing satin-like illuminated surface.",

  vertexShader,
  fragmentShader,

  parameters: {
    folds: {
      value: 5.0,
      min: 1.0,
      max: 15.0,
      step: 0.01,
    },

    shine: {
      value: 1.0,
      min: 0.0,
      max: 4.0,
      step: 0.01,
    },

    depth: {
      value: 0.55,
      min: 0.05,
      max: 2.0,
      step: 0.01,
    },

    speed: {
      value: 0.18,
      min: -2.0,
      max: 2.0,
      step: 0.01,
    },
  },
};