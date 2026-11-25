/**
 * Shadex Editor — framework-free so it can be mounted anywhere (React wrapper, plain page).
 * The editor only ever touches the IR; the renderer reads the IR every frame.
 */
import { clone, newId, MAX_LIGHTS, MAX_REPEAT, type Scene, type Layer, type Light, type Group, type ShapeType, type ShadeType, type BlendMode, type Hex } from '../core/ir';
import { SHAPES, SHADES, defaults, type ParamDef } from '../core/primitives';
import { PRESETS, PRESET_LABELS, makeLayer, makeLight, makeGroup } from '../core/presets';
import { ShadexRenderer } from '../core/runtime';
import { animValue } from '../core/compiler';
import { toEmbed, toJSON, toShadertoy, encodeScene, decodeScene, validateScene } from '../core/export';

type Sel = { kind: 'layer'; id: string } | { kind: 'light'; id: string } | { kind: 'group'; id: string } | { kind: 'background' } | { kind: 'finish' };
type Attrs = Record<string, unknown> & { class?: string; style?: string };
type Binding = { input: HTMLInputElement; num: HTMLInputElement; get: () => number; path?: string; fmt: (v: number) => string; paint: (v: number) => void };

const STORE_KEY = 'shadex:scene:v0.3';

function h<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Attrs = {}, ...kids: (Node | string | null | false | undefined)[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === null || v === false) continue;
    if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v as EventListener);
    else if (k === 'class') el.className = String(v);
    else if (k in el && k !== 'style' && k !== 'list') (el as unknown as Record<string, unknown>)[k] = v;
    else el.setAttribute(k, String(v));
  }
  for (const kid of kids) if (kid !== null && kid !== undefined && kid !== false) el.append(kid);
  return el;
}

const ICON = {
  eye: '<svg viewBox="0 0 24 24"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>',
  eyeOff: '<svg viewBox="0 0 24 24"><path d="M3 3l18 18M10.6 5.1A10 10 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.2 4.1M6.6 6.6C3.8 8.4 2 12 2 12s3.6 7 10 7a9.7 9.7 0 0 0 5.4-1.6"/></svg>',
  up: '<svg viewBox="0 0 24 24"><path d="M6 15l6-6 6 6"/></svg>',
  down: '<svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>',
  copy: '<svg viewBox="0 0 24 24"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></svg>',
  trash: '<svg viewBox="0 0 24 24"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></svg>',
  plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
  undo: '<svg viewBox="0 0 24 24"><path d="M9 14L4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/></svg>',
  redo: '<svg viewBox="0 0 24 24"><path d="M15 14l5-5-5-5"/><path d="M20 9H10a6 6 0 0 0 0 12h3"/></svg>',
  play: '<svg viewBox="0 0 24 24"><path d="M7 5v14l12-7z"/></svg>',
  pause: '<svg viewBox="0 0 24 24"><path d="M8 5v14M16 5v14"/></svg>',
  dice: '<svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="4"/><circle cx="9" cy="9" r="1.2"/><circle cx="15" cy="15" r="1.2"/><circle cx="15" cy="9" r="1.2"/><circle cx="9" cy="15" r="1.2"/></svg>',
  spark: '<svg viewBox="0 0 24 24"><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/></svg>',
  export: '<svg viewBox="0 0 24 24"><path d="M12 15V3M7 8l5-5 5 5"/><path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"/></svg>',
  import: '<svg viewBox="0 0 24 24"><path d="M12 3v12M7 10l5 5 5-5"/><path d="M5 17v2a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-2"/></svg>',
  bg: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="9" cy="10" r="3"/><circle cx="15" cy="15" r="4"/></svg>',
  finish: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 0 0 16z"/></svg>',
  ribbon: '<svg viewBox="0 0 24 24"><path d="M2 15c4-8 8 4 12-4s6-2 8-3"/><path d="M2 19c4-8 8 4 12-4s6-2 8-3"/></svg>',
  arc: '<svg viewBox="0 0 24 24"><path d="M4 20A16 16 0 0 1 20 4"/><path d="M9 20a11 11 0 0 1 11-11"/></svg>',
  orb: '<svg viewBox="0 0 24 24"><circle cx="9" cy="12" r="6"/><circle cx="16" cy="13" r="5"/></svg>',
  blob: '<svg viewBox="0 0 24 24"><path d="M12 3c5 0 9 3 8 8s-3 10-9 10-8-4-8-9 4-9 9-9Z"/></svg>',
  circle: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/></svg>',
  box: '<svg viewBox="0 0 24 24"><rect x="4" y="6" width="16" height="12" rx="3"/></svg>',
  polygon: '<svg viewBox="0 0 24 24"><path d="M12 3l8 9-8 9-8-9z"/></svg>',
  light: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3.5"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/></svg>',
  symbol: '<svg viewBox="0 0 24 24"><path d="M12 3l3 6 6 .8-4.5 4.2 1.1 6L12 17l-5.6 3 1.1-6L3 9.8 9 9z"/></svg>',
  linear: '<svg viewBox="0 0 24 24"><path d="M3 17L21 7"/><path d="M3 12L15 5.5M9 18.5 21 12" opacity=".45"/></svg>',
  particles: '<svg viewBox="0 0 24 24"><circle cx="5" cy="6" r="1.4"/><circle cx="12" cy="4" r="1"/><circle cx="18" cy="9" r="1.6"/><circle cx="8" cy="14" r="1.1"/><circle cx="15" cy="17" r="1.3"/><circle cx="20" cy="20" r="1"/><circle cx="4" cy="20" r="1.2"/></svg>',
};
const icon = (k: keyof typeof ICON, cls = '') => { const s = h('span', { class: `sx-ico ${cls}` }); s.innerHTML = ICON[k]; return s; };

const BLENDS: [BlendMode, string][] = [['normal', 'Normal'], ['add', 'Sumar luz'], ['screen', 'Trama'], ['multiply', 'Multiplicar']];
const ASPECTS: [number, string][] = [[1.9, 'Tarjeta ancha'], [1.35, 'Tarjeta alta'], [16 / 9, 'Hero 16:9'], [1.6, 'Panorámica'], [1, 'Cuadrado'], [9 / 16, 'Móvil 9:16']];

/* colour helpers for palette generation ----------------------------------------------------- */
const hsl = (hue: number, s: number, l: number): Hex => {
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => { const k = (n + hue / 30) % 12; return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)); };
  return '#' + [f(0), f(8), f(4)].map(x => Math.round(x * 255).toString(16).padStart(2, '0')).join('');
};
const rand = (a: number, b: number) => a + Math.random() * (b - a);
const randomPalette = (): [Hex, Hex, Hex] => {
  const base = Math.random() * 360, step = rand(18, 55) * (Math.random() < 0.5 ? -1 : 1);
  return [hsl(base, rand(0.75, 1), rand(0.3, 0.45)), hsl(base + step, rand(0.8, 1), rand(0.5, 0.62)), hsl(base + step * 2, rand(0.6, 1), rand(0.78, 0.9))];
};

export interface EditorOptions {
  /** start scene; otherwise URL hash → saved draft → Silvana preset */
  scene?: Scene;
  onChange?: (scene: Scene) => void;
}

export class ShadexEditor {
  private scene: Scene;
  private sel: Sel;
  private past: string[] = [];
  private future: string[] = [];
  private renderer: ShadexRenderer | null = null;
  private playing = true;
  private time = 0;
  private last = 0;
  private raf = 0;
  private resScale = 0.75;
  private pageLight = false;
  private frames = 0;
  private fpsT = 0;

  private root: HTMLElement;
  private layersEl!: HTMLElement;
  private inspectorEl!: HTMLElement;
  private stageEl!: HTMLElement;
  private cardEl!: HTMLElement;
  private canvas!: HTMLCanvasElement;
  private markerEl!: HTMLElement;
  private lightLayer!: HTMLElement;
  private errorEl!: HTMLElement;
  private fpsEl!: HTMLElement;
  private nameInput!: HTMLInputElement;
  private presetSelect!: HTMLSelectElement;
  private aspectSelect!: HTMLSelectElement;
  private playBtn!: HTMLButtonElement;
  private toastEl!: HTMLElement;
  private ro: ResizeObserver | null = null;
  private saveTimer = 0;

  constructor(host: HTMLElement, private opts: EditorOptions = {}) {
    this.scene = opts.scene ?? this.initialScene();
    this.sel = this.scene.layers.length ? { kind: 'layer', id: this.scene.layers[this.scene.layers.length - 1].id } : { kind: 'background' };
    this.root = h('div', { class: 'sx-app' });
    host.append(this.root);
    this.build();
    try {
      this.renderer = new ShadexRenderer(this.canvas);
    } catch (e) {
      this.showError((e as Error).message);
    }
    this.renderLayers();
    this.renderInspector();
    this.layoutCard();
    this.ro = new ResizeObserver(() => this.layoutCard());
    this.ro.observe(this.stageEl);
    window.addEventListener('keydown', this.onKey);
    this.raf = requestAnimationFrame(this.loop);
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    window.removeEventListener('keydown', this.onKey);
    this.ro?.disconnect();
    this.renderer?.dispose();
    this.root.remove();
  }

