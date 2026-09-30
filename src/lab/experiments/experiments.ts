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

import {
  fbmExperiment,
} from "../../experiments/004-fbm/experiment";

import {
  domainWarpingExperiment,
} from "../../experiments/005-domain-warping/experiment";

import {
  normalsExperiment,
} from "../../experiments/006-normals/experiment";


export const experiments: ShadexExperiment[] = [
  gradientExperiment,
  shapesExperiment,
  noiseExperiment,
  fbmExperiment,
  domainWarpingExperiment,
  normalsExperiment,
];