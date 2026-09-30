#version 300 es

precision highp float;

in vec2 v_uv;

uniform float u_time;
uniform vec2 u_resolution;

uniform float u_scale;
uniform float u_speed;
uniform float u_contrast;

out vec4 outColor;


// Pseudo-random determinista.
//
// La misma coordenada siempre
// produce el mismo número.
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


// Value noise 2D.
float noise(vec2 p) {
  vec2 cell =
    floor(p);

  vec2 local =
    fract(p);

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

  // Curva suave de interpolación.
  vec2 smoothLocal =
    local *
    local *
    (3.0 - 2.0 * local);

  return mix(
    mix(
      a,
      b,
      smoothLocal.x
    ),
    mix(
      c,
      d,
      smoothLocal.x
    ),
    smoothLocal.y
  );
}


void main() {
  vec2 uv = v_uv;

  vec2 p =
    uv * u_scale;

  p.x *=
    u_resolution.x /
    u_resolution.y;

  // Desplazamos el espacio
  // con el tiempo.
  p.y +=
    u_time * u_speed;

  float n =
    noise(p);

  // Contraste alrededor de 0.5.
  n =
    (n - 0.5) *
    u_contrast +
    0.5;

  n = clamp(
    n,
    0.0,
    1.0
  );

  vec3 darkColor =
    vec3(
      0.015,
      0.02,
      0.07
    );

  vec3 blueColor =
    vec3(
      0.08,
      0.25,
      0.95
    );

  vec3 violetColor =
    vec3(
      0.75,
      0.16,
      1.0
    );

  vec3 color =
    mix(
      darkColor,
      blueColor,
      n
    );

  color =
    mix(
      color,
      violetColor,
      pow(n, 3.0)
    );

  outColor =
    vec4(
      color,
      1.0
    );
}