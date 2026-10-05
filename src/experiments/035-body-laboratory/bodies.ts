import type {
  ShadexBody,
} from "../../scene/body.types";


export const energyOrbBody:
  ShadexBody = {
    id: "energy-orb",

    name: "Energy Orb",

    domain: "3d",

    generator: {
      type: "sphere",

      radius: 0.85,
    },

    appearance: {
      type: "emissive",

      color: [
        0.25,
        0.55,
        1.0,
      ],

      intensity: 1.8,
    },

    dynamics: [
      {
        type: "pulse",

        speed: 1.5,

        amount: 0.12,
      },
    ],

    effects: [
      {
        type: "distortion",

        amount: 0.16,

        scale: 3.0,
      },

      {
        type: "glow",

        intensity: 1.3,

        radius: 0.35,
      },
    ],
  };


export const planetBody:
  ShadexBody = {
    id: "planet",

    name: "Planet",

    domain: "3d",

    generator: {
      type: "sphere",

      radius: 0.82,
    },

    appearance: {
      type: "solid",

      color: [
        0.12,
        0.32,
        0.18,
      ],
    },

    dynamics: [
      {
        type: "rotation",

        speed: 0.15,
      },
    ],

    effects: [
      {
        type: "distortion",

        amount: 0.04,

        scale: 7.0,
      },
    ],
  };


export const auroraBody: ShadexBody = {
  id: "aurora",
  name: "Aurora",

  domain: "volume",

  generator: {
    type: "density-field",
    shape: "bands",
    scale: 2.5,
    detail: 4,
    sharpness: 2.4,
  },

  envelope: {
    type: "vertical",
    center: 0,
    width: 0.72,
    softness: 0.35,
  },

  appearance: {
    type: "emissive",
    color: [
      0.15,
      1.0,
      0.65,
    ],
    intensity: 1.5,
  },

  dynamics: [
    {
      type: "flow",
      speed: 0.25,
      direction: [
        1.0,
        0.2,
        0.0,
      ],
    },
  ],

  effects: [
    {
      type: "turbulence",
      amount: 0.65,
      detail: 3,
    },

    {
      type: "glow",
      intensity: 0.9,
      radius: 0.25,
    },
  ],
};


export const bodyPresets = [
  energyOrbBody,
  planetBody,
  auroraBody,
];