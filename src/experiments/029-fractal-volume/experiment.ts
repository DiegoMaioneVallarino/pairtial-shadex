import type {
  ShadexExperiment,
} from "../../lab/experiments/experiment.types";

import vertexShader from "./vertex.glsl?raw";
import fragmentShader from "./fragment.glsl?raw";


export const fractalVolumeExperiment:
  ShadexExperiment = {
    id: "029-fractal-volume",

    name: "Fractal Volume",

    description:
      "Volumetric traversal through an iterative folded fractal field.",

    vertexShader,
    fragmentShader,

    parameters: {
      speed: {
        label: "Travel Speed",
        value: 0.35,
        min: -2.0,
        max: 2.0,
        step: 0.01,
      },

      scale: {
        label: "Fractal Scale",
        value: 2.04,
        min: 1.2,
        max: 3.0,
        step: 0.01,
      },

      offset: {
        label: "Fractal Offset",
        value: 0.9,
        min: 0.1,
        max: 2.0,
        step: 0.01,
      },

      density: {
        label: "Density",
        value: 1.0,
        min: 0.0,
        max: 4.0,
        step: 0.01,
      },

      brightness: {
        label: "Brightness",
        value: 1.0,
        min: 0.0,
        max: 5.0,
        step: 0.01,
      },

      stepSize: {
        label: "Step Size",
        value: 0.028,
        min: 0.005,
        max: 0.08,
        step: 0.001,
      },

      primaryColor: {
        type: "color",
        label: "Primary",
        value: [
          0.12,
          0.55,
          1.0,
        ],
      },

      secondaryColor: {
        type: "color",
        label: "Secondary",
        value: [
          0.72,
          0.15,
          1.0,
        ],
      },

      animate: {
        type: "boolean",
        label: "Animate",
        value: true,
      },
    },
  };