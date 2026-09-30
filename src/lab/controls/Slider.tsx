import "./Slider.css";

interface SliderProps {
  label: string;

  value: number;
  min: number;
  max: number;
  step: number;

  onChange: (
    value: number,
  ) => void;
}

export function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: SliderProps) {
  return (
    <label className="control-slider">
      <div className="control-slider__header">
        <span>
          {label}
        </span>

        <strong>
          {value}
        </strong>
      </div>

      <input
        type="range"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(event) =>
          onChange(
            Number(
              event.target.value,
            ),
          )
        }
      />
    </label>
  );
}