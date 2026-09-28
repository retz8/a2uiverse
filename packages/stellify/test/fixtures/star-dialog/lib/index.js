import {createRoot} from 'react-dom/client';
import './dialog.css';

export function openDialog(container) {
  return createRoot(container);
}
