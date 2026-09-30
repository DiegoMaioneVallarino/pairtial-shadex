#version 300 es

precision highp float;

in vec2 v_uv;

uniform float u_time;
uniform vec2 u_resolution;

uniform float u_radius;
uniform float u_softness;

out vec4 outColor;

void main() {
  vec2 uv = v_uv;

  // Transformamos 0..1 a -1..1
  vec2 p = uv * 2.0 - 1.0;

  // Corregimos el aspect ratio.
  p.x *= u_resolution.x / u_resolution.y;

  // Distancia del pixel al centro.
  float distanceToCenter = length(p);

  // Radio animado muy ligeramente.
  float pulse =
    sin(u_time * 2.0) * 0.03;

  float radius =
    u_radius + pulse;

  // 1 dentro del círculo,
  // 0 fuera del círculo.
  float circle =
    1.0 -
    smoothstep(
      radius,
      radius + u_softness,
      distanceToCenter
    );

  vec3 background = vec3(
    0.015,
    0.018,
    0.04
  );

  vec3 innerColor = vec3(
    0.20,
    0.35,
    1.0
  );

  vec3 outerColor = vec3(
    0.95,
    0.20,
    0.80
  );

  float gradient =
    distanceToCenter /
    max(radius, 0.001);

  vec3 sphereColor =
    mix(
      innerColor,
      outerColor,
      gradient
    );

  // Una pequeña iluminación falsa.
  vec2 lightPosition =
    vec2(
      sin(u_time * 0.7) * 0.35,
      cos(u_time * 0.5) * 0.25
    );

  float lightDistance =
    length(p - lightPosition);

  float glow =
    0.15 /
    max(lightDistance, 0.08);

  sphereColor +=
    vec3(
      0.15,
      0.25,
      0.8
    ) * glow * circle;

  vec3 finalColor =
    mix(
      background,
      sphereColor,
      circle
    );

  outColor =
    vec4(finalColor, 1.0);
}