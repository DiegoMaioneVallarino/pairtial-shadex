#version 300 es

precision highp float;

in vec2 v_uv;

uniform vec2 u_resolution;

uniform float u_radius;
uniform float u_lightX;
uniform float u_lightY;
uniform float u_ambient;
uniform float u_shininess;
uniform float u_specular;

out vec4 outColor;

void main() {
  vec2 p =
    v_uv * 2.0 - 1.0;

  p.x *=
    u_resolution.x /
    u_resolution.y;

  float radius =
    max(
      u_radius,
      0.001
    );

  vec2 sphereXY =
    p / radius;

  float distanceSquared =
    dot(
      sphereXY,
      sphereXY
    );

  if (
    distanceSquared > 1.0
  ) {
    outColor =
      vec4(
        0.008,
        0.01,
        0.025,
        1.0
      );

    return;
  }

  float z =
    sqrt(
      1.0 -
      distanceSquared
    );

  vec3 normal =
    normalize(
      vec3(
        sphereXY,
        z
      )
    );

  vec3 lightDirection =
    normalize(
      vec3(
        u_lightX,
        u_lightY,
        1.0
      )
    );

  /*
   * Nuestra cámara está mirando
   * directamente hacia la esfera.
   */
  vec3 viewDirection =
    vec3(
      0.0,
      0.0,
      1.0
    );


  // -------------------------
  // DIFFUSE
  // -------------------------

  float diffuse =
    max(
      dot(
        normal,
        lightDirection
      ),
      0.0
    );


  // -------------------------
  // SPECULAR
  // -------------------------

  /*
   * reflect() calcula hacia dónde
   * rebota la luz sobre la normal.
   */
  vec3 reflectedLight =
    reflect(
      -lightDirection,
      normal
    );

  /*
   * ¿Ese reflejo apunta
   * hacia la cámara?
   */
  float reflectionAlignment =
    max(
      dot(
        reflectedLight,
        viewDirection
      ),
      0.0
    );

  /*
   * shininess concentra
   * el reflejo.
   */
  float specular =
    pow(
      reflectionAlignment,
      u_shininess
    );

  specular *=
    u_specular;


  // -------------------------
  // MATERIAL
  // -------------------------

  vec3 materialColor =
    vec3(
      0.16,
      0.24,
      0.95
    );

  float lighting =
    u_ambient +
    diffuse *
    (1.0 - u_ambient);

  vec3 color =
    materialColor *
    lighting;


  /*
   * Reflejo blanco.
   */
  color +=
    vec3(1.0) *
    specular;


  outColor =
    vec4(
      color,
      1.0
    );
}