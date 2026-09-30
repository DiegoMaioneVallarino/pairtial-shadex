#version 300 es

precision highp float;


in vec2 v_uv;

out vec4 outColor;


uniform float u_time;
uniform vec2 u_resolution;


/*
 * FUNCTION FIELD
 */
uniform float u_amplitude;
uniform float u_frequency;


/*
 * LIGHT FIELD
 */
uniform float u_thickness;
uniform float u_intensity;


/*
 * WARP FIELD
 */
uniform float u_warp;


/*
 * ATMOSPHERE
 */
uniform float u_atmosphere;


/*
 * ANIMATION
 */
uniform float u_speed;
uniform bool u_animate;


/*
 * COLOR FIELD
 */
uniform vec3 u_primaryColor;
uniform vec3 u_secondaryColor;
uniform vec3 u_accentColor;


/*
 * FIELD POSITION
 */
uniform vec2 u_fieldOrigin;


/*
 * FUNCTION SELECTION
 */
uniform int u_functionMode;


/* =========================================================
   HASH / NOISE
   ========================================================= */

float hash21(
  vec2 p
) {
  p =
    fract(
      p *
      vec2(
        123.34,
        456.21
      )
    );

  p +=
    dot(
      p,
      p + 45.32
    );

  return fract(
    p.x * p.y
  );
}


float noise(
  vec2 p
) {
  vec2 i =
    floor(p);

  vec2 f =
    fract(p);


  float a =
    hash21(
      i
    );

  float b =
    hash21(
      i +
      vec2(1.0, 0.0)
    );

  float c =
    hash21(
      i +
      vec2(0.0, 1.0)
    );

  float d =
    hash21(
      i +
      vec2(1.0, 1.0)
    );


  vec2 u =
    f * f *
    (
      3.0 -
      2.0 * f
    );


  return mix(
    mix(
      a,
      b,
      u.x
    ),

    mix(
      c,
      d,
      u.x
    ),

    u.y
  );
}


/* =========================================================
   1. FUNCTION FIELD

   This is the mathematical information.

   Eventually Glass should be capable of supplying
   this function/data instead of hardcoding it here.
   ========================================================= */

float functionField(
  float x,
  float time
) {
  /*
   * SINE
   */
  if (
    u_functionMode == 0
  ) {
    return
      sin(
        x *
        u_frequency +
        time
      ) *
      u_amplitude;
  }


  /*
   * DOUBLE WAVE
   */
  if (
    u_functionMode == 1
  ) {
    float waveA =
      sin(
        x *
        u_frequency +
        time
      );

    float waveB =
      sin(
        x *
        u_frequency *
        2.13 -
        time * 0.7
      );

    return
      (
        waveA * 0.7 +
        waveB * 0.3
      ) *
      u_amplitude;
  }


  /*
   * PULSE
   */
  float wave =
    sin(
      x *
      u_frequency +
      time
    );

  return
    sign(wave) *
    pow(
      abs(wave),
      0.35
    ) *
    u_amplitude;
}


/* =========================================================
   2. WARP FIELD

   Geometry itself is not modified.

   Instead we modify the coordinate system in which
   the function is evaluated.
   ========================================================= */

vec2 warpField(
  vec2 p,
  float time
) {
  float n1 =
    noise(
      p * 1.7 +
      vec2(
        time * 0.15,
        0.0
      )
    );


  float n2 =
    noise(
      p * 2.3 +
      vec2(
        4.7,
        time * 0.12
      )
    );


  vec2 warpVector =
    vec2(
      n1 - 0.5,
      n2 - 0.5
    );


  return
    p +
    warpVector *
    u_warp;
}


/* =========================================================
   3. LIGHT FIELD

   This is the Aurora principle.

   We don't draw the function.

   We calculate distance from every pixel
   to the mathematical function.

   distance -> light
   ========================================================= */

float lightField(
  vec2 p,
  float functionY
) {
  float distanceToFunction =
    abs(
      p.y -
      functionY
    );


  float light =
    exp(
      -distanceToFunction *
      u_thickness
    );


  return
    light *
    u_intensity;
}


/* =========================================================
   SECONDARY LIGHT FIELD

   A wider and softer halo surrounding the curve.
   ========================================================= */

float haloField(
  vec2 p,
  float functionY
) {
  float distanceToFunction =
    abs(
      p.y -
      functionY
    );


  return
    exp(
      -distanceToFunction *
      (
        u_thickness *
        0.22
      )
    );
}


/* =========================================================
   4. MESH COLOR FIELD

   Inspired by experiment 021.

   Instead of assigning a color directly to the
   function, space itself contains color.
   ========================================================= */

float colorNode(
  vec2 p,
  vec2 position,
  float spread
) {
  vec2 delta =
    p - position;


  return exp(
    -dot(
      delta,
      delta
    ) *
    spread
  );
}


