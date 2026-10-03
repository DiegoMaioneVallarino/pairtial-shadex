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
    }

  | {
      id: string;
      type: "sphere-distance";
      input: string;
      radius: number;
      output: "float";
    }

  | {
      id: string;
      type: "pulse";
      input: string;
      speed: number;
      amount: number;
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