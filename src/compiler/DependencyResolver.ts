import type {
  ShaderBlockInstance,
  ShaderGraph,
} from "../blocks/block.types";


/**
 * Devuelve los bloques en orden topológico:
 *
 * dependencia → consumidor
 *
 * Ejemplo:
 *
 * UV → Wave → Gradient → Output
 *
 * aunque graph.blocks esté almacenado como:
 *
 * Output, Gradient, UV, Wave
 *
 * el resultado será:
 *
 * UV, Wave, Gradient, Output
 */
export function resolveBlockOrder(
  graph: ShaderGraph,
): ShaderBlockInstance[] {
  const blockMap =
    new Map<
      string,
      ShaderBlockInstance
    >();


  for (
    const block
    of graph.blocks
  ) {
    if (
      blockMap.has(
        block.id,
      )
    ) {
      throw new Error(
        `Duplicate block id "${block.id}".`,
      );
    }


    blockMap.set(
      block.id,
      block,
    );
  }


  /*
   * Número de dependencias que
   * tiene cada bloque.
   */
  const indegree =
    new Map<
      string,
      number
    >();


  /*
   * dependency -> consumers
   *
   * Si:
   *
   * A → B
   *
   * entonces:
   *
   * adjacency[A] = [B]
   */
  const adjacency =
    new Map<
      string,
      Set<string>
    >();


  for (
    const block
    of graph.blocks
  ) {
    indegree.set(
      block.id,
      0,
    );

    adjacency.set(
      block.id,
      new Set(),
    );
  }


  /*
   * Construimos el grafo de
   * dependencias.
   */
  for (
    const connection
    of graph.connections
  ) {
    const from =
      connection.from.block;

    const to =
      connection.to.block;


    if (
      !blockMap.has(from)
    ) {
      throw new Error(
        `Connection references missing source block "${from}".`,
      );
    }


    if (
      !blockMap.has(to)
    ) {
      throw new Error(
        `Connection references missing target block "${to}".`,
      );
    }


    /*
     * Un bloque conectado consigo mismo
     * ya constituye un ciclo.
     */
    if (
      from === to
    ) {
      throw new Error(
        `Graph cycle detected: "${from}" connects to itself.`,
      );
    }


    const consumers =
      adjacency.get(from)!;


    /*
     * Evitamos contar dos veces la
     * misma dependencia entre A y B.
     *
     * A puede alimentar varios inputs
     * de B, pero B sigue dependiendo
     * conceptualmente de A una vez.
     */
    if (
      !consumers.has(to)
    ) {
      consumers.add(to);

      indegree.set(
        to,
        (
          indegree.get(to) ??
          0
        ) + 1,
      );
    }
  }


  /*
   * Kahn's algorithm.
   *
   * Empezamos por todos los bloques
   * que no dependen de ningún otro.
   */
  const queue:
    string[] = [];


  for (
    const block
    of graph.blocks
  ) {
    if (
      indegree.get(
        block.id,
      ) === 0
    ) {
      queue.push(
        block.id,
      );
    }
  }


  const result:
    ShaderBlockInstance[] = [];


  while (
    queue.length > 0
  ) {
    const blockId =
      queue.shift()!;


    const block =
      blockMap.get(
        blockId,
      )!;


    result.push(
      block,
    );


    const consumers =
      adjacency.get(
        blockId,
      ) ??
      new Set<string>();


    for (
      const consumerId
      of consumers
    ) {
      const nextDegree =
        (
          indegree.get(
            consumerId,
          ) ??
          0
        ) - 1;


      indegree.set(
        consumerId,
        nextDegree,
      );


      if (
        nextDegree === 0
      ) {
        queue.push(
          consumerId,
        );
      }
    }
  }


  /*
   * Si no pudimos procesar todos
   * los bloques, necesariamente
   * existe al menos un ciclo.
   */
  if (
    result.length !==
    graph.blocks.length
  ) {
    const cyclicBlocks =
      graph.blocks
        .filter(
          (block) =>
            (
              indegree.get(
                block.id,
              ) ??
              0
            ) > 0,
        )
        .map(
          (block) =>
            block.id,
        );


    throw new Error(
      `Graph cycle detected involving: ${cyclicBlocks.join(
        ", ",
      )}.`,
    );
  }


  return result;
}