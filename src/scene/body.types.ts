export type BodyDomain =
  | "screen"
  | "2d"
  | "3d"
  | "surface"
  | "volume";

export type EnvelopeRegion =
  | {
      type: "vertical";
      center: number;
      width: number;
    }
  | {
      type: "radial";
      center: [
        number,
        number,
      ];
      radius: number;
    };

export type EnvelopeFalloff =
  | {
      type: "hard";
    }
  | {
      type: "smooth";
      softness: number;
    };

export interface BodyEnvelope {
  region: EnvelopeRegion;
  falloff: EnvelopeFalloff;
}
export type BodyGenerator =
  | {
      type: "sphere";

      radius: number;
    }
 | {
    type: "density-field";

    shape:
      | "uniform"
      | "bands";

    scale: number;
    detail: number;
    sharpness: number;
  }


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
  envelope?: BodyEnvelope;

  appearance: BodyAppearance;

  dynamics: BodyDynamic[];
  effects: BodyEffect[];
}