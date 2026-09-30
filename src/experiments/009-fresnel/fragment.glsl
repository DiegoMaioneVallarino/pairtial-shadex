#version 300 es

precision highp float;

in vec2 v_uv;

uniform vec2 u_resolution;

uniform float u_radius;
uniform float u_power;
uniform float u_intensity;

out vec4 outColor;

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

  vec3 viewDirection =
    vec3(0.0, 0.0, 1.0);

  float facing =
    max(
      dot(
        normal,
        viewDirection
      ),
      0.0
    );

  float fresnel =
    pow(
      1.0 - facing,
      u_power
    );

  fresnel *=
    u_intensity;

  vec3 baseColor =
    vec3(
      0.035,
      0.055,
      0.16
    );

  vec3 edgeColor =
    vec3(
      0.15,
      0.75,
      1.0
    );

  vec3 color =
    baseColor +
    edgeColor * fresnel;

  outColor =
    vec4(color, 1.0);
}