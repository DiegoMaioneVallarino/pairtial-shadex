#version 300 es

precision highp float;

in vec2 v_uv;

uniform float u_time;
uniform vec2 u_resolution;

uniform float u_waves;
uniform float u_intensity;
uniform float u_spread;
uniform float u_speed;

out vec4 outColor;


float hash(float n) {
  return fract(
    sin(n) *
    43758.5453123
  );
}


float noise(float x) {
  float i = floor(x);
  float f = fract(x);

  f =
    f * f *
    (3.0 - 2.0 * f);

  return mix(
    hash(i),
    hash(i + 1.0),
    f
  );
}


void main() {
  vec2 uv = v_uv;

  vec2 p =
    uv * 2.0 - 1.0;

  p.x *=
    u_resolution.x /
    u_resolution.y;

  float time =
    u_time * u_speed;

  vec3 background =
    mix(
      vec3(
        0.005,
        0.008,
        0.03
      ),
      vec3(
        0.015,
        0.025,
        0.075
      ),
      uv.y
    );

  vec3 aurora =
    vec3(0.0);

  for (int i = 0; i < 5; i++) {
    float fi =
      float(i);

    float frequency =
      u_waves +
      fi * 0.7;

    float wave =
      sin(
        p.x * frequency +
        time * (0.8 + fi * 0.13)
      );

    wave +=
      sin(
        p.x * frequency * 0.43 -
        time * 0.7 +
        fi
      ) * 0.5;

    wave +=
      (
        noise(
          p.x * 2.0 +
          time +
          fi * 10.0
        ) -
        0.5
      ) * 0.6;

    float center =
      0.15 +
      wave * 0.18 +
      fi * 0.045;

    float distanceToRibbon =
      abs(
        p.y - center
      );

    float ribbon =
      exp(
        -distanceToRibbon *
        u_spread *
        (
          1.0 +
          fi * 0.15
        )
      );

    vec3 ribbonColor =
      mix(
        vec3(
          0.05,
          1.0,
          0.55
        ),
        vec3(
          0.35,
          0.2,
          1.0
        ),
        fi / 4.0
      );

    aurora +=
      ribbonColor *
      ribbon *
      (
        0.35 +
        0.65 *
        noise(
          p.x * 3.0 +
          time +
          fi
        )
      );
  }

  /*
   * Fade vertical para evitar
   * que parezca simplemente
   * una colección de líneas.
   */
  float atmosphere =
    smoothstep(
      -0.7,
      0.4,
      p.y
    ) *
    (
      1.0 -
      smoothstep(
        0.3,
        1.0,
        p.y
      )
    );

  aurora *=
    atmosphere *
    u_intensity;

  vec3 color =
    background +
    aurora;

  outColor =
    vec4(color, 1.0);
}