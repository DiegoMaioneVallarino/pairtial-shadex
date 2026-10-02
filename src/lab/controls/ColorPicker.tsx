import type {
  ColorValue,
} from "../experiments/experiment.types";


interface ColorPickerProps {
  label: string;

  value: ColorValue;

  onChange: (
    value: ColorValue
  ) => void;
}


function componentToHex(
  value: number,
) {
  const normalized =
    Math.round(
      Math.max(
        0,
        Math.min(1, value),
      ) * 255,
    );

  return normalized
    .toString(16)
    .padStart(2, "0");
}


function colorToHex(
  color: ColorValue,
) {
  return (
    "#" +
    componentToHex(color[0]) +
    componentToHex(color[1]) +
    componentToHex(color[2])
  );
}


function hexToColor(
  hex: string,
): ColorValue {
  return [
    parseInt(
      hex.slice(1, 3),
      16,
    ) / 255,

    parseInt(
      hex.slice(3, 5),
      16,
    ) / 255,

    parseInt(
      hex.slice(5, 7),
      16,
    ) / 255,
  ];
}


export function ColorPicker({
  label,
  value,
  onChange,
}: ColorPickerProps) {
  return (
    <label className="control color-control">
      <span>
        {label}
      </span>

      <input
        type="color"
        value={colorToHex(value)}
        onChange={(event) =>
          onChange(
            hexToColor(
              event.target.value,
            ),
          )
        }
      />
    </label>
  );
}