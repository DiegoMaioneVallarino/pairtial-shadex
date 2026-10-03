import type {
  VisualProgram,
} from "../ir/visual-ir.types";


function floatLiteral(
  value: number,
) {
  if (
    Number.isInteger(value)
  ) {
    return `${value}.0`;
  }

  return String(value);
}


function vec3Literal(
  value: [
    number,
    number,
    number,
  ],
) {
  return `vec3(
    ${floatLiteral(value[0])},
    ${floatLiteral(value[1])},
    ${floatLiteral(value[2])}
  )`;
}


function variable(
  id: string,
) {
  return `v_${id.replace(
    /[^a-zA-Z0-9_]/g,
    "_",
  )}`;
}


export function compileVisualProgram(
  program: VisualProgram,
): string {
  const lines: string[] = [];


  for (
    const operation of
    program.operations
  ) {
    const target =
      variable(operation.id);


    switch (
      operation.type
    ) {
     case "coordinates": {
  lines.push(`
vec2 ${target} =
  (v_uv - 0.5) * 2.0;

${target}.x *=
  u_resolution.x /
  u_resolution.y;
`);

  break;
}


      case "sphere-distance": {
        const input =
          variable(
            operation.input,
          );

        lines.push(`
float ${target} =
  length(${input}) -
  ${floatLiteral(
    operation.radius,
  )};
`);

        break;
      }


      case "pulse": {
        lines.push(`
float ${target} =
  sin(
    u_time *
    ${floatLiteral(
      operation.speed,
    )}
  ) *
  ${floatLiteral(
    operation.amount,
  )};
`);

        break;
      }


      case "distort-distance": {
        const input =
          variable(
            operation.input,
          );

        lines.push(`
float ${target} =
  ${input} -
  (
    noise(
      v_coordinates *
      ${floatLiteral(
        operation.scale,
      )} +
      u_time * 0.15
    ) - 0.5
  ) *
  ${floatLiteral(
    operation.amount,
  )};
`);

        break;
      }


      case "body-mask": {
        const input =
          variable(
            operation.input,
          );

        lines.push(`
float ${target} =
  1.0 -
  smoothstep(
    0.0,
    ${floatLiteral(
      operation.softness,
    )},
    ${input}
  );
`);

        break;
      }


      case "emissive": {
        const mask =
          variable(
            operation.mask,
          );

        lines.push(`
vec3 ${target} =
  ${vec3Literal(
    operation.color,
  )} *
  ${mask} *
  ${floatLiteral(
    operation.intensity,
  )};
`);

        break;
      }


      case "glow": {
        const distance =
          variable(
            operation.distance,
          );

        const color =
          variable(
            operation.color,
          );

        lines.push(`
float ${target}_field =
  exp(
    -abs(${distance}) /
    ${floatLiteral(
      operation.radius,
    )}
  );

vec3 ${target} =
  ${color} +
  ${vec3Literal([
    0.25,
    0.55,
    1,
  ])} *
  ${target}_field *
  ${floatLiteral(
    operation.intensity,
  )};
`);

        break;
      }


      case "output": {
        const color =
          variable(
            operation.color,
          );

        lines.push(`
outColor =
  vec4(
    ${color},
    1.0
  );
`);

        break;
      }
    }
  }


  return lines.join("\n");
}