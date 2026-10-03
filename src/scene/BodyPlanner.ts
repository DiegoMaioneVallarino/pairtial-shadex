import type {
  ShadexBody,
} from "./body.types";

import type {
  VisualOperation,
  VisualProgram,
} from "../ir/visual-ir.types";


export function planBody(
  body: ShadexBody,
): VisualProgram {
  const operations:
    VisualOperation[] = [];

  /*
   * Todo body comienza necesitando
   * un sistema de coordenadas.
   */
  operations.push({
    id: "coordinates",
    type: "coordinates",
    output: "vec2",
  });


  /*
   * GENERATOR
   */
  if (
    body.generator.type ===
    "sphere"
  ) {
    let radiusSource =
      body.generator.radius;

    const pulse =
      body.dynamics.find(
        (dynamic) =>
          dynamic.type ===
          "pulse",
      );

    if (pulse) {
      operations.push({
        id: "pulse",
        type: "pulse",
        input: "coordinates",
        speed: pulse.speed,
        amount: pulse.amount,
        output: "float",
      });
    }

    operations.push({
      id: "geometry",
      type: "sphere-distance",
      input: "coordinates",
      radius: radiusSource,
      output: "float",
    });
  } else {
    throw new Error(
      `Unsupported generator: ${body.generator.type}`,
    );
  }


  /*
   * La variable nos permite encadenar
   * transformaciones geométricas.
   */
  let distanceSource =
    "geometry";


  /*
   * EFFECTS QUE MODIFICAN GEOMETRÍA
   */
  for (
    const effect of
    body.effects
  ) {
    if (
      effect.type ===
      "distortion"
    ) {
      const id =
        `distortion-${operations.length}`;

      operations.push({
        id,
        type:
          "distort-distance",
        input:
          distanceSource,
        amount:
          effect.amount,
        scale:
          effect.scale,
        output:
          "float",
      });

      distanceSource = id;
    }
  }


  /*
   * Convertimos distancia en presencia
   * visible del cuerpo.
   */
  operations.push({
    id: "mask",
    type: "body-mask",
    input: distanceSource,
    softness: 0.015,
    output: "float",
  });


  /*
   * APPEARANCE
   */
  let colorSource =
    "appearance";

  operations.push({
    id: colorSource,
    type: "emissive",
    mask: "mask",
    color:
      body.appearance.color,
    intensity:
      body.appearance.type ===
      "emissive"
        ? body.appearance
            .intensity
        : 1,
    output: "color",
  });


  /*
   * EFFECTS QUE MODIFICAN APARIENCIA
   */
  for (
    const effect of
    body.effects
  ) {
    if (
      effect.type ===
      "glow"
    ) {
      const id =
        `glow-${operations.length}`;

      operations.push({
        id,
        type: "glow",
        distance:
          distanceSource,
        color:
          colorSource,
        intensity:
          effect.intensity,
        radius:
          effect.radius,
        output:
          "color",
      });

      colorSource = id;
    }
  }


  operations.push({
    id: "output",
    type: "output",
    color: colorSource,
  });


  return {
    operations,
    output: "output",
  };
}