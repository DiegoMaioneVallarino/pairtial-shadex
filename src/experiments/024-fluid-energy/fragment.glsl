#version 300 es

precision highp float;

in vec2 v_uv;

uniform float u_time;
uniform vec2 u_resolution;

uniform float u_scale;
uniform float u_warp;
uniform float u_energy;
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
      hash(
        i +
        vec2(1.0, 0.0)
      ),
      f.x
    ),
    mix(
      hash(
        i +
        vec2(0.0, 1.0)
      ),
      hash(
        i +
        vec2(1.0, 1.0)
      ),
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
      p * 2.04 +
      vec2(
        4.2,
        7.1
      );

    amplitude *=
      0.5;
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

  p *=
    u_scale;

  float t =
    u_time *
    u_speed;


  vec2 q;

  q.x =
    fbm(
      p +
      vec2(
        t,
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
        t
      )
    );


  vec2 r;

  r.x =
    fbm(
      p +
      u_warp *
      q +
      vec2(
        1.7,
        9.2
      )
    );

  r.y =
    fbm(
      p +
      u_warp *
      q +
      vec2(
        8.3,
        2.8
      )
    );


  float field =
    fbm(
      p +
      u_warp *
      r
    );


  /*
   * Creamos filamentos.
   */
  float filamentA =
    abs(
      sin(
        field * 13.0 +
        r.x * 8.0
      )
    );

  filamentA =
    pow(
      1.0 -
      filamentA,
      7.0
    );


  float filamentB =
    abs(
      sin(
        field * 8.0 -
        r.y * 11.0 +
        1.7
      )
    );

  filamentB =
    pow(
      1.0 -
      filamentB,
      5.0
    );


  float energy =
    filamentA +
    filamentB *
    0.55;


  vec3 background =
    vec3(
      0.003,
      0.005,
      0.02
    );


  vec3 electricBlue =
    vec3(
      0.02,
      0.32,
      1.0
    );

  vec3 cyan =
    vec3(
      0.0,
      1.0,
      0.9
    );

  vec3 violet =
    vec3(
      0.55,
      0.05,
      1.0
    );


  vec3 color =
    background;

  color +=
    electricBlue *
    field *
    0.3;

  color +=
    violet *
    r.x *
    0.2;

  color +=
    cyan *
    energy *
    u_energy;


  /*
   * Núcleo blanco de los
   * filamentos más fuertes.
   */
  float core =
    pow(
      clamp(
        energy,
        0.0,
        1.0
      ),
      3.0
    );

  color +=
    vec3(
      0.75,
      0.95,
      1.0
    ) *
    core *
    u_energy *
    0.8;


  /*
   * Viñeta.
   */
  vec2 centered =
    uv - 0.5;

  float vignette =
    1.0 -
    dot(
      centered,
      centered
    ) *
    0.8;

  color *= vignette;


  outColor =
    vec4(
      color,
      1.0
    );
}