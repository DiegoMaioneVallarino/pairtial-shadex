export type VisualValueType =
  | "float"
  | "vec2"
  | "vec3"
  | "color";

export type VisualOperation =
  | {
      id: string;
      type: "coordinates";
      output: "vec2";
    }| {
    id: string;
    type: "turbulence-coordinates";

    input: string;
    time: string;

    amount: number;
    detail: number;
    speed: number;

    output: "vec2";
  }

  | {
    id: string;
    type: "sphere-distance";
    input: string;
    radius: string;
    output: "float";
  }| {
    id: string;
    type: "flow-coordinates";
    input: string;
    time: string;
    speed: number;
    direction: [
      number,
      number,
    ];
    output: "vec2";
  }| {
    id: string;
    type: "vertical-envelope";
    coordinates: string;
    input: string;
    center: number;
    width: number;
    softness: number;
    output: "float";
  }| {
    id: string;
    type: "radial-envelope";

    coordinates: string;
    input: string;

    center: [
      number,
      number,
    ];

    radius: number;
    softness: number;

    output: "float";
  }

 | {
    id: string;
    type: "density-field";

    input: string;

    shape:
      | "uniform"
      | "bands";

    scale: number;
    detail: number;
    sharpness: number;

    output: "float";
  }

  | {
      id: string;
      type: "distort-distance";
      input: string;
      amount: number;
      scale: number;
      output: "float";
    }

  | {
      id: string;
      type: "body-mask";
      input: string;
      softness: number;
      output: "float";
    }

  | {
      id: string;
      type: "emissive";
      mask: string;
      color: [
        number,
        number,
        number,
      ];
      intensity: number;
      output: "color";
    }

  | {
      id: string;
      type: "glow";
      distance: string;
      color: string;
      intensity: number;
      radius: number;
      output: "color";
    }| {
    id: string;
    type: "constant";
    value: number;
    output: "float";
  }

| {
    id: string;
    type: "time";
    output: "float";
  }

| {
    id: string;
    type: "multiply";
    a: string;
    b: string;
    output: "float";
  }

| {
    id: string;
    type: "add";
    a: string;
    b: string;
    output: "float";
  }

| {
    id: string;
    type: "sin";
    input: string;
    output: "float";
  }

  | {
      id: string;
      type: "output";
      color: string;
    };
    

export interface VisualProgram {
  operations: VisualOperation[];
  output: string;
}