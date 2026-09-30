#version 300 es

precision highp float;

in vec2 v_uv;

out vec4 outColor;


uniform float u_time;
uniform vec2 u_resolution;

uniform float u_speed;

uniform float u_pathAmplitude;
uniform float u_pathFrequency;

uniform float u_tunnelSize;
uniform float u_fold;

uniform float u_fractalScale;
uniform float u_fractalDetail;

uniform float u_glow;
uniform float u_exposure;

uniform vec3 u_primaryColor;
uniform vec3 u_secondaryColor;
uniform vec3 u_accentColor;

uniform bool u_animate;


const float MAX_DISTANCE =
  55.0;

const int MAX_STEPS =
  88;


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
   HASH
   ========================================================= */

float hash21(
  vec2 p
) {
  vec3 p3 =
    fract(
      vec3(
        p.x,
        p.y,
        p.x
      ) *
      0.1031
    );


  p3 +=
    dot(
      p3,
      p3.yzx +
      33.33
    );


  return
    fract(
      (
        p3.x +
        p3.y
      ) *
      p3.z
    );
}


/* =========================================================
   PATH

   Mathematical trajectory through the world.
   ========================================================= */

vec2 path(
  float z
) {
  float f =
    u_pathFrequency;


  float x =
    sin(
      z * f
    ) *
    u_pathAmplitude;


  x +=
    sin(
      z *
      f *
      0.37 +
      1.7
    ) *
    u_pathAmplitude *
    0.35;


  float y =
    cos(
      z *
      f *
      0.71
    ) *
    u_pathAmplitude *
    0.55;


  y +=
    sin(
      z *
      f *
      0.23
    ) *
    u_pathAmplitude *
    0.25;


  return
    vec2(
      x,
      y
    );
}


/* =========================================================
   BOX SDF
   ========================================================= */

float sdfBox(
  vec3 p,
  vec3 size
) {
  vec3 q =
    abs(p) -
    size;


  return
    length(
      max(
        q,
        0.0
      )
    ) +
    min(
      max(
        q.x,
        max(
          q.y,
          q.z
        )
      ),
      0.0
    );
}


/* =========================================================
   FRACTAL PATTERN

   This is NOT the geometry.

   It is a procedural energy/material field.
   ========================================================= */

float fractalPattern(
  vec2 p,
  float time
) {
  /*
   * Repeat pattern.
   */
  p =
    mod(
      p * 0.55 +
      4.0,
      8.0
    ) -
    4.0;


  float energy =
    0.0;


  float previous =
    0.0;


  const int ITERATIONS =
    6;


  for (
    int i = 0;
    i < ITERATIONS;
    i++
  ) {
    /*
     * Fold.
     */
    p =
      abs(p);


    /*
     * Chaotic inversion.
     */
    float denominator =
      clamp(
        abs(
          p.x *
          p.y
        ),
        0.28,
        2.4
      );


    p =
      p /
      denominator;


    p *=
      u_fractalScale;


    p -=
      vec2(
        1.15,
        0.82
      );


    /*
     * Slowly rotate each fractal level.
     */
    p =
      rotate2D(
        0.11 +
        time *
        0.012
      ) *
      p;


    float current =
      length(p);


    energy +=
      abs(
        current -
        previous
      );


    previous =
      current;
  }


  /*
   * Turn chaotic variation into thin
   * luminous structures.
   */
  float pattern =
    exp(
      -energy *
      0.75 /
      max(
        u_fractalDetail,
        0.05
      )
    );


  return
    pattern;
}


/* =========================================================
   TRIPLANAR PROCEDURAL FIELD
   ========================================================= */

float triplanarFractal(
  vec3 p,
  float time
) {
  float xy =
    fractalPattern(
      p.xy,
      time
    );


  float xz =
    fractalPattern(
      p.xz,
      time +
      1.7
    );


  float yz =
    fractalPattern(
      p.yz,
      time +
      3.1
    );


  return
    (
      xy +
      xz +
      yz
    ) /
    3.0;
}


/* =========================================================
   WORLD FIELD

   Returns:

   x = distance
   y = material region
   ========================================================= */

