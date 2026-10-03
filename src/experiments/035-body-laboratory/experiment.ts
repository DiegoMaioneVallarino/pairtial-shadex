import {
  compileBody,
} from "../../scene/BodyCompiler";

import {
  energyOrbBody,
} from "./bodies";


export const bodyLaboratoryExperiment =
  compileBody(
    energyOrbBody,
  );