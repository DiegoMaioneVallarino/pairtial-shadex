import type {
  SelectOption,
} from "../../experiments/experiment.types";


interface SelectProps {
  label: string;

  value: number;

  options: SelectOption[];

  onChange: (
    value: number
  ) => void;
}


export function Select({
  label,
  value,
  options,
  onChange,
}: SelectProps) {
  return (
    <label className="control select-control">
      <span>
        {label}
      </span>

      <select
        value={value}
        onChange={(event) =>
          onChange(
            Number(
              event.target.value,
            ),
          )
        }
      >
        {options.map(
          (option) => (
            <option
              key={option.value}
              value={option.value}
            >
              {option.label}
            </option>
          ),
        )}
      </select>
    </label>
  );
}