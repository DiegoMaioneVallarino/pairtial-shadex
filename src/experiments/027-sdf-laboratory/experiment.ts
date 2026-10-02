import type {
  ShadexExperiment,
} from "../../lab/experiments/experiment.types";

import vertexShader from "./vertex.glsl?raw";
import fragmentShader from "./fragment.glsl?raw";


export const sdfLaboratoryExperiment:
  ShadexExperiment = {
    id: "027-sdf-laboratory",

    name: "SDF Laboratory",

    description:
      "Implicit 3D geometry built from signed distance fields, smooth boolean operations, ray marching and procedural normals.",

    vertexShader,
    fragmentShader,

    parameters: {
      sphereRadius: {
        label: "Sphere Radius",
        value: 0.8,
        min: 0.15,
        max: 1.5,
        step: 0.01,
      },

      spherePosition: {
        type: "vec3",
        label: "Sphere Position",
        value: [
          -0.45,
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
          0.55,
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
        value: 0.45,
        min: 0.01,
        max: 1.5,
        step: 0.01,
      },

      subtraction: {
        label: "Subtraction",
        value: 0.0,
        min: 0.0,
        max: 1.0,
        step: 0.01,
      },

      rotation: {
        label: "Rotation",
        value: 0.25,
        min: -2.0,
        max: 2.0,
        step: 0.01,
      },

      glow: {
        label: "Glow",
        value: 0.65,
        min: 0.0,
        max: 3.0,
        step: 0.01,
      },

      primaryColor: {
        type: "color",
        label: "Primary",
        value: [
          0.12,
          0.48,
          1.0,
        ],
      },

      secondaryColor: {
        type: "color",
        label: "Secondary",
        value: [
          0.72,
          0.12,
          1.0,
        ],
      },

      animate: {
        type: "boolean",
        label: "Animate",
        value: true,
      },

      operation: {
        type: "select",
        label: "Operation",
        value: 1,

        options: [
          {
            label: "Union",
            value: 0,
          },
          {
            label: "Smooth Union",
            value: 1,
          },
          {
            label: "Intersection",
            value: 2,
          },
          {
            label: "Subtract",
            value: 3,
          },
        ],
      },
    },
  };