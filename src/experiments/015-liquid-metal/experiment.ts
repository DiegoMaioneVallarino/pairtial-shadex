import type {
  ShadexExperiment,
} from "../experiment.types";

import vertexShader from "./vertex.glsl?raw";
import fragmentShader from "./fragment.glsl?raw";

export const liquidMetalExperiment: ShadexExperiment = {
  id: "015-liquid-metal",
  name: "Liquid Metal",

  description:
    "Animated procedural surface normals create a flowing reflective metallic material.",

  vertexShader,
  fragmentShader,

  parameters: {
    scale: {
      value: 2.2,
      min: 0.5,
      max: 8.0,
      step: 0.01,
    },

    distortion: {
      value: 2.8,
      min: 0.0,
      max: 8.0,
      step: 0.01,
    },

    shine: {
      value: 1.4,
      min: 0.0,
      max: 4.0,
      step: 0.01,
    },

    speed: {
      value: 0.12,
      min: -1.0,
      max: 1.0,
      step: 0.01,
    },
  },
};