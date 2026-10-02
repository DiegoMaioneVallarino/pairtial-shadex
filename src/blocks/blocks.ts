import type {
  ShaderBlockDefinition,
} from "./block.types";

import {
  UVBlock,
} from "./input/UVBlock";

import {
  WaveBlock,
} from "./math/WaveBlock";

import {
  GradientBlock,
} from "./color/GradientBlock";

import {
  OutputBlock,
} from "./output/OutputBlock";


export const blockDefinitions:
  Record<
    string,
    ShaderBlockDefinition
  > = {
    uv: UVBlock,
    wave: WaveBlock,
    gradient: GradientBlock,
    output: OutputBlock,
  };