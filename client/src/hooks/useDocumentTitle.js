import { useEffect } from 'react';
import { STRINGS } from '../constants/strings';

/** Keeps the browser tab title in sync with the page ("Where am I?"). */
export function useDocumentTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} · ${STRINGS.app.name}` : STRINGS.app.name;
  }, [title]);
}
