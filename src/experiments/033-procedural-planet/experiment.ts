import type {
  ShadexExperiment,
} from "../experiment.types";

import vertexShader from "./vertex.glsl?raw";
import fragmentShader from "./fragment.glsl?raw";


export const proceduralPlanetExperiment:
  ShadexExperiment = {
    id: "033-procedural-planet",

    name: "Procedural Planet",

    description:
      "Procedural planet with spherical height fields, generated biomes, oceans, atmosphere and volumetric clouds.",

    vertexShader,
    fragmentShader,

    parameters: {
      terrainScale: {
        label: "Terrain Scale",
        value: 3.2,
        min: 0.5,
        max: 10.0,
        step: 0.01,
      },

      terrainHeight: {
        label: "Terrain Height",
        value: 0.13,
        min: 0.0,
        max: 0.35,
        step: 0.005,
      },

      waterLevel: {
        label: "Water Level",
        value: 1.0,
        min: 0.8,
        max: 1.15,
        step: 0.005,
      },

      cloudDensity: {
        label: "Cloud Density",
        value: 1.25,
        min: 0.0,
        max: 3.0,
        step: 0.01,
      },

      cloudScale: {
        label: "Cloud Scale",
        value: 3.5,
        min: 0.5,
        max: 10.0,
        step: 0.01,
      },

      atmosphere: {
        label: "Atmosphere",
        value: 1.15,
        min: 0.0,
        max: 4.0,
        step: 0.01,
      },

      rotation: {
        label: "Rotation",
        value: 0.08,
        min: -1.0,
        max: 1.0,
        step: 0.01,
      },

      oceanColor: {
        type: "color",
        label: "Ocean",
        value: [
          0.015,
          0.16,
          0.48,
        ],
      },

      landColor: {
        type: "color",
        label: "Land",
        value: [
          0.08,
          0.42,
          0.13,
        ],
      },

      rockColor: {
        type: "color",
        label: "Rock",
        value: [
          0.36,
          0.28,
          0.20,
        ],
      },

      atmosphereColor: {
        type: "color",
        label: "Atmosphere Color",
        value: [
          0.18,
          0.52,
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