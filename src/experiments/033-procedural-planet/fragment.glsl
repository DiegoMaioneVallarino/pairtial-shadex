#version 300 es

precision highp float;

in vec2 v_uv;

out vec4 outColor;


uniform float u_time;
uniform vec2 u_resolution;

uniform float u_terrainScale;
uniform float u_terrainHeight;
uniform float u_waterLevel;

uniform float u_cloudDensity;
uniform float u_cloudScale;

uniform float u_atmosphere;
uniform float u_rotation;

uniform vec3 u_oceanColor;
uniform vec3 u_landColor;
uniform vec3 u_rockColor;
uniform vec3 u_atmosphereColor;

uniform bool u_animate;


const float PLANET_RADIUS = 1.0;
const float CLOUD_RADIUS = 1.09;

const float MAX_DISTANCE = 10.0;
const float SURFACE_EPSILON = 0.0015;

const int TERRAIN_STEPS = 72;
const int CLOUD_STEPS = 36;


/* =========================================================
   ROTATION
   ========================================================= */

mat2 rotate2D(
  float angle
) {
  float s = sin(angle);
  float c = cos(angle);

  return mat2(
    c, -s,
    s, c
  );
}


/* =========================================================
   HASH
   ========================================================= */

float hash31(
  vec3 p
) {
  p =
    fract(
      p * 0.1031
    );

  p +=
    dot(
      p,
      p.yzx + 33.33
    );

  return
    fract(
      (
        p.x + p.y
      ) * p.z
    );
}


/* =========================================================
   3D NOISE
   ========================================================= */

float noise3D(
  vec3 p
) {
  vec3 i =
    floor(p);

  vec3 f =
    fract(p);

  f =
    f * f *
    (
      3.0 -
      2.0 * f
    );


  float n000 =
    hash31(
      i +
      vec3(0, 0, 0)
    );

  float n100 =
    hash31(
      i +
      vec3(1, 0, 0)
    );

  float n010 =
    hash31(
      i +
      vec3(0, 1, 0)
    );

  float n110 =
    hash31(
      i +
      vec3(1, 1, 0)
    );

  float n001 =
    hash31(
      i +
      vec3(0, 0, 1)
    );

  float n101 =
    hash31(
      i +
      vec3(1, 0, 1)
    );

  float n011 =
    hash31(
      i +
      vec3(0, 1, 1)
    );

  float n111 =
    hash31(
      i +
      vec3(1, 1, 1)
    );


  float x00 =
    mix(
      n000,
      n100,
      f.x
    );

  float x10 =
    mix(
      n010,
      n110,
      f.x
    );

  float x01 =
    mix(
      n001,
      n101,
      f.x
    );

  float x11 =
    mix(
      n011,
      n111,
      f.x
    );


  float y0 =
    mix(
      x00,
      x10,
      f.y
    );

  float y1 =
    mix(
      x01,
      x11,
      f.y
    );


  return
    mix(
      y0,
      y1,
      f.z
    );
}


/* =========================================================
   FBM
   ========================================================= */

float fbm(
  vec3 p
) {
  float value =
    0.0;

  float amplitude =
    0.5;


  for (
    int i = 0;
    i < 5;
    i++
  ) {
    value +=
      noise3D(p) *
      amplitude;

    p =
      p * 2.03 +
      vec3(
        17.1,
        9.2,
        13.7
      );

    amplitude *=
      0.5;
  }


  return value;
}


/* =========================================================
   PLANET ROTATION
   ========================================================= */

vec3 rotatePlanet(
  vec3 p,
  float time
) {
  p.xz =
    rotate2D(
      time *
      u_rotation
    ) *
    p.xz;

  return p;
}


/* =========================================================
   TERRAIN HEIGHT FIELD

   direction → elevation
   ========================================================= */

float terrainHeight(
  vec3 direction
) {
  vec3 p =
    direction *
    u_terrainScale;


  float continents =
    fbm(p);


  float mountains =
    fbm(
      p * 2.7 +
      continents * 2.2
    );


  /*
   * Large continental masses.
   */
  float land =
    smoothstep(
      0.38,
      0.67,
      continents
    );


  /*
   * Mountains appear mainly on land.
   */
  float mountain =
    pow(
      max(
        mountains -
        0.42,
        0.0
      ),
      2.0
    );


  return
    land *
    u_terrainHeight *
    (
      0.32 +
      mountain * 2.8
    );
}


/* =========================================================
   PLANET DISTANCE ESTIMATOR
   ========================================================= */

