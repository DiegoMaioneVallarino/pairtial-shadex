import { useState } from 'react';
import { Lab } from '../lab/Lab';
import { MaterialLab } from '../material-lab/MaterialLab';
import './App.css';

export function App() {
  const [window, setWindow] = useState<'lab' | 'materials'>('lab');
  return <main className="app">
    {window === 'lab' ? <>
      <button className="app__material-launch" onClick={() => setWindow('materials')}>◈ Abrir Material Lab</button>
      <Lab />
    </> : <MaterialLab onBack={() => setWindow('lab')} />}
  </main>;
}
