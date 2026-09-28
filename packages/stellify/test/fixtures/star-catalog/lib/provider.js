import {useEffect, useState} from 'react';
import {jsx} from 'react/jsx-runtime';

let themeLoaded;

/** The theme, loaded once, the way the seven catalog packages load theirs. */
export function loadTheme() {
  themeLoaded ??= import('./theme.css');
  return themeLoaded;
}

export function Provider({children}) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let alive = true;
    loadTheme().then(() => alive && setReady(true));
    return () => {
      alive = false;
    };
  }, []);
  return ready ? jsx('div', {className: 'star-catalog', children}) : null;
}
