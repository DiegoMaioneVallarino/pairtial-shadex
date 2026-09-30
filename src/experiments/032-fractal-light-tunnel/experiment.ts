import type {
  ShadexExperiment,
} from "../experiment.types";

import vertexShader from "./vertex.glsl?raw";
import fragmentShader from "./fragment.glsl?raw";


export const fractalLightTunnelExperiment:
  ShadexExperiment = {
    id: "032-fractal-light-tunnel",

    name: "Fractal Light Tunnel",

    description:
      "Curved implicit tunnel combining path warping, repeated SDF geometry, folded fractal patterns and luminous field accumulation.",

    vertexShader,
    fragmentShader,

    parameters: {
      speed: {
        label: "Travel Speed",
        value: 1.0,
        min: -2.0,
        max: 3.0,
        step: 0.01,
      },

      pathAmplitude: {
        label: "Path Amplitude",
        value: 2.8,
        min: 0.0,
        max: 8.0,
        step: 0.01,
      },

      pathFrequency: {
        label: "Path Frequency",
        value: 0.18,
        min: 0.01,
        max: 0.8,
        step: 0.01,
      },

      tunnelSize: {
        label: "Tunnel Size",
        value: 2.8,
        min: 1.0,
        max: 6.0,
        step: 0.01,
      },

      fold: {
        label: "Space Fold",
        value: 1.15,
        min: 0.2,
        max: 3.0,
        step: 0.01,
      },

      fractalScale: {
        label: "Fractal Scale",
        value: 1.85,
        min: 0.8,
        max: 3.0,
        step: 0.01,
      },

      fractalDetail: {
        label: "Fractal Detail",
        value: 1.0,
        min: 0.1,
        max: 3.0,
        step: 0.01,
      },

      glow: {
        label: "Glow",
        value: 1.25,
        min: 0.0,
        max: 4.0,
        step: 0.01,
      },

      exposure: {
        label: "Exposure",
        value: 1.15,
        min: 0.1,
        max: 4.0,
        step: 0.01,
      },

      primaryColor: {
        type: "color",
        label: "Primary",
        value: [
          0.08,
          0.72,
          1.0,
        ],
      },

      secondaryColor: {
        type: "color",
        label: "Secondary",
        value: [
          0.75,
          0.08,
          1.0,
        ],
      },

      accentColor: {
        type: "color",
        label: "Accent",
        value: [
          0.15,
          1.0,
          0.62,
        ],
      },

      animate: {
        type: "boolean",
        label: "Animate",
        value: true,
      },
    },
  };