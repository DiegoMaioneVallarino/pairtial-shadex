import { Viewport } from "./viewport/Viewport";

import "./Lab.css";

export function Lab() {
  return (
    <section className="lab">
      <header className="lab__header">
        <div className="lab__brand">
          <div className="lab__logo">
            <span />
          </div>

          <div>
            <strong>Pairtial Shadex</strong>
            <small>Generative Visual Engine</small>
          </div>
        </div>

        <nav className="lab__navigation">
          <button className="is-active">Experiment</button>
          <button>Gallery</button>
          <button>Render</button>
          <button>Presets</button>
        </nav>

        <div className="lab__status">
          <span className="lab__status-dot" />
          WebGL2
        </div>
      </header>

      <div className="lab__workspace">
        <aside className="lab__sidebar">
          <span className="lab__section-label">
            FUNDAMENTALS
          </span>

          <button className="lab__experiment is-active">
            <span>001</span>
            Gradient
          </button>
        </aside>

        <Viewport />

        <aside className="lab__properties">
          <span className="lab__section-label">
            EXPERIMENT
          </span>

          <h2>Gradient</h2>

          <p>
            Our first Shadex experiment.
          </p>

          <div className="lab__property">
            <span>Renderer</span>
            <strong>WebGL2</strong>
          </div>

          <div className="lab__property">
            <span>Shader</span>
            <strong>GLSL ES 3.0</strong>
          </div>
        </aside>
      </div>
    </section>
  );
}