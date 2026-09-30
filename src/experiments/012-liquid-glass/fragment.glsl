#version 300 es

precision highp float;

in vec2 v_uv;

uniform float u_time;
uniform vec2 u_resolution;

uniform float u_distortion;
uniform float u_refraction;
uniform float u_edge;
uniform float u_speed;

out vec4 outColor;


float hash(vec2 p) {
  return fract(
    sin(
      dot(
        p,
        vec2(127.1, 311.7)
      )
    ) * 43758.5453
  );
}


float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);

  vec2 u =
    f * f * (3.0 - 2.0 * f);

  return mix(
    mix(
      hash(i),
      hash(i + vec2(1.0, 0.0)),
      u.x
    ),
    mix(
      hash(i + vec2(0.0, 1.0)),
      hash(i + vec2(1.0, 1.0)),
      u.x
    ),
    u.y
  );
}


float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;

  for (int i = 0; i < 5; i++) {
    value +=
      noise(p) * amplitude;

    p =
      p * 2.03 +
      vec2(17.1, 9.2);

    amplitude *= 0.5;
  }

  return value;
}


vec3 background(vec2 uv) {
  float a =
    sin(
      uv.x * 5.0 +
      uv.y * 3.0
    );

  float b =
    sin(
      uv.y * 7.0 -
      uv.x * 2.0
    );

  float field =
    a * b * 0.5 + 0.5;

  vec3 deep =
    vec3(0.01, 0.015, 0.07);

  vec3 blue =
    vec3(0.04, 0.32, 1.0);

  vec3 purple =
    vec3(0.65, 0.12, 1.0);

  return mix(
    mix(deep, blue, uv.y),
    purple,
    field * 0.35
  );
}


void main() {
  vec2 uv = v_uv;

  vec2 p =
    uv * 2.0 - 1.0;

  p.x *=
    u_resolution.x /
    u_resolution.y;

  float time =
    u_time * u_speed;

  float warp =
    fbm(
      p * 2.2 +
      vec2(time, -time * 0.6)
    );

  float warp2 =
    fbm(
      p * 3.1 +
      vec2(
        warp * 3.0,
        time
      )
    );

  float radius =
    length(p);

  float boundary =
    0.62 +
    (warp - 0.5) *
    u_distortion *
    0.25 +
    (warp2 - 0.5) *
    u_distortion *
    0.12;

  float sdf =
    radius - boundary;

  float mask =
    1.0 -
    smoothstep(
      -0.01,
      0.015,
      sdf
    );

  vec3 base =
    background(uv);

  if (mask <= 0.001) {
    outColor =
      vec4(base, 1.0);

    return;
  }

  /*
   * Aproximamos la normal calculando
   * cómo cambia el campo alrededor
   * del píxel.
   */
  float epsilon = 0.004;

  float nx =
    fbm(
      (p + vec2(epsilon, 0.0)) *
      2.2 +
      vec2(time, -time * 0.6)
    ) -
    fbm(
      (p - vec2(epsilon, 0.0)) *
      2.2 +
      vec2(time, -time * 0.6)
    );

  float ny =
    fbm(
      (p + vec2(0.0, epsilon)) *
      2.2 +
      vec2(time, -time * 0.6)
    ) -
    fbm(
      (p - vec2(0.0, epsilon)) *
      2.2 +
      vec2(time, -time * 0.6)
    );

  vec2 normal =
    normalize(
      vec2(nx, ny) +
      normalize(p) * 0.15
    );

  vec2 refractedUV =
    uv +
    normal *
    u_refraction *
    mask;

  vec3 glass =
    background(refractedUV);

  float edge =
    1.0 -
    smoothstep(
      0.0,
      0.12,
      abs(sdf)
    );

  edge =
    pow(edge, 2.0);

  vec3 rimColor =
    vec3(
      0.4,
      0.85,
      1.0
    );

  glass +=
    rimColor *
    edge *
    u_edge;

  float highlight =
    pow(
      max(
        dot(
          normal,
          normalize(
            vec2(-0.6, 0.8)
          )
        ),
        0.0
      ),
      12.0
    );

  glass +=
    vec3(1.0) *
    highlight *
    0.65;

  vec3 finalColor =
    mix(
      base,
      glass,
      mask
    );

  outColor =
    vec4(
      finalColor,
      1.0
    );
}