float planetField(
  vec3 p,
  float time
) {
  vec3 localP =
    rotatePlanet(
      p,
      time
    );


  float radius =
    length(localP);


  vec3 direction =
    localP /
    max(
      radius,
      0.0001
    );


  float elevation =
    terrainHeight(
      direction
    );


  float surfaceRadius =
    max(
      u_waterLevel,
      PLANET_RADIUS +
      elevation
    );


  /*
   * Conservative radial distance estimate.
   */
  return
    (
      radius -
      surfaceRadius
    ) *
    0.72;
}


/* =========================================================
   RAY / SPHERE

   Cheap bounding-volume test.
   ========================================================= */

bool intersectSphere(
  vec3 rayOrigin,
  vec3 rayDirection,
  float radius,
  out float nearDistance,
  out float farDistance
) {
  float b =
    dot(
      rayOrigin,
      rayDirection
    );


  float c =
    dot(
      rayOrigin,
      rayOrigin
    ) -
    radius * radius;


  float h =
    b * b -
    c;


  if (
    h < 0.0
  ) {
    return false;
  }


  h =
    sqrt(h);


  nearDistance =
    -b - h;

  farDistance =
    -b + h;


  return
    farDistance >
    0.0;
}


/* =========================================================
   TERRAIN MARCH
   ========================================================= */

float marchPlanet(
  vec3 rayOrigin,
  vec3 rayDirection,
  float nearDistance,
  float farDistance,
  float time
) {
  float travel =
    max(
      nearDistance,
      0.0
    );


  for (
    int i = 0;
    i < TERRAIN_STEPS;
    i++
  ) {
    vec3 p =
      rayOrigin +
      rayDirection *
      travel;


    float distanceField =
      planetField(
        p,
        time
      );


    if (
      abs(distanceField) <
      SURFACE_EPSILON
    ) {
      return travel;
    }


    travel +=
      max(
        abs(distanceField),
        0.001
      );


    if (
      travel >
      farDistance
    ) {
      break;
    }
  }


  return -1.0;
}


/* =========================================================
   NORMAL
   ========================================================= */

vec3 calculateNormal(
  vec3 p,
  float time
) {
  const float e =
    0.002;


  float center =
    planetField(
      p,
      time
    );


  return
    normalize(
      vec3(
        planetField(
          p +
          vec3(e, 0, 0),
          time
        ) -
        center,

        planetField(
          p +
          vec3(0, e, 0),
          time
        ) -
        center,

        planetField(
          p +
          vec3(0, 0, e),
          time
        ) -
        center
      )
    );
}


/* =========================================================
   SURFACE INFORMATION
   ========================================================= */

vec3 surfaceColor(
  vec3 p,
  vec3 normal,
  float time
) {
  vec3 localP =
    rotatePlanet(
      p,
      time
    );


  float radius =
    length(localP);


  vec3 direction =
    normalize(
      localP
    );


  float terrain =
    PLANET_RADIUS +
    terrainHeight(
      direction
    );


  /*
   * WATER
   */
  if (
    terrain <
    u_waterLevel +
    0.002
  ) {
    float depth =
      clamp(
        (
          u_waterLevel -
          terrain
        ) *
        18.0,
        0.0,
        1.0
      );


    vec3 shallowWater =
      u_oceanColor *
      1.8;


    vec3 deepWater =
      u_oceanColor *
      0.38;


    return
      mix(
        shallowWater,
        deepWater,
        depth
      );
  }


  /*
   * LATITUDE
   */
  float latitude =
    abs(
      direction.y
    );


  /*
   * SLOPE
   */
  float slope =
    1.0 -
    max(
      dot(
        normal,
        direction
      ),
      0.0
    );


  /*
   * Fine material variation.
   */
  float detail =
    noise3D(
      direction *
      80.0
    );


  /*
   * Rock on steep slopes.
   */
  float rock =
    smoothstep(
      0.08,
      0.28,
      slope
    );


  /*
   * Polar snow.
   */
  float snow =
    smoothstep(
      0.72,
      0.9,
      latitude +
      detail * 0.08
    );


  /*
   * Beaches near water level.
   */
  float beach =
    1.0 -
    smoothstep(
      0.004,
      0.025,
      terrain -
      u_waterLevel
    );


  vec3 sandColor =
    vec3(
      0.72,
      0.62,
      0.38
    );


  vec3 snowColor =
    vec3(
      0.82,
      0.9,
      0.95
    );


  vec3 color =
    u_landColor;


  color *=
    mix(
      0.72,
      1.25,
      detail
    );


  color =
    mix(
      color,
      sandColor,
      beach
    );


  color =
    mix(
      color,
      u_rockColor,
      rock
    );


  color =
    mix(
      color,
      snowColor,
      snow
    );


  return color;
}


/* =========================================================
   CLOUD DENSITY

   position → density
   ========================================================= */

