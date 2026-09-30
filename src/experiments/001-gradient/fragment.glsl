#version 300 es

precision highp float;

in vec2 v_uv;

uniform float u_time;
uniform vec2 u_resolution;

out vec4 outColor;

void main() {
  vec2 uv = v_uv;

  float wave =
    sin(
      uv.x * 5.0 +
      u_time
    ) * 0.5 + 0.5;

  vec3 blue = vec3(
    0.12,
    0.32,
    1.0
  );

  vec3 violet = vec3(
    0.72,
    0.18,
    1.0
  );

  vec3 pink = vec3(
    1.0,
    0.24,
    0.62
  );

  vec3 color =
    mix(
      blue,
      violet,
      uv.y
    );

  color = mix(
    color,
    pink,
    wave * 0.35
  );

  outColor = vec4(
    color,
    1.0
  );
}