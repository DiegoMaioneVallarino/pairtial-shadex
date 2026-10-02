import type {
  ShadexExperiment,
} from "../../lab/experiments/experiment.types";

import vertexShader from "./vertex.glsl?raw";
import fragmentShader from "./fragment.glsl?raw";


export const fieldCompositionExperiment:
  ShadexExperiment = {
    id: "025-field-composition",

    name: "Field Composition",

    description:
      "First Shadex field composition prototype: mathematical functions rendered as luminous fields, colored by a mesh gradient and embedded in an atmospheric field.",

    vertexShader,
    fragmentShader,

    parameters: {
      amplitude: {
        label: "Function Amplitude",
        value: 0.34,
        min: 0.05,
        max: 0.8,
        step: 0.01,
      },

      frequency: {
        label: "Function Frequency",
        value: 2.4,
        min: 0.2,
        max: 8.0,
        step: 0.01,
      },

      thickness: {
        label: "Light Thickness",
        value: 8.0,
        min: 1.0,
        max: 30.0,
        step: 0.1,
      },

      intensity: {
        label: "Light Intensity",
        value: 1.4,
        min: 0.0,
        max: 5.0,
        step: 0.01,
      },

      warp: {
        label: "Domain Warp",
        value: 0.08,
        min: 0.0,
        max: 0.4,
        step: 0.005,
      },

      atmosphere: {
        label: "Atmosphere",
        value: 0.75,
        min: 0.0,
        max: 3.0,
        step: 0.01,
      },

      speed: {
        label: "Speed",
        value: 0.15,
        min: -1.0,
        max: 1.0,
        step: 0.01,
      },

      primaryColor: {
        type: "color",
        label: "Primary",
        value: [
          0.05,
          0.55,
          1.0,
        ],
      },

      secondaryColor: {
        type: "color",
        label: "Secondary",
        value: [
          0.48,
          0.12,
          1.0,
        ],
      },

      accentColor: {
        type: "color",
        label: "Accent",
        value: [
          0.05,
          1.0,
          0.72,
        ],
      },

      fieldOrigin: {
        type: "vec2",
        label: "Field Origin",
        value: [
          0.0,
          0.0,
        ],
        min: -1.0,
        max: 1.0,
        step: 0.01,
      },

      animate: {
        type: "boolean",
        label: "Animate",
        value: true,
      },

      functionMode: {
        type: "select",
        label: "Function",
        value: 0,

        options: [
          {
            label: "Sine",
            value: 0,
          },
          {
            label: "Double Wave",
            value: 1,
          },
          {
            label: "Pulse",
            value: 2,
          },
        ],
      },
    },
  };