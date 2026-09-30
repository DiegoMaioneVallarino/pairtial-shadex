#version 300 es

precision highp float;

in vec2 v_uv;

uniform float u_time;
uniform vec2 u_resolution;

uniform float u_radius;
uniform float u_lightX;
uniform float u_lightY;
uniform float u_ambient;

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

  if (distanceSquared > 1.0) {
    outColor =
      vec4(
        0.008,
        0.01,
        0.025,
        1.0
      );

    return;
  }

  /*
   * Reconstruimos Z.
   */
  float z =
    sqrt(
      1.0 -
      distanceSquared
    );

  /*
   * Normal de la superficie.
   */
  vec3 normal =
    normalize(
      vec3(
        sphereXY,
        z
      )
    );

  /*
   * Dirección de la luz.
   *
   * X e Y vienen del Lab.
   * Z positivo significa que
   * está frente a la esfera.
   */
  vec3 lightDirection =
    normalize(
      vec3(
        u_lightX,
        u_lightY,
        1.0
      )
    );

  /*
   * Lambert diffuse.
   *
   * dot() compara la dirección
   * de ambos vectores.
   */
  float diffuse =
    max(
      dot(
        normal,
        lightDirection
      ),
      0.0
    );

  /*
   * Luz ambiente.
   *
   * Evita que el lado oscuro
   * desaparezca completamente.
   */
  float lighting =
    u_ambient +
    diffuse *
    (1.0 - u_ambient);

  vec3 materialColor =
    vec3(
      0.32,
      0.38,
      1.0
    );

  vec3 color =
    materialColor *
    lighting;

  outColor =
    vec4(
      color,
      1.0
    );
}