import type {
  ShaderBlockDefinition,
} from "../block.types";


export const OutputBlock:
  ShaderBlockDefinition = {
    type: "output",

    name: "Output",

    inputs: [
      {
        name: "color",
        type: "vec3",
      },
    ],

    outputs: [],

    compile(context) {
      return `
outColor =
  vec4(
    ${context.input("color")},
    1.0
  );
`;
    },
  };