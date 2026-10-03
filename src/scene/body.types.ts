export type BodyDomain =
  | "screen"
  | "2d"
  | "3d"
  | "surface"
  | "volume";


export type BodyGenerator =
  | {
      type: "sphere";

      radius: number;
    }
  | {
      type: "density-field";

      scale: number;

      detail: number;
    };


export type BodyAppearance =
  | {
      type: "solid";

      color: [
        number,
        number,
        number,
      ];
    }
  | {
      type: "emissive";

      color: [
        number,
        number,
        number,
      ];

      intensity: number;
    };


export type BodyDynamic =
  | {
      type: "rotation";

      speed: number;
    }
  | {
      type: "pulse";

      speed: number;

      amount: number;
    }
  | {
      type: "flow";

      speed: number;

      direction: [
        number,
        number,
        number,
      ];
    };


export type BodyEffect =
  | {
      type: "distortion";

      amount: number;

      scale: number;
    }
  | {
      type: "turbulence";

      amount: number;

      detail: number;
    }
  | {
      type: "glow";

      intensity: number;

      radius: number;
    };


export interface ShadexBody {
  id: string;

  name: string;

  domain: BodyDomain;

  generator: BodyGenerator;

  appearance: BodyAppearance;

  dynamics: BodyDynamic[];

  effects: BodyEffect[];
}