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
  /*
   * El radio base ya es un valor
   * dentro del programa.
   */
  operations.push({
    id: "base-radius",
    type: "constant",
    value:
      body.generator.radius,
    output: "float",
  });


  /*
   * Por defecto la esfera utiliza
   * directamente su radio base.
   */
  let radiusSource =
    "base-radius";


  /*
   * Pulse es semántica de alto nivel.
   *
   * Aquí deja de existir como concepto
   * y se expande a matemáticas.
   */
  const pulse =
    body.dynamics.find(
      (dynamic) =>
        dynamic.type ===
        "pulse",
    );


  if (pulse) {
    operations.push({
      id: "time",
      type: "time",
      output: "float",
    });


    operations.push({
      id: "pulse-speed",
      type: "constant",
      value:
        pulse.speed,
      output: "float",
    });


    operations.push({
      id: "pulse-phase",
      type: "multiply",
      a: "time",
      b: "pulse-speed",
      output: "float",
    });


    operations.push({
      id: "pulse-wave",
      type: "sin",
      input:
        "pulse-phase",
      output: "float",
    });


    operations.push({
      id: "pulse-amount",
      type: "constant",
      value:
        pulse.amount,
      output: "float",
    });


    operations.push({
      id: "pulse-offset",
      type: "multiply",
      a: "pulse-wave",
      b: "pulse-amount",
      output: "float",
    });


    operations.push({
      id: "animated-radius",
      type: "add",
      a: "base-radius",
      b: "pulse-offset",
      output: "float",
    });


    radiusSource =
      "animated-radius";
  }


  operations.push({
    id: "geometry",
    type: "sphere-distance",
    input: "coordinates",
    radius:
      radiusSource,
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