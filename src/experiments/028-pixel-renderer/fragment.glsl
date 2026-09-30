#version 300 es

precision highp float;

in vec2 v_uv;

out vec4 outColor;


uniform float u_time;
uniform vec2 u_resolution;


/* =========================================================
   PIXEL RENDERER
   ========================================================= */

uniform float u_pixelSize;
uniform float u_colorLevels;

uniform float u_outline;
uniform float u_outlineThickness;

uniform float u_dithering;

uniform vec3 u_shadowColor;
uniform vec3 u_outlineColor;

uniform int u_renderMode;


/* =========================================================
   GEOMETRY
   ========================================================= */

uniform float u_sphereRadius;
uniform vec3 u_spherePosition;

uniform vec3 u_boxPosition;
uniform vec3 u_boxSize;

uniform float u_smoothness;
uniform float u_rotation;

uniform vec3 u_primaryColor;
uniform vec3 u_secondaryColor;

uniform bool u_animate;


const float MAX_DISTANCE =
  30.0;

const float SURFACE_DISTANCE =
  0.0015;

const int MAX_STEPS =
  72;


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
   SDF PRIMITIVES
   ========================================================= */

float sdfSphere(
  vec3 p,
  float radius
) {
  return
    length(p) -
    radius;
}


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
   SMOOTH UNION
   ========================================================= */

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
   WORLD
   ========================================================= */

float mapWorld(
  vec3 p
) {
  float time =
    u_animate
      ? u_time
      : 0.0;


  vec3 worldP =
    p;


  worldP.xz =
    rotate2D(
      time *
      u_rotation
    ) *
    worldP.xz;


  vec3 sphereP =
    worldP -
    u_spherePosition;


  vec3 boxP =
    worldP -
    u_boxPosition;


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


  return
    opSmoothUnion(
      sphere,
      box,
      u_smoothness
    );
}


/* =========================================================
   NORMAL
   ========================================================= */

vec3 calculateNormal(
  vec3 p
) {
  const float e =
    0.002;


  return normalize(
    vec3(
      mapWorld(
        p +
        vec3(
          e,
          0.0,
          0.0
        )
      ) -
      mapWorld(
        p -
        vec3(
          e,
          0.0,
          0.0
        )
      ),

      mapWorld(
        p +
        vec3(
          0.0,
          e,
          0.0
        )
      ) -
      mapWorld(
        p -
        vec3(
          0.0,
          e,
          0.0
        )
      ),

      mapWorld(
        p +
        vec3(
          0.0,
          0.0,
          e
        )
      ) -
      mapWorld(
        p -
        vec3(
          0.0,
          0.0,
          e
        )
      )
    )
  );
}


/* =========================================================
   RAY MARCH
   ========================================================= */

