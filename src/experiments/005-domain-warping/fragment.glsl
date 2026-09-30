#version 300 es

precision highp float;

in vec2 v_uv;

uniform float u_time;
uniform vec2 u_resolution;

uniform float u_scale;
uniform float u_speed;
uniform float u_warp;
uniform float u_detail;
uniform float u_flow;

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

  float a = random(cell);
  float b = random(
    cell + vec2(1.0, 0.0)
  );
  float c = random(
    cell + vec2(0.0, 1.0)
  );
  float d = random(
    cell + vec2(1.0, 1.0)
  );

  vec2 u =
    local *
    local *
    (3.0 - 2.0 * local);

  return mix(
    mix(a, b, u.x),
    mix(c, d, u.x),
    u.y
  );
}


float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;

  for (int i = 0; i < 6; i++) {
    value +=
      amplitude *
      noise(p);

    p *= 2.02;

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

  /*
   * Primer campo de deformación.
   */
  vec2 q;

  q.x = fbm(
    p +
    vec2(
      0.0,
      time
    )
  );

  q.y = fbm(
    p +
    vec2(
      5.2,
      1.3
    ) +
    time * 0.7
  );


  /*
   * Segundo campo.
   *
   * Aquí usamos q para modificar
   * dónde consultamos el siguiente
   * FBM.
   */
  vec2 r;

  r.x = fbm(
    p +
    u_warp * q +
    vec2(
      1.7,
      9.2
    ) +
    time * u_flow
  );

  r.y = fbm(
    p +
    u_warp * q +
    vec2(
      8.3,
      2.8
    ) -
    time * u_flow
  );


  /*
   * Campo final.
   */
  float f = fbm(
    p +
    u_detail * r
  );


  /*
   * Paleta.
   */
  vec3 deep =
    vec3(
      0.005,
      0.008,
      0.035
    );

  vec3 electricBlue =
    vec3(
      0.02,
      0.22,
      1.0
    );

  vec3 violet =
    vec3(
      0.48,
      0.08,
      1.0
    );

  vec3 magenta =
    vec3(
      1.0,
      0.08,
      0.55
    );

  vec3 cyan =
    vec3(
      0.1,
      0.9,
      1.0
    );


  /*
   * El propio campo controla
   * los colores.
   */
  vec3 color =
    mix(
      deep,
      electricBlue,
      smoothstep(
        0.15,
        0.65,
        f
      )
    );

  color = mix(
    color,
    violet,
    clamp(
      length(q) * 0.55,
      0.0,
      1.0
    )
  );

  color = mix(
    color,
    magenta,
    clamp(
      r.x * r.y,
      0.0,
      1.0
    )
  );


  /*
   * Creamos líneas brillantes
   * en zonas concretas del campo.
   */
  float ridge =
    1.0 -
    abs(
      f * 2.0 - 1.0
    );

  ridge =
    pow(
      ridge,
      5.0
    );

  color +=
    cyan *
    ridge *
    0.35;


  /*
   * Vignette suave.
   */
  vec2 centered =
    v_uv - 0.5;

  float vignette =
    1.0 -
    dot(
      centered,
      centered
    ) * 0.8;

  color *= vignette;


  outColor =
    vec4(
      color,
      1.0
    );
}