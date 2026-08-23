/**
 * The command palette: language input as a summonable overlay — summon, speak, dismiss.
 * The palette never blocks: an utterance while a paint is in flight is last-intent-wins — the
 * wiring cancels the in-flight paint and dispatches.
 */
import {useEffect, useRef, useState} from 'react';
import {TextField} from '@radix-ui/themes';

export interface PaletteProps {
  open: boolean;
  onDismiss: () => void;
  onSubmit: (utterance: string) => void;
}

export function Palette({open, onDismiss, onSubmit}: PaletteProps) {
  const [text, setText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // Escape works wherever focus is — clicking outside the overlay must not trap the user.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onDismiss();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onDismiss]);

  if (!open) return null;

  const submit = () => {
    const utterance = text.trim();
    if (!utterance) return;
    setText('');
    onSubmit(utterance);
  };

  return (
    <div className="canvas-palette" data-testid="canvas-palette">
      <TextField.Root
        ref={inputRef}
        aria-label="Ask the agent"
        placeholder="Ask anything…"
        size="3"
        value={text}
        onChange={e => setText(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter') {
            e.preventDefault();
            submit();
          }
        }}
      />
      <div className="canvas-palette-hint">Enter to ask · Esc to dismiss</div>
    </div>
  );
}
