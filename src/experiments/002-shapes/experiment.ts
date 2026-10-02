import type {
  ShadexExperiment,
} from "../../lab/experiments/experiment.types";

import vertexShader from "./vertex.glsl?raw";
import fragmentShader from "./fragment.glsl?raw";

export const shapesExperiment: ShadexExperiment = {
  id: "002-shapes",

  name: "Shapes",

  description:
    "Procedural shapes generated entirely from pixel coordinates and distance functions.",

  vertexShader,
  fragmentShader,

  parameters: {
    radius: {
      value: 0.55,
      min: 0.1,
      max: 1.0,
      step: 0.01,
    },

    softness: {
      value: 0.015,
      min: 0.001,
      max: 0.15,
      step: 0.001,
    },
  },
};