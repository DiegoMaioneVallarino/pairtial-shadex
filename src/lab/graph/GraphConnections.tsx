import type {
  ShaderGraph,
} from "../../blocks/block.types";


interface GraphConnectionsProps {
  graph: ShaderGraph;
}


const BLOCK_WIDTH =
  190;

const HEADER_HEIGHT =
  44;

const PORT_HEIGHT =
  28;


export function GraphConnections({
  graph,
}: GraphConnectionsProps) {
  return (
    <svg
      className="shader-connections"
    >
      {graph.connections.map(
        (
          connection,
          index,
        ) => {
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
                sourceX
              ) *
                0.5,
              50,
            );


          const path = [
            `M ${sourceX} ${sourceY}`,
            `C ${sourceX + distance} ${sourceY}`,
            `${targetX - distance} ${targetY}`,
            `${targetX} ${targetY}`,
          ].join(" ");


          return (
            <path
              key={`${connection.from.block}-${connection.to.block}-${index}`}
              d={path}
              className="shader-connection"
            />
          );
        },
      )}
    </svg>
  );
}