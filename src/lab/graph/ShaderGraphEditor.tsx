import {
  useEffect,
  useRef,
  useState,
} from "react";

import type {
  PointerEvent as ReactPointerEvent,
} from "react";

import type {
  ShaderGraph,
  ShaderValueType,
} from "../../blocks/block.types";

import {
  blockDefinitions,
} from "../../blocks/blocks";

import {
  ShaderBlock,
} from "./ShaderBlock";

import {
  GraphConnections,
} from "./GraphConnections";

import "./ShaderGraphEditor.css";


interface ShaderGraphEditorProps {
  graph: ShaderGraph;

  onChange: (
    graph: ShaderGraph,
  ) => void;

  selectedBlockId:
    string | null;

  onSelectBlock: (
    blockId: string | null,
  ) => void;
}


interface DragState {
  blockId: string;

  offsetX: number;
  offsetY: number;
}


interface ConnectionDragState {
  blockId: string;

  outputName: string;

  outputType: ShaderValueType;

  startX: number;
  startY: number;

  currentX: number;
  currentY: number;
}


export function ShaderGraphEditor({
  graph,
  onChange,
  selectedBlockId,
  onSelectBlock,
}: ShaderGraphEditorProps) {
  const canvasRef =
    useRef<HTMLDivElement | null>(
      null,
    );





  const [
    connectionDrag,
    setConnectionDrag,
  ] = useState<
    ConnectionDragState | null
  >(null);

const [
  selectedConnectionIndex,
  setSelectedConnectionIndex,
] = useState<
  number | null
>(null);
  const dragState =
    useRef<
      DragState | null
    >(null);


  function getCanvasPoint(
    clientX: number,
    clientY: number,
  ) {
    const canvas =
      canvasRef.current;


    if (!canvas) {
      return {
        x: 0,
        y: 0,
      };
    }


    const rect =
      canvas.getBoundingClientRect();


    return {
      x:
        clientX -
        rect.left +
        canvas.scrollLeft,

      y:
        clientY -
        rect.top +
        canvas.scrollTop,
    };
  }


  function addBlock(
    type: string,
  ) {
    const definition =
      blockDefinitions[type];


    if (!definition) {
      return;
    }


    let number =
      graph.blocks.filter(
        (block) =>
          block.type === type,
      ).length + 1;


    let id =
      `${type}${number}`;


    while (
      graph.blocks.some(
        (block) =>
          block.id === id,
      )
    ) {
      number += 1;

      id =
        `${type}${number}`;
    }


    const newBlock = {
      id,
      type,

      position: {
        x:
          120 +
          graph.blocks.length *
            35,

        y:
          120 +
          graph.blocks.length *
            25,
      },
    };


   onChange({
  ...graph,

  blocks: [
    ...graph.blocks,
    newBlock,
  ],
});


setSelectedConnectionIndex(
  null,
);


onSelectBlock(
  id,
);
  }


  useEffect(() => {
  function handleKeyDown(
    event: KeyboardEvent,
  ) {
    if (
      event.key !==
        "Delete" &&
      event.key !==
        "Backspace"
    ) {
      return;
    }


    /*
     * Nunca borrar elementos del
     * grafo mientras el usuario está
     * escribiendo/editando un control.
     */
    const target =
      event.target;


    if (
      target instanceof
        HTMLInputElement ||
      target instanceof
        HTMLTextAreaElement ||
      target instanceof
        HTMLSelectElement ||
      (
        target instanceof
          HTMLElement &&
        target.isContentEditable
      )
    ) {
      return;
    }


    /*
     * DELETE CONNECTION
     */
    if (
      selectedConnectionIndex !==
      null
    ) {
      event.preventDefault();


      onChange({
        ...graph,

        connections:
          graph.connections.filter(
            (
              _,
              index,
            ) =>
              index !==
              selectedConnectionIndex,
          ),
      });


      setSelectedConnectionIndex(
        null,
      );


      return;
    }


    /*
     * DELETE BLOCK
     */
    if (
      selectedBlockId
    ) {
      event.preventDefault();


      const blockId =
        selectedBlockId;


      onChange({
        ...graph,

        blocks:
          graph.blocks.filter(
            (block) =>
              block.id !==
              blockId,
          ),

        /*
         * Todas las conexiones que
         * entraban o salían del nodo
         * también desaparecen.
         */
        connections:
          graph.connections.filter(
            (connection) =>
              connection.from.block !==
                blockId &&
              connection.to.block !==
                blockId,
          ),
      });


      onSelectBlock(
        null,
      );


      setSelectedConnectionIndex(
        null,
      );
    }
  }


  window.addEventListener(
    "keydown",
    handleKeyDown,
  );


  return () => {
    window.removeEventListener(
      "keydown",
      handleKeyDown,
    );
  };
}, [
  graph,
  onChange,
  onSelectBlock,
  selectedBlockId,
  selectedConnectionIndex,
]);

  function startDragging(
    blockId: string,
    event:
      ReactPointerEvent<HTMLDivElement>,
  ) {
    const block =
      graph.blocks.find(
        (candidate) =>
          candidate.id ===
          blockId,
      );


    if (!block) {
      return;
    }


    const point =
      getCanvasPoint(
        event.clientX,
        event.clientY,
      );


    dragState.current = {
      blockId,

      offsetX:
        point.x -
        (
          block.position?.x ??
          0
        ),

      offsetY:
        point.y -
        (
          block.position?.y ??
          0
        ),
    };


    event.currentTarget
      .setPointerCapture(
        event.pointerId,
      );
  }


  function startConnection(
    blockId: string,
    outputName: string,
    outputType: ShaderValueType,
    event:
      ReactPointerEvent<HTMLSpanElement>,
  ) {
    dragState.current =
      null;


    const socketRect =
      event.currentTarget
        .getBoundingClientRect();


    const point =
      getCanvasPoint(
        socketRect.left +
          socketRect.width /
            2,

        socketRect.top +
          socketRect.height /
            2,
      );


    setConnectionDrag({
      blockId,
      outputName,
      outputType,

      startX:
        point.x,

      startY:
        point.y,

      currentX:
        point.x,

      currentY:
        point.y,
    });
  }


  function finishConnection(
    blockId: string,
    inputName: string,
    inputType: ShaderValueType,
    event:
      ReactPointerEvent<HTMLSpanElement>,
  ) {
    event.stopPropagation();


    if (!connectionDrag) {
      return;
    }


    if (
      connectionDrag.blockId ===
      blockId
    ) {
      setConnectionDrag(
        null,
      );

      return;
    }


    if (
      connectionDrag.outputType !==
      inputType
    ) {
      setConnectionDrag(
        null,
      );

      return;
    }


    /*
     * Un input solo puede recibir
     * una conexión.
     *
     * Si ya tenía una, la
     * sustituimos.
     */
    const connectionsWithoutInput =
      graph.connections.filter(
        (connection) =>
          !(
            connection.to.block ===
              blockId &&
            connection.to.input ===
              inputName
          ),
      );


    onChange({
      ...graph,

      connections: [
        ...connectionsWithoutInput,

        {
          from: {
            block:
              connectionDrag.blockId,

            output:
              connectionDrag.outputName,
          },

          to: {
            block:
              blockId,

            input:
              inputName,
          },
        },
      ],
    });


    setConnectionDrag(
      null,
    );
  }


  function handlePointerMove(
    event:
      ReactPointerEvent<HTMLDivElement>,
  ) {
    /*
     * CONNECTION DRAG
     */
    if (connectionDrag) {
      const point =
        getCanvasPoint(
          event.clientX,
          event.clientY,
        );


      setConnectionDrag(
        (current) => {
          if (!current) {
            return null;
          }


          return {
            ...current,

            currentX:
              point.x,

            currentY:
              point.y,
          };
        },
      );


      return;
    }


    /*
     * BLOCK DRAG
     */
    const drag =
      dragState.current;


    if (!drag) {
      return;
    }


    const point =
      getCanvasPoint(
        event.clientX,
        event.clientY,
      );


    const nextX =
      Math.max(
        0,
        point.x -
          drag.offsetX,
      );


    const nextY =
      Math.max(
        0,
        point.y -
          drag.offsetY,
      );


    onChange({
      ...graph,

      blocks:
        graph.blocks.map(
          (block) => {
            if (
              block.id !==
              drag.blockId
            ) {
              return block;
            }


            return {
              ...block,

              position: {
                x: nextX,
                y: nextY,
              },
            };
          },
        ),
    });
  }


  function handleCanvasPointerUp(
    event:
      ReactPointerEvent<HTMLDivElement>,
  ) {
    dragState.current =
      null;


    if (!connectionDrag) {
      return;
    }


    /*
     * Detectamos qué elemento
     * existe debajo del cursor.
     *
     * Esto hace la conexión más
     * robusta que depender solamente
     * del onPointerUp del socket.
     */
    const element =
      document.elementFromPoint(
        event.clientX,
        event.clientY,
      );


    const socket =
      element?.closest(
        '[data-port-direction="input"]',
      ) as HTMLElement | null;


    if (!socket) {
      setConnectionDrag(
        null,
      );

      return;
    }


    const blockId =
      socket.dataset.blockId;

    const inputName =
      socket.dataset.portName;

    const inputType =
      socket.dataset.portType as
        | ShaderValueType
        | undefined;


    if (
      !blockId ||
      !inputName ||
      !inputType
    ) {
      setConnectionDrag(
        null,
      );

      return;
    }


    if (
      blockId ===
      connectionDrag.blockId ||
      inputType !==
        connectionDrag.outputType
    ) {
      setConnectionDrag(
        null,
      );

      return;
    }


    const connectionsWithoutInput =
      graph.connections.filter(
        (connection) =>
          !(
            connection.to.block ===
              blockId &&
            connection.to.input ===
              inputName
          ),
      );


    onChange({
      ...graph,

      connections: [
        ...connectionsWithoutInput,

        {
          from: {
            block:
              connectionDrag.blockId,

            output:
              connectionDrag.outputName,
          },

          to: {
            block:
              blockId,

            input:
              inputName,
          },
        },
      ],
    });


    setConnectionDrag(
      null,
    );
  }


  function cancelInteraction() {
    dragState.current =
      null;

    setConnectionDrag(
      null,
    );
  }


  return (
    <div
      className="shader-graph-editor"
    >
      <aside
        className="shader-block-library"
      >
        <div
          className="shader-block-library__header"
        >
          Blocks
        </div>


        <div
          className="shader-block-library__list"
        >
          {Object.values(
            blockDefinitions,
          ).map(
            (definition) => (
              <button
                key={
                  definition.type
                }
                className="shader-block-library__item"
                onClick={() =>
                  addBlock(
                    definition.type,
                  )
                }
              >
                <span>
                  +
                </span>

                {definition.name}
              </button>
            ),
          )}
        </div>
      </aside>


      <div
        ref={canvasRef}
        className="shader-graph-canvas"
        onPointerMove={
          handlePointerMove
        }
        onPointerUp={
          handleCanvasPointerUp
        }
        onPointerCancel={
          cancelInteraction
        }
       onPointerDown={() => {
  onSelectBlock(
    null,
  );

  setSelectedConnectionIndex(
    null,
  );
}}
      >
        <div
          className="shader-graph-grid"
        />


        <GraphConnections
  graph={graph}
  selectedConnectionIndex={
    selectedConnectionIndex
  }
  onSelectConnection={(
    index,
  ) => {
    onSelectBlock(
      null,
    );

    setSelectedConnectionIndex(
      index,
    );
  }}
/>


        {connectionDrag && (
          <svg
            className="shader-connections shader-connections--temporary"
          >
            <path
              className="shader-connection shader-connection--temporary"
              d={`
                M
                ${connectionDrag.startX}
                ${connectionDrag.startY}

                C
                ${connectionDrag.startX + 80}
                ${connectionDrag.startY},

                ${connectionDrag.currentX - 80}
                ${connectionDrag.currentY},

                ${connectionDrag.currentX}
                ${connectionDrag.currentY}
              `}
            />
          </svg>
        )}


        {graph.blocks.map(
          (block) => {
            const definition =
              blockDefinitions[
                block.type
              ];


            if (!definition) {
              return null;
            }


            return (
              <ShaderBlock
                key={block.id}
                block={block}
                definition={
                  definition
                }
                selected={
                selectedBlockId ===
                block.id
                }
                onSelect={(
  blockId,
) => {
  setSelectedConnectionIndex(
    null,
  );

  onSelectBlock(
    blockId,
  );
}}
                        onDragStart={
                  startDragging
                }
                onConnectionStart={
                  startConnection
                }
                onConnectionEnd={
                  finishConnection
                }
              />
            );
          },
        )}
      </div>
    </div>
  );
}