vec3 meshColorField(
  vec2 p,
  float time
) {
  vec2 nodeA =
    vec2(
      -0.75 +
      sin(
        time * 0.31
      ) * 0.2,

      0.35 +
      cos(
        time * 0.27
      ) * 0.18
    );


  vec2 nodeB =
    vec2(
      0.65 +
      cos(
        time * 0.23
      ) * 0.2,

      0.25 +
      sin(
        time * 0.37
      ) * 0.15
    );


  vec2 nodeC =
    vec2(
      sin(
        time * 0.19
      ) * 0.35,

      -0.65 +
      cos(
        time * 0.29
      ) * 0.15
    );


  float a =
    colorNode(
      p,
      nodeA,
      1.5
    );


  float b =
    colorNode(
      p,
      nodeB,
      1.4
    );


  float c =
    colorNode(
      p,
      nodeC,
      1.3
    );


  vec3 color =
    vec3(0.0);


  color +=
    u_primaryColor *
    a;


  color +=
    u_secondaryColor *
    b;


  color +=
    u_accentColor *
    c;


  float total =
    max(
      a + b + c,
      0.001
    );


  return
    color /
    total;
}


/* =========================================================
   5. APPLE-LIKE ATMOSPHERE FIELD

   Large soft fields that exist independently from
   the mathematical function.
   ========================================================= */

float atmosphereBlob(
  vec2 p,
  vec2 center,
  float radius
) {
  vec2 delta =
    p - center;


  return exp(
    -dot(
      delta,
      delta
    ) *
    radius
  );
}


vec3 atmosphereField(
  vec2 p,
  float time
) {
  vec2 centerA =
    vec2(
      -0.55 +
      sin(
        time * 0.17
      ) * 0.25,

      0.15
    );


  vec2 centerB =
    vec2(
      0.55 +
      cos(
        time * 0.14
      ) * 0.2,

      -0.15
    );


  vec2 centerC =
    vec2(
      sin(
        time * 0.11
      ) * 0.3,

      0.6
    );


  float a =
    atmosphereBlob(
      p,
      centerA,
      1.3
    );


  float b =
    atmosphereBlob(
      p,
      centerB,
      1.1
    );


  float c =
    atmosphereBlob(
      p,
      centerC,
      1.5
    );


  vec3 atmosphere =
    vec3(0.0);


  atmosphere +=
    u_primaryColor *
    a *
    0.22;


  atmosphere +=
    u_secondaryColor *
    b *
    0.18;


  atmosphere +=
    u_accentColor *
    c *
    0.12;


  return
    atmosphere *
    u_atmosphere;
}


/* =========================================================
   MAIN COMPOSITION
   ========================================================= */

void main() {
  vec2 uv =
    v_uv;


  vec2 p =
    uv * 2.0 - 1.0;


  p.x *=
    u_resolution.x /
    u_resolution.y;


  p -=
    u_fieldOrigin;


  float time =
    u_animate
      ? u_time * u_speed
      : 0.0;


  /*
   * -------------------------------------------------------
   * GEOMETRY
   * -------------------------------------------------------
   */

  vec2 warpedPosition =
    warpField(
      p,
      time
    );


  float functionY =
    functionField(
      warpedPosition.x,
      time
    );


  /*
   * -------------------------------------------------------
   * LIGHT
   * -------------------------------------------------------
   */

  float coreLight =
    lightField(
      warpedPosition,
      functionY
    );


  float halo =
    haloField(
      warpedPosition,
      functionY
    );


  /*
   * -------------------------------------------------------
   * COLOR
   * -------------------------------------------------------
   */

  vec3 fieldColor =
    meshColorField(
      warpedPosition,
      time
    );


  /*
   * -------------------------------------------------------
   * ATMOSPHERE
   * -------------------------------------------------------
   */

  vec3 atmosphere =
    atmosphereField(
      p,
      time
    );


  /*
   * -------------------------------------------------------
   * COMPOSITION
   * -------------------------------------------------------
   */

  vec3 background =
    vec3(
      0.006,
      0.009,
      0.025
    );


  vec3 color =
    background;


  /*
   * Apple-like background field.
   */
  color +=
    atmosphere;


  /*
   * Wide aurora halo.
   */
  color +=
    fieldColor *
    halo *
    0.32;


  /*
   * Main luminous function.
   */
  color +=
    fieldColor *
    coreLight;


  /*
   * Hot luminous core.
   */
  float hotCore =
    pow(
      max(
        coreLight /
        max(
          u_intensity,
          0.001
        ),
        0.0
      ),
      5.0
    );


  color +=
    vec3(1.0) *
    hotCore *
    0.65;


  /*
   * Interaction between atmospheric field
   * and luminous field.
   */
  color +=
    atmosphere *
    halo *
    0.8;


  /*
   * Mild tone mapping.
   */
  color =
    color /
    (
      color +
      vec3(0.85)
    );


  /*
   * Vignette.
   */
  vec2 edge =
    uv *
    (
      1.0 - uv
    );


  float vignette =
    pow(
      max(
        edge.x *
        edge.y *
        16.0,
        0.0
      ),
      0.16
    );


  color *=
    0.72 +
    vignette *
    0.28;


  outColor =
    vec4(
      color,
      1.0
    );
}