  getScene(): Scene { return clone(this.scene); }

  setScene(s: Scene, record = true) {
    if (record) this.record();
    this.scene = clone(s);
    const top = this.scene.layers[this.scene.layers.length - 1];
    this.sel = top ? { kind: 'layer', id: top.id } : { kind: 'background' };
    this.refreshAll();
    this.changed();
  }

  /* ---------------------------------------------------------------------------------------- */
  private initialScene(): Scene {
    const m = /[#&]s=([A-Za-z0-9_-]+)/.exec(location.hash);
    if (m) { const s = decodeScene(m[1]); if (s) return s; }
    try {
      const saved = localStorage.getItem(STORE_KEY);
      if (saved) { const s = validateScene(JSON.parse(saved)); if (s) return s; }
    } catch { /* storage unavailable */ }
    return PRESETS.flor();
  }

  private record() {
    this.past.push(JSON.stringify(this.scene));
    if (this.past.length > 120) this.past.shift();
    this.future = [];
  }
  private undo() {
    const prev = this.past.pop();
    if (!prev) return;
    this.future.push(JSON.stringify(this.scene));
    this.scene = JSON.parse(prev);
    this.fixSelection();
    this.refreshAll();
    this.changed();
  }
  private redo() {
    const next = this.future.pop();
    if (!next) return;
    this.past.push(JSON.stringify(this.scene));
    this.scene = JSON.parse(next);
    this.fixSelection();
    this.refreshAll();
    this.changed();
  }
  private fixSelection() {
    if (this.sel.kind === 'group') {
      const id = this.sel.id;
      if (!this.scene.groups.some(g => g.id === id)) this.sel = { kind: 'background' };
    }
    if (this.sel.kind === 'light') {
      const id = this.sel.id;
      if (!this.scene.lights.some(l => l.id === id)) this.sel = { kind: 'background' };
    }
    if (this.sel.kind === 'layer') {
      const id = this.sel.id;
      if (!this.scene.layers.some(l => l.id === id)) {
        const top = this.scene.layers[this.scene.layers.length - 1];
        this.sel = top ? { kind: 'layer', id: top.id } : { kind: 'background' };
      }
    }
  }
  /** called after every committed edit */
  private changed() {
    clearTimeout(this.saveTimer);
    this.saveTimer = window.setTimeout(() => {
      try { localStorage.setItem(STORE_KEY, JSON.stringify(this.scene)); } catch { /* ignore */ }
    }, 300);
    this.opts.onChange?.(this.getScene());
  }
  private refreshAll() {
    this.nameInput.value = this.scene.name;
    this.aspectSelect.value = String(this.nearestAspect());
    this.renderLayers();
    this.renderInspector();
    this.layoutCard();
  }
  private get group(): Group | undefined {
    const sel = this.sel;
    return sel.kind === 'group' ? this.scene.groups.find(g => g.id === sel.id) : undefined;
  }
  private get light(): Light | undefined {
    const sel = this.sel;
    return sel.kind === 'light' ? this.scene.lights.find(l => l.id === sel.id) : undefined;
  }
  private get layer(): Layer | undefined {
    const sel = this.sel;
    return sel.kind === 'layer' ? this.scene.layers.find(l => l.id === sel.id) : undefined;
  }

  /* ---------------------------------------------------------------------------------------- */
  private build() {
    this.nameInput = h('input', { class: 'sx-name', value: this.scene.name, spellcheck: false, 'aria-label': 'Nombre de la pieza' });
    this.nameInput.addEventListener('change', () => { this.record(); this.scene.name = this.nameInput.value.trim() || 'Sin título'; this.changed(); });

    this.presetSelect = h('select', { class: 'sx-select', 'aria-label': 'Plantillas' },
      h('option', { value: '' }, 'Plantillas…'),
      ...Object.keys(PRESETS).map(k => h('option', { value: k }, PRESET_LABELS[k] ?? k)));
    this.presetSelect.addEventListener('change', () => {
      const k = this.presetSelect.value;
      if (k && PRESETS[k]) this.setScene(PRESETS[k]());
      this.presetSelect.value = '';
    });

    this.aspectSelect = h('select', { class: 'sx-select', 'aria-label': 'Proporción' },
      ...ASPECTS.map(([v, l]) => h('option', { value: String(v) }, l)));
    this.aspectSelect.value = String(this.nearestAspect());
    this.aspectSelect.addEventListener('change', () => { this.record(); this.scene.aspect = parseFloat(this.aspectSelect.value); this.layoutCard(); this.changed(); });

    this.playBtn = h('button', { class: 'sx-btn sx-btn--icon', title: 'Reproducir / pausar (espacio)', onclick: () => this.togglePlay() }, icon('pause'));
    this.fpsEl = h('span', { class: 'sx-fps' }, '— fps');

    const header = h('header', { class: 'sx-header' },
      h('div', { class: 'sx-brand' }, h('span', { class: 'sx-logo' }), h('strong', {}, 'Shadex'), h('span', { class: 'sx-tag' }, 'editor 0.1')),
      h('div', { class: 'sx-header__mid' }, this.nameInput, this.presetSelect),
      h('div', { class: 'sx-header__right' },
        h('button', { class: 'sx-btn sx-btn--icon', title: 'Deshacer (Ctrl+Z)', onclick: () => this.undo() }, icon('undo')),
        h('button', { class: 'sx-btn sx-btn--icon', title: 'Rehacer (Ctrl+Shift+Z)', onclick: () => this.redo() }, icon('redo')),
        h('button', { class: 'sx-btn', title: 'Pequeña variación de la capa seleccionada', onclick: () => this.vary() }, icon('spark'), h('span', {}, 'Variar')),
        h('button', { class: 'sx-btn', title: 'Importar JSON', onclick: () => this.openImport() }, icon('import'), h('span', {}, 'Importar')),
        h('button', { class: 'sx-btn sx-btn--primary', onclick: () => this.openExport() }, icon('export'), h('span', {}, 'Exportar')),
      ));

    this.layersEl = h('div', { class: 'sx-layers' });
    const addMenu = h('div', { class: 'sx-add-menu', hidden: true },
      ...(Object.keys(SHAPES) as ShapeType[]).map(t =>
        h('button', { class: 'sx-add-item', onclick: () => { addMenu.hidden = true; this.addLayer(t); } },
          icon(t as keyof typeof ICON), h('span', {}, h('strong', {}, SHAPES[t].label), h('small', {}, SHAPES[t].hint)))));
    const addBtn = h('button', { class: 'sx-btn sx-btn--add', onclick: (e: Event) => { e.stopPropagation(); addMenu.hidden = !addMenu.hidden; } }, icon('plus'), h('span', {}, 'Añadir forma'));
    document.addEventListener('click', e => { if (!addMenu.contains(e.target as Node)) addMenu.hidden = true; });

    const left = h('aside', { class: 'sx-panel sx-panel--left' },
      h('div', { class: 'sx-panel__title' }, 'Capas'),
      h('div', { class: 'sx-add' }, addBtn, addMenu),
      this.layersEl);

    this.canvas = h('canvas', { class: 'sx-canvas' });
    this.markerEl = h('div', { class: 'sx-marker' });
    this.errorEl = h('pre', { class: 'sx-error', hidden: true });
    this.lightLayer = h('div', { class: 'sx-lights' });
    this.cardEl = h('div', { class: 'sx-card' }, this.canvas, this.markerEl, this.lightLayer);
    this.bindCanvas();

    const res = h('input', { type: 'range', min: '0.25', max: '1', step: '0.05', value: String(this.resScale), class: 'sx-mini-range', 'aria-label': 'Resolución' }) as HTMLInputElement;
    const resLabel = h('span', { class: 'sx-dim' }, `${Math.round(this.resScale * 100)} %`);
    res.addEventListener('input', () => { this.resScale = parseFloat(res.value); resLabel.textContent = `${Math.round(this.resScale * 100)} %`; this.layoutCard(); });
    const pageBtn = h('button', { class: 'sx-chip', onclick: () => { this.pageLight = !this.pageLight; this.stageEl.classList.toggle('is-light', this.pageLight); pageBtn.textContent = this.pageLight ? 'Página clara' : 'Página oscura'; } }, 'Página oscura');

    this.stageEl = h('section', { class: 'sx-stage' }, this.cardEl, this.errorEl);
    const stageWrap = h('div', { class: 'sx-stage-wrap' },
      this.stageEl,
      h('div', { class: 'sx-stagebar' },
        this.playBtn, this.aspectSelect, pageBtn,
        h('label', { class: 'sx-res' }, h('span', { class: 'sx-dim' }, 'Resolución'), res, resLabel),
        h('span', { class: 'sx-hint' }, 'Arrastra para mover · rueda para escalar'),
        this.fpsEl));

    this.inspectorEl = h('aside', { class: 'sx-panel sx-panel--right' });
    this.toastEl = h('div', { class: 'sx-toast', role: 'status' });
    this.root.append(header, h('div', { class: 'sx-body' }, left, stageWrap, this.inspectorEl), this.toastEl);
  }

  private nearestAspect() {
    return ASPECTS.reduce((b, [v]) => Math.abs(v - this.scene.aspect) < Math.abs(b - this.scene.aspect) ? v : b, ASPECTS[0][0]);
  }

  private layoutCard() {
    const r = this.stageEl.getBoundingClientRect();
    const pad = r.width < 600 ? 16 : 40;
    const aw = Math.max(50, r.width - pad * 2), ah = Math.max(50, r.height - pad * 2);
    let w = aw, hh = aw / this.scene.aspect;
    if (hh > ah) { hh = ah; w = ah * this.scene.aspect; }
    this.cardEl.style.width = `${Math.round(w)}px`;
    this.cardEl.style.height = `${Math.round(hh)}px`;
    this.cardEl.style.borderRadius = `${this.scene.radius}px`;
    this.cardEl.style.background = this.scene.background.base;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.max(1, Math.round(w * dpr * this.resScale));
    this.canvas.height = Math.max(1, Math.round(hh * dpr * this.resScale));
    this.updateMarker();
  }

  private updateMarker() {
    this.renderLightHandles();
    const g = this.group;
    const l = this.layer;
    const at = g ?? l?.transform;
    if (!at) { this.markerEl.hidden = true; return; }
    const H = this.cardEl.clientHeight, W = this.cardEl.clientWidth;
    // a layer inside a symbol is drawn relative to the symbol centre
    const og = l?.group ? this.scene.groups.find(x => x.id === l.group) : undefined;
    const x = og ? og.x + at.x * og.scale : at.x, y = og ? og.y + at.y * og.scale : at.y;
    this.markerEl.hidden = false;
    this.markerEl.classList.toggle('is-symbol', !!g);
    this.markerEl.style.left = `${W / 2 + x * H}px`;
    this.markerEl.style.top = `${H / 2 - y * H}px`;
  }

  /** draggable handles for spatial lights, placed at their base position */
  private renderLightHandles() {
    if (!this.lightLayer) return;
    const H = this.cardEl.clientHeight, W = this.cardEl.clientWidth;
    const showAll = this.sel.kind === 'light' || this.scene.layers.some(l => l.visible && l.shade.type === 'lit');
    this.lightLayer.replaceChildren(...(showAll ? this.scene.lights : []).map(li => {
      const active = this.sel.kind === 'light' && this.sel.id === li.id;
      const dot = h('button', {
        class: `sx-light-handle${active ? ' is-active' : ''}${li.enabled ? '' : ' is-off'}`,
        title: `${li.name} · arrastra para moverla`,
        style: `left:${W / 2 + li.x * H}px;top:${H / 2 - li.y * H}px;--c:${li.color}`,
      });
      if (li.orbit > 0.001) dot.append(h('span', { class: 'sx-light-orbit', style: `width:${li.orbit * 2 * H}px;height:${li.orbit * 1.5 * H}px` }));
      dot.addEventListener('pointerdown', e => {
        e.stopPropagation();
        if (!active) { this.sel = { kind: 'light', id: li.id }; this.renderLayers(); this.renderInspector(); }
        this.startDrag(e, dot);
      });
      return dot;
    }));
  }

  private drag: { x: number; y: number; tx: number; ty: number; target: { x: number; y: number } } | null = null;

  private startDrag(e: PointerEvent, captureEl: HTMLElement) {
    const target = this.light ?? this.group ?? this.layer?.transform;
    if (!target) return;
    captureEl.setPointerCapture(e.pointerId);
    this.record();
    this.drag = { x: e.clientX, y: e.clientY, tx: target.x, ty: target.y, target };
    this.cardEl.classList.add('is-dragging');
    const move = (ev: PointerEvent) => {
      const d = this.drag;
      if (!d) return;
      const H = this.cardEl.clientHeight;
      d.target.x = +(d.tx + (ev.clientX - d.x) / H).toFixed(3);
      d.target.y = +(d.ty - (ev.clientY - d.y) / H).toFixed(3);
      this.updateMarker();
      this.syncInspectorValues();
    };
    const end = () => {
      captureEl.removeEventListener('pointermove', move);
      captureEl.removeEventListener('pointerup', end);
      captureEl.removeEventListener('pointercancel', end);
      if (this.drag) { this.drag = null; this.cardEl.classList.remove('is-dragging'); this.renderLightHandles(); this.changed(); }
    };
    captureEl.addEventListener('pointermove', move);
    captureEl.addEventListener('pointerup', end);
    captureEl.addEventListener('pointercancel', end);
  }

  private bindCanvas() {
    this.canvas.addEventListener('pointerdown', e => this.startDrag(e, this.canvas));
    let wheelTimer = 0;
    this.canvas.addEventListener('wheel', e => {
      const l = this.layer;
      if (!l) return;
      e.preventDefault();
      if (!wheelTimer) this.record();
      clearTimeout(wheelTimer);
      wheelTimer = window.setTimeout(() => { wheelTimer = 0; this.changed(); }, 400);
      l.transform.scale = Math.min(4, Math.max(0.1, +(l.transform.scale * Math.exp(-e.deltaY * 0.0015)).toFixed(3)));
      this.syncInspectorValues();
    }, { passive: false });
  }

  /* render loop ------------------------------------------------------------------------------ */
  private loop = (now: number) => {
    this.raf = requestAnimationFrame(this.loop);
    const dt = this.last ? Math.min(0.1, (now - this.last) / 1000) : 0;
    this.last = now;
    if (this.playing) this.time += dt;
    if (!this.renderer) return;
    this.renderer.sync(this.scene);
    if (this.renderer.lastError) this.showError(this.renderer.lastError);
    else if (!this.errorEl.hidden) this.errorEl.hidden = true;
    this.renderer.draw(this.scene, this.time);
    // animated sliders follow the shader's ping-pong (same clock: time × speed)
    const T = this.time * this.scene.speed;
    for (const b of this.bindings) {
      const a = b.path ? this.scene.anims[b.path] : undefined;
      if (!a) continue;
      const v = animValue(a, T);
      b.input.value = String(v);
      b.num.value = b.fmt(v);
      b.paint(v);
    }
    this.frames++;
    if (now - this.fpsT > 500) {
      this.fpsEl.textContent = `${Math.round(this.frames * 1000 / (now - this.fpsT))} fps`;
      this.frames = 0;
      this.fpsT = now;
    }
  };

  private togglePlay() {
    this.playing = !this.playing;
    this.playBtn.replaceChildren(icon(this.playing ? 'pause' : 'play'));
  }

  private showError(msg: string) {
    this.errorEl.hidden = false;
    this.errorEl.textContent = `El shader no compiló:\n${msg.slice(0, 600)}`;
  }

  private onKey = (e: KeyboardEvent) => {
    if (!this.root.isConnected) return;
    const t = e.target as HTMLElement;
    const typing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT');
    const mod = e.metaKey || e.ctrlKey;
    if (mod && e.key.toLowerCase() === 'z') { e.preventDefault(); if (e.shiftKey) this.redo(); else this.undo(); return; }
    if (mod && e.key.toLowerCase() === 'y') { e.preventDefault(); this.redo(); return; }
    if (typing) return;
    if (e.key === ' ') { e.preventDefault(); this.togglePlay(); }
    if ((e.key === 'Delete' || e.key === 'Backspace') && this.layer) { e.preventDefault(); this.removeLayer(this.layer.id); }
    if ((e.key === 'Delete' || e.key === 'Backspace') && this.light) { e.preventDefault(); this.removeLight(this.light.id); }
    if (mod && e.key.toLowerCase() === 'd' && this.layer) { e.preventDefault(); this.duplicateLayer(this.layer.id); }
    if (mod && e.key.toLowerCase() === 'g' && this.layer) { e.preventDefault(); this.makeSymbol(this.layer); }
  };

  /* layers ------------------------------------------------------------------------------------ */
  private addLayer(t: ShapeType) {
    this.record();
    const flat = t === 'circle' || t === 'box' || t === 'polygon';
    const shade: ShadeType = flat ? 'lit' : t === 'orb' ? 'glass' : t === 'blob' ? 'solid' : 'glow';
    const l = makeLayer(t, shade, { palette: randomPalette(), warp: flat ? { amount: 0, scale: 1.5, speed: 0.15 } : undefined });
    if (shade === 'lit') this.ensureLights();
    this.scene.layers.push(l);
    this.sel = { kind: 'layer', id: l.id };
    this.renderLayers(); this.renderInspector(); this.updateMarker(); this.changed();
  }
  /** a lit surface without lights is dark: give it a key light and a fill light */
  private ensureLights() {
    if (this.scene.lights.some(l => l.enabled)) return;
    this.scene.lights.push(
      makeLight({ name: 'Luz principal', x: 0.25, y: 0.28, color: '#d6f0ff', intensity: 1.3 }),
      makeLight({ name: 'Luz de relleno', x: -0.35, y: -0.2, radius: 0.35, color: '#ff4fa8', intensity: 0.7, speed: -0.3, phase: 2.5 }),
    );
  }
  private addLight(kind: Light['kind']) {
    if (this.scene.lights.length >= MAX_LIGHTS) { this.toast(`Máximo ${MAX_LIGHTS} luces`); return; }
    this.record();
    const hue = Math.random() * 360;
    const li = makeLight({
      name: kind === 'linear' ? 'Franja de luz' : `Luz ${this.scene.lights.length + 1}`, kind,
      x: +rand(-0.4, 0.4).toFixed(2), y: +rand(-0.3, 0.3).toFixed(2), color: hsl(hue, 0.9, 0.7),
      radius: kind === 'linear' ? 0.06 : 0.4, rotation: kind === 'linear' ? 0.8 : 0, phase: +rand(0, 6).toFixed(2),
    });
    this.scene.lights.push(li);
    this.sel = { kind: 'light', id: li.id };
    this.renderLayers(); this.renderInspector(); this.updateMarker(); this.changed();
  }
  private removeLight(id: string) {
    this.record();
    this.scene.lights = this.scene.lights.filter(l => l.id !== id);
    this.dropAnims(id);
    this.sel = { kind: 'background' };
    this.renderLayers(); this.renderInspector(); this.updateMarker(); this.changed();
  }
  private duplicateLight(id: string) {
    if (this.scene.lights.length >= MAX_LIGHTS) { this.toast(`Máximo ${MAX_LIGHTS} luces`); return; }
    this.record();
    const src = this.scene.lights.find(l => l.id === id)!;
    const copy = { ...clone(src), id: newId(), name: `${src.name} copia`, x: src.x + 0.05, phase: src.phase + 1.5 };
    this.scene.lights.push(copy);
    this.sel = { kind: 'light', id: copy.id };
    this.renderLayers(); this.renderInspector(); this.updateMarker(); this.changed();
  }

  private dropAnims(prefix: string) {
    for (const k of Object.keys(this.scene.anims)) if (k.startsWith(`${prefix}.`)) delete this.scene.anims[k];
  }
  private makeSymbol(l?: Layer) {
    this.record();
    const g = makeGroup({ name: `Símbolo ${this.scene.groups.length + 1}` });
    if (l) {
      // keep the layer where it is on screen: the symbol takes its position
      g.x = l.transform.x; g.y = l.transform.y;
      l.transform.x = 0; l.transform.y = 0;
      l.group = g.id;
    }
    this.scene.groups.push(g);
    this.sel = { kind: 'group', id: g.id };
    this.renderLayers(); this.renderInspector(); this.updateMarker(); this.changed();
    this.toast('Símbolo creado: repítelo, gíralo o añádele más capas');
  }
  private removeGroup(id: string) {
    this.record();
    const g = this.scene.groups.find(x => x.id === id);
    for (const l of this.scene.layers) if (l.group === id) {
      l.group = null;
      if (g) { l.transform.x = +(g.x + l.transform.x * g.scale).toFixed(3); l.transform.y = +(g.y + l.transform.y * g.scale).toFixed(3); l.transform.scale *= g.scale; }
    }
    this.scene.groups = this.scene.groups.filter(x => x.id !== id);
    this.dropAnims(id);
    this.sel = { kind: 'background' };
    this.renderLayers(); this.renderInspector(); this.updateMarker(); this.changed();
  }

  private removeLayer(id: string) {
    this.record();
    const i = this.scene.layers.findIndex(l => l.id === id);
    this.scene.layers.splice(i, 1);
    for (const l of this.scene.layers) if (l.mask.source === id) l.mask.source = null;
    this.dropAnims(id);
    const next = this.scene.layers[Math.min(i, this.scene.layers.length - 1)];
    this.sel = next ? { kind: 'layer', id: next.id } : { kind: 'background' };
    this.renderLayers(); this.renderInspector(); this.updateMarker(); this.changed();
  }
  private duplicateLayer(id: string) {
    this.record();
    const i = this.scene.layers.findIndex(l => l.id === id);
    const copy = clone(this.scene.layers[i]);
    copy.id = newId();
    copy.name = `${copy.name} copia`;
    copy.transform.x += 0.04; copy.transform.y -= 0.04;
    for (const [k, a] of Object.entries(this.scene.anims)) if (k.startsWith(`${id}.`)) this.scene.anims[copy.id + k.slice(id.length)] = { ...a };
    this.scene.layers.splice(i + 1, 0, copy);
    this.sel = { kind: 'layer', id: copy.id };
    this.renderLayers(); this.renderInspector(); this.updateMarker(); this.changed();
  }
  private moveLayer(id: string, dir: 1 | -1) {
    const i = this.scene.layers.findIndex(l => l.id === id), j = i + dir;
    if (j < 0 || j >= this.scene.layers.length) return;
    this.record();
    const ls = this.scene.layers;
    [ls[i], ls[j]] = [ls[j], ls[i]];
    this.renderLayers(); this.changed();
  }

  private renderLayers() {
    const row = (sel: Sel, ico: HTMLElement, title: string, sub: string, actions: HTMLElement | null, dim = false) => {
      const active = this.sel.kind === sel.kind && (!('id' in sel) || (this.sel as { id: string }).id === sel.id);
      return h('div', {
        class: `sx-layer${active ? ' is-active' : ''}${dim ? ' is-hidden' : ''}`, tabindex: 0, role: 'button',
        onclick: () => { this.sel = sel; this.renderLayers(); this.renderInspector(); this.updateMarker(); },
        onkeydown: (e: KeyboardEvent) => { if (e.key === 'Enter') (e.currentTarget as HTMLElement).click(); },
      }, ico, h('div', { class: 'sx-layer__text' }, h('strong', {}, title), h('small', {}, sub)), actions);
    };
    const act = (k: keyof typeof ICON, title: string, fn: () => void) =>
      h('button', { class: 'sx-iconbtn', title, onclick: (e: Event) => { e.stopPropagation(); fn(); } }, icon(k));

    const items = [...this.scene.layers].reverse().map(l => {
      const vis = h('button', {
        class: 'sx-iconbtn sx-iconbtn--eye', title: l.visible ? 'Ocultar' : 'Mostrar',
        onclick: (e: Event) => { e.stopPropagation(); this.record(); l.visible = !l.visible; this.renderLayers(); this.changed(); },
      }, icon(l.visible ? 'eye' : 'eyeOff'));
      const gName = l.group ? this.scene.groups.find(g => g.id === l.group)?.name : undefined;
      const tags = [gName ? `◇ ${gName}` : '', l.mask.source ? '◐ máscara' : '', Object.keys(this.scene.anims).some(k => k.startsWith(`${l.id}.`)) ? '↔ animada' : ''].filter(Boolean);
      const r = row({ kind: 'layer', id: l.id }, icon(l.shape.type as keyof typeof ICON, 'sx-ico--shape'), l.name,
        tags.length ? tags.join(' · ') : `${SHAPES[l.shape.type].label} · ${SHADES[l.shade.type].label}`,
        h('div', { class: 'sx-layer__actions' },
          act('up', 'Subir', () => this.moveLayer(l.id, 1)),
          act('down', 'Bajar', () => this.moveLayer(l.id, -1)),
          act('copy', 'Duplicar (Ctrl+D)', () => this.duplicateLayer(l.id)),
          act('trash', 'Eliminar', () => this.removeLayer(l.id)), vis), !l.visible);
      if (gName) r.classList.add('is-grouped');
      return r;
    });
    const groupRows = this.scene.groups.map(g => {
      const n = this.scene.layers.filter(l => l.group === g.id).length;
      return row({ kind: 'group', id: g.id }, icon('symbol', 'sx-ico--shape sx-ico--symbol'), g.name,
        `${n} capa${n === 1 ? '' : 's'} · ${g.count > 1 ? `${g.count}× ${g.mode === 'radial' ? 'en círculo' : 'en fila'}` : 'sin repetir'}${g.spin ? ' · gira' : ''}`,
        h('div', { class: 'sx-layer__actions' }, act('trash', 'Desagrupar (las capas se conservan)', () => this.removeGroup(g.id))));
    });
    const lightRows = this.scene.lights.map(li => {
      const vis = h('button', {
        class: 'sx-iconbtn sx-iconbtn--eye', title: li.enabled ? 'Apagar' : 'Encender',
        onclick: (e: Event) => { e.stopPropagation(); this.record(); li.enabled = !li.enabled; this.renderLayers(); this.updateMarker(); this.changed(); },
      }, icon(li.enabled ? 'eye' : 'eyeOff'));
      const ico = icon(li.kind === 'linear' ? 'linear' : 'light', 'sx-ico--shape sx-ico--light');
      ico.style.setProperty('--c', li.color);
      return row({ kind: 'light', id: li.id }, ico, li.name,
        `${li.kind === 'linear' ? 'Franja' : 'Radial'}${li.orbit > 0.001 ? ' · en órbita' : ''}`,
        h('div', { class: 'sx-layer__actions' },
          act('copy', 'Duplicar', () => this.duplicateLight(li.id)),
          act('trash', 'Eliminar', () => this.removeLight(li.id)), vis), !li.enabled);
    });
    this.layersEl.replaceChildren(
      ...items,
      ...(items.length ? [] : [h('p', { class: 'sx-empty' }, 'Sin formas. Añade una para empezar.')]),
      h('div', { class: 'sx-sep' }),
      h('div', { class: 'sx-panel__title sx-panel__title--row' }, h('span', {}, 'Símbolos'),
        h('span', { class: 'sx-row-btns' },
          h('button', { class: 'sx-chip', title: 'Convierte la capa seleccionada en un símbolo (Ctrl+G)', onclick: () => this.makeSymbol(this.layer) }, icon('plus'), 'Símbolo'))),
      ...groupRows,
      ...(groupRows.length ? [] : [h('p', { class: 'sx-empty' }, 'Selecciona una capa y pulsa “Símbolo” para agruparla, repetirla y transformarla como un todo.')]),
      h('div', { class: 'sx-sep' }),
      h('div', { class: 'sx-panel__title sx-panel__title--row' }, h('span', {}, 'Luces espaciales'),
        h('span', { class: 'sx-row-btns' },
          h('button', { class: 'sx-chip', title: 'Luz radial', onclick: () => this.addLight('radial') }, icon('plus'), 'Radial'),
          h('button', { class: 'sx-chip', title: 'Franja de luz', onclick: () => this.addLight('linear') }, icon('plus'), 'Franja'))),
      ...lightRows,
      ...(lightRows.length ? [] : [h('p', { class: 'sx-empty' }, 'Sin luces. Las formas con material “Luz espacial” las necesitan para cobrar volumen.')]),
      h('div', { class: 'sx-sep' }),
      row({ kind: 'background' }, icon('bg', 'sx-ico--shape'), 'Fondo', 'Degradado de malla', null),
      row({ kind: 'finish' }, icon('finish', 'sx-ico--shape'), 'Acabado', 'Color, grano, viñeta, velocidad', null),
    );
  }

  /* inspector -------------------------------------------------------------------------------- */
  private bindings: Binding[] = [];

  /** refresh slider positions after external edits (drag/wheel) without rebuilding the panel */
  private syncInspectorValues() {
    for (const b of this.bindings) {
      if (b.path && this.scene.anims[b.path]) continue;
      const v = b.get();
      if (document.activeElement !== b.num) b.num.value = String(+v.toFixed(3));
      b.input.value = String(v);
    }
  }

  private slider(def: Pick<ParamDef, 'label' | 'min' | 'max' | 'step' | 'default'> & { angle?: boolean }, get: () => number, set: (v: number) => void, path?: string) {
    const fmt = (v: number) => String(+v.toFixed(def.step >= 1 ? 0 : 3));
    const input = h('input', { type: 'range', min: String(def.min), max: String(def.max), step: String(def.step), value: String(get()), class: 'sx-range' }) as HTMLInputElement;
    const num = h('input', { type: 'number', min: String(def.min), max: String(def.max), step: String(def.step), value: fmt(get()), class: 'sx-num' }) as HTMLInputElement;
    const paintValue = (v: number) => { const t = (v - def.min) / (def.max - def.min); input.style.setProperty('--fill', `${Math.max(0, Math.min(1, t)) * 100}%`); };
    const paint = () => paintValue(get());
    let recorded = false;
    const apply = (v: number, commit: boolean) => {
      if (!Number.isFinite(v)) return;
      if (!recorded) { this.record(); recorded = true; }
      set(v);
      paint();
      if (commit) { recorded = false; this.changed(); }
    };
    input.addEventListener('input', () => { apply(parseFloat(input.value), false); num.value = fmt(get()); });
    input.addEventListener('change', () => apply(parseFloat(input.value), true));
    num.addEventListener('change', () => { const v = Math.min(def.max * 4, Math.max(def.min - Math.abs(def.max), parseFloat(num.value))); apply(v, true); input.value = String(get()); });
    const label = h('label', { class: 'sx-field__label', title: 'Doble clic para restablecer' }, def.label);
    label.addEventListener('dblclick', () => { apply(def.default, true); input.value = String(get()); num.value = fmt(get()); });
    paint();
    const field = h('div', { class: 'sx-field' });
    const binding: Binding = { input, num, get, path, fmt, paint: paintValue };
    this.bindings.push(binding);

    if (!path) {
      field.append(label, h('div', { class: 'sx-field__ctl' }, input, num));
      return field;
    }
    // ping-pong animation: the value travels min → max → min … and the slider shows it live
    const animRow = h('div', { class: 'sx-anim' });
    const animBtn = h('button', { class: 'sx-animbtn', title: 'Animar: ir y volver entre un mínimo y un máximo' }, '↔') as HTMLButtonElement;
    const renderAnim = () => {
      const a = this.scene.anims[path];
      field.classList.toggle('is-animated', !!a);
      animBtn.classList.toggle('is-on', !!a);
      input.disabled = !!a;
      num.disabled = !!a;
      if (!a) { animRow.replaceChildren(); return; }
      const box = (lbl: string, k: 'min' | 'max' | 'speed', step: number) => {
        const n = h('input', { type: 'number', step: String(step), value: String(+a[k].toFixed(4)), class: 'sx-num sx-num--sm' }) as HTMLInputElement;
        n.addEventListener('change', () => {
          const v = parseFloat(n.value);
          if (!Number.isFinite(v)) return;
          this.record(); a[k] = v; this.changed();
        });
        return h('label', { class: 'sx-anim__box' }, h('span', {}, lbl), n);
      };
      animRow.replaceChildren(box('Mín', 'min', def.step), box('Máx', 'max', def.step), box('Vel', 'speed', 0.01));
    };
    animBtn.addEventListener('click', () => {
      this.record();
      if (this.scene.anims[path]) {
        delete this.scene.anims[path];
      } else {
        const v = get(), span = (def.max - def.min) * 0.25;
        const min = +Math.max(def.min, v - span).toFixed(4), max = +Math.min(def.max, v + span).toFixed(4);
        this.scene.anims[path] = { min, max, speed: 0.25, phase: max > min ? (v - min) / (max - min) : 0 };
      }
      renderAnim();
      this.changed();
    });
    renderAnim();
    field.append(label, h('div', { class: 'sx-field__ctl' }, input, num, animBtn), animRow);
    return field;
  }

  private color(label: string, get: () => Hex, set: (v: Hex) => void) {
    const input = h('input', { type: 'color', value: get(), class: 'sx-color' }) as HTMLInputElement;
    let recorded = false;
    input.addEventListener('input', () => { if (!recorded) { this.record(); recorded = true; } set(input.value); hex.textContent = input.value; });
    input.addEventListener('change', () => { recorded = false; this.changed(); });
    const hex = h('span', { class: 'sx-hex' }, get());
    return h('label', { class: 'sx-swatch', title: label }, input, hex);
  }

  private select<T extends string>(label: string, options: [T, string][], get: () => T, set: (v: T) => void) {
    const s = h('select', { class: 'sx-select sx-select--full' }, ...options.map(([v, l]) => h('option', { value: v }, l))) as HTMLSelectElement;
    s.value = get();
    s.addEventListener('change', () => { this.record(); set(s.value as T); this.changed(); });
    return h('div', { class: 'sx-field' }, h('label', { class: 'sx-field__label' }, label), s);
  }

  private section(title: string, open: boolean, extra: HTMLElement | null, ...kids: (HTMLElement | null)[]) {
    const d = h('details', { class: 'sx-section', open }, h('summary', {}, h('span', {}, title), extra), ...kids.filter(Boolean) as HTMLElement[]);
    return d;
  }

  private renderInspector() {
    this.bindings = [];
    const sel = this.sel;
    if (sel.kind === 'background') return this.inspectorEl.replaceChildren(...this.backgroundInspector());
    if (sel.kind === 'finish') return this.inspectorEl.replaceChildren(...this.finishInspector());
    if (sel.kind === 'light') { const li = this.light; if (li) return this.inspectorEl.replaceChildren(...this.lightInspector(li)); }
    if (sel.kind === 'group') { const g = this.group; if (g) return this.inspectorEl.replaceChildren(...this.groupInspector(g)); }
    const l = this.layer;
    if (!l) return this.inspectorEl.replaceChildren(h('p', { class: 'sx-empty' }, 'Selecciona una capa.'));
    this.inspectorEl.replaceChildren(...this.layerInspector(l));
  }

  private layerInspector(l: Layer): HTMLElement[] {
    const name = h('input', { class: 'sx-title-input', value: l.name, spellcheck: false }) as HTMLInputElement;
    name.addEventListener('change', () => { this.record(); l.name = name.value.trim() || 'Capa'; this.renderLayers(); this.changed(); });

    const shapeDef = SHAPES[l.shape.type], shadeDef = SHADES[l.shade.type];
    const shapeSel = this.select<ShapeType>('Tipo de forma', (Object.keys(SHAPES) as ShapeType[]).map(k => [k, SHAPES[k].label]), () => l.shape.type, v => {
      const keep = l.shape.params.count;
      l.shape = { type: v, params: defaults(SHAPES[v].params) };
      if (keep !== undefined && 'count' in l.shape.params) l.shape.params.count = Math.min(keep, SHAPES[v].params[0].max);
      this.renderLayers(); this.renderInspector();
    });
    const shadeSel = this.select<ShadeType>('Material', (Object.keys(SHADES) as ShadeType[]).map(k => [k, SHADES[k].label]), () => l.shade.type, v => {
      const flow = l.shade.params.flow;
      l.shade = { type: v, params: { ...defaults(SHADES[v].params), flow: flow ?? 0.08 }, palette: l.shade.palette };
      if (v === 'lit') this.ensureLights();
      if (v === 'glow' && l.blend === 'normal') l.blend = 'add';
      if (v !== 'glow' && l.blend === 'add') l.blend = 'normal';
      this.renderLayers(); this.renderInspector();
    });

    const paramSliders = (defs: ParamDef[], bag: Record<string, number>, prefix: string) => {
      const out: HTMLElement[] = [];
      let group: string | undefined;
      for (const d of defs) {
        if (d.group && d.group !== group) { group = d.group; out.push(h('div', { class: 'sx-subhead' }, d.group)); }
        out.push(this.slider(d, () => bag[d.key] ?? d.default, v => { bag[d.key] = d.int ? Math.round(v) : v; }, `${prefix}.${d.key}`));
      }
      return out;
    };

    const palette = h('div', { class: 'sx-palette' },
      ...[0, 1, 2].map(k => this.color(['Sombra', 'Medio', 'Luz'][k], () => l.shade.palette[k], v => { l.shade.palette[k] = v; })));
    const litNote = l.shade.type === 'lit'
      ? h('p', { class: 'sx-hintline' }, 'La paleta se recorre según cuánta luz llega: sombra sin luz, luz donde la luz es intensa. El borde toma el color de la luz más cercana.')
      : null;
    const palBtn = h('button', { class: 'sx-chip', onclick: () => { this.record(); l.shade.palette = randomPalette(); this.renderInspector(); this.changed(); } }, icon('dice'), 'Paleta aleatoria');
    const rndBtn = h('button', { class: 'sx-chip', title: 'Valores aleatorios dentro de rangos seguros', onclick: (e: Event) => { e.preventDefault(); this.randomizeLayer(l); } }, icon('dice'), 'Aleatorio');

    const T = l.transform;
    return [
      h('div', { class: 'sx-inspector__head' }, icon(l.shape.type as keyof typeof ICON, 'sx-ico--shape sx-ico--lg'), name),
      h('p', { class: 'sx-hintline' }, shapeDef.hint),
      this.section('Forma', true, rndBtn, shapeSel, ...paramSliders(shapeDef.params, l.shape.params, `${l.id}.shape`)),
      this.section('Material', true, null, shadeSel, h('div', { class: 'sx-field' }, h('label', { class: 'sx-field__label' }, 'Paleta'), palette), h('div', { class: 'sx-row-end' }, palBtn), litNote, ...paramSliders(shadeDef.params, l.shade.params, `${l.id}.shade`)),
      this.section('Movimiento orgánico', false, null,
        this.slider({ label: 'Intensidad del ruido', min: 0, max: 0.5, step: 0.005, default: 0.04 }, () => l.warp.amount, v => { l.warp.amount = v; }, `${l.id}.warp.amount`),
        this.slider({ label: 'Escala del ruido', min: 0.2, max: 8, step: 0.05, default: 1.5 }, () => l.warp.scale, v => { l.warp.scale = v; }, `${l.id}.warp.scale`),
        this.slider({ label: 'Velocidad', min: 0, max: 2, step: 0.01, default: 0.15 }, () => l.warp.speed, v => { l.warp.speed = v; }, `${l.id}.warp.speed`)),
      this.section('Deformación', Object.entries(l.deform).some(([k, v]) => ['twist', 'bend', 'wave', 'pinch'].includes(k) && v !== 0), null,
        h('p', { class: 'sx-hintline' }, 'Distorsiona la forma como los filtros de Photoshop. Usa ↔ para que vaya y vuelva.'),
        this.slider({ label: 'Remolino', min: -8, max: 8, step: 0.01, default: 0 }, () => l.deform.twist, v => { l.deform.twist = v; }, `${l.id}.deform.twist`),
        this.slider({ label: 'Radio del remolino', min: 0.05, max: 1.5, step: 0.01, default: 0.5 }, () => l.deform.twistRadius, v => { l.deform.twistRadius = v; }, `${l.id}.deform.twistRadius`),
        this.slider({ label: 'Curvar', min: -4, max: 4, step: 0.01, default: 0 }, () => l.deform.bend, v => { l.deform.bend = v; }, `${l.id}.deform.bend`),
        this.slider({ label: 'Ondular', min: 0, max: 0.3, step: 0.002, default: 0 }, () => l.deform.wave, v => { l.deform.wave = v; }, `${l.id}.deform.wave`),
        this.slider({ label: 'Frecuencia de onda', min: 0.5, max: 40, step: 0.1, default: 6 }, () => l.deform.waveFreq, v => { l.deform.waveFreq = v; }, `${l.id}.deform.waveFreq`),
        this.slider({ label: 'Velocidad de onda', min: -6, max: 6, step: 0.01, default: 1 }, () => l.deform.waveSpeed, v => { l.deform.waveSpeed = v; }, `${l.id}.deform.waveSpeed`),
        this.slider({ label: 'Inflar (+) · pellizcar (−)', min: -0.9, max: 0.9, step: 0.01, default: 0 }, () => l.deform.pinch, v => { l.deform.pinch = v; }, `${l.id}.deform.pinch`)),
      this.section('Máscara', !!l.mask.source, null,
        this.select<string>('Recortar con la forma de', [['', 'Sin máscara'], ...this.scene.layers.filter(o => o.id !== l.id).map(o => [o.id, `${o.name}${o.visible ? '' : ' (oculta)'}`] as [string, string])],
          () => l.mask.source ?? '', v => { l.mask.source = v || null; this.renderLayers(); this.renderInspector(); }),
        l.mask.source ? this.select<string>('Mostrar', [['in', 'Dentro de la forma'], ['out', 'Fuera de la forma']], () => l.mask.invert ? 'out' : 'in', v => { l.mask.invert = v === 'out'; }) : null,
        l.mask.source ? this.slider({ label: 'Suavizado del borde', min: 0, max: 0.15, step: 0.001, default: 0 }, () => l.mask.feather, v => { l.mask.feather = v; }, `${l.id}.mask.feather`) : null,
        h('p', { class: 'sx-hintline' }, 'La capa que hace de máscara puede estar oculta: solo se usa su contorno.')),
      this.section('Símbolo', !!l.group, null,
        this.select<string>('Pertenece a', [['', 'Ninguno'], ...this.scene.groups.map(g => [g.id, g.name] as [string, string]), ['__new', '+ Nuevo símbolo con esta capa']],
          () => l.group ?? '', v => {
            if (v === '__new') { this.makeSymbol(l); return; }
            l.group = v || null;
            this.renderLayers(); this.renderInspector(); this.updateMarker();
          }),
        l.group ? h('div', { class: 'sx-row-end' }, h('button', { class: 'sx-chip', onclick: () => { this.sel = { kind: 'group', id: l.group! }; this.renderLayers(); this.renderInspector(); this.updateMarker(); } }, icon('symbol'), 'Editar símbolo')) : null),
      this.section('Posición', false, null,
        this.slider({ label: 'Horizontal', min: -1.5, max: 1.5, step: 0.005, default: 0 }, () => T.x, v => { T.x = v; this.updateMarker(); }, `${l.id}.transform.x`),
        this.slider({ label: 'Vertical', min: -1, max: 1, step: 0.005, default: 0 }, () => T.y, v => { T.y = v; this.updateMarker(); }, `${l.id}.transform.y`),
        this.slider({ label: 'Rotación', min: -3.1416, max: 3.1416, step: 0.01, default: 0 }, () => T.rotation, v => { T.rotation = v; }, `${l.id}.transform.rotation`),
        this.slider({ label: 'Escala', min: 0.1, max: 4, step: 0.01, default: 1 }, () => T.scale, v => { T.scale = v; }, `${l.id}.transform.scale`),
        this.slider({ label: 'Desenfoque', min: 0, max: 0.2, step: 0.001, default: 0 }, () => T.blur, v => { T.blur = v; }, `${l.id}.transform.blur`)),
      this.section('Mezcla', true, null,
        this.select<BlendMode>('Modo', BLENDS, () => l.blend, v => { l.blend = v; }),
        this.slider({ label: 'Opacidad', min: 0, max: 1, step: 0.01, default: 1 }, () => l.opacity, v => { l.opacity = v; }, `${l.id}.opacity`)),
    ];
  }

  private groupInspector(g: Group): HTMLElement[] {
    const name = h('input', { class: 'sx-title-input', value: g.name, spellcheck: false }) as HTMLInputElement;
    name.addEventListener('change', () => { this.record(); g.name = name.value.trim() || 'Símbolo'; this.renderLayers(); this.changed(); });
    const members = this.scene.layers.filter(l => l.group === g.id);
    const others = this.scene.layers.filter(l => l.group !== g.id);
    const addSel = h('select', { class: 'sx-select sx-select--full' }, h('option', { value: '' }, 'Añadir capa al símbolo…'), ...others.map(o => h('option', { value: o.id }, o.name))) as HTMLSelectElement;
    addSel.addEventListener('change', () => {
      const l = this.scene.layers.find(x => x.id === addSel.value);
      if (!l) return;
      this.record();
      // keep it where it is on screen
      l.transform.x = +((l.transform.x - g.x) / g.scale).toFixed(3); l.transform.y = +((l.transform.y - g.y) / g.scale).toFixed(3);
      l.group = g.id;
      this.renderLayers(); this.renderInspector(); this.changed();
    });
    const P = (k: string) => `${g.id}.${k}`;
    return [
      h('div', { class: 'sx-inspector__head' }, icon('symbol', 'sx-ico--shape sx-ico--lg sx-ico--symbol'), name),
      h('p', { class: 'sx-hintline' }, 'Un símbolo agrupa capas que se mueven, giran y escalan juntas, y puede repetirse. Arrastra sobre la vista para moverlo.'),
      this.section('Capas', true, null,
        h('div', { class: 'sx-members' }, ...members.map(m => h('button', { class: 'sx-chip', onclick: () => { this.sel = { kind: 'layer', id: m.id }; this.renderLayers(); this.renderInspector(); this.updateMarker(); } }, icon(m.shape.type as keyof typeof ICON), m.name))),
        others.length ? addSel : null),
      this.section('Repetición', true, null,
        this.slider({ label: 'Copias', min: 1, max: MAX_REPEAT, step: 1, default: 1 }, () => g.count, v => { g.count = Math.round(v); this.renderLayers(); }, P('count')),
        this.select<Group['mode']>('Disposición', [['radial', 'En círculo (alrededor del centro)'], ['linear', 'En fila']], () => g.mode, v => { g.mode = v; this.renderInspector(); }),
        g.mode === 'linear' ? this.slider({ label: 'Separación', min: 0, max: 1, step: 0.005, default: 0.3 }, () => g.spacing, v => { g.spacing = v; }, P('spacing')) : null,
        this.slider({ label: 'Escala por copia', min: 0.5, max: 1.5, step: 0.01, default: 1 }, () => g.scaleStep, v => { g.scaleStep = v; }, P('scaleStep'))),
      this.section('Transformación', true, null,
        this.slider({ label: 'Horizontal', min: -1.5, max: 1.5, step: 0.005, default: 0 }, () => g.x, v => { g.x = v; this.updateMarker(); }, P('x')),
        this.slider({ label: 'Vertical', min: -1, max: 1, step: 0.005, default: 0 }, () => g.y, v => { g.y = v; this.updateMarker(); }, P('y')),
        this.slider({ label: 'Rotación', min: -3.1416, max: 3.1416, step: 0.01, default: 0 }, () => g.rotation, v => { g.rotation = v; }, P('rotation')),
        this.slider({ label: 'Escala', min: 0.1, max: 4, step: 0.01, default: 1 }, () => g.scale, v => { g.scale = v; this.updateMarker(); }, P('scale')),
        this.slider({ label: 'Giro continuo (rad/s)', min: -3, max: 3, step: 0.01, default: 0 }, () => g.spin, v => { g.spin = v; }, P('spin'))),
      h('div', { class: 'sx-row-end' }, h('button', { class: 'sx-chip', onclick: () => this.removeGroup(g.id) }, icon('trash'), 'Desagrupar')),
    ];
  }

  private lightInspector(li: Light): HTMLElement[] {
    const name = h('input', { class: 'sx-title-input', value: li.name, spellcheck: false }) as HTMLInputElement;
    name.addEventListener('change', () => { this.record(); li.name = name.value.trim() || 'Luz'; this.renderLayers(); this.changed(); });
    const ico = icon(li.kind === 'linear' ? 'linear' : 'light', 'sx-ico--shape sx-ico--lg sx-ico--light');
    ico.style.setProperty('--c', li.color);
    const moved = () => this.renderLightHandles();
    return [
      h('div', { class: 'sx-inspector__head' }, ico, name),
      h('p', { class: 'sx-hintline' }, 'Las luces viven en la escena. Cada forma con “Luz espacial” las lee desde su contorno: arrastra la luz sobre la vista y mira cómo el reflejo recorre el borde.'),
      this.section('Luz', true, null,
        this.select<Light['kind']>('Tipo', [['radial', 'Radial (foco)'], ['linear', 'Franja (línea de luz)']], () => li.kind, v => { li.kind = v; this.renderLayers(); this.renderInspector(); }),
        h('div', { class: 'sx-field' }, h('label', { class: 'sx-field__label' }, 'Color'), this.color('Color', () => li.color, v => { li.color = v; moved(); })),
        this.slider({ label: 'Intensidad', min: 0, max: 4, step: 0.01, default: 1.2 }, () => li.intensity, v => { li.intensity = v; }, `${li.id}.intensity`),
        this.slider({ label: li.kind === 'linear' ? 'Grosor de la franja' : 'Radio', min: 0.02, max: 1.5, step: 0.005, default: 0.45 }, () => li.radius, v => { li.radius = v; }, `${li.id}.radius`),
        li.kind === 'radial' ? this.slider({ label: 'Proporción elíptica', min: 0.15, max: 3, step: 0.01, default: 1 }, () => li.aspect, v => { li.aspect = v; }, `${li.id}.aspect`) : null,
        this.slider({ label: 'Rotación', min: -3.1416, max: 3.1416, step: 0.01, default: 0 }, () => li.rotation, v => { li.rotation = v; }, `${li.id}.rotation`),
        this.slider({ label: 'Altura (rasante ↔ cenital)', min: 0.02, max: 1.5, step: 0.01, default: 0.35 }, () => li.height, v => { li.height = v; }, `${li.id}.height`)),
      this.section('Posición y recorrido', true, null,
        this.slider({ label: 'Horizontal', min: -1.5, max: 1.5, step: 0.005, default: 0 }, () => li.x, v => { li.x = v; moved(); }, `${li.id}.x`),
        this.slider({ label: 'Vertical', min: -1, max: 1, step: 0.005, default: 0 }, () => li.y, v => { li.y = v; moved(); }, `${li.id}.y`),
        this.slider({ label: 'Radio de órbita', min: 0, max: 0.8, step: 0.005, default: 0.12 }, () => li.orbit, v => { li.orbit = v; moved(); }, `${li.id}.orbit`),
        this.slider({ label: 'Velocidad de órbita', min: -2, max: 2, step: 0.01, default: 0.35 }, () => li.speed, v => { li.speed = v; }, `${li.id}.speed`),
        this.slider({ label: 'Desfase', min: 0, max: 6.283, step: 0.01, default: 0 }, () => li.phase, v => { li.phase = v; }, `${li.id}.phase`)),
    ];
  }

  private backgroundInspector(): HTMLElement[] {
    const bg = this.scene.background;
    return [
      h('div', { class: 'sx-inspector__head' }, icon('bg', 'sx-ico--shape sx-ico--lg'), h('strong', { class: 'sx-title' }, 'Fondo')),
      h('p', { class: 'sx-hintline' }, 'Un color base y cuatro focos de color que se mezclan y derivan lentamente.'),
      this.section('Base', true, null,
        h('div', { class: 'sx-field' }, h('label', { class: 'sx-field__label' }, 'Color base'), this.color('Base', () => bg.base, v => { bg.base = v; this.cardEl.style.background = v; })),
        this.slider({ label: 'Deriva', min: 0, max: 1, step: 0.01, default: 0.1 }, () => bg.drift, v => { bg.drift = v; }, 'bg.drift')),
      ...bg.points.map((pt, k) => this.section(`Foco ${k + 1}`, k < 2,
        h('span', { class: 'sx-dot', style: `background:${pt.color}` }),
        h('div', { class: 'sx-field' }, h('label', { class: 'sx-field__label' }, 'Color'), this.color('Color', () => pt.color, v => { pt.color = v; })),
        this.slider({ label: 'Tamaño (0 = apagado)', min: 0, max: 1.5, step: 0.01, default: 0.5 }, () => pt.radius, v => { pt.radius = v; }, `bg.p${k}.radius`),
        this.slider({ label: 'Horizontal', min: -1.5, max: 1.5, step: 0.01, default: 0 }, () => pt.x, v => { pt.x = v; }, `bg.p${k}.x`),
        this.slider({ label: 'Vertical', min: -1, max: 1, step: 0.01, default: 0 }, () => pt.y, v => { pt.y = v; }, `bg.p${k}.y`))),
    ];
  }

  private finishInspector(): HTMLElement[] {
    const f = this.scene.finish;
    const s = this.scene;
    return [
      h('div', { class: 'sx-inspector__head' }, icon('finish', 'sx-ico--shape sx-ico--lg'), h('strong', { class: 'sx-title' }, 'Acabado')),
      h('p', { class: 'sx-hintline' }, 'Se aplica a toda la pieza. Aquí vive buena parte del “look” de producto.'),
      this.section('Color', true, null,
        this.slider({ label: 'Exposición', min: 0.2, max: 3, step: 0.01, default: 1 }, () => f.exposure, v => { f.exposure = v; }, 'finish.exposure'),
        this.slider({ label: 'Suavizar brillos', min: 0, max: 1, step: 0.01, default: 0.8 }, () => f.tonemap, v => { f.tonemap = v; }, 'finish.tonemap'),
        this.slider({ label: 'Contraste', min: 0.5, max: 1.6, step: 0.01, default: 1.04 }, () => f.contrast, v => { f.contrast = v; }, 'finish.contrast'),
        this.slider({ label: 'Saturación', min: 0, max: 2, step: 0.01, default: 1.05 }, () => f.saturation, v => { f.saturation = v; }, 'finish.saturation')),
      this.section('Textura', true, null,
        this.slider({ label: 'Viñeta', min: 0, max: 1, step: 0.01, default: 0.18 }, () => f.vignette, v => { f.vignette = v; }, 'finish.vignette'),
        this.slider({ label: 'Grano', min: 0, max: 1, step: 0.01, default: 0.22 }, () => f.grain, v => { f.grain = v; }, 'finish.grain')),
      this.section('Pieza', true, null,
        this.slider({ label: 'Velocidad general', min: 0, max: 3, step: 0.01, default: 1 }, () => s.speed, v => { s.speed = v; }),
        this.slider({ label: 'Radio de esquinas (px)', min: 0, max: 60, step: 1, default: 22 }, () => s.radius, v => { s.radius = v; this.cardEl.style.borderRadius = `${v}px`; }),
        this.slider({ label: 'Proporción (ancho / alto)', min: 0.4, max: 3, step: 0.01, default: 1.6 }, () => s.aspect, v => { s.aspect = v; this.layoutCard(); this.aspectSelect.value = String(this.nearestAspect()); })),
    ];
  }

  /* exploration ------------------------------------------------------------------------------ */
  private randomizeLayer(l: Layer) {
    this.record();
    const roll = (defs: ParamDef[], bag: Record<string, number>) => {
      for (const d of defs) {
        if (d.key === 'seed') { bag.seed = Math.round(rand(0, 100)); continue; }
        if (d.angle) { bag[d.key] = rand(0, Math.PI * 2); continue; }
        const [a, b] = d.safe ?? [d.min, d.max];
        const v = rand(a, b);
        bag[d.key] = d.int ? Math.round(v) : +v.toFixed(4);
      }
    };
    roll(SHAPES[l.shape.type].params, l.shape.params);
    roll(SHADES[l.shade.type].params, l.shade.params);
    this.renderInspector();
    this.changed();
  }

  /** small nudge around current values: explore without losing the look */
  private vary() {
    const l = this.layer;
    if (!l) { this.toast('Selecciona una capa para variarla'); return; }
    this.record();
    const nudge = (defs: ParamDef[], bag: Record<string, number>) => {
      for (const d of defs) {
        if (d.key === 'seed' || d.key === 'count') continue;
        const [a, b] = d.safe ?? [d.min, d.max];
        const v = (bag[d.key] ?? d.default) + (b - a) * rand(-0.15, 0.15);
        bag[d.key] = d.int ? Math.round(Math.min(d.max, Math.max(d.min, v))) : +Math.min(d.max, Math.max(d.min, v)).toFixed(4);
      }
    };
    nudge(SHAPES[l.shape.type].params, l.shape.params);
    nudge(SHADES[l.shade.type].params, l.shade.params);
    this.renderInspector();
    this.changed();
  }

  /* import / export -------------------------------------------------------------------------- */
  private modal(title: string, body: HTMLElement[], foot: HTMLElement[]) {
    const close = () => wrap.remove();
    const wrap = h('div', { class: 'sx-modal', onclick: (e: Event) => { if (e.target === wrap) close(); } },
      h('div', { class: 'sx-modal__box', role: 'dialog', 'aria-label': title },
        h('div', { class: 'sx-modal__head' }, h('strong', {}, title), h('button', { class: 'sx-iconbtn', title: 'Cerrar', onclick: close }, '✕')),
        ...body,
        h('div', { class: 'sx-modal__foot' }, ...foot)));
    wrap.addEventListener('keydown', e => { if ((e as KeyboardEvent).key === 'Escape') close(); });
    this.root.append(wrap);
    return close;
  }

  private openExport() {
    const share = () => `${location.href.split('#')[0]}#s=${encodeScene(this.scene)}`;
    const tabs: [string, string, () => string, string][] = [
      ['embed', 'Insertar en web', () => toEmbed(this.scene), 'Pega este bloque en cualquier HTML. No necesita instalar nada: se pausa fuera de pantalla y respeta “reducir movimiento”.'],
      ['glsl', 'Shadertoy', () => toShadertoy(this.scene), 'Pega en la pestaña “Image” de Shadertoy. Es el mismo shader que ves aquí, con los valores fijados.'],
      ['json', 'JSON', () => toJSON(this.scene), 'La pieza en formato Shadex 0.1. Puedes volver a importarla o versionarla en tu repositorio.'],
      ['link', 'Enlace', share, 'Quien abra este enlace verá la pieza en el editor, lista para modificar. No se guarda nada en ningún servidor.'],
    ];
    const ext: Record<string, string> = { embed: 'html', glsl: 'glsl', json: 'json', link: 'txt' };
    let current = tabs[0];
    const area = h('textarea', { class: 'sx-code', readOnly: true, spellcheck: false }) as HTMLTextAreaElement;
    const note = h('p', { class: 'sx-hintline' });
    const size = h('span', { class: 'sx-dim' });
    const tabBar = h('div', { class: 'sx-tabs' });
    const show = (t: typeof tabs[number]) => {
      current = t;
      area.value = t[2]();
      note.textContent = t[3];
      size.textContent = `${(new Blob([area.value]).size / 1024).toFixed(1)} KB`;
      tabBar.querySelectorAll('button').forEach(b => b.classList.toggle('is-active', b.dataset.k === t[0]));
    };
    tabs.forEach(t => tabBar.append(h('button', { class: 'sx-tab', 'data-k': t[0], onclick: () => show(t) }, t[1])));
    const copy = h('button', { class: 'sx-btn sx-btn--primary', onclick: () => this.copy(area) }, 'Copiar');
    const download = h('button', {
      class: 'sx-btn', onclick: () => {
        const slug = this.scene.name.toLowerCase().normalize('NFD').replace(/[^\w]+/g, '-').replace(/^-|-$/g, '') || 'shadex';
        const a = h('a', { href: URL.createObjectURL(new Blob([area.value], { type: 'text/plain' })), download: `${slug}.${ext[current[0]]}` });
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      },
    }, 'Descargar');
    this.modal('Exportar', [tabBar, note, area], [size, h('span', { class: 'sx-grow' }), download, copy]);
    show(tabs[0]);
  }

  private openImport() {
    const area = h('textarea', { class: 'sx-code', spellcheck: false, placeholder: 'Pega aquí un JSON de Shadex o un enlace compartido…' }) as HTMLTextAreaElement;
    const file = h('input', { type: 'file', accept: '.json,application/json', class: 'sx-file' }) as HTMLInputElement;
    file.addEventListener('change', async () => { const f = file.files?.[0]; if (f) area.value = await f.text(); });
    const close = this.modal('Importar', [h('p', { class: 'sx-hintline' }, 'Acepta un JSON exportado desde Shadex, un archivo .json o un enlace con #s=…'), area, file], [
      h('span', { class: 'sx-grow' }),
      h('button', {
        class: 'sx-btn sx-btn--primary', onclick: () => {
          const txt = area.value.trim();
          const m = /[#&]s=([A-Za-z0-9_-]+)/.exec(txt);
          let s: Scene | null = null;
          if (m) s = decodeScene(m[1]);
          else { try { s = validateScene(JSON.parse(txt)); } catch { s = null; } }
          if (!s) { this.toast('No reconozco ese contenido como una pieza Shadex'); return; }
          this.setScene(s);
          close();
          this.toast('Pieza importada');
        },
      }, 'Importar'),
    ]);
    setTimeout(() => area.focus(), 30);
  }

  private async copy(area: HTMLTextAreaElement) {
    try {
      await navigator.clipboard.writeText(area.value);
      this.toast('Copiado');
    } catch {
      area.focus();
      area.select();
      const ok = document.execCommand?.('copy');
      this.toast(ok ? 'Copiado' : 'Selecciónalo y copia con Ctrl+C');
    }
  }

  private toast(msg: string) {
    this.toastEl.textContent = msg;
    this.toastEl.classList.add('is-on');
    clearTimeout((this.toastEl as unknown as { _t: number })._t);
    (this.toastEl as unknown as { _t: number })._t = window.setTimeout(() => this.toastEl.classList.remove('is-on'), 1800);
  }
}
