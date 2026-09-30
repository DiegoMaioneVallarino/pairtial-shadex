#version 300 es

precision highp float;

in vec2 v_uv;

uniform float u_time;
uniform vec2 u_resolution;

uniform float u_scale;
uniform float u_speed;
uniform float u_octaves;
uniform float u_persistence;
uniform float u_lacunarity;

out vec4 outColor;


float random(vec2 p) {
  return fract(
    sin(
      dot(
        p,
        vec2(127.1, 311.7)
      )
    ) * 43758.5453123
  );
}


float noise(vec2 p) {
  vec2 cell = floor(p);
  vec2 local = fract(p);

  float a =
    random(cell);

  float b =
    random(
      cell + vec2(1.0, 0.0)
    );

  float c =
    random(
      cell + vec2(0.0, 1.0)
    );

  float d =
    random(
      cell + vec2(1.0, 1.0)
    );

  vec2 smoothLocal =
    local *
    local *
    (3.0 - 2.0 * local);

  return mix(
    mix(a, b, smoothLocal.x),
    mix(c, d, smoothLocal.x),
    smoothLocal.y
  );
}


float fbm(vec2 p) {
  float value = 0.0;

  float amplitude = 0.5;
  float frequency = 1.0;

  float totalAmplitude = 0.0;

  // GLSL necesita un máximo conocido.
  for (int i = 0; i < 8; i++) {
    if (
      float(i) >= u_octaves
    ) {
      break;
    }

    value +=
      noise(
        p * frequency
      ) * amplitude;

    totalAmplitude +=
      amplitude;

    frequency *=
      u_lacunarity;

    amplitude *=
      u_persistence;
  }

  return value /
    max(totalAmplitude, 0.001);
}


void main() {
  vec2 uv = v_uv;

  vec2 p =
    uv * 2.0 - 1.0;

  p.x *=
    u_resolution.x /
    u_resolution.y;

  p *= u_scale;

  p += vec2(
    u_time * u_speed * 0.25,
    u_time * u_speed
  );

  float n =
    fbm(p);

  vec3 deep =
    vec3(
      0.015,
      0.02,
      0.08
    );

  vec3 blue =
    vec3(
      0.05,
      0.25,
      1.0
    );

  vec3 violet =
    vec3(
      0.55,
      0.12,
      1.0
    );

  vec3 pink =
    vec3(
      1.0,
      0.18,
      0.62
    );

  vec3 color =
    mix(
      deep,
      blue,
      smoothstep(
        0.15,
        0.55,
        n
      )
    );

  color =
    mix(
      color,
      violet,
      smoothstep(
        0.45,
        0.72,
        n
      )
    );

  color =
    mix(
      color,
      pink,
      smoothstep(
        0.68,
        0.95,
        n
      )
    );

  outColor =
    vec4(color, 1.0);
}