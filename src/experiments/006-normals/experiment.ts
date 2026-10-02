import type {
  ShadexExperiment,
} from "../../lab/experiments/experiment.types";

import vertexShader from "./vertex.glsl?raw";
import fragmentShader from "./fragment.glsl?raw";

export const normalsExperiment: ShadexExperiment = {
  id: "006-normals",

  name: "Normals",

  description:
    "Visualizes the surface direction of a procedural sphere by encoding its XYZ normal vector as RGB.",

  vertexShader,
  fragmentShader,

  parameters: {
    radius: {
      value: 0.65,
      min: 0.2,
      max: 0.95,
      step: 0.01,
    },
  },
};