#version 300 es

precision highp float;

in vec2 v_uv;

out vec4 outColor;


uniform float u_time;
uniform vec2 u_resolution;


uniform float u_sphereRadius;
uniform vec3 u_spherePosition;

uniform vec3 u_boxPosition;
uniform vec3 u_boxSize;

uniform float u_smoothness;
uniform float u_subtraction;

uniform float u_rotation;
uniform float u_glow;

uniform vec3 u_primaryColor;
uniform vec3 u_secondaryColor;

uniform bool u_animate;
uniform int u_operation;


const float MAX_DISTANCE =
  30.0;

const float SURFACE_DISTANCE =
  0.001;

const int MAX_STEPS =
  96;


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
   PRIMITIVE SDFs
   ========================================================= */


/*
 * Sphere:
 *
 * distance from point to center
 * minus radius.
 */
float sdfSphere(
  vec3 p,
  float radius
) {
  return
    length(p) -
    radius;
}


/*
 * Box SDF.
 */
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
   BOOLEAN FIELD OPERATIONS
   ========================================================= */

float opUnion(
  float a,
  float b
) {
  return
    min(
      a,
      b
    );
}


float opIntersection(
  float a,
  float b
) {
  return
    max(
      a,
      b
    );
}


float opSubtract(
  float a,
  float b
) {
  return
    max(
      a,
      -b
    );
}


/*
 * Polynomial smooth minimum.
 *
 * Instead of:
 *
 * min(a,b)
 *
 * we smoothly blend the two fields.
 */
float opSmoothUnion(
  float a,
  float b,
  float k
) {
  float safeK =
    max(
      k,
      0.0001
    );


  float h =
    clamp(
      0.5 +
      0.5 *
      (
        b - a
      ) /
      safeK,

      0.0,
      1.0
    );


  return
    mix(
      b,
      a,
      h
    ) -
    safeK *
    h *
    (
      1.0 - h
    );
}


/* =========================================================
   WORLD FIELD

   This is effectively our:

   F(x,y,z,t) -> distance
   ========================================================= */

float mapWorld(
  vec3 p
) {
  float time =
    u_animate
      ? u_time
      : 0.0;


  /*
   * Rotate the coordinate system rather
   * than rotating stored geometry.
   */
  vec3 worldP =
    p;


  worldP.xz =
    rotate2D(
      time *
      u_rotation
    ) *
    worldP.xz;


  /*
   * Sphere coordinate system.
   */
  vec3 sphereP =
    worldP -
    u_spherePosition;


  /*
   * Box coordinate system.
   */
  vec3 boxP =
    worldP -
    u_boxPosition;


  /*
   * Give the box a slightly different
   * rotation.
   */
  boxP.xy =
    rotate2D(
      0.45 +
      time *
      u_rotation *
      0.4
    ) *
    boxP.xy;


  float sphere =
    sdfSphere(
      sphereP,
      u_sphereRadius
    );


  float box =
    sdfBox(
      boxP,
      u_boxSize
    );


  /*
   * -----------------------------------------------
   * BOOLEAN OPERATIONS
   * -----------------------------------------------
   */

  float result;


  if (
    u_operation == 0
  ) {
    result =
      opUnion(
        sphere,
        box
      );
  }

  else if (
    u_operation == 1
  ) {
    result =
      opSmoothUnion(
        sphere,
        box,
        u_smoothness
      );
  }

  else if (
    u_operation == 2
  ) {
    result =
      opIntersection(
        sphere,
        box
      );
  }

  else {
    /*
     * Sphere minus box.
     */
    result =
      opSubtract(
        sphere,
        box
      );
  }


  /*
   * Optional secondary subtraction.

   * This gives us a first taste of
   * procedural sculpting.
   */
  vec3 cutterPosition =
    vec3(
      0.0,
      0.0,
      0.0
    );


  float cutter =
    sdfSphere(
      worldP -
      cutterPosition,

      0.35
    );


  float carved =
    opSubtract(
      result,
      cutter
    );


  result =
    mix(
      result,
      carved,
      u_subtraction
    );


  return result;
}


/* =========================================================
   NORMAL

   Gradient of our distance field.
   ========================================================= */

vec3 calculateNormal(
  vec3 p
) {
  const float epsilon =
    0.001;


  vec2 e =
    vec2(
      epsilon,
      0.0
    );


  float center =
    mapWorld(p);


  return normalize(
    vec3(
      mapWorld(
        p +
        e.xyy
      ) -
      center,

      mapWorld(
        p +
        e.yxy
      ) -
      center,

      mapWorld(
        p +
        e.yyx
      ) -
      center
    )
  );
}


/* =========================================================
   RAY MARCHING
   ========================================================= */

