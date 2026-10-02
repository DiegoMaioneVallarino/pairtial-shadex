export type Vec2Value = [
  number,
  number,
];

export type Vec3Value = [
  number,
  number,
  number,
];

export type ColorValue = [
  number,
  number,
  number,
];

export type ExperimentParameterValue =
  | number
  | boolean
  | Vec2Value
  | Vec3Value;


interface BaseParameter {
  label?: string;
}


export interface FloatParameter
  extends BaseParameter {
  type?: "float";

  value: number;

  min: number;
  max: number;
  step: number;
}


export interface ColorParameter
  extends BaseParameter {
  type: "color";

  value: ColorValue;
}


export interface Vec2Parameter
  extends BaseParameter {
  type: "vec2";

  value: Vec2Value;

  min?: number;
  max?: number;
  step?: number;
}


export interface Vec3Parameter
  extends BaseParameter {
  type: "vec3";

  value: Vec3Value;

  min?: number;
  max?: number;
  step?: number;
}


export interface BooleanParameter
  extends BaseParameter {
  type: "boolean";

  value: boolean;
}


export interface SelectOption {
  label: string;
  value: number;
}


export interface SelectParameter
  extends BaseParameter {
  type: "select";

  value: number;

  options: SelectOption[];
}


export type ExperimentParameter =
  | FloatParameter
  | ColorParameter
  | Vec2Parameter
  | Vec3Parameter
  | BooleanParameter
  | SelectParameter;


export interface ShadexExperiment {
  id: string;

  name: string;

  description: string;

  vertexShader: string;

  fragmentShader: string;

  parameters?: Record<
    string,
    ExperimentParameter
  >;
}