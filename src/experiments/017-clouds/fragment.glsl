#version 300 es

precision highp float;

in vec2 v_uv;

uniform float u_time;
uniform vec2 u_resolution;

uniform float u_scale;
uniform float u_density;
uniform float u_detail;
uniform float u_speed;

out vec4 outColor;


float hash(vec2 p) {
  return fract(
    sin(dot(p, vec2(127.1, 311.7))) *
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
  float result = 0.0;
  float amplitude = 0.5;

  for (int i = 0; i < 7; i++) {
    result +=
      noise(p) * amplitude;

    p =
      p * 2.02 +
      vec2(13.2, 7.4);

    amplitude *= 0.5;
  }

  return result;
}


void main() {
  vec2 uv = v_uv;

  vec2 p =
    uv * u_scale;

  p.x *=
    u_resolution.x /
    u_resolution.y;

  float time =
    u_time * u_speed;

  vec2 flow =
    vec2(
      time,
      time * 0.25
    );

  float large =
    fbm(
      p + flow
    );

  float detail =
    fbm(
      p * 2.3 -
      flow * 0.4
    );

  float cloud =
    mix(
      large,
      detail,
      u_detail
    );

  cloud =
    smoothstep(
      1.0 - u_density,
      1.0,
      cloud
    );

  float lightNoise =
    fbm(
      p +
      vec2(
        -0.15,
        0.2
      )
    );

  float illumination =
    clamp(
      lightNoise -
      large +
      0.55,
      0.0,
      1.0
    );

  vec3 skyBottom =
    vec3(
      0.12,
      0.18,
      0.42
    );

  vec3 skyTop =
    vec3(
      0.015,
      0.025,
      0.09
    );

  vec3 sky =
    mix(
      skyBottom,
      skyTop,
      uv.y
    );

  vec3 shadowCloud =
    vec3(
      0.18,
      0.2,
      0.32
    );

  vec3 brightCloud =
    vec3(
      0.85,
      0.9,
      1.0
    );

  vec3 cloudColor =
    mix(
      shadowCloud,
      brightCloud,
      illumination
    );

  vec3 color =
    mix(
      sky,
      cloudColor,
      cloud
    );

  outColor =
    vec4(color, 1.0);
}