import type {
  VisualOperation,
  VisualProgram,
} from "../../../ir/visual-ir.types";

import "./VisualIRPanel.css";


interface VisualIRPanelProps {
  program: VisualProgram;
}


function getOperationDetail(
  operation: VisualOperation,
): string {
  switch (operation.type) {
    case "coordinates":
      return "screen coordinates";

    case "constant":
      return String(
        operation.value,
      );

    case "time":
      return "u_time";

    case "multiply":
      return `${operation.a} × ${operation.b}`;

    case "add":
      return `${operation.a} + ${operation.b}`;

    case "sin":
      return `sin(${operation.input})`;

    case "sphere-distance":
      return `${operation.input} · radius: ${operation.radius}`;

    case "distort-distance":
      return `${operation.input} · amount: ${operation.amount}`;

    case "body-mask":
      return `${operation.input} · softness: ${operation.softness}`;

    case "emissive":
      return `${operation.mask} · intensity: ${operation.intensity}`;

    case "glow":
      return `${operation.distance} + ${operation.color}`;

    case "output":
      return operation.color;

    default:
      return "";
  }
}


function getOutput(
  operation: VisualOperation,
): string {
  if (
    "output" in operation
  ) {
    return operation.output;
  }

  return "final";
}


export function VisualIRPanel({
  program,
}: VisualIRPanelProps) {
  return (
    <div className="visual-ir">
      <div className="visual-ir__header">
        <span className="visual-ir__eyebrow">
          COMPILED PROGRAM
        </span>

        <strong>
          Visual IR
        </strong>

        <span className="visual-ir__count">
          {program.operations.length}
          {" "}
          operations
        </span>
      </div>

      <div className="visual-ir__operations">
        {program.operations.map(
          (
            operation,
            index,
          ) => (
            <div
              className="visual-ir__operation"
              key={operation.id}
            >
              <span className="visual-ir__index">
                {String(
                  index + 1,
                ).padStart(
                  2,
                  "0",
                )}
              </span>

              <div className="visual-ir__content">
                <div className="visual-ir__title">
                  <span className="visual-ir__id">
                    {operation.id}
                  </span>

                  <span className="visual-ir__type">
                    {operation.type}
                  </span>
                </div>

                <div className="visual-ir__detail">
                  {getOperationDetail(
                    operation,
                  )}
                </div>
              </div>

              <span className="visual-ir__output">
                {getOutput(
                  operation,
                )}
              </span>
            </div>
          ),
        )}
      </div>
    </div>
  );
}