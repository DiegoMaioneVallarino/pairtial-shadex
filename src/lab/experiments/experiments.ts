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

import {
  diffuseLightExperiment,
} from "../../experiments/007-diffuse-light/experiment";

import {
  specularExperiment,
} from "../../experiments/008-specular/experiment";

import {
  fresnelExperiment,
} from "../../experiments/009-fresnel/experiment";

import {
  multipleLightsExperiment,
} from "../../experiments/010-multiple-lights/experiment";

import {
  glassExperiment,
} from "../../experiments/011-glass/experiment";

import {
  liquidGlassExperiment,
} from "../../experiments/012-liquid-glass/experiment";

import {
  causticsExperiment,
} from "../../experiments/013-caustics/experiment";

import {
  volumetricLightExperiment,
} from "../../experiments/014-volumetric-light/experiment";

import {
  liquidMetalExperiment,
} from "../../experiments/015-liquid-metal/experiment";

import {
  iridescenceExperiment,
} from "../../experiments/016-iridescence/experiment";

import {
  cloudsExperiment,
} from "../../experiments/017-clouds/experiment";

import {
  auroraExperiment,
} from "../../experiments/018-aurora/experiment";

import {
  abstractFlowExperiment,
} from "../../experiments/019-abstract-flow/experiment";

import {
  appleBackgroundExperiment,
} from "../../experiments/020-apple-background/experiment";

import {
  meshGradientExperiment,
} from "../../experiments/021-mesh-gradient/experiment";

import {
  silkExperiment,
} from "../../experiments/022-silk/experiment";

import {
  holographicGlassExperiment,
} from "../../experiments/023-holographic-glass/experiment";

import {
  fluidEnergyExperiment,
} from "../../experiments/024-fluid-energy/experiment";

import {
  fieldCompositionExperiment,
} from "../../experiments/025-field-composition/experiment";


import {
  luminous3DCurveExperiment,
} from "../../experiments/026-luminous-3d-curve/experiment";

import {
  sdfLaboratoryExperiment,
} from "../../experiments/027-sdf-laboratory/experiment";

import {
  pixelRendererExperiment,
} from "../../experiments/028-pixel-renderer/experiment";

import {
  fractalVolumeExperiment,
} from "../../experiments/029-fractal-volume/experiment";

import {
  fractalLightTunnelExperiment,
} from "../../experiments/032-fractal-light-tunnel/experiment";

import {
  proceduralPlanetExperiment,
} from "../../experiments/033-procedural-planet/experiment";

export const experiments: ShadexExperiment[] = [
  gradientExperiment,
  shapesExperiment,
  noiseExperiment,
  fbmExperiment,
  domainWarpingExperiment,

  normalsExperiment,
  diffuseLightExperiment,
  specularExperiment,

  fresnelExperiment,
  multipleLightsExperiment,
  glassExperiment,

  liquidGlassExperiment,
  causticsExperiment,
  volumetricLightExperiment,

  liquidMetalExperiment,
iridescenceExperiment,
cloudsExperiment,
auroraExperiment,
abstractFlowExperiment,

appleBackgroundExperiment,
meshGradientExperiment,
silkExperiment,
holographicGlassExperiment,
fluidEnergyExperiment,

holographicGlassExperiment,
fluidEnergyExperiment,
fieldCompositionExperiment,
luminous3DCurveExperiment,
sdfLaboratoryExperiment,

pixelRendererExperiment,
fractalVolumeExperiment,
fractalLightTunnelExperiment,
proceduralPlanetExperiment,

];