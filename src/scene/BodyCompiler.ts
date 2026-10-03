import type {
  ShadexBody,
} from "./body.types";

import type {
  ShadexExperiment,
} from "../lab/experiments/experiment.types";


const vertexShader = `#version 300 es

precision highp float;

out vec2 v_uv;

void main() {
  vec2 position;

  if (gl_VertexID == 0) {
    position =
      vec2(-1.0, -1.0);
  } else if (
    gl_VertexID == 1
  ) {
    position =
      vec2(3.0, -1.0);
  } else {
    position =
      vec2(-1.0, 3.0);
  }

  v_uv =
    position * 0.5 +
    0.5;

  gl_Position =
    vec4(
      position,
      0.0,
      1.0
    );
}
`;


export function compileBody(
  body: ShadexBody,
): ShadexExperiment {
  if (
    body.generator.type ===
    "sphere"
  ) {
    return compileSphereBody(
      body,
    );
  }


  return compileFieldBody(
    body,
  );
}


function compileSphereBody(
  body: ShadexBody,
): ShadexExperiment {
  const radius =
    body.generator.type ===
    "sphere"
      ? body.generator.radius
      : 0.8;


  const color =
    body.appearance.color;


  const intensity =
    body.appearance.type ===
    "emissive"
      ? body.appearance.intensity
      : 1;


  const pulse =
    body.dynamics.find(
      (dynamic) =>
        dynamic.type ===
        "pulse",
    );


  const distortion =
    body.effects.find(
      (effect) =>
        effect.type ===
        "distortion",
    );


  const glow =
    body.effects.find(
      (effect) =>
        effect.type ===
        "glow",
    );


  const fragmentShader = `#version 300 es

precision highp float;

in vec2 v_uv;

uniform float u_time;
uniform vec2 u_resolution;

out vec4 outColor;


float hash(vec2 p) {
  return fract(
    sin(
      dot(
        p,
        vec2(
          127.1,
          311.7
        )
      )
    ) *
    43758.5453123
  );
}


float noise(vec2 p) {
  vec2 i =
    floor(p);

  vec2 f =
    fract(p);

  f =
    f * f *
    (3.0 - 2.0 * f);

  float a =
    hash(i);

  float b =
    hash(
      i +
      vec2(1.0, 0.0)
    );

  float c =
    hash(
      i +
      vec2(0.0, 1.0)
    );

  float d =
    hash(
      i +
      vec2(1.0, 1.0)
    );

  return mix(
    mix(a, b, f.x),
    mix(c, d, f.x),
    f.y
  );
}


void main() {
  vec2 p =
    v_uv * 2.0 -
    1.0;

  p.x *=
    u_resolution.x /
    max(
      u_resolution.y,
      1.0
    );


  float radius =
    ${radius.toFixed(4)};


  ${
    pulse?.type === "pulse"
      ? `
  radius *=
    1.0 +
    sin(
      u_time *
      ${pulse.speed.toFixed(4)}
    ) *
    ${pulse.amount.toFixed(4)};
`
      : ""
  }


  float distortion =
    0.0;


  ${
    distortion?.type ===
    "distortion"
      ? `
  distortion =
    (
      noise(
        p *
        ${distortion.scale.toFixed(4)} +
        u_time * 0.15
      ) -
      0.5
    ) *
    ${distortion.amount.toFixed(4)};
`
      : ""
  }


  float distanceToBody =
    length(p) -
    radius -
    distortion;


  float bodyMask =
    1.0 -
    smoothstep(
      -0.02,
      0.02,
      distanceToBody
    );


  vec3 bodyColor =
    vec3(
      ${color[0].toFixed(4)},
      ${color[1].toFixed(4)},
      ${color[2].toFixed(4)}
    ) *
    ${intensity.toFixed(4)};


  vec3 color =
    bodyColor *
    bodyMask;


  ${
    glow?.type === "glow"
      ? `
  float glowField =
    exp(
      -abs(
        distanceToBody
      ) *
      ${
        (
          8 /
          Math.max(
            glow.radius,
            0.01,
          )
        ).toFixed(4)
      }
    );

  color +=
    bodyColor *
    glowField *
    ${glow.intensity.toFixed(4)};
`
      : ""
  }


  color *=
    1.0 -
    0.25 *
    length(p);


  outColor =
    vec4(
      color,
      1.0
    );
}
`;


  return {
    id:
      "035-body-laboratory",

    name:
      body.name,

    description:
      `${body.domain} body generated through the Shadex body model.`,

    vertexShader,

    fragmentShader,

    parameters: {},
  };
}


function compileFieldBody(
  body: ShadexBody,
): ShadexExperiment {
  const color =
    body.appearance.color;


  const intensity =
    body.appearance.type ===
    "emissive"
      ? body.appearance.intensity
      : 1;


  const generator =
    body.generator.type ===
    "density-field"
      ? body.generator
      : {
          scale: 2,
          detail: 3,
        };


  const flow =
    body.dynamics.find(
      (dynamic) =>
        dynamic.type ===
        "flow",
    );


  const turbulence =
    body.effects.find(
      (effect) =>
        effect.type ===
        "turbulence",
    );


  const fragmentShader = `#version 300 es

precision highp float;

in vec2 v_uv;

uniform float u_time;
uniform vec2 u_resolution;

out vec4 outColor;


float hash(vec2 p) {
  return fract(
    sin(
      dot(
        p,
        vec2(
          127.1,
          311.7
        )
      )
    ) *
    43758.5453123
  );
}


float noise(vec2 p) {
  vec2 i =
    floor(p);

  vec2 f =
    fract(p);

  f =
    f * f *
    (3.0 - 2.0 * f);

  return mix(
    mix(
      hash(i),
      hash(
        i +
        vec2(1.0, 0.0)
      ),
      f.x
    ),
    mix(
      hash(
        i +
        vec2(0.0, 1.0)
      ),
      hash(
        i +
        vec2(1.0, 1.0)
      ),
      f.x
    ),
    f.y
  );
}


void main() {
  vec2 p =
    v_uv * 2.0 -
    1.0;

  p.x *=
    u_resolution.x /
    max(
      u_resolution.y,
      1.0
    );


  vec2 q =
    p *
    ${generator.scale.toFixed(4)};


  ${
    flow?.type === "flow"
      ? `
  q +=
    vec2(
      ${flow.direction[0].toFixed(4)},
      ${flow.direction[1].toFixed(4)}
    ) *
    u_time *
    ${flow.speed.toFixed(4)};
`
      : ""
  }


  float field =
    noise(q);


  ${
    turbulence?.type ===
    "turbulence"
      ? `
  field +=
    noise(
      q * ${turbulence.detail.toFixed(4)} +
      field * 2.0
    ) *
    ${turbulence.amount.toFixed(4)};
`
      : ""
  }


  float curtain =
    exp(
      -abs(
        p.y -
        (
          field -
          0.5
        ) *
        0.65
      ) *
      7.0
    );


  float fade =
    smoothstep(
      1.2,
      0.0,
      abs(p.x)
    );


  vec3 color =
    vec3(
      ${color[0].toFixed(4)},
      ${color[1].toFixed(4)},
      ${color[2].toFixed(4)}
    ) *
    curtain *
    fade *
    ${intensity.toFixed(4)};


  outColor =
    vec4(
      color,
      1.0
    );
}
`;


  return {
    id:
      "035-body-laboratory",

    name:
      body.name,

    description:
      `${body.domain} body generated through the Shadex body model.`,

    vertexShader,

    fragmentShader,

    parameters: {},
  };
}