import {
  useEffect,
  useRef,
} from "react";

import {
  Renderer,
} from "../../engine/core/Renderer";

import type {
  ExperimentParameter,
  ExperimentParameterValue,
  ShadexExperiment,
} from "../experiments/experiment.types";

import type {
  UniformType,
} from "../../engine/shaders/uniforms";

import "./Viewport.css";


interface ViewportProps {
  experiment:
    ShadexExperiment;

  values: Record<
    string,
    ExperimentParameterValue
  >;
}


function getUniformType(
  parameter:
    ExperimentParameter,
): UniformType {
  switch (
    parameter.type
  ) {
    case "color":
      return "vec3";

    case "vec2":
      return "vec2";

    case "vec3":
      return "vec3";

    case "boolean":
      return "bool";

    case "select":
      return "int";

    case "float":
    default:
      return "float";
  }
}


function applyExperimentUniforms(
  renderer: Renderer,

  experiment:
    ShadexExperiment,

  values: Record<
    string,
    ExperimentParameterValue
  >,
) {
  const parameters =
    experiment.parameters ??
    {};


  for (
    const [name, parameter]
    of Object.entries(
      parameters,
    )
  ) {
    const value =
      values[name] ??
      parameter.value;


    const uniformType =
      getUniformType(
        parameter,
      );


    renderer.setUniform(
      name,
      value,
      uniformType,
    );
  }
}


export function Viewport({
  experiment,
  values,
}: ViewportProps) {
  const canvasRef =
    useRef<
      HTMLCanvasElement | null
    >(null);


  const rendererRef =
    useRef<
      Renderer | null
    >(null);


  /*
   * Creamos un renderer nuevo
   * cuando cambia el experimento.
   */
  useEffect(() => {
    const canvas =
      canvasRef.current;


    if (!canvas) {
      return;
    }


    const renderer =
      new Renderer(
        canvas,
      );


    renderer.setShader(
      experiment.vertexShader,
      experiment.fragmentShader,
    );


    /*
     * Aplicamos inmediatamente
     * los parámetros actuales.
     */
    applyExperimentUniforms(
      renderer,
      experiment,
      values,
    );


    rendererRef.current =
      renderer;


    renderer.start();


    return () => {
      renderer.destroy();

      rendererRef.current =
        null;
    };
  }, [experiment]);


  /*
   * Actualizamos uniforms
   * sin reconstruir el renderer.
   */
  useEffect(() => {
    const renderer =
      rendererRef.current;


    if (!renderer) {
      return;
    }


    applyExperimentUniforms(
      renderer,
      experiment,
      values,
    );
  }, [
    values,
    experiment,
  ]);


  return (
    <section className="viewport">
      <canvas
        ref={canvasRef}
        className="viewport__canvas"
      />


      <div className="viewport__info">
        <div>
          <span className="viewport__live" />

          LIVE
        </div>


        <strong>
          {experiment.id}

          {" / "}

          {experiment.name}
        </strong>
      </div>
    </section>
  );
}