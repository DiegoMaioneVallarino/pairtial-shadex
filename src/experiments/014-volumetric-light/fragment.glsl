#version 300 es

precision highp float;

in vec2 v_uv;

uniform float u_time;
uniform vec2 u_resolution;

uniform float u_density;
uniform float u_beamWidth;
uniform float u_scatter;
uniform float u_motion;

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

  f =
    f * f * (3.0 - 2.0 * f);

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

  for (int i = 0; i < 5; i++) {
    result +=
      noise(p) * amplitude;

    p *= 2.03;

    amplitude *= 0.5;
  }

  return result;
}


void main() {
  vec2 uv = v_uv;

  vec2 p =
    uv * 2.0 - 1.0;

  p.x *=
    u_resolution.x /
    u_resolution.y;

  float time =
    u_time * u_motion;

  /*
   * Fuente de luz fuera
   * de la parte superior.
   */
  vec2 lightPosition =
    vec2(
      0.0,
      1.35
    );

  vec2 toPixel =
    p - lightPosition;

  float distanceFromLight =
    length(toPixel);

  float angle =
    atan(
      toPixel.x,
      -toPixel.y
    );

  /*
   * Variación procedural de
   * densidad del medio.
   */
  float fog =
    fbm(
      p * 2.2 +
      vec2(
        time * 0.2,
        -time * 0.35
      )
    );

  fog =
    mix(
      1.0,
      fog,
      u_density
    );


  /*
   * Varios haces.
   */
  float beamA =
    exp(
      -abs(
        angle - 0.22
      ) *
      u_beamWidth
    );

  float beamB =
    exp(
      -abs(
        angle + 0.18
      ) *
      u_beamWidth *
      1.3
    );

  float beamC =
    exp(
      -abs(
        angle + 0.02
      ) *
      u_beamWidth *
      2.0
    );

  float beams =
    beamA +
    beamB * 0.8 +
    beamC * 0.45;

  /*
   * La luz pierde energía
   * con la distancia.
   */
  float attenuation =
    1.0 /
    (
      1.0 +
      distanceFromLight *
      distanceFromLight *
      0.8
    );

  float light =
    beams *
    fog *
    attenuation *
    u_scatter;


  vec3 background =
    vec3(
      0.004,
      0.006,
      0.02
    );

  /*
   * Niebla ambiental.
   */
  background +=
    vec3(
      0.025,
      0.035,
      0.08
    ) *
    fog *
    0.4;


  vec3 lightColor =
    vec3(
      0.55,
      0.72,
      1.0
    );

  vec3 color =
    background +
    lightColor * light;


  /*
   * Núcleo luminoso.
   */
  float source =
    exp(
      -distanceFromLight *
      7.0
    );

  color +=
    vec3(
      0.75,
      0.85,
      1.0
    ) *
    source *
    2.0;


  outColor =
    vec4(
      color,
      1.0
    );
}