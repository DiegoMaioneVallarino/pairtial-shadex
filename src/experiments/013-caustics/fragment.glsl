#version 300 es

precision highp float;

in vec2 v_uv;

uniform float u_time;
uniform vec2 u_resolution;

uniform float u_scale;
uniform float u_speed;
uniform float u_intensity;
uniform float u_sharpness;

out vec4 outColor;


float causticLayer(
  vec2 p,
  float time
) {
  float value = 0.0;

  value +=
    sin(
      p.x * 2.1 +
      sin(p.y * 1.7 + time)
    );

  value +=
    sin(
      p.y * 2.4 +
      sin(p.x * 1.3 - time * 0.8)
    );

  value +=
    sin(
      (p.x + p.y) * 1.8 +
      time * 0.7
    );

  return value / 3.0;
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

  float layerA =
    causticLayer(
      p,
      time
    );

  float layerB =
    causticLayer(
      p * 1.37 +
      vec2(3.1, 7.7),
      -time * 1.3
    );

  float field =
    abs(
      layerA - layerB
    );

  float caustic =
    1.0 -
    smoothstep(
      0.0,
      0.35,
      field
    );

  caustic =
    pow(
      caustic,
      u_sharpness
    );

  caustic *=
    u_intensity;

  vec3 deepWater =
    vec3(
      0.005,
      0.055,
      0.12
    );

  vec3 shallowWater =
    vec3(
      0.02,
      0.35,
      0.48
    );

  vec3 lightColor =
    vec3(
      0.55,
      1.0,
      0.92
    );

  float depth =
    smoothstep(
      -1.0,
      1.0,
      p.y / u_scale
    );

  vec3 color =
    mix(
      deepWater,
      shallowWater,
      depth
    );

  color +=
    lightColor *
    caustic;

  /*
   * Una segunda capa más fina.
   */
  float fine =
    causticLayer(
      p * 2.4,
      time * 1.6
    );

  fine =
    pow(
      1.0 -
      abs(fine),
      u_sharpness + 2.0
    );

  color +=
    lightColor *
    fine *
    u_intensity *
    0.2;

  outColor =
    vec4(
      color,
      1.0
    );
}