float rayMarch(
  vec3 rayOrigin,
  vec3 rayDirection
) {
  float totalDistance =
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


    if (
      distanceToScene <
      SURFACE_DISTANCE
    ) {
      return totalDistance;
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


  return MAX_DISTANCE;
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
   COLOR QUANTIZATION
   ========================================================= */

vec3 quantizeColor(
  vec3 color,
  float levels
) {
  float safeLevels =
    max(
      levels,
      2.0
    );


  return
    floor(
      color *
      safeLevels +
      0.5
    ) /
    safeLevels;
}


/*
 * Quantizing light independently gives us
 * cleaner toon bands than simply quantizing
 * the final RGB value.
 */
float quantizeLight(
  float value,
  float levels
) {
  float safeLevels =
    max(
      levels,
      2.0
    );


  return
    floor(
      value *
      safeLevels
    ) /
    max(
      safeLevels - 1.0,
      1.0
    );
}


/* =========================================================
   BAYER DITHERING

   4x4 ordered matrix.
   ========================================================= */

float bayer4(
  vec2 pixelPosition
) {
  ivec2 p =
    ivec2(
      mod(
        pixelPosition,
        4.0
      )
    );


  int index =
    p.x +
    p.y * 4;


  float value;


  if (index == 0) {
    value = 0.0;
  }

  else if (index == 1) {
    value = 8.0;
  }

  else if (index == 2) {
    value = 2.0;
  }

  else if (index == 3) {
    value = 10.0;
  }

  else if (index == 4) {
    value = 12.0;
  }

  else if (index == 5) {
    value = 4.0;
  }

  else if (index == 6) {
    value = 14.0;
  }

  else if (index == 7) {
    value = 6.0;
  }

  else if (index == 8) {
    value = 3.0;
  }

  else if (index == 9) {
    value = 11.0;
  }

  else if (index == 10) {
    value = 1.0;
  }

  else if (index == 11) {
    value = 9.0;
  }

  else if (index == 12) {
    value = 15.0;
  }

  else if (index == 13) {
    value = 7.0;
  }

  else if (index == 14) {
    value = 13.0;
  }

  else {
    value = 5.0;
  }


  return
    (
      value +
      0.5
    ) /
    16.0;
}


/* =========================================================
   BACKGROUND
   ========================================================= */

vec3 backgroundColor(
  vec2 uv
) {
  float vertical =
    clamp(
      uv.y,
      0.0,
      1.0
    );


  vec3 bottom =
    vec3(
      0.015,
      0.018,
      0.04
    );


  vec3 top =
    vec3(
      0.035,
      0.045,
      0.085
    );


  return
    mix(
      bottom,
      top,
      vertical
    );
}


/* =========================================================
   MAIN
   ========================================================= */

void main() {
  /*
   * =======================================================
   * VIRTUAL PIXEL GRID
   * =======================================================
   */

  float pixelSize =
    max(
      u_pixelSize,
      1.0
    );


  vec2 virtualResolution =
    max(
      floor(
        u_resolution /
        pixelSize
      ),
      vec2(1.0)
    );


  /*
   * Which virtual pixel are we currently in?
   */
  vec2 pixelCoordinate =
    floor(
      v_uv *
      virtualResolution
    );


  /*
   * Sample at the CENTER of the virtual pixel.
   */
  vec2 pixelUV =
    (
      pixelCoordinate +
      0.5
    ) /
    virtualResolution;


  /*
   * From this point onward the 3D renderer itself
   * sees the pixelated coordinate.
   */
  vec2 p =
    pixelUV * 2.0 -
    1.0;


  p.x *=
    u_resolution.x /
    u_resolution.y;


  /* =======================================================
     CAMERA
     ======================================================= */

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


  /* =======================================================
     RENDER BACKGROUND
     ======================================================= */

  vec3 color =
    backgroundColor(
      pixelUV
    );


  /*
   * Quantize background too so the entire image
   * belongs to the same pixel-art world.
   */
  color =
    quantizeColor(
      color,
      max(
        u_colorLevels,
        3.0
      )
    );


  /* =======================================================
     RAY MARCH
     ======================================================= */

  float distanceToSurface =
    rayMarch(
      cameraPosition,
      rayDirection
    );


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


    /* =====================================================
       PIXEL LIGHTING
       ===================================================== */

    vec3 lightDirection =
      normalize(
        vec3(
          -0.65,
          0.85,
          -0.55
        )
      );


    float diffuse =
      max(
        dot(
          normal,
          lightDirection
        ),
        0.0
      );


    /*
     * A second weaker light prevents the shadow
     * side becoming completely flat.
     */
    vec3 fillDirection =
      normalize(
        vec3(
          0.7,
          0.15,
          -0.4
        )
      );


    float fill =
      max(
        dot(
          normal,
          fillDirection
        ),
        0.0
      );


    float lighting =
      0.12 +
      diffuse * 0.78 +
      fill * 0.18;


    lighting =
      clamp(
        lighting,
        0.0,
        1.0
      );


    /* =====================================================
       DITHERING
       ===================================================== */

    float threshold =
      bayer4(
        pixelCoordinate
      );


    float ditherOffset =
      (
        threshold -
        0.5
      ) *
      u_dithering /
      max(
        u_colorLevels,
        2.0
      );


    if (
      u_renderMode == 1 ||
      u_renderMode == 2
    ) {
      lighting +=
        ditherOffset;
    }


    lighting =
      clamp(
        lighting,
        0.0,
        1.0
      );


    /* =====================================================
       TOON LIGHT BANDS
       ===================================================== */

    float quantizedLighting =
      quantizeLight(
        lighting,
        u_colorLevels
      );


    /*
     * Color field across the actual 3D surface.
     */
    float colorMix =
      clamp(
        position.y *
        0.42 +
        position.x *
        0.12 +
        0.5,

        0.0,
        1.0
      );


    vec3 baseColor =
      mix(
        u_secondaryColor,
        u_primaryColor,
        colorMix
      );


    /*
     * Shadow is a real palette color instead of
     * simply multiplying everything toward black.
     */
    vec3 surfaceColor =
      mix(
        u_shadowColor,
        baseColor,
        quantizedLighting
      );


    /* =====================================================
       SPECULAR BAND
       ===================================================== */

    vec3 viewDirection =
      -rayDirection;


    vec3 halfDirection =
      normalize(
        lightDirection +
        viewDirection
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
        32.0
      );


    /*
     * Hard specular threshold = pixel-art highlight.
     */
    float pixelSpecular =
      step(
        0.52,
        specular
      );


    surfaceColor =
      mix(
        surfaceColor,
        vec3(1.0),
        pixelSpecular *
        0.55
      );


    /* =====================================================
       AUTOMATIC SILHOUETTE
       ===================================================== */

    float facing =
      max(
        dot(
          normal,
          viewDirection
        ),
        0.0
      );


    /*
     * Low facing means the surface is almost
     * perpendicular to the camera:
     *
     * that's our silhouette.
     */
    float silhouette =
      1.0 -
      facing;


    float outlineStart =
      mix(
        0.96,
        0.48,
        u_outlineThickness
      );


    float outlineMask =
      smoothstep(
        outlineStart,
        1.0,
        silhouette
      );


    outlineMask *=
      u_outline;


    /*
     * Pixel Toon mode makes the outline hard.
     */
    if (
      u_renderMode == 2
    ) {
      outlineMask =
        step(
          0.18,
          outlineMask
        );
    }


    /* =====================================================
       FINAL QUANTIZATION
       ===================================================== */

    if (
      u_renderMode == 0
    ) {
      surfaceColor =
        quantizeColor(
          surfaceColor,
          u_colorLevels
        );
    }

    else {
      /*
       * Dithered modes still quantize the resulting
       * palette after modifying illumination.
       */
      surfaceColor =
        quantizeColor(
          surfaceColor,
          u_colorLevels
        );
    }


    /*
     * Outline comes AFTER color quantization so it
     * remains a clean palette entry.
     */
    surfaceColor =
      mix(
        surfaceColor,
        u_outlineColor,
        outlineMask
      );


    color =
      surfaceColor;
  }


  /* =======================================================
     FINAL OUTPUT

     No antialiasing is intentionally performed.
     ======================================================= */

  outColor =
    vec4(
      color,
      1.0
    );
}