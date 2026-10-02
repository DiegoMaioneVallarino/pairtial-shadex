import type {
  ExperimentParameter,
} from "../lab/experiments/experiment.types";

import type {
  ShaderBlockDefinition,
  ShaderBlockInstance,
  ShaderGraph,
} from "../blocks/block.types";

import {
  blockDefinitions,
} from "../blocks/blocks";

import {
  resolveBlockOrder,
} from "./DependencyResolver";


export interface CompiledShaderGraph {
  fragmentShader: string;

  parameters: Record<
    string,
    ExperimentParameter
  >;
}


function sanitize(
  value: string,
) {
  return value.replace(
    /[^a-zA-Z0-9_]/g,
    "_",
  );
}


function variableName(
  blockId: string,
  outputName: string,
) {
  return `v_${sanitize(
    blockId,
  )}_${sanitize(
    outputName,
  )}`;
}


function uniformName(
  blockId: string,
  parameterName: string,
) {
  return `${sanitize(
    blockId,
  )}_${sanitize(
    parameterName,
  )}`;
}


function glslUniformType(
  parameter:
    ExperimentParameter,
) {
  switch (
    parameter.type
  ) {
    case "color":
      return "vec3";

    case "vec2":
      return "vec2";

    case "vec3":
      return "vec3";

    case "boolean":
      return "bool";

    case "select":
      return "int";

    default:
      return "float";
  }
}


function findDefinition(
  block:
    ShaderBlockInstance,
): ShaderBlockDefinition {
  const definition =
    blockDefinitions[
      block.type
    ];


  if (!definition) {
    throw new Error(
      `Unknown shader block: ${block.type}`,
    );
  }


  return definition;
}


export function compileShaderGraph(
  graph: ShaderGraph,
): CompiledShaderGraph {
  /*
   * IMPORTANTE:
   *
   * graph.blocks ya no determina
   * el orden de ejecución.
   *
   * El orden se deriva de las
   * conexiones.
   */
  const orderedBlocks =
    resolveBlockOrder(
      graph,
    );


  const parameters:
    Record<
      string,
      ExperimentParameter
    > = {};


  const uniformDeclarations:
    string[] = [];


  const blockCode:
    string[] = [];


  for (
    const block
    of orderedBlocks
  ) {
    const definition =
      findDefinition(
        block,
      );


    const mergedParameters = {
      ...(
        definition.parameters ??
        {}
      ),

      ...(
        block.parameters ??
        {}
      ),
    };


    /*
     * PARAMETERS → UNIFORMS
     */
    for (
      const [
        parameterName,
        parameter,
      ] of Object.entries(
        mergedParameters,
      )
    ) {
      const generatedName =
        uniformName(
          block.id,
          parameterName,
        );


      parameters[
        generatedName
      ] = parameter;


      uniformDeclarations.push(
        `uniform ${glslUniformType(
          parameter,
        )} u_${generatedName};`,
      );
    }


    /*
     * INPUT RESOLUTION
     */
    const input = (
      inputName: string,
    ) => {
      const connection =
        graph.connections.find(
          (candidate) =>
            candidate.to.block ===
              block.id &&
            candidate.to.input ===
              inputName,
        );


      if (!connection) {
        throw new Error(
          `Missing input "${inputName}" on block "${block.id}".`,
        );
      }


      /*
       * Gracias al topological sort,
       * sabemos que esta variable
       * habrá sido declarada antes.
       */
      return variableName(
        connection.from.block,
        connection.from.output,
      );
    };


    /*
     * OUTPUT RESOLUTION
     */
    const output = (
      outputName: string,
    ) =>
      variableName(
        block.id,
        outputName,
      );


    /*
     * UNIFORM RESOLUTION
     */
    const uniform = (
      parameterName: string,
    ) =>
      `u_${uniformName(
        block.id,
        parameterName,
      )}`;


    blockCode.push(
      `
/* =========================================================
   BLOCK: ${definition.name}
   INSTANCE: ${block.id}
   ========================================================= */

${definition.compile({
  id: block.id,
  input,
  output,
  uniform,
})}
`,
    );
  }


  const fragmentShader =
    `#version 300 es

precision highp float;

in vec2 v_uv;

out vec4 outColor;

uniform float u_time;
uniform vec2 u_resolution;

${uniformDeclarations.join(
  "\n",
)}

void main() {

${blockCode.join(
  "\n",
)}

}
`;


  return {
    fragmentShader,
    parameters,
  };
}