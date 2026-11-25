import { useState } from 'react';
import { Lab } from '../lab/Lab';
import { MaterialLab } from '../material-lab/MaterialLab';
import { ShadexEditorView } from '../shadex/editor/ShadexEditorView';
import './App.css';

type View = 'editor' | 'lab' | 'materials';

export function App() {
  const [view, setView] = useState<View>('editor');
  if (view === 'editor') return <ShadexEditorView onBack={() => setView('lab')} />;
  return <main className="app">
    {view === 'lab' ? <>
      <button className="app__editor-launch" onClick={() => setView('editor')}>✦ Editor Shadex</button>
      <button className="app__material-launch" onClick={() => setView('materials')}>◈ Abrir Material Lab</button>
      <Lab />
    </> : <MaterialLab onBack={() => setView('lab')} />}
  </main>;
}