vec2 mapWorld(
  vec3 worldP,
  float time
) {
  /*
   * -----------------------------------------------
   * PATH WARP
   *
   * Straight world:
   *
   *     |
   *     |
   *     |
   *
   * becomes:
   *
   *     ╭─
   *    ╱
   *   ╯
   *  ╱
   * -----------------------------------------------
   */

  vec3 p =
    worldP;


  p.xy -=
    path(
      p.z
    );


  /*
   * Rotate cross section progressively along Z.
   */
  p.xy =
    rotate2D(
      p.z * 0.045 +
      time * 0.04
    ) *
    p.xy;


  /*
   * Mirror-fold lower/upper space.
   */
  float side =
    sign(
      p.y
    );


  p.y =
    abs(
      p.y
    );


  /*
   * Repeat world along Z.
   */
  p.z =
    mod(
      p.z +
      6.0,
      12.0
    ) -
    6.0;


  /*
   * -----------------------------------------------
   * FRACTAL SPACE FOLDING
   * -----------------------------------------------
   */

  vec3 folded =
    p;


  for (
    int i = 0;
    i < 4;
    i++
  ) {
    folded =
      abs(
        folded
      ) -
      u_fold;


    folded.xz =
      rotate2D(
        radians(
          side *
          -38.0
        )
      ) *
      folded.xz;


    folded.yz =
      rotate2D(
        radians(
          67.0
        )
      ) *
      folded.yz;
  }


  /*
   * Large inverted box.

   * Negative box creates the interior
   * of our tunnel/cavern.
   */
  float tunnel =
    -sdfBox(
      folded,
      vec3(
        u_tunnelSize,
        u_tunnelSize,
        5.8
      )
    );


  /*
   * Repeated floating structural block.
   */
  vec3 blockP =
    p;


  blockP.z =
    mod(
      blockP.z +
      3.0,
      6.0
    ) -
    3.0;


  blockP.x -=
    u_tunnelSize *
    0.62;


  blockP.xy =
    rotate2D(
      time * 0.17 +
      blockP.z * 0.12
    ) *
    blockP.xy;


  float block =
    sdfBox(
      blockP,
      vec3(
        0.38,
        0.75,
        0.85
      )
    );


  /*
   * Which field is closest?
   */
  float distanceField =
    min(
      tunnel,
      block
    );


  float material =
    block < tunnel
      ? 1.0
      : 0.0;


  return
    vec2(
      distanceField,
      material
    );
}


/* =========================================================
   CAMERA
   ========================================================= */

mat3 lookAt(
  vec3 direction,
  vec3 up
) {
  vec3 forward =
    normalize(
      direction
    );


  vec3 right =
    normalize(
      cross(
        forward,
        normalize(
          up
        )
      )
    );


  vec3 correctedUp =
    cross(
      right,
      forward
    );


  return
    mat3(
      right,
      correctedUp,
      forward
    );
}


/* =========================================================
   HYBRID FIELD MARCHER

   Not just:

   find surface

   and not just:

   integrate volume

   We march using the SDF while accumulating
   light around the field.
   ========================================================= */

vec3 marchField(
  vec3 rayOrigin,
  vec3 rayDirection,
  float time
) {
  float travel =
    0.0;


  vec3 accumulatedLight =
    vec3(0.0);


  for (
    int i = 0;
    i < MAX_STEPS;
    i++
  ) {
    vec3 p =
      rayOrigin +
      rayDirection *
      travel;


    vec2 scene =
      mapWorld(
        p,
        time
      );


    float distanceField =
      scene.x;


    float material =
      scene.y;


    /*
     * -----------------------------------------------
     * FRACTAL ENERGY
     * -----------------------------------------------
     */

    float pattern =
      triplanarFractal(
        p * 0.72,
        time
      );


    /*
     * -----------------------------------------------
     * DISTANCE → LIGHT
     *
     * Close to implicit geometry:
     * high energy.
     * -----------------------------------------------
     */

    float proximity =
      1.0 /
      (
        1.0 +
        abs(
          distanceField
        ) *
        abs(
          distanceField
        ) *
        12.0
      );


    /*
     * Make the fractal pattern visible mainly
     * near our geometry.
     */
    float emission =
      proximity *
      (
        0.12 +
        pattern *
        2.4
      );


    /*
     * -----------------------------------------------
     * COLOR FIELD
     * -----------------------------------------------
     */

    float phase =
      sin(
        p.z * 0.14 +
        pattern * 5.0 +
        time * 0.2
      ) *
      0.5 +
      0.5;


    vec3 tunnelColor =
      mix(
        u_secondaryColor,
        u_primaryColor,
        phase
      );


    tunnelColor =
      mix(
        tunnelColor,
        u_accentColor,
        pattern *
        pattern *
        0.55
      );


    /*
     * Blocks have a hotter material.
     */
    vec3 blockColor =
      mix(
        u_primaryColor,
        vec3(1.0),
        0.42 +
        pattern *
        0.35
      );


    vec3 fieldColor =
      mix(
        tunnelColor,
        blockColor,
        material
      );


    /*
     * -----------------------------------------------
     * DEPTH ATTENUATION
     * -----------------------------------------------
     */

    float depthFade =
      exp(
        -travel *
        travel *
        0.00065
      );


    /*
     * Prevent near-camera explosion.
     */
    float nearFade =
      smoothstep(
        0.8,
        4.0,
        travel
      );


    accumulatedLight +=
      fieldColor *
      emission *
      depthFade *
      nearFade *
      0.035 *
      u_glow;


    /*
     * -----------------------------------------------
     * MARCH STEP
     *
     * We exploit the distance field instead of
     * blindly taking equal volume steps.
     * -----------------------------------------------
     */

    float jitter =
      hash21(
        gl_FragCoord.xy +
        float(i) * 13.71 +
        time
      );


    float stepDistance =
      max(
        0.018,
        abs(
          distanceField
        ) *
        0.55
      );


    stepDistance *=
      mix(
        0.88,
        1.08,
        jitter
      );


    travel +=
      stepDistance;


    if (
      travel >
      MAX_DISTANCE
    ) {
      break;
    }


    /*
     * Cheap early exit when already extremely bright.
     */
    if (
      dot(
        accumulatedLight,
        vec3(
          0.333
        )
      ) >
      7.0
    ) {
      break;
    }
  }


  return
    accumulatedLight;
}


/* =========================================================
   MAIN
   ========================================================= */

void main() {
  vec2 uv =
    (
      gl_FragCoord.xy -
      u_resolution.xy *
      0.5
    ) /
    u_resolution.y;


  float time =
    u_animate
      ? u_time * u_speed
      : 0.0;


  /*
   * Camera moves down Z.
   */
  float cameraZ =
    time *
    4.5;


  vec2 cameraPath =
    path(
      cameraZ
    );


  vec3 cameraPosition =
    vec3(
      cameraPath,
      cameraZ
    );


  /*
   * Look some distance ahead on the SAME
   * mathematical path.
   */
  float lookDistance =
    5.5;


  vec2 targetPath =
    path(
      cameraZ +
      lookDistance
    );


  vec3 targetPosition =
    vec3(
      targetPath,
      cameraZ +
      lookDistance
    );


  mat3 camera =
    lookAt(
      targetPosition -
      cameraPosition,
      vec3(
        0.0,
        1.0,
        0.0
      )
    );


  vec3 rayDirection =
    camera *
    normalize(
      vec3(
        uv,
        0.72
      )
    );


  /*
   * -----------------------------------------------
   * FIELD RENDER
   * -----------------------------------------------
   */

  vec3 color =
    marchField(
      cameraPosition,
      rayDirection,
      time
    );


  /*
   * Very subtle deep-space base.
   */
  color +=
    vec3(
      0.0015,
      0.002,
      0.008
    );


  /*
   * Exposure.
   */
  color *=
    u_exposure;


  /*
   * White-hot energy where multiple luminous
   * contributions overlap.
   */
  float luminance =
    dot(
      color,
      vec3(
        0.2126,
        0.7152,
        0.0722
      )
    );


  color =
    mix(
      color,
      vec3(1.0),
      smoothstep(
        1.0,
        3.0,
        luminance
      ) *
      0.28
    );


  /*
   * Filmic-ish compression.
   */
  color =
    color /
    (
      color +
      vec3(0.72)
    );


  /*
   * Gamma/contrast.
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
  vec2 screenUV =
    v_uv;


  vec2 edge =
    screenUV *
    (
      1.0 -
      screenUV
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
    0.58 +
    vignette *
    0.42;


  outColor =
    vec4(
      color,
      1.0
    );
}