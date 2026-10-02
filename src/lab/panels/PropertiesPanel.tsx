import {
  Slider,
} from "../controls/Slider";

import {
  Toggle,
} from "../controls/Toggle";

import {
  ColorPicker,
} from "../controls/ColorPicker";

import {
  VectorInput,
} from "../controls/VectorInput";

import {
  Select,
} from "../controls/Select";

import type {
  ExperimentParameter,
  ExperimentParameterValue,
} from "../experiments/experiment.types";


function ParameterControl({
  name,
  parameter,
  value,
  onChange,
}: {
  name: string;

  parameter: ExperimentParameter;

  value: ExperimentParameterValue;

  onChange: (
    value: ExperimentParameterValue
  ) => void;
}) {
  const label =
    parameter.label ??
    name;


  if (
    parameter.type === "color"
  ) {
    return (
      <ColorPicker
        label={label}
        value={value as [
          number,
          number,
          number,
        ]}
        onChange={onChange}
      />
    );
  }


  if (
    parameter.type === "vec2" ||
    parameter.type === "vec3"
  ) {
    return (
      <VectorInput
        label={label}
        value={value as
          | [number, number]
          | [number, number, number]
        }
        step={parameter.step}
        onChange={onChange}
      />
    );
  }


  if (
    parameter.type === "boolean"
  ) {
    return (
      <Toggle
        label={label}
        value={value as boolean}
        onChange={onChange}
      />
    );
  }


  if (
    parameter.type === "select"
  ) {
    return (
      <Select
        label={label}
        value={value as number}
        options={parameter.options}
        onChange={onChange}
      />
    );
  }


  /*
   * Sin type = float.
   *
   * Esto mantiene compatibles
   * los experimentos 001–024.
   */
  return (
    <Slider
      label={label}
      value={value as number}
      min={parameter.min}
      max={parameter.max}
      step={parameter.step}
      onChange={onChange}
    />
  );
}