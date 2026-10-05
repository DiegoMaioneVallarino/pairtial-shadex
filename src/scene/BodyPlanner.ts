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

let coordinateSource =
  "coordinates";
  /*
   * GENERATOR
   */
  
  /*
 * COORDINATE DYNAMICS
 *
 * Dynamics como Flow modifican
 * el espacio antes de que el
 * generator lo evalúe.
 */
const flow =
  body.dynamics.find(
    (dynamic) =>
      dynamic.type ===
      "flow",
  );

if (flow) {
  operations.push({
    id: "flow-time",
    type: "time",
    output: "float",
  });

  operations.push({
    id: "flow-coordinates",
    type: "flow-coordinates",
    input:
      coordinateSource,
    time: "flow-time",
    speed:
      flow.speed,
    direction: [
      flow.direction[0],
      flow.direction[1],
    ],
    output: "vec2",
  });

  coordinateSource =
    "flow-coordinates";
}
/*
 * SPATIAL EFFECTS
 *
 * Turbulence deforma el espacio
 * antes de que el generator
 * evalúe el Body.
 */
const turbulence =
  body.effects.find(
    (effect) =>
      effect.type ===
      "turbulence",
  );

if (turbulence) {
  operations.push({
    id: "turbulence-coordinates",
    type: "turbulence-coordinates",
    input:
      coordinateSource,
    amount:
      turbulence.amount,
    detail:
      turbulence.detail,
    output: "vec2",
  });

  coordinateSource =
    "turbulence-coordinates";
}

/*
 * GENERATOR
 */
  
  let geometrySource: string;
let representation:
  | "distance"
  | "density";

switch (body.generator.type) {
  case "sphere": {
    operations.push({
      id: "base-radius",
      type: "constant",
      value:
        body.generator.radius,
      output: "float",
    });

    let radiusSource =
      "base-radius";

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
        value: pulse.speed,
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
        input: "pulse-phase",
        output: "float",
      });

      operations.push({
        id: "pulse-amount",
        type: "constant",
        value: pulse.amount,
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
    input:
  coordinateSource,
        radius: radiusSource,
      output: "float",
    });

    geometrySource =
      "geometry";

    representation =
      "distance";

    break;
  }

  case "density-field": {
 operations.push({
  id: "density",
  type: "density-field",

  input:
    coordinateSource,

  shape:
    body.generator.shape,

  scale:
    body.generator.scale,

  detail:
    body.generator.detail,

  sharpness:
    body.generator.sharpness,

  output: "float",
});

    geometrySource =
      "density";

    representation =
      "density";

    break;
  }
}
  /*
   * La variable nos permite encadenar
   * transformaciones geométricas.
   */
/*
 * REPRESENTATION PROCESSING
 *
 * Distance y Density representan
 * presencia visual de maneras distintas.
 */
let representationSource =
  geometrySource;


/*
 * DISTANCE EFFECTS
 *
 * Estos efectos solo tienen sentido
 * sobre una representación de distancia.
 */
if (
  representation ===
  "distance"
) {
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
          representationSource,
        amount:
          effect.amount,
        scale:
          effect.scale,
        output:
          "float",
      });

      representationSource =
        id;
    }
  }
}


/*
 * PRESENCE
 *
 * Distance necesita convertirse
 * en una máscara.
 *
 * Density ya representa directamente
 * cuánto cuerpo existe en cada punto.
 */
let presenceSource: string;

if (
  representation ===
  "distance"
) {
  operations.push({
    id: "mask",
    type: "body-mask",
    input:
      representationSource,
    softness: 0.015,
    output: "float",
  });

  presenceSource =
    "mask";
} else {
  presenceSource =
    representationSource;
}
/*
 * ENVELOPE
 *
 * Limita espacialmente la
 * presencia del Body.
 */
if (
  body.envelope?.region.type ===
  "vertical"
) {
  const region =
    body.envelope.region;

  const falloff =
    body.envelope.falloff;

  operations.push({
    id: "envelope",
    type: "vertical-envelope",

    coordinates:
      coordinateSource,

    input:
      presenceSource,

    center:
      region.center,

    width:
      region.width,

    softness:
      falloff.type === "smooth"
        ? falloff.softness
        : 0,

    output: "float",
  });

  presenceSource =
    "envelope";
}

  /*
   * APPEARANCE
   */
  let colorSource =
    "appearance";

  operations.push({
    id: colorSource,
    type: "emissive",
mask: presenceSource,
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
 *
 * El glow actual trabaja sobre
 * campos de distancia.
 *
 * Density tendrá posteriormente
 * su propia implementación volumétrica.
 */
for (
  const effect of
  body.effects
) {
  if (
    effect.type === "glow" &&
    representation ===
      "distance"
  ) {
    const id =
      `glow-${operations.length}`;

    operations.push({
      id,
      type: "glow",
      distance:
        representationSource,
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