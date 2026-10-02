import type {
  ShaderBlockDefinition,
} from "../block.types";


export const GradientBlock:
  ShaderBlockDefinition = {
    type: "gradient",

    name: "Color Gradient",

    inputs: [
      {
        name: "factor",
        type: "float",
      },
    ],

    outputs: [
      {
        name: "color",
        type: "vec3",
      },
    ],

    parameters: {
      colorA: {
        type: "color",
        label: "Color A",
        value: [
          0.05,
          0.35,
          1.0,
        ],
      },

      colorB: {
        type: "color",
        label: "Color B",
        value: [
          0.85,
          0.08,
          1.0,
        ],
      },
    },

    compile(context) {
      return `
vec3 ${context.output("color")} =
  mix(
    ${context.uniform("colorA")},
    ${context.uniform("colorB")},
    clamp(
      ${context.input("factor")},
      0.0,
      1.0
    )
  );
`;
    },
  };