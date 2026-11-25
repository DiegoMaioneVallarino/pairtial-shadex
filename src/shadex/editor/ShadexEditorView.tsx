/** React wrapper: mounts the framework-free editor inside your app. */
import { useEffect, useRef } from 'react';
import { ShadexEditor } from './editor';
import type { Scene } from '../core/ir';
import './editor.css';

export function ShadexEditorView({ scene, onChange, onBack }: { scene?: Scene; onChange?: (s: Scene) => void; onBack?: () => void }) {
  const host = useRef<HTMLDivElement>(null);
  const cb = useRef(onChange);
  cb.current = onChange;
  useEffect(() => {
    if (!host.current) return;
    const editor = new ShadexEditor(host.current, { scene, onChange: s => cb.current?.(s) });
    return () => editor.destroy();
    // the editor owns its state after mount; pass a new `key` to start over with another scene
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 10 }}>
      {onBack && (
        <button onClick={onBack} style={{ position: 'absolute', zIndex: 70, left: 16, bottom: 14, height: 30, padding: '0 12px', borderRadius: 9, border: '1px solid rgba(255,255,255,.14)', background: 'rgba(20,21,30,.9)', color: '#fff', cursor: 'pointer' }}>
          ← Volver al Lab
        </button>
      )}
      <div ref={host} style={{ width: '100%', height: '100%' }} />
    </div>
  );
}
