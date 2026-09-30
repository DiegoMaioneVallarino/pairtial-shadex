#version 300 es

precision highp float;

in vec2 v_uv;

uniform float u_time;
uniform vec2 u_resolution;

uniform float u_radius;

out vec4 outColor;

void main() {
  vec2 p =
    v_uv * 2.0 - 1.0;

  p.x *=
    u_resolution.x /
    u_resolution.y;

  float radius =
    max(u_radius, 0.001);

  vec2 sphereXY =
    p / radius;

  float distanceSquared =
    dot(
      sphereXY,
      sphereXY
    );

  // Fuera de la esfera.
  if (distanceSquared > 1.0) {
    vec3 background =
      vec3(
        0.008,
        0.01,
        0.025
      );

    outColor =
      vec4(
        background,
        1.0
      );

    return;
  }

  /*
   * Ecuación de una esfera:
   *
   * x² + y² + z² = 1
   *
   * por tanto:
   *
   * z = sqrt(
   *   1 - x² - y²
   * )
   */

  float z =
    sqrt(
      1.0 -
      distanceSquared
    );

  vec3 normal =
    normalize(
      vec3(
        sphereXY.x,
        sphereXY.y,
        z
      )
    );

  /*
   * Las normales van de:
   *
   * -1 → +1
   *
   * pero RGB necesita:
   *
   *  0 → 1
   *
   * por eso:
   */

  vec3 normalColor =
    normal * 0.5 + 0.5;

  outColor =
    vec4(
      normalColor,
      1.0
    );
}