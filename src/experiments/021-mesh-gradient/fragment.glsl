#version 300 es

precision highp float;

in vec2 v_uv;

uniform float u_time;
uniform vec2 u_resolution;

uniform float u_spread;
uniform float u_motion;
uniform float u_brightness;
uniform float u_warp;

out vec4 outColor;


float influence(
  vec2 p,
  vec2 center,
  float spread
) {
  vec2 delta =
    p - center;

  return exp(
    -dot(
      delta,
      delta
    ) *
    spread
  );
}


void main() {
  vec2 p =
    v_uv * 2.0 - 1.0;

  p.x *=
    u_resolution.x /
    u_resolution.y;

  float t =
    u_time *
    u_motion;


  /*
   * Deformamos ligeramente
   * las coordenadas.
   */
  vec2 q = p;

  q.x +=
    sin(
      p.y * 2.5 +
      t
    ) *
    u_warp *
    0.1;

  q.y +=
    cos(
      p.x * 2.0 -
      t * 0.8
    ) *
    u_warp *
    0.1;


  vec2 p1 =
    vec2(
      -0.7 +
      sin(t * 0.7) * 0.2,
      0.45
    );

  vec2 p2 =
    vec2(
      0.65,
      0.4 +
      cos(t * 0.5) * 0.2
    );

  vec2 p3 =
    vec2(
      -0.2,
      -0.65 +
      sin(t * 0.4) * 0.15
    );

  vec2 p4 =
    vec2(
      0.55 +
      cos(t * 0.6) * 0.15,
      -0.45
    );


  float w1 =
    influence(
      q,
      p1,
      u_spread
    );

  float w2 =
    influence(
      q,
      p2,
      u_spread
    );

  float w3 =
    influence(
      q,
      p3,
      u_spread
    );

  float w4 =
    influence(
      q,
      p4,
      u_spread
    );


  vec3 c1 =
    vec3(
      0.12,
      0.38,
      1.0
    );

  vec3 c2 =
    vec3(
      0.7,
      0.12,
      1.0
    );

  vec3 c3 =
    vec3(
      1.0,
      0.18,
      0.5
    );

  vec3 c4 =
    vec3(
      0.05,
      0.9,
      0.85
    );


  float total =
    w1 +
    w2 +
    w3 +
    w4 +
    0.001;


  vec3 color =
    (
      c1 * w1 +
      c2 * w2 +
      c3 * w3 +
      c4 * w4
    ) /
    total;


  /*
   * Fondo para regiones
   * alejadas de los nodos.
   */
  float coverage =
    clamp(
      total,
      0.0,
      1.0
    );

  vec3 background =
    vec3(
      0.012,
      0.018,
      0.05
    );

  color =
    mix(
      background,
      color,
      coverage
    );

  color *=
    u_brightness;


  outColor =
    vec4(
      color,
      1.0
    );
}