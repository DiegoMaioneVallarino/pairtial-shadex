import type {
  ShaderBlockDefinition,
} from "../block.types";


export const UVBlock:
  ShaderBlockDefinition = {
    type: "uv",

    name: "UV",

    inputs: [],

    outputs: [
      {
        name: "uv",
        type: "vec2",
      },
    ],

    compile(context) {
      return `
vec2 ${context.output("uv")} =
  v_uv * 2.0 - 1.0;

${context.output("uv")}.x *=
  u_resolution.x /
  u_resolution.y;
`;
    },
  };