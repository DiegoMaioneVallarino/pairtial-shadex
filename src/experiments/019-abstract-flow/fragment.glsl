#version 300 es

precision highp float;

in vec2 v_uv;

uniform float u_time;
uniform vec2 u_resolution;

uniform float u_scale;
uniform float u_warp;
uniform float u_glow;
uniform float u_speed;

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
    43758.5453
  );
}


float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);

  f =
    f * f *
    (3.0 - 2.0 * f);

  return mix(
    mix(
      hash(i),
      hash(i + vec2(1.0, 0.0)),
      f.x
    ),
    mix(
      hash(i + vec2(0.0, 1.0)),
      hash(i + vec2(1.0, 1.0)),
      f.x
    ),
    f.y
  );
}


float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;

  for (int i = 0; i < 6; i++) {
    value +=
      noise(p) *
      amplitude;

    p =
      p * 2.03 +
      vec2(
        5.2,
        1.3
      );

    amplitude *= 0.5;
  }

  return value;
}


void main() {
  vec2 uv = v_uv;

  vec2 p =
    uv * 2.0 - 1.0;

  p.x *=
    u_resolution.x /
    u_resolution.y;

  p *= u_scale;

  float time =
    u_time * u_speed;

  vec2 q;

  q.x =
    fbm(
      p +
      vec2(
        time,
        0.0
      )
    );

  q.y =
    fbm(
      p +
      vec2(
        5.2,
        1.3
      ) -
      vec2(
        0.0,
        time
      )
    );

  vec2 r;

  r.x =
    fbm(
      p +
      u_warp * q +
      vec2(
        1.7,
        9.2
      ) +
      time * 0.15
    );

  r.y =
    fbm(
      p +
      u_warp * q +
      vec2(
        8.3,
        2.8
      ) -
      time * 0.12
    );

  float field =
    fbm(
      p +
      u_warp * r
    );

  float ribbon =
    sin(
      field * 10.0 +
      r.x * 6.0 -
      r.y * 5.0
    );

  ribbon =
    abs(ribbon);

  ribbon =
    pow(
      1.0 - ribbon,
      4.0
    );

  vec3 midnight =
    vec3(
      0.005,
      0.008,
      0.035
    );

  vec3 blue =
    vec3(
      0.03,
      0.22,
      1.0
    );

  vec3 violet =
    vec3(
      0.48,
      0.08,
      1.0
    );

  vec3 pink =
    vec3(
      1.0,
      0.12,
      0.52
    );

  vec3 cyan =
    vec3(
      0.05,
      0.85,
      1.0
    );

  vec3 color =
    mix(
      midnight,
      blue,
      field
    );

  color =
    mix(
      color,
      violet,
      r.x * 0.8
    );

  color =
    mix(
      color,
      pink,
      r.y * 0.45
    );

  color +=
    cyan *
    ribbon *
    u_glow;

  /*
   * Glow suave alrededor
   * de zonas energéticas.
   */
  float energy =
    smoothstep(
      0.45,
      0.9,
      field
    );

  color +=
    violet *
    energy *
    0.25 *
    u_glow;

  /*
   * Viñeta.
   */
  vec2 centered =
    v_uv - 0.5;

  float vignette =
    1.0 -
    dot(
      centered,
      centered
    ) * 0.75;

  color *= vignette;

  outColor =
    vec4(
      color,
      1.0
    );
}