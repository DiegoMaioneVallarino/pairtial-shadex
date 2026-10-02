import type {
  ShaderGraph,
} from "../../blocks/block.types";


export const graph:
  ShaderGraph = {
    blocks: [
      {
        id: "uv1",
        type: "uv",

        position: {
          x: 80,
          y: 120,
        },
      },

      {
        id: "wave1",
        type: "wave",

        position: {
          x: 330,
          y: 120,
        },
      },

      {
        id: "gradient1",
        type: "gradient",

        position: {
          x: 580,
          y: 120,
        },
      },

      {
        id: "output1",
        type: "output",

        position: {
          x: 830,
          y: 120,
        },
      },
    ],

    connections: [
      {
        from: {
          block: "uv1",
          output: "uv",
        },

        to: {
          block: "wave1",
          input: "position",
        },
      },

      {
        from: {
          block: "wave1",
          output: "value",
        },

        to: {
          block: "gradient1",
          input: "factor",
        },
      },

      {
        from: {
          block: "gradient1",
          output: "color",
        },

        to: {
          block: "output1",
          input: "color",
        },
      },
    ],
  };