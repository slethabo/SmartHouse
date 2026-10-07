import { useId, useState } from 'react';

/** Small "?" help tooltip that works with mouse, keyboard and touch. */
export function Tooltip({ text, label = 'More information' }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <span className="tooltip" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button
        type="button"
        className="tooltip__trigger"
        aria-label={label}
        aria-describedby={open ? id : undefined}
        aria-expanded={open}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={() => setOpen((o) => !o)}
      >
        ?
      </button>
      {open && (
        <span className="tooltip__bubble" role="tooltip" id={id}>
          {text}
        </span>
      )}
    </span>
  );
}
