export type UniformVec2 = [
  number,
  number,
];

export type UniformVec3 = [
  number,
  number,
  number,
];


export type UniformValue =
  | number
  | boolean
  | UniformVec2
  | UniformVec3;


export type UniformType =
  | "float"
  | "int"
  | "bool"
  | "vec2"
  | "vec3";


export interface Uniform {
  type: UniformType;

  value: UniformValue;
}