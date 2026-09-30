import type {
  ShadexExperiment,
} from "../experiment.types";

import vertexShader from "./vertex.glsl?raw";
import fragmentShader from "./fragment.glsl?raw";


export const pixelRendererExperiment:
  ShadexExperiment = {
    id: "028-pixel-renderer",

    name: "Pixel Renderer",

    description:
      "Implicit 3D geometry rendered as procedural pixel art with quantized lighting, automatic outlines and dithering.",

    vertexShader,
    fragmentShader,

    parameters: {
      pixelSize: {
        label: "Pixel Size",
        value: 4.0,
        min: 1.0,
        max: 16.0,
        step: 1.0,
      },

      colorLevels: {
        label: "Color Levels",
        value: 6.0,
        min: 2.0,
        max: 16.0,
        step: 1.0,
      },

      outline: {
        label: "Outline",
        value: 0.72,
        min: 0.0,
        max: 1.0,
        step: 0.01,
      },

      outlineThickness: {
        label: "Outline Thickness",
        value: 0.45,
        min: 0.0,
        max: 1.0,
        step: 0.01,
      },

      dithering: {
        label: "Dithering",
        value: 0.35,
        min: 0.0,
        max: 1.0,
        step: 0.01,
      },

      sphereRadius: {
        label: "Sphere Radius",
        value: 0.82,
        min: 0.15,
        max: 1.5,
        step: 0.01,
      },

      spherePosition: {
        type: "vec3",
        label: "Sphere Position",
        value: [
          -0.42,
          0.0,
          0.0,
        ],
        min: -2.0,
        max: 2.0,
        step: 0.01,
      },

      boxPosition: {
        type: "vec3",
        label: "Box Position",
        value: [
          0.52,
          0.0,
          0.0,
        ],
        min: -2.0,
        max: 2.0,
        step: 0.01,
      },

      boxSize: {
        type: "vec3",
        label: "Box Size",
        value: [
          0.55,
          0.55,
          0.55,
        ],
        min: 0.05,
        max: 1.5,
        step: 0.01,
      },

      smoothness: {
        label: "Smooth Union",
        value: 0.42,
        min: 0.01,
        max: 1.5,
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
        label: "Primary",
        value: [
          0.12,
          0.62,
          1.0,
        ],
      },

      secondaryColor: {
        type: "color",
        label: "Secondary",
        value: [
          0.72,
          0.18,
          1.0,
        ],
      },

      shadowColor: {
        type: "color",
        label: "Shadow",
        value: [
          0.025,
          0.035,
          0.09,
        ],
      },

      outlineColor: {
        type: "color",
        label: "Outline Color",
        value: [
          0.015,
          0.018,
          0.04,
        ],
      },

      animate: {
        type: "boolean",
        label: "Animate",
        value: true,
      },

      renderMode: {
        type: "select",
        label: "Render Mode",
        value: 2,

        options: [
          {
            label: "Quantized",
            value: 0,
          },
          {
            label: "Dithered",
            value: 1,
          },
          {
            label: "Pixel Toon",
            value: 2,
          },
        ],
      },
    },
  };