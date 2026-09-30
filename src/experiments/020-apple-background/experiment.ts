import type {
  ShadexExperiment,
} from "../experiment.types";

import vertexShader from "./vertex.glsl?raw";
import fragmentShader from "./fragment.glsl?raw";


export const appleBackgroundExperiment:
  ShadexExperiment = {
    id: "020-apple-background",

    name: "Apple-like Background",

    description:
      "Large animated color fields blend into a soft luminous premium background.",

    vertexShader,
    fragmentShader,

    parameters: {
      /*
       * FLOATS
       */
      flow: {
        label: "Flow",

        value: 0.7,
        min: 0.0,
        max: 3.0,
        step: 0.01,
      },

      glow: {
        label: "Glow",

        value: 0.7,
        min: 0.0,
        max: 3.0,
        step: 0.01,
      },

      softness: {
        label: "Softness",

        value: 1.7,
        min: 0.3,
        max: 6.0,
        step: 0.01,
      },

      speed: {
        label: "Speed",

        value: 0.12,
        min: -1.0,
        max: 1.0,
        step: 0.01,
      },


      /*
       * COLORS
       */
      primaryColor: {
        type: "color",

        label: "Primary",

        value: [
          0.08,
          0.32,
          1.0,
        ],
      },

      secondaryColor: {
        type: "color",

        label: "Secondary",

        value: [
          0.46,
          0.12,
          1.0,
        ],
      },

      accentColor: {
        type: "color",

        label: "Accent",

        value: [
          1.0,
          0.16,
          0.52,
        ],
      },


      /*
       * VECTOR
       */
      lightPosition: {
        type: "vec2",

        label: "Light Position",

        value: [
          0.0,
          0.15,
        ],

        min: -2.0,
        max: 2.0,
        step: 0.01,
      },


      /*
       * BOOLEAN
       */
      animate: {
        type: "boolean",

        label: "Animate",

        value: true,
      },


      /*
       * SELECT / INT
       */
      mode: {
        type: "select",

        label: "Visual Mode",

        value: 0,

        options: [
          {
            label: "Soft",
            value: 0,
          },

          {
            label: "Vivid",
            value: 1,
          },

          {
            label: "Dreamy",
            value: 2,
          },
        ],
      },
    },
  };