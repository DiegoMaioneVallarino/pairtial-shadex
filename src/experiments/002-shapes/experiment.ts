import vertexShader from "./vertex.glsl?raw";
import fragmentShader from "./fragment.glsl?raw";

export const shapesExperiment = {
  id: "002-shapes",

  name: "Shapes",

  description:
    "Procedural shapes generated entirely from pixel coordinates and distance functions.",

  vertexShader,
  fragmentShader,

  uniforms: {
    radius: 0.55,
    softness: 0.015,
  },
};