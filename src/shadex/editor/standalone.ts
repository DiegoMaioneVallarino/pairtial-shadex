/** Standalone editor page entry (the public Shadex site). */
import { ShadexEditor } from './editor';
import './editor.css';

const host = document.getElementById('shadex') ?? document.body;
new ShadexEditor(host);