float cloudField(
  vec3 p,
  float time
) {
  float radius =
    length(p);


  /*
   * Only evaluate inside atmospheric shell.
   */
  float shell =
    smoothstep(
      PLANET_RADIUS + 0.025,
      PLANET_RADIUS + 0.06,
      radius
    );


  shell *=
    1.0 -
    smoothstep(
      CLOUD_RADIUS - 0.035,
      CLOUD_RADIUS,
      radius
    );


  if (
    shell <= 0.0
  ) {
    return 0.0;
  }


  vec3 direction =
    normalize(p);


  vec3 q =
    direction *
    u_cloudScale;


  /*
   * First FBM creates broad distortion.
   */
  float warp =
    fbm(
      q * 0.75 +
      vec3(
        time * 0.025,
        0.0,
        time * 0.012
      )
    );


  /*
   * Second FBM creates actual clouds.
   */
  float cloud =
    fbm(
      q +
      warp * 2.2 +
      vec3(
        time * 0.04,
        time * 0.015,
        0.0
      )
    );


  cloud =
    smoothstep(
      0.48,
      0.68,
      cloud
    );


  return
    cloud *
    shell *
    u_cloudDensity;
}


/* =========================================================
   CLOUD VOLUME RENDERER
   ========================================================= */

vec4 renderClouds(
  vec3 rayOrigin,
  vec3 rayDirection,
  float startDistance,
  float endDistance,
  float time,
  vec3 lightDirection
) {
  vec3 accumulatedColor =
    vec3(0.0);


  float accumulatedAlpha =
    0.0;


  float lengthRange =
    max(
      endDistance -
      startDistance,
      0.001
    );


  float stepSize =
    lengthRange /
    float(CLOUD_STEPS);


  for (
    int i = 0;
    i < CLOUD_STEPS;
    i++
  ) {
    float fi =
      float(i) +
      0.5;


    float travel =
      startDistance +
      fi * stepSize;


    vec3 p =
      rayOrigin +
      rayDirection *
      travel;


    float density =
      cloudField(
        p,
        time
      );


    if (
      density >
      0.001
    ) {
      /*
       * Directional derivative.

       * One extra density sample approximates
       * how the cloud changes towards the light.
       */
      float epsilon =
        0.025;


      float lightDensity =
        cloudField(
          p +
          lightDirection *
          epsilon,
          time
        );


      float derivative =
        (
          density -
          lightDensity
        ) /
        epsilon;


      float lighting =
        clamp(
          derivative *
          0.45 +
          0.65,
          0.12,
          1.25
        );


      /*
       * Clouds closer to planet receive
       * less ambient light.
       */
      float altitude =
        clamp(
          (
            length(p) -
            PLANET_RADIUS
          ) /
          (
            CLOUD_RADIUS -
            PLANET_RADIUS
          ),
          0.0,
          1.0
        );


      vec3 cloudColor =
        mix(
          vec3(
            0.38,
            0.43,
            0.5
          ),
          vec3(
            1.0,
            0.98,
            0.94
          ),
          lighting
        );


      cloudColor =
        mix(
          cloudColor,
          u_atmosphereColor,
          (
            1.0 -
            altitude
          ) *
          0.12
        );


      float alpha =
        density *
        stepSize *
        6.0;


      alpha =
        clamp(
          alpha,
          0.0,
          1.0
        );


      /*
       * Front-to-back alpha compositing.
       */
      float remaining =
        1.0 -
        accumulatedAlpha;


      accumulatedColor +=
        cloudColor *
        alpha *
        remaining;


      accumulatedAlpha +=
        alpha *
        remaining;


      if (
        accumulatedAlpha >
        0.97
      ) {
        break;
      }
    }
  }


  return
    vec4(
      accumulatedColor,
      accumulatedAlpha
    );
}


/* =========================================================
   STAR FIELD
   ========================================================= */

vec3 starField(
  vec3 rayDirection
) {
  vec3 cell =
    floor(
      rayDirection *
      420.0
    );


  float star =
    hash31(
      cell
    );


  star =
    pow(
      star,
      85.0
    );


  vec3 starColor =
    mix(
      vec3(
        0.45,
        0.62,
        1.0
      ),
      vec3(
        1.0,
        0.78,
        0.5
      ),
      hash31(
        cell +
        8.7
      )
    );


  return
    starColor *
    star *
    2.4;
}


/* =========================================================
   ATMOSPHERE

   Cheap approximation based on ray proximity
   to the planet.
   ========================================================= */

