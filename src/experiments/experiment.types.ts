export interface ExperimentParameter {
  value: number;
  min: number;
  max: number;
  step: number;
}

export interface ShadexExperiment {
  id: string;
  name: string;
  description: string;

  vertexShader: string;
  fragmentShader: string;

  parameters?: Record<
    string,
    ExperimentParameter
  >;
}