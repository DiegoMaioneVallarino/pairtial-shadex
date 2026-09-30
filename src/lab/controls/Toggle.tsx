interface ToggleProps {
  label: string;

  value: boolean;

  onChange: (
    value: boolean
  ) => void;
}


export function Toggle({
  label,
  value,
  onChange,
}: ToggleProps) {
  return (
    <label className="control toggle-control">
      <span>
        {label}
      </span>

      <input
        type="checkbox"
        checked={value}
        onChange={(event) =>
          onChange(
            event.target.checked
          )
        }
      />
    </label>
  );
}