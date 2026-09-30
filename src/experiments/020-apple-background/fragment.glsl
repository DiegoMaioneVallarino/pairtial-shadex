#version 300 es

precision highp float;


in vec2 v_uv;


uniform float u_time;
uniform vec2 u_resolution;


/*
 * FLOAT PARAMETERS
 */
uniform float u_flow;
uniform float u_glow;
uniform float u_softness;
uniform float u_speed;


/*
 * COLOR PARAMETERS
 */
uniform vec3 u_primaryColor;
uniform vec3 u_secondaryColor;
uniform vec3 u_accentColor;


/*
 * VECTOR PARAMETERS
 */
uniform vec2 u_lightPosition;


/*
 * BOOLEAN PARAMETER
 */
uniform bool u_animate;


/*
 * SELECT PARAMETER
 */
uniform int u_mode;


out vec4 outColor;


/*
 * Soft radial field.
 */
float blob(
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


/*
 * Large soft atmospheric glow.
 */
float atmosphere(
  vec2 p,
  vec2 center,
  float radius
) {
  float distanceToLight =
    length(
      p - center
    );

  return exp(
    -distanceToLight *
    radius
  );
}


void main() {
  vec2 uv =
    v_uv;


  vec2 p =
    uv * 2.0 - 1.0;


  p.x *=
    u_resolution.x /
    u_resolution.y;


  /*
   * Boolean test.
   *
   * animate = false means that
   * shader time becomes zero.
   */
  float t =
    u_animate
      ? u_time * u_speed
      : 0.0;


  /*
   * Animated color centers.
   */
  vec2 centerA =
    vec2(
      -0.55 +
      sin(
        t * 0.7
      ) * 0.18,

      0.25 +
      cos(
        t * 0.5
      ) * 0.15
    );


  vec2 centerB =
    vec2(
      0.5 +
      cos(
        t * 0.45
      ) * 0.22,

      0.15 +
      sin(
        t * 0.65
      ) * 0.18
    );


  vec2 centerC =
    vec2(
      0.05 +
      sin(
        t * 0.3
      ) * 0.35,

      -0.55 +
      cos(
        t * 0.4
      ) * 0.12
    );


  vec2 centerD =
    vec2(
      -0.1 +
      cos(
        t * 0.6
      ) * 0.25,

      0.55 +
      sin(
        t * 0.35
      ) * 0.12
    );


  /*
   * Global coordinate flow.
   */
  vec2 warped =
    p;


  warped.x +=
    sin(
      p.y * 2.2 +
      t
    ) *
    0.12 *
    u_flow;


  warped.y +=
    sin(
      p.x * 1.8 -
      t * 0.7
    ) *
    0.1 *
    u_flow;


  /*
   * Large color fields.
   */
  float a =
    blob(
      warped,
      centerA,
      u_softness
    );


  float b =
    blob(
      warped,
      centerB,
      u_softness * 0.8
    );


  float c =
    blob(
      warped,
      centerC,
      u_softness * 0.65
    );


  float d =
    blob(
      warped,
      centerD,
      u_softness * 0.9
    );


  /*
   * Neutral deep background.
   */
  vec3 baseColor =
    vec3(
      0.012,
      0.016,
      0.045
    );


  /*
   * User controlled colors.
   */
  vec3 color =
    baseColor;


  color +=
    u_primaryColor *
    a *
    0.85;


  color +=
    u_secondaryColor *
    b *
    0.75;


  color +=
    u_accentColor *
    c *
    0.55;


  /*
   * Fourth field is generated
   * from primary + secondary.
   */
  vec3 fourthColor =
    mix(
      u_primaryColor,
      u_secondaryColor,
      0.5
    );


  color +=
    fourthColor *
    d *
    0.4;


  /*
   * Intersection glow.
   */
  float intersection =
    a * b +
    b * c +
    a * d;


  color +=
    mix(
      u_primaryColor,
      vec3(1.0),
      0.55
    ) *
    intersection *
    u_glow;


  /*
   * vec2 test:
   *
   * User can move this light
   * directly from Shadex.
   */
  float lightField =
    atmosphere(
      p,
      u_lightPosition,
      1.7
    );


  color +=
    vec3(
      0.14,
      0.18,
      0.32
    ) *
    lightField *
    u_glow;


  /*
   * SELECT TEST
   *
   * 0 = Soft
   * 1 = Vivid
   * 2 = Dreamy
   */
  if (
    u_mode == 0
  ) {
    /*
     * Soft:
     * compressed contrast,
     * smooth premium look.
     */
    color =
      color /
      (
        color +
        vec3(0.75)
      );


    color *=
      1.15;
  }


  else if (
    u_mode == 1
  ) {
    /*
     * Vivid:
     * stronger saturation
     * and contrast.
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
        vec3(luminance),
        color,
        1.35
      );


    color =
      pow(
        color,
        vec3(0.82)
      );
  }


  else {
    /*
     * Dreamy:
     * lifted blacks +
     * pastel glow.
     */
    color =
      sqrt(
        max(
          color,
          vec3(0.0)
        )
      );


    vec3 dreamTint =
      mix(
        u_secondaryColor,
        u_accentColor,
        0.5
      );


    color +=
      dreamTint *
      intersection *
      0.25;


    color =
      mix(
        color,
        vec3(
          0.12,
          0.14,
          0.22
        ),
        0.08
      );
  }


  /*
   * Soft central atmosphere.
   */
  float centralAtmosphere =
    exp(
      -dot(
        p,
        p
      ) *
      0.65
    );


  color +=
    vec3(
      0.04,
      0.055,
      0.12
    ) *
    centralAtmosphere;


  /*
   * Edge vignette.
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