#version 300 es

precision highp float;

in vec2 v_uv;

uniform float u_time;
uniform vec2 u_resolution;

uniform float u_distortion;
uniform float u_fresnel;
uniform float u_spectrum;
uniform float u_speed;

out vec4 outColor;


vec3 background(
  vec2 uv
) {
  vec3 dark =
    vec3(
      0.008,
      0.012,
      0.035
    );

  vec3 blue =
    vec3(
      0.04,
      0.15,
      0.5
    );

  float light =
    exp(
      -length(
        uv -
        vec2(
          0.35,
          0.7
        )
      ) *
      2.5
    );

  return
    dark +
    blue * light;
}


void main() {
  vec2 uv = v_uv;

  vec2 p =
    uv * 2.0 - 1.0;

  p.x *=
    u_resolution.x /
    u_resolution.y;

  float t =
    u_time *
    u_speed;


  /*
   * Silueta deformada.
   */
  float deformation =
    sin(
      p.x * 3.0 +
      t
    ) *
    sin(
      p.y * 2.5 -
      t * 0.7
    ) *
    0.07 *
    u_distortion;


  float radius =
    length(p);

  float boundary =
    0.67 +
    deformation;

  float sdf =
    radius -
    boundary;


  vec3 outside =
    background(uv);


  if (sdf > 0.0) {
    outColor =
      vec4(
        outside,
        1.0
      );

    return;
  }


  /*
   * Normal aproximada de esfera
   * deformada.
   */
  vec2 normalizedXY =
    p /
    max(
      boundary,
      0.001
    );

  float d2 =
    min(
      dot(
        normalizedXY,
        normalizedXY
      ),
      1.0
    );

  float z =
    sqrt(
      max(
        0.0,
        1.0 - d2
      )
    );

  vec3 normal =
    normalize(
      vec3(
        normalizedXY,
        z
      )
    );


  /*
   * Refracción falsa.
   */
  vec2 refractedUV =
    uv +
    normal.xy *
    0.08 *
    u_distortion;

  vec3 refracted =
    background(
      refractedUV
    );


  vec3 viewDirection =
    vec3(
      0.0,
      0.0,
      1.0
    );


  float facing =
    max(
      dot(
        normal,
        viewDirection
      ),
      0.0
    );


  float fresnel =
    pow(
      1.0 -
      facing,
      3.0
    ) *
    u_fresnel;


  /*
   * Espectro holográfico.
   */
  float phase =
    facing *
    5.0 +
    normal.x * 2.0 +
    normal.y * 1.5 +
    t * 0.25;


  vec3 spectrum =
    0.5 +
    0.5 *
    cos(
      6.28318 *
      (
        phase +
        vec3(
          0.0,
          0.33,
          0.67
        )
      )
    );


  vec3 color =
    refracted;

  color +=
    spectrum *
    fresnel *
    u_spectrum;


  /*
   * Borde cristalino.
   */
  float edge =
    1.0 -
    smoothstep(
      0.0,
      0.08,
      abs(sdf)
    );

  color +=
    vec3(
      0.65,
      0.85,
      1.0
    ) *
    edge *
    0.45;


  /*
   * Highlight blanco.
   */
  vec3 light =
    normalize(
      vec3(
        -0.6,
        0.8,
        1.0
      )
    );

  float highlight =
    pow(
      max(
        dot(
          normal,
          light
        ),
        0.0
      ),
      32.0
    );

  color +=
    vec3(1.0) *
    highlight;


  outColor =
    vec4(
      color,
      1.0
    );
}