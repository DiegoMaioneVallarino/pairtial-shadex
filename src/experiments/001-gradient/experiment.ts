import vertexShader from "./vertex.glsl?raw";
import fragmentShader from "./fragment.glsl?raw";

export const gradientExperiment = {
  id: "001-gradient",

  name: "Gradient",

  description:
    "Animated color interpolation using UV coordinates.",

  vertexShader,
  fragmentShader,
};