vec3 atmosphereField(
  vec3 rayOrigin,
  vec3 rayDirection
) {
  float projection =
    max(
      dot(
        -rayOrigin,
        rayDirection
      ),
      0.0
    );


  vec3 closestPoint =
    rayOrigin +
    rayDirection *
    projection;


  float closestRadius =
    length(
      closestPoint
    );


  float atmosphereDistance =
    max(
      closestRadius -
      PLANET_RADIUS,
      0.0
    );


  float glow =
    exp(
      -atmosphereDistance *
      18.0
    );


  glow *=
    u_atmosphere;


  return
    u_atmosphereColor *
    glow *
    0.42;
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
      ? u_time
      : 0.0;


  vec3 rayOrigin =
    vec3(
      0.0,
      0.05,
      3.4
    );


  vec3 rayDirection =
    normalize(
      vec3(
        uv,
        -1.45
      )
    );


  vec3 lightDirection =
    normalize(
      vec3(
        -0.7,
        0.65,
        0.45
      )
    );


  /* =======================================================
     BACKGROUND
     ======================================================= */

  vec3 color =
    vec3(
      0.0015,
      0.0025,
      0.008
    );


  color +=
    starField(
      rayDirection
    );


  /*
   * Atmospheric halo is visible even when
   * the ray misses the solid planet.
   */
  color +=
    atmosphereField(
      rayOrigin,
      rayDirection
    );


  /* =======================================================
     BOUNDING SPHERE

     First test the cheap analytic cloud sphere.
     ======================================================= */

  float cloudNear;
  float cloudFar;


  bool hitsAtmosphere =
    intersectSphere(
      rayOrigin,
      rayDirection,
      CLOUD_RADIUS,
      cloudNear,
      cloudFar
    );


  if (
    hitsAtmosphere
  ) {
    cloudNear =
      max(
        cloudNear,
        0.0
      );


    /* =====================================================
       PLANET BOUND
       ===================================================== */

    float planetNear;
    float planetFar;


    bool hitsPlanetBounds =
      intersectSphere(
        rayOrigin,
        rayDirection,
        PLANET_RADIUS +
        u_terrainHeight +
        0.05,
        planetNear,
        planetFar
      );


    float surfaceDistance =
      -1.0;


    if (
      hitsPlanetBounds
    ) {
      surfaceDistance =
        marchPlanet(
          rayOrigin,
          rayDirection,
          max(
            planetNear,
            0.0
          ),
          planetFar,
          time
        );
    }


    /* =====================================================
       PLANET SURFACE
       ===================================================== */

    if (
      surfaceDistance >
      0.0
    ) {
      vec3 surfacePosition =
        rayOrigin +
        rayDirection *
        surfaceDistance;


      vec3 normal =
        calculateNormal(
          surfacePosition,
          time
        );


      vec3 materialColor =
        surfaceColor(
          surfacePosition,
          normal,
          time
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
       * Wrap lighting keeps the dark hemisphere
       * readable.
       */
      float wrap =
        clamp(
          (
            dot(
              normal,
              lightDirection
            ) +
            0.32
          ) /
          1.32,
          0.0,
          1.0
        );


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
          48.0
        );


      /*
       * Detect water again for stronger specular.
       */
      vec3 localP =
        rotatePlanet(
          surfacePosition,
          time
        );


      vec3 direction =
        normalize(
          localP
        );


      float terrain =
        PLANET_RADIUS +
        terrainHeight(
          direction
        );


      float waterMask =
        1.0 -
        step(
          u_waterLevel +
          0.002,
          terrain
        );


      vec3 surfaceLighting =
        materialColor *
        (
          0.08 +
          wrap * 0.78 +
          diffuse * 0.25
        );


      surfaceLighting +=
        vec3(1.0) *
        specular *
        mix(
          0.08,
          0.75,
          waterMask
        );


      /*
       * Fresnel atmosphere around surface.
       */
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


      surfaceLighting +=
        u_atmosphereColor *
        fresnel *
        u_atmosphere *
        0.42;


      color =
        surfaceLighting;
    }


    /* =====================================================
       CLOUDS

       Stop cloud march at planet surface if one
       exists, otherwise march through whole shell.
       ===================================================== */

    float cloudEnd =
      cloudFar;


    if (
      surfaceDistance >
      0.0
    ) {
      cloudEnd =
        min(
          cloudEnd,
          surfaceDistance
        );
    }


    vec4 clouds =
      renderClouds(
        rayOrigin,
        rayDirection,
        cloudNear,
        cloudEnd,
        time,
        lightDirection
      );


    color =
      color *
      (
        1.0 -
        clouds.a
      ) +
      clouds.rgb;
  }


  /* =======================================================
     TONE MAPPING
     ======================================================= */

  color =
    color /
    (
      color +
      vec3(0.72)
    );


  color =
    pow(
      max(
        color,
        vec3(0.0)
      ),
      vec3(0.82)
    );


  /* =======================================================
     VIGNETTE
     ======================================================= */

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
      0.15
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