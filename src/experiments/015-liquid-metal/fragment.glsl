#version 300 es

precision highp float;

in vec2 v_uv;

uniform float u_time;
uniform vec2 u_resolution;

uniform float u_scale;
uniform float u_distortion;
uniform float u_shine;
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

  f = f * f * (3.0 - 2.0 * f);

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
    value += noise(p) * amplitude;

    p =
      p * 2.03 +
      vec2(8.3, 2.8);

    amplitude *= 0.5;
  }

  return value;
}


void main() {
  vec2 p =
    v_uv * 2.0 - 1.0;

  p.x *=
    u_resolution.x /
    u_resolution.y;

  float time =
    u_time * u_speed;

  p *= u_scale;

  float fieldA =
    fbm(
      p +
      vec2(
        time,
        -time * 0.4
      )
    );

  float fieldB =
    fbm(
      p +
      vec2(
        fieldA * u_distortion,
        -fieldA * u_distortion
      )
    );

  float height =
    fieldB;

  float e = 0.01;

  float hx =
    fbm(
      p +
      vec2(e, 0.0) +
      vec2(
        fieldA * u_distortion,
        -fieldA * u_distortion
      )
    );

  float hy =
    fbm(
      p +
      vec2(0.0, e) +
      vec2(
        fieldA * u_distortion,
        -fieldA * u_distortion
      )
    );

  vec3 normal =
    normalize(
      vec3(
        height - hx,
        height - hy,
        e
      )
    );

  vec3 viewDirection =
    vec3(0.0, 0.0, 1.0);

  float fresnel =
    pow(
      1.0 -
      max(
        dot(
          normal,
          viewDirection
        ),
        0.0
      ),
      3.0
    );

  vec3 light =
    normalize(
      vec3(
        -0.5,
        0.8,
        1.0
      )
    );

  float reflection =
    pow(
      max(
        dot(
          reflect(-light, normal),
          viewDirection
        ),
        0.0
      ),
      20.0
    );

  reflection *= u_shine;

  float bands =
    sin(
      fieldB * 18.0 +
      p.x * 1.5
    ) * 0.5 + 0.5;

  vec3 darkMetal =
    vec3(
      0.025,
      0.03,
      0.045
    );

  vec3 silver =
    vec3(
      0.55,
      0.62,
      0.72
    );

  vec3 color =
    mix(
      darkMetal,
      silver,
      bands * 0.65
    );

  color +=
    fresnel *
    vec3(
      0.35,
      0.45,
      0.65
    );

  color +=
    reflection *
    vec3(1.0);

  outColor =
    vec4(color, 1.0);
}