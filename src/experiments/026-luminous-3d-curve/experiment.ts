import type {
  ShadexExperiment,
} from "../../lab/experiments/experiment.types";

import vertexShader from "./vertex.glsl?raw";
import fragmentShader from "./fragment.glsl?raw";


export const luminous3DCurveExperiment:
  ShadexExperiment = {
    id: "026-luminous-3d-curve",

    name: "Luminous 3D Curve",

    description:
      "A parametric 3D curve rendered as a depth-aware luminous field.",

    vertexShader,
    fragmentShader,

    parameters: {
      radius: {
        label: "Curve Radius",
        value: 0.75,
        min: 0.1,
        max: 1.5,
        step: 0.01,
      },

      turns: {
        label: "Turns",
        value: 2.5,
        min: 0.5,
        max: 6.0,
        step: 0.01,
      },

      depth: {
        label: "Depth",
        value: 1.2,
        min: 0.1,
        max: 3.0,
        step: 0.01,
      },

      thickness: {
        label: "Thickness",
        value: 18.0,
        min: 2.0,
        max: 60.0,
        step: 0.1,
      },

      glow: {
        label: "Glow",
        value: 1.4,
        min: 0.0,
        max: 5.0,
        step: 0.01,
      },

      perspective: {
        label: "Perspective",
        value: 2.8,
        min: 1.2,
        max: 6.0,
        step: 0.01,
      },

      rotation: {
        label: "Rotation",
        value: 0.22,
        min: -2.0,
        max: 2.0,
        step: 0.01,
      },

      primaryColor: {
        type: "color",
        label: "Near Color",
        value: [
          0.15,
          0.85,
          1.0,
        ],
      },

      secondaryColor: {
        type: "color",
        label: "Far Color",
        value: [
          0.55,
          0.12,
          1.0,
        ],
      },

      animate: {
        type: "boolean",
        label: "Animate",
        value: true,
      },

liquid: {
  label: "Liquid",
  value: 0.65,
  min: 0.0,
  max: 2.0,
  step: 0.01,
},

liquidScale: {
  label: "Liquid Scale",
  value: 2.4,
  min: 0.5,
  max: 8.0,
  step: 0.01,
},

mixing: {
  label: "Color Mixing",
  value: 0.8,
  min: 0.0,
  max: 2.0,
  step: 0.01,
},
      curveMode: {
        type: "select",
        label: "Curve",

        value: 0,

        options: [
          {
            label: "Helix",
            value: 0,
          },
          {
            label: "Lissajous",
            value: 1,
          },
          {
            label: "Orbit",
            value: 2,
          },
        ],
      },
    },
  };