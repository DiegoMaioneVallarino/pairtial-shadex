import type {
  ExperimentParameter,
} from "../lab/experiments/experiment.types";


export type ShaderValueType =
  | "float"
  | "vec2"
  | "vec3"
  | "color";


export interface BlockInput {
  name: string;
  type: ShaderValueType;
}


export interface BlockOutput {
  name: string;
  type: ShaderValueType;
}


export interface BlockPosition {
  x: number;
  y: number;
}


export interface ShaderBlockDefinition {
  type: string;

  name: string;

  inputs: BlockInput[];

  outputs: BlockOutput[];

  parameters?: Record<
    string,
    ExperimentParameter
  >;

  compile: (
    context: BlockCompileContext,
  ) => string;
}


export interface ShaderBlockInstance {
  id: string;

  type: string;

  position?: BlockPosition;

  parameters?: Record<
    string,
    ExperimentParameter
  >;
}


export interface BlockCompileContext {
  id: string;

  input: (
    name: string,
  ) => string;

  output: (
    name: string,
  ) => string;

  uniform: (
    name: string,
  ) => string;
}


export interface ShaderConnection {
  from: {
    block: string;
    output: string;
  };

  to: {
    block: string;
    input: string;
  };
}


export interface ShaderGraph {
  blocks: ShaderBlockInstance[];

  connections: ShaderConnection[];
}