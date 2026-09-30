#version 300 es

precision highp float;

in vec2 v_uv;

uniform float u_time;
uniform vec2 u_resolution;

uniform float u_frequency;
uniform float u_shift;
uniform float u_fresnel;
uniform float u_speed;

out vec4 outColor;


void main() {
  vec2 p =
    v_uv * 2.0 - 1.0;

  p.x *=
    u_resolution.x /
    u_resolution.y;

  float d =
    dot(p, p);

  if (d > 0.75) {
    vec3 background =
      vec3(
        0.006,
        0.008,
        0.02
      );

    outColor =
      vec4(
        background,
        1.0
      );

    return;
  }

  float z =
    sqrt(
      max(
        0.0,
        1.0 -
        d / 0.75
      )
    );

  vec3 normal =
    normalize(
      vec3(
        p / sqrt(0.75),
        z
      )
    );

  vec3 viewDirection =
    vec3(
      0.0,
      0.0,
      1.0
    );

  float angle =
    1.0 -
    max(
      dot(
        normal,
        viewDirection
      ),
      0.0
    );

  float phase =
    angle *
    u_frequency +
    u_shift +
    sin(
      p.x * 4.0 +
      p.y * 3.0 +
      u_time * u_speed
    ) * 0.5;

  vec3 spectrum =
    0.5 +
    0.5 *
    cos(
      6.28318 *
      (
        phase +
        vec3(
          0.0,
          0.33,
          0.67
        )
      )
    );

  float fresnel =
    pow(
      angle,
      2.5
    ) *
    u_fresnel;

  vec3 base =
    vec3(
      0.035,
      0.04,
      0.06
    );

  vec3 color =
    base +
    spectrum *
    (
      0.35 +
      fresnel
    );

  float highlight =
    pow(
      max(
        dot(
          normal,
          normalize(
            vec3(
              -0.5,
              0.8,
              1.0
            )
          )
        ),
        0.0
      ),
      40.0
    );

  color +=
    vec3(1.0) *
    highlight *
    1.4;

  outColor =
    vec4(color, 1.0);
}