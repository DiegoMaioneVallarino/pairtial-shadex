import type {
  ShadexExperiment,
} from "../../experiments/experiment.types";

import {
  gradientExperiment,
} from "../../experiments/001-gradient/experiment";

import {
  shapesExperiment,
} from "../../experiments/002-shapes/experiment";

export const experiments: ShadexExperiment[] = [
  gradientExperiment,
  shapesExperiment,
];