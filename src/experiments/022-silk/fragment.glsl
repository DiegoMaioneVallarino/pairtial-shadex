#version 300 es

precision highp float;

in vec2 v_uv;

uniform float u_time;
uniform vec2 u_resolution;

uniform float u_folds;
uniform float u_shine;
uniform float u_depth;
uniform float u_speed;

out vec4 outColor;


float surface(
  vec2 p,
  float time
) {
  float foldA =
    sin(
      p.x *
      u_folds +
      sin(
        p.y * 2.0 +
        time
      )
    );

  float foldB =
    sin(
      p.x *
      u_folds *
      0.47 -
      p.y * 2.4 -
      time * 0.6
    );

  float foldC =
    sin(
      p.y * 3.0 +
      p.x * 1.5 +
      time * 0.3
    );

  return
    foldA * 0.55 +
    foldB * 0.3 +
    foldC * 0.15;
}


void main() {
  vec2 p =
    v_uv * 2.0 - 1.0;

  p.x *=
    u_resolution.x /
    u_resolution.y;

  float t =
    u_time *
    u_speed;

  float h =
    surface(
      p,
      t
    ) *
    u_depth;

  float e =
    0.003;

  float hx =
    surface(
      p + vec2(e, 0.0),
      t
    ) *
    u_depth;

  float hy =
    surface(
      p + vec2(0.0, e),
      t
    ) *
    u_depth;


  vec3 normal =
    normalize(
      vec3(
        h - hx,
        h - hy,
        e * 3.0
      )
    );


  vec3 lightDirection =
    normalize(
      vec3(
        -0.7,
        0.5,
        1.0
      )
    );

  vec3 viewDirection =
    vec3(
      0.0,
      0.0,
      1.0
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
   * Satin tiene highlights
   * más largos que un plástico.
   */
  vec3 halfVector =
    normalize(
      lightDirection +
      viewDirection
    );

  float satin =
    pow(
      max(
        dot(
          normal,
          halfVector
        ),
        0.0
      ),
      8.0
    );

  satin *=
    u_shine;


  float secondary =
    pow(
      max(
        dot(
          normal,
          normalize(
            vec3(
              0.7,
              -0.2,
              1.0
            )
          )
        ),
        0.0
      ),
      18.0
    );


  vec3 shadowColor =
    vec3(
      0.025,
      0.015,
      0.07
    );

  vec3 fabricColor =
    vec3(
      0.3,
      0.08,
      0.62
    );

  vec3 highlightColor =
    vec3(
      0.85,
      0.55,
      1.0
    );


  vec3 color =
    mix(
      shadowColor,
      fabricColor,
      0.2 +
      diffuse * 0.8
    );

  color +=
    highlightColor *
    satin;

  color +=
    vec3(
      0.18,
      0.25,
      0.65
    ) *
    secondary *
    0.4;


  outColor =
    vec4(
      color,
      1.0
    );
}