float rayMarch(
  vec3 rayOrigin,
  vec3 rayDirection,

  out float glowAccumulator
) {
  float totalDistance =
    0.0;


  glowAccumulator =
    0.0;


  for (
    int i = 0;
    i < MAX_STEPS;
    i++
  ) {
    vec3 position =
      rayOrigin +
      rayDirection *
      totalDistance;


    float distanceToScene =
      mapWorld(
        position
      );


    /*
     * A little energy accumulates whenever
     * the ray approaches the field.

     * This is NOT a separate background.
     * It comes from the SDF itself.
     */
    glowAccumulator +=
      exp(
        -abs(
          distanceToScene
        ) *
        12.0
      ) *
      0.008;


    if (
      distanceToScene <
      SURFACE_DISTANCE
    ) {
      break;
    }


    totalDistance +=
      distanceToScene;


    if (
      totalDistance >
      MAX_DISTANCE
    ) {
      break;
    }
  }


  return totalDistance;
}


/* =========================================================
   CAMERA
   ========================================================= */

mat3 cameraMatrix(
  vec3 cameraPosition,
  vec3 target
) {
  vec3 forward =
    normalize(
      target -
      cameraPosition
    );


  vec3 right =
    normalize(
      cross(
        forward,
        vec3(
          0.0,
          1.0,
          0.0
        )
      )
    );


  vec3 up =
    cross(
      right,
      forward
    );


  return mat3(
    right,
    up,
    forward
  );
}


/* =========================================================
   LIGHTING
   ========================================================= */

vec3 shadeSurface(
  vec3 position,
  vec3 normal,
  vec3 rayDirection
) {
  vec3 lightDirection =
    normalize(
      vec3(
        -0.6,
        0.8,
        -0.7
      )
    );


  /*
   * Lambert diffuse.
   */
  float diffuse =
    max(
      dot(
        normal,
        lightDirection
      ),
      0.0
    );


  /*
   * Fresnel.
   */
  float fresnel =
    pow(
      1.0 -
      max(
        dot(
          normal,
          -rayDirection
        ),
        0.0
      ),
      3.0
    );


  /*
   * Specular.
   */
  vec3 halfDirection =
    normalize(
      lightDirection -
      rayDirection
    );


  float specular =
    pow(
      max(
        dot(
          normal,
          halfDirection
        ),
        0.0
      ),
      48.0
    );


  /*
   * Position itself controls the material color.
   *
   * Primitive version of a 3D ColorField.
   */
  float colorMix =
    clamp(
      position.y *
      0.45 +
      0.5,

      0.0,
      1.0
    );


  vec3 materialColor =
    mix(
      u_secondaryColor,
      u_primaryColor,
      colorMix
    );


  vec3 color =
    materialColor *
    (
      0.12 +
      diffuse *
      0.88
    );


  color +=
    mix(
      u_primaryColor,
      vec3(1.0),
      0.65
    ) *
    fresnel *
    0.75;


  color +=
    vec3(1.0) *
    specular *
    0.85;


  return color;
}


/* =========================================================
   MAIN
   ========================================================= */

void main() {
  vec2 uv =
    v_uv;


  vec2 p =
    uv * 2.0 -
    1.0;


  p.x *=
    u_resolution.x /
    u_resolution.y;


  /*
   * Camera.
   */
  vec3 cameraPosition =
    vec3(
      0.0,
      0.2,
      -4.2
    );


  vec3 cameraTarget =
    vec3(
      0.0,
      0.0,
      0.0
    );


  mat3 camera =
    cameraMatrix(
      cameraPosition,
      cameraTarget
    );


  vec3 rayDirection =
    camera *
    normalize(
      vec3(
        p,
        1.7
      )
    );


  /*
   * -----------------------------------------------
   * RAY MARCH
   * -----------------------------------------------
   */

  float glowAccumulator;


  float distanceToSurface =
    rayMarch(
      cameraPosition,
      rayDirection,
      glowAccumulator
    );


  /*
   * Dark base.
   */
  vec3 color =
    vec3(
      0.004,
      0.007,
      0.018
    );


  /*
   * -----------------------------------------------
   * HIT
   * -----------------------------------------------
   */

  if (
    distanceToSurface <
    MAX_DISTANCE
  ) {
    vec3 position =
      cameraPosition +
      rayDirection *
      distanceToSurface;


    vec3 normal =
      calculateNormal(
        position
      );


    color =
      shadeSurface(
        position,
        normal,
        rayDirection
      );


    /*
     * Tiny atmospheric depth.
     */
    float fog =
      1.0 -
      exp(
        -distanceToSurface *
        0.035
      );


    color =
      mix(
        color,
        vec3(
          0.006,
          0.008,
          0.025
        ),
        fog
      );
  }


  /*
   * -----------------------------------------------
   * SDF GLOW
   *
   * Glow comes directly from proximity of the ray
   * to our implicit geometry.
   * -----------------------------------------------
   */

  vec3 glowColor =
    mix(
      u_secondaryColor,
      u_primaryColor,
      0.5
    );


  color +=
    glowColor *
    glowAccumulator *
    u_glow;


  /*
   * Tone mapping.
   */
  color =
    color /
    (
      color +
      vec3(0.8)
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
      1.0 -
      uv
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
    0.72 +
    vignette *
    0.28;


  outColor =
    vec4(
      color,
      1.0
    );
}