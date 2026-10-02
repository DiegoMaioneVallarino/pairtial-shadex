import type {
  ShaderBlockDefinition,
} from "../block.types";


export const WaveBlock:
  ShaderBlockDefinition = {
    type: "wave",

    name: "Wave",

    inputs: [
      {
        name: "position",
        type: "vec2",
      },
    ],

    outputs: [
      {
        name: "value",
        type: "float",
      },
    ],

    parameters: {
      frequency: {
        label: "Frequency",
        value: 3.0,
        min: 0.1,
        max: 12.0,
        step: 0.01,
      },

      amplitude: {
        label: "Amplitude",
        value: 1.0,
        min: 0.0,
        max: 3.0,
        step: 0.01,
      },

      speed: {
        label: "Speed",
        value: 1.0,
        min: -3.0,
        max: 3.0,
        step: 0.01,
      },
    },

    compile(context) {
      return `
float ${context.output("value")} =
  sin(
    ${context.input("position")}.x *
    ${context.uniform("frequency")} +
    u_time *
    ${context.uniform("speed")}
  ) *
  ${context.uniform("amplitude")};

${context.output("value")} =
  ${context.output("value")} *
  0.5 +
  0.5;
`;
    },
  };