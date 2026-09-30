import type {
  ShadexExperiment,
} from "../experiment.types";

import vertexShader from "./vertex.glsl?raw";
import fragmentShader from "./fragment.glsl?raw";

export const volumetricLightExperiment: ShadexExperiment = {
  id: "014-volumetric-light",

  name: "Volumetric Light",

  description:
    "Procedural density fields scatter directional light to create animated atmospheric beams.",

  vertexShader,
  fragmentShader,

  parameters: {
    density: {
      value: 0.75,
      min: 0.0,
      max: 1.0,
      step: 0.01,
    },

    beamWidth: {
      value: 8.0,
      min: 1.0,
      max: 30.0,
      step: 0.1,
    },

    scatter: {
      value: 0.8,
      min: 0.0,
      max: 3.0,
      step: 0.01,
    },

    motion: {
      value: 0.3,
      min: 0.0,
      max: 2.0,
      step: 0.01,
    },
  },
};