import type {
  Vec2Value,
  Vec3Value,
} from "../experiments/experiment.types";


type VectorValue =
  | Vec2Value
  | Vec3Value;


interface VectorInputProps {
  label: string;

  value: VectorValue;

  step?: number;

  onChange: (
    value: VectorValue
  ) => void;
}


export function VectorInput({
  label,
  value,
  step = 0.01,
  onChange,
}: VectorInputProps) {
  function updateComponent(
    index: number,
    nextValue: number,
  ) {
    const next =
      [...value] as VectorValue;

    next[index] =
      nextValue;

    onChange(next);
  }


  return (
    <div className="control vector-control">
      <span>
        {label}
      </span>

      <div className="vector-inputs">
        {value.map(
          (component, index) => (
            <input
              key={index}
              type="number"
              step={step}
              value={component}
              onChange={(event) =>
                updateComponent(
                  index,
                  Number(
                    event.target.value,
                  ),
                )
              }
            />
          ),
        )}
      </div>
    </div>
  );
}