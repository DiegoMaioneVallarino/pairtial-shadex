import type {
  PointerEvent,
} from "react";

import type {
  ShaderBlockDefinition,
  ShaderBlockInstance,
  ShaderValueType,
} from "../../blocks/block.types";


interface ShaderBlockProps {
  block: ShaderBlockInstance;

  definition: ShaderBlockDefinition;

  selected: boolean;

  onSelect: (
    blockId: string,
  ) => void;

  onDragStart: (
    blockId: string,
    event: PointerEvent<HTMLDivElement>,
  ) => void;

  onConnectionStart: (
    blockId: string,
    outputName: string,
    outputType: ShaderValueType,
    event: PointerEvent<HTMLSpanElement>,
  ) => void;

  onConnectionEnd: (
    blockId: string,
    inputName: string,
    inputType: ShaderValueType,
    event: PointerEvent<HTMLSpanElement>,
  ) => void;
}


export function ShaderBlock({
  block,
  definition,
  selected,
  onSelect,
  onDragStart,
  onConnectionStart,
  onConnectionEnd,
}: ShaderBlockProps) {
  function handleHeaderPointerDown(
    event: PointerEvent<HTMLDivElement>,
  ) {
    event.stopPropagation();

    onSelect(
      block.id,
    );

    onDragStart(
      block.id,
      event,
    );
  }


  return (
    <div
      className={[
        "shader-block",
        selected
          ? "shader-block--selected"
          : "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={{
        left:
          block.position?.x ??
          0,

        top:
          block.position?.y ??
          0,
      }}
    >
      <div
        className="shader-block__header"
        onPointerDown={
          handleHeaderPointerDown
        }
      >
        <span
          className="shader-block__type"
        >
          {definition.name}
        </span>

        <span
          className="shader-block__id"
        >
          {block.id}
        </span>
      </div>


      <div
        className="shader-block__body"
      >
        <div
          className="shader-block__ports"
        >
          <div
            className="shader-block__inputs"
          >
            {definition.inputs.map(
              (input) => (
                <div
                  className="shader-port shader-port--input"
                  key={input.name}
                >
                  <span
                    className="shader-port__socket"
                    data-block-id={
                      block.id
                    }
                    data-port-name={
                      input.name
                    }
                    data-port-type={
                      input.type
                    }
                    data-port-direction="input"
                    onPointerUp={(
                      event,
                    ) => {
                      event.stopPropagation();

                      onConnectionEnd(
                        block.id,
                        input.name,
                        input.type,
                        event,
                      );
                    }}
                  />

                  <span>
                    {input.name}
                  </span>

                  <small>
                    {input.type}
                  </small>
                </div>
              ),
            )}
          </div>


          <div
            className="shader-block__outputs"
          >
            {definition.outputs.map(
              (output) => (
                <div
                  className="shader-port shader-port--output"
                  key={output.name}
                >
                  <small>
                    {output.type}
                  </small>

                  <span>
                    {output.name}
                  </span>

                  <span
                    className="shader-port__socket"
                    data-block-id={
                      block.id
                    }
                    data-port-name={
                      output.name
                    }
                    data-port-type={
                      output.type
                    }
                    data-port-direction="output"
                    onPointerDown={(
                      event,
                    ) => {
                      event.stopPropagation();

                      onConnectionStart(
                        block.id,
                        output.name,
                        output.type,
                        event,
                      );
                    }}
                  />
                </div>
              ),
            )}
          </div>
        </div>


        {definition.parameters &&
          Object.keys(
            definition.parameters,
          ).length > 0 && (
            <div
              className="shader-block__parameter-summary"
            >
              {Object.entries(
                definition.parameters,
              ).map(
                ([
                  name,
                  parameter,
                ]) => (
                  <div
                    key={name}
                    className="shader-block__parameter"
                  >
                    <span>
                      {parameter.label ??
                        name}
                    </span>
                  </div>
                ),
              )}
            </div>
          )}
      </div>
    </div>
  );
}