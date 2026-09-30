import {
  gradientExperiment,
} from "../../experiments/001-gradient/experiment";

import {
  shapesExperiment,
} from "../../experiments/002-shapes/experiment";

export const experiments = [
  gradientExperiment,
  shapesExperiment,
];

export type ShadexExperiment =
  (typeof experiments)[number];