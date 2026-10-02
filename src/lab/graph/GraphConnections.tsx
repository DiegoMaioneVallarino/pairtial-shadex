import type {
  ShaderConnection,
  ShaderGraph,
} from "../../blocks/block.types";


interface GraphConnectionsProps {
  graph: ShaderGraph;

  selectedConnectionIndex:
    number | null;

  onSelectConnection: (
    index: number,
  ) => void;
}


const BLOCK_WIDTH =
  190;

const HEADER_HEIGHT =
  44;

const PORT_HEIGHT =
  28;


export function GraphConnections({
  graph,
  selectedConnectionIndex,
  onSelectConnection,
}: GraphConnectionsProps) {
  function createPath(
    connection:
      ShaderConnection,
  ) {
    const source =
      graph.blocks.find(
        (block) =>
          block.id ===
          connection.from.block,
      );


    const target =
      graph.blocks.find(
        (block) =>
          block.id ===
          connection.to.block,
      );


    if (
      !source ||
      !target
    ) {
      return null;
    }


    const sourceX =
      (
        source.position?.x ??
        0
      ) +
      BLOCK_WIDTH;


    const sourceY =
      (
        source.position?.y ??
        0
      ) +
      HEADER_HEIGHT +
      PORT_HEIGHT;


    const targetX =
      target.position?.x ??
      0;


    const targetY =
      (
        target.position?.y ??
        0
      ) +
      HEADER_HEIGHT +
      PORT_HEIGHT;


    const distance =
      Math.max(
        Math.abs(
          targetX -
            sourceX,
        ) * 0.5,

        50,
      );


    return [
      `M ${sourceX} ${sourceY}`,

      `C ${sourceX + distance} ${sourceY}`,

      `${targetX - distance} ${targetY}`,

      `${targetX} ${targetY}`,
    ].join(" ");
  }


  return (
    <svg
      className="shader-connections"
    >
      {graph.connections.map(
        (
          connection,
          index,
        ) => {
          const path =
            createPath(
              connection,
            );


          if (!path) {
            return null;
          }


          const selected =
            selectedConnectionIndex ===
            index;


          return (
            <g
              key={`${connection.from.block}-${connection.from.output}-${connection.to.block}-${connection.to.input}-${index}`}
            >
              {/*
               * Hit area invisible.
               *
               * Hace mucho más sencillo
               * seleccionar un cable.
               */}
              <path
                d={path}
                className="shader-connection-hit-area"
                onPointerDown={(
                  event,
                ) => {
                  event.stopPropagation();

                  onSelectConnection(
                    index,
                  );
                }}
              />


              <path
                d={path}
                className={[
                  "shader-connection",

                  selected
                    ? "shader-connection--selected"
                    : "",
                ]
                  .filter(
                    Boolean,
                  )
                  .join(" ")}
              />
            </g>
          );
        },
      )}
    </svg>
  );
}