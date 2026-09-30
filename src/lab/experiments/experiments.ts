import type {
  ShadexExperiment,
} from "../../experiments/experiment.types";

import {
  gradientExperiment,
} from "../../experiments/001-gradient/experiment";

import {
  shapesExperiment,
} from "../../experiments/002-shapes/experiment";

import {
  noiseExperiment,
} from "../../experiments/003-noise/experiment";

export const experiments: ShadexExperiment[] = [
  gradientExperiment,
  shapesExperiment,
  noiseExperiment,
];