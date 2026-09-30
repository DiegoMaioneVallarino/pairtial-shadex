#version 300 es

precision highp float;

in vec2 v_uv;

uniform float u_time;
uniform vec2 u_resolution;

uniform float u_radius;
uniform float u_refraction;
uniform float u_fresnel;
uniform float u_glow;

out vec4 outColor;


vec3 background(vec2 uv) {
  float waveA =
    sin(
      uv.x * 8.0 +
      uv.y * 3.0
    );

  float waveB =
    sin(
      uv.y * 10.0 -
      uv.x * 4.0
    );

  float pattern =
    waveA * waveB;

  vec3 blue =
    vec3(
      0.03,
      0.12,
      0.55
    );

  vec3 violet =
    vec3(
      0.48,
      0.08,
      0.75
    );

  vec3 pink =
    vec3(
      0.9,
      0.16,
      0.5
    );

  vec3 color =
    mix(
      blue,
      violet,
      uv.y
    );

  color =
    mix(
      color,
      pink,
      pattern * 0.25 + 0.25
    );

  return color;
}


void main() {
  vec2 uv = v_uv;

  vec2 p =
    uv * 2.0 - 1.0;

  p.x *=
    u_resolution.x /
    u_resolution.y;

  vec2 sphereXY =
    p / max(u_radius, 0.001);

  float d2 =
    dot(sphereXY, sphereXY);

  /*
   * Fondo normal.
   */
  vec3 baseBackground =
    background(
      uv +
      vec2(
        u_time * 0.01,
        0.0
      )
    );

  if (d2 > 1.0) {
    outColor =
      vec4(
        baseBackground,
        1.0
      );

    return;
  }

  float z =
    sqrt(
      1.0 - d2
    );

  vec3 normal =
    normalize(
      vec3(
        sphereXY,
        z
      )
    );


  /*
   * Distorsión/refracción falsa.
   *
   * La normal desplaza las
   * coordenadas del fondo.
   */
  vec2 distortedUV =
    uv +
    normal.xy *
    u_refraction;


  vec3 refractedColor =
    background(
      distortedUV +
      vec2(
        u_time * 0.01,
        0.0
      )
    );


  /*
   * Fresnel.
   */
  vec3 viewDirection =
    vec3(
      0.0,
      0.0,
      1.0
    );

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

  fresnel *=
    u_fresnel;


  /*
   * Highlight superior.
   */
  vec3 lightDirection =
    normalize(
      vec3(
        -0.7,
        0.8,
        1.0
      )
    );

  float highlight =
    pow(
      max(
        dot(
          normal,
          lightDirection
        ),
        0.0
      ),
      24.0
    );


  /*
   * Color del borde del vidrio.
   */
  vec3 glassEdge =
    vec3(
      0.45,
      0.85,
      1.0
    );


  vec3 color =
    refractedColor;

  color +=
    glassEdge *
    fresnel *
    u_glow;

  color +=
    vec3(1.0) *
    highlight *
    0.7;


  /*
   * Ligera absorción interior.
   */
  color *=
    mix(
      0.82,
      1.0,
      fresnel
    );


  outColor =
    vec4(
      color,
      1.0
    );
}