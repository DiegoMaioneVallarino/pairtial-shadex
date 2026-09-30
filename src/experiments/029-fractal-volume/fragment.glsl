#version 300 es

precision highp float;

in vec2 v_uv;

out vec4 outColor;


uniform float u_time;
uniform vec2 u_resolution;

uniform float u_speed;
uniform float u_scale;
uniform float u_offset;

uniform float u_density;
uniform float u_brightness;
uniform float u_stepSize;

uniform vec3 u_primaryColor;
uniform vec3 u_secondaryColor;

uniform bool u_animate;


/* =========================================================
   FRACTAL FIELD

   p → density/energy

   No geometry.
   No triangles.
   No particles.
   ========================================================= */

float fractalField(
  vec3 p
) {
  float previousLength =
    0.0;


  float energy =
    0.0;


  const int ITERATIONS =
    9;


  for (
    int i = 0;
    i < ITERATIONS;
    i++
  ) {
    /*
     * Fold space.
     */
    p =
      abs(p);


    /*
     * Inversion.

     * dot(p,p) = squared distance
     * from origin.
     */
    float radiusSquared =
      max(
        dot(
          p,
          p
        ),
        0.001
      );


    p =
      p *
      u_scale /
      radiusSquared;


    /*
     * Translation after inversion.
     */
    p -=
      vec3(
        u_offset,
        u_offset * 0.72,
        u_offset * 0.58
      );


    float currentLength =
      length(p);


    /*
     * Measure how violently the fractal
     * changes between iterations.
     */
    energy +=
      abs(
        currentLength -
        previousLength
      );


    previousLength =
      currentLength;
  }


  /*
   * Convert iterative activity into
   * usable volumetric density.
   */
  return
    energy *
    0.045;
}


/* =========================================================
   MAIN
   ========================================================= */

void main() {
  vec2 uv =
    v_uv * 2.0 -
    1.0;


  uv.x *=
    u_resolution.x /
    u_resolution.y;


  float time =
    u_animate
      ? u_time * u_speed
      : 0.0;


  /*
   * Slightly curved camera trajectory.
   */
  vec3 rayOrigin =
    vec3(
      sin(
        time * 0.17
      ) *
      0.28,

      cos(
        time * 0.13
      ) *
      0.22,

      time
    );


  vec3 rayDirection =
    normalize(
      vec3(
        uv,
        0.75
      )
    );


  /*
   * Accumulated volumetric energy.
   */
  vec3 accumulatedColor =
    vec3(0.0);


  float accumulatedDensity =
    0.0;


  float travel =
    0.0;


  const int STEPS =
    72;


  for (
    int i = 0;
    i < STEPS;
    i++
  ) {
    /*
     * Position along ray.
     */
    vec3 p =
      rayOrigin +
      rayDirection *
      travel;


    /*
     * Infinite repetition along Z.
     */
    p.z =
      fract(
        p.z
      ) -
      0.5;


    /*
     * Slight spatial repetition in XY
     * creates a larger apparent universe.
     */
    p.xy =
      mod(
        p.xy +
        2.0,
        4.0
      ) -
      2.0;


    /*
     * Evaluate mathematical field.
     */
    float field =
      fractalField(
        p
      );


    /*
     * Convert field into density.
     */
    float density =
      exp(
        -field *
        1.6
      );


    density =
      pow(
        density,
        2.2
      );


    density *=
      u_density;


    /*
     * Color evolves with depth and field
     * intensity.
     */
    float colorPhase =
      sin(
        travel * 0.65 +
        field * 2.0
      ) *
      0.5 +
      0.5;


    vec3 fieldColor =
      mix(
        u_secondaryColor,
        u_primaryColor,
        colorPhase
      );


    /*
     * Bright center in dense regions.
     */
    fieldColor =
      mix(
        fieldColor,
        vec3(1.0),
        density *
        0.12
      );


    /*
     * Front-to-back-ish energy accumulation.
     */
    float contribution =
      density *
      u_stepSize;


    accumulatedColor +=
      fieldColor *
      contribution *
      u_brightness;


    accumulatedDensity +=
      contribution;


    /*
     * Advance through volume.
     */
    travel +=
      u_stepSize;


    /*
     * Cheap early exit.

     * Once enough energy has accumulated,
     * later samples barely matter.
     */
    if (
      accumulatedDensity >
      2.5
    ) {
      break;
    }
  }


  /*
   * Deep background.
   */
  vec3 background =
    vec3(
      0.002,
      0.004,
      0.012
    );


  vec3 color =
    background +
    accumulatedColor;


  /*
   * Filmic compression.
   */
  color =
    color /
    (
      color +
      vec3(0.72)
    );


  /*
   * Slight contrast.
   */
  color =
    pow(
      max(
        color,
        vec3(0.0)
      ),
      vec3(0.82)
    );


  /*
   * Vignette.
   */
  vec2 edge =
    v_uv *
    (
      1.0 -
      v_uv
    );


  float vignette =
    pow(
      max(
        edge.x *
        edge.y *
        16.0,
        0.0
      ),
      0.18
    );


  color *=
    0.68 +
    vignette *
    0.32;


  outColor =
    vec4(
      color,
      1.0
    );
}