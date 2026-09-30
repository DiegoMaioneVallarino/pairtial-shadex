#version 300 es

precision highp float;

in vec2 v_uv;

uniform vec2 u_resolution;

uniform float u_radius;

uniform float u_lightAX;
uniform float u_lightAY;

uniform float u_lightBX;
uniform float u_lightBY;

uniform float u_ambient;

out vec4 outColor;


float diffuseLight(
  vec3 normal,
  vec3 lightDirection
) {
  return max(
    dot(
      normal,
      normalize(lightDirection)
    ),
    0.0
  );
}


void main() {
  vec2 p =
    v_uv * 2.0 - 1.0;

  p.x *=
    u_resolution.x /
    u_resolution.y;

  vec2 sphereXY =
    p / max(u_radius, 0.001);

  float d2 =
    dot(sphereXY, sphereXY);

  if (d2 > 1.0) {
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
    sqrt(1.0 - d2);

  vec3 normal =
    normalize(
      vec3(sphereXY, z)
    );

  vec3 lightA =
    vec3(
      u_lightAX,
      u_lightAY,
      1.0
    );

  vec3 lightB =
    vec3(
      u_lightBX,
      u_lightBY,
      1.0
    );

  float diffuseA =
    diffuseLight(
      normal,
      lightA
    );

  float diffuseB =
    diffuseLight(
      normal,
      lightB
    );

  vec3 blueLight =
    vec3(
      0.1,
      0.35,
      1.0
    ) * diffuseA;

  vec3 pinkLight =
    vec3(
      1.0,
      0.12,
      0.55
    ) * diffuseB;

  vec3 material =
    vec3(
      0.32,
      0.34,
      0.42
    );

  vec3 lighting =
    vec3(u_ambient) +
    blueLight +
    pinkLight;

  vec3 color =
    material * lighting;

  outColor =
    vec4(color, 1.0);
}