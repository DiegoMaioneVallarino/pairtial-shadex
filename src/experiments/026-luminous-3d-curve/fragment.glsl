#version 300 es

precision highp float;

in vec2 v_uv;

out vec4 outColor;


uniform float u_time;
uniform vec2 u_resolution;

uniform float u_radius;
uniform float u_turns;
uniform float u_depth;

uniform float u_thickness;
uniform float u_glow;

uniform float u_perspective;
uniform float u_rotation;

uniform vec3 u_primaryColor;
uniform vec3 u_secondaryColor;

uniform bool u_animate;
uniform int u_curveMode;


const float PI =
  3.14159265359;


/* =========================================================
   ROTATION
   ========================================================= */

mat2 rotate2D(
  float angle
) {
  float s =
    sin(angle);

  float c =
    cos(angle);

  return mat2(
    c, -s,
    s, c
  );
}


/* =========================================================
   PARAMETRIC 3D CURVE
   ========================================================= */

vec3 curve3D(
  float t,
  float time
) {
  float angle =
    t *
    PI *
    2.0 *
    u_turns;


  /*
   * HELIX
   */
  if (
    u_curveMode == 0
  ) {
    return vec3(
      cos(angle) *
      u_radius,

      (
        t - 0.5
      ) *
      1.7,

      sin(angle) *
      u_depth
    );
  }


  /*
   * LISSAJOUS
   */
  if (
    u_curveMode == 1
  ) {
    return vec3(
      sin(angle) *
      u_radius,

      sin(
        angle * 1.5 +
        0.7
      ) *
      0.75,

      cos(
        angle * 0.7
      ) *
      u_depth
    );
  }


  /*
   * ORBIT
   */
  float a =
    angle;


  return vec3(
    (
      cos(a) +
      0.35 *
      cos(a * 3.0)
    ) *
    u_radius,

    (
      sin(a) +
      0.35 *
      sin(a * 3.0)
    ) *
    0.65,

    sin(
      a * 2.0
    ) *
    u_depth *
    0.65
  );
}


/* =========================================================
   3D TRANSFORM
   ========================================================= */

vec3 transformPoint(
  vec3 point,
  float time
) {
  float angleY =
    time *
    u_rotation;


  point.xz =
    rotate2D(
      angleY
    ) *
    point.xz;


  point.yz =
    rotate2D(
      sin(
        time * 0.23
      ) *
      0.25
    ) *
    point.yz;


  return point;
}


/* =========================================================
   PERSPECTIVE
   ========================================================= */

vec2 projectPoint(
  vec3 point,
  out float depthValue
) {
  float cameraDistance =
    u_perspective;


  float z =
    point.z +
    cameraDistance;


  z =
    max(
      z,
      0.15
    );


  float perspectiveScale =
    cameraDistance /
    z;


  depthValue =
    perspectiveScale;


  return
    point.xy *
    perspectiveScale;
}


/* =========================================================
   MAIN
   ========================================================= */

void main() {
  vec2 uv =
    v_uv;


  vec2 p =
    uv * 2.0 - 1.0;


  p.x *=
    u_resolution.x /
    u_resolution.y;


  float time =
    u_animate
      ? u_time
      : 0.0;


  /*
   * =======================================================
   * SHARED LIGHT FIELD
   *
   * Instead of rendering every sample independently,
   * every point contributes energy to the SAME field.
   *
   * When curves approach each other, their energy
   * naturally accumulates.
   * =======================================================
   */

  float lightField =
    0.0;


  float haloField =
    0.0;


  vec3 colorField =
    vec3(0.0);


  float colorWeight =
    0.0;


  float closestDistance =
    1000.0;


  float closestDepth =
    0.0;


  const int SAMPLES =
    96;


  for (
    int i = 0;
    i < SAMPLES;
    i++
  ) {
    float t =
      float(i) /
      float(
        SAMPLES - 1
      );


    vec3 point =
      curve3D(
        t,
        time
      );


    point =
      transformPoint(
        point,
        time
      );


    float depthValue;


    vec2 projected =
      projectPoint(
        point,
        depthValue
      );


    float distanceToPoint =
      length(
        p -
        projected
      );


    /*
     * Perspective affects apparent size.
     */
    float perspectiveThickness =
      u_thickness /
      max(
        depthValue,
        0.4
      );


    /*
     * Narrow energy contribution.
     */
    float energy =
      exp(
        -distanceToPoint *
        perspectiveThickness
      );


    /*
     * Wide energy contribution.
     */
    float halo =
      exp(
        -distanceToPoint *
        perspectiveThickness *
        0.22
      );


    /*
     * Depth normalization.
     */
    float nearFactor =
      clamp(
        (
          depthValue -
          0.55
        ) /
        1.2,
        0.0,
        1.0
      );


    /*
     * Depth-dependent color.
     */
    vec3 sampleColor =
      mix(
        u_secondaryColor,
        u_primaryColor,
        nearFactor
      );


    /*
     * -----------------------------------------------------
     * THE IMPORTANT PART
     *
     * All curve samples accumulate into the same scalar
     * field.
     * -----------------------------------------------------
     */

    lightField +=
      energy *
      (
        0.35 +
        nearFactor *
        0.65
      );


    haloField +=
      halo *
      (
        0.25 +
        nearFactor *
        0.5
      );


    /*
     * Colors also accumulate.
     */
    colorField +=
      sampleColor *
      energy;


    colorWeight +=
      energy;


    /*
     * Track closest point only for subtle depth effects.
     */
    if (
      distanceToPoint <
      closestDistance
    ) {
      closestDistance =
        distanceToPoint;

      closestDepth =
        nearFactor;
    }
  }


  /*
   * =======================================================
   * FIELD NORMALIZATION
   * =======================================================
   */

  vec3 fieldColor =
    colorField /
    max(
      colorWeight,
      0.0001
    );


  /*
   * =======================================================
   * LIQUID FUSION
   *
   * This is where accumulated light stops looking like
   * separate glows and becomes a connected material.
   * =======================================================
   */

  float liquidField =
    1.0 -
    exp(
      -lightField *
      1.35
    );


  /*
   * Sharpen the transition slightly.

   * Low energy disappears.
   * Intersections become solid luminous masses.
   */
  float liquidBody =
    smoothstep(
      0.08,
      0.72,
      liquidField
    );


  /*
   * Softer outer material.
   */
  float softBody =
    smoothstep(
      0.015,
      0.55,
      liquidField
    );


  /*
   * Halo also behaves as one accumulated field.
   */
  float mergedHalo =
    1.0 -
    exp(
      -haloField *
      0.055 *
      u_glow
    );


  /*
   * =======================================================
   * COLOR MIXING AT INTERSECTIONS
   * =======================================================
   */

  /*
   * colorWeight becomes higher when multiple curve
   * segments overlap.

   * This lets us detect fusion regions without noise.
   */
  float overlap =
    smoothstep(
      0.75,
      2.2,
      colorWeight
    );


  /*
   * Intersections become brighter and slightly whiter,
   * like two luminous fluids mixing.
   */
  vec3 mergedColor =
    mix(
      fieldColor,
      vec3(1.0),
      overlap * 0.42
    );


  /*
   * Slight depth coloration remains.
   */
  mergedColor =
    mix(
      mergedColor,
      u_primaryColor,
      closestDepth * 0.08
    );


  /*
   * =======================================================
   * BACKGROUND
   * =======================================================
   */

  vec3 color =
    vec3(
      0.003,
      0.006,
      0.018
    );


  /*
   * Very subtle atmosphere generated by the curve
   * itself — NOT a separate liquid background.
   */
  color +=
    fieldColor *
    mergedHalo *
    0.55;


  /*
   * Soft body.
   */
  color +=
    mergedColor *
    softBody *
    0.22;


  /*
   * Main liquid luminous body.
   */
  color +=
    mergedColor *
    liquidBody *
    0.85;


  /*
   * =======================================================
   * FUSION BLOOM
   *
   * Where multiple pieces overlap, the material emits
   * extra energy.
   * =======================================================
   */

  color +=
    mix(
      fieldColor,
      vec3(1.0),
      0.65
    ) *
    overlap *
    liquidBody *
    0.45;


  /*
   * Thin hot core.
   */
  float hotCore =
    smoothstep(
      0.58,
      0.92,
      liquidField
    );


  hotCore =
    pow(
      hotCore,
      3.0
    );


  color +=
    vec3(1.0) *
    hotCore *
    0.38;


  /*
   * =======================================================
   * TONE MAPPING
   * =======================================================
   */

  color =
    color /
    (
      color +
      vec3(0.78)
    );


  color =
    pow(
      max(
        color,
        vec3(0.0)
      ),
      vec3(0.9)
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