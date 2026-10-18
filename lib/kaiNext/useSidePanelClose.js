'use client';

import { useState } from 'react';

// Los .knx-side-panel (ver kai-next.css) se montan/desmontan condicionalmente desde el padre —
// React los saca del DOM apenas cambia esa condición, sin dejarle tiempo a la transición de
// salida para correr. Este hook no cambia NADA de cuándo se abre/cierra cada panel (eso lo
// sigue decidiendo el padre vía onClose) — solo retrasa el unmount real lo que dura la
// animación, agregando una clase --closing mientras tanto para que la transición de salida
// pueda jugar.
const CLOSE_ANIM_MS = 200;

export function useSidePanelClose(onClose) {
  const [closing, setClosing] = useState(false);
  // `fn` opcional: para cuando cerrar implica además otra cosa (ej. onDeleted tras borrar) en
  // vez de el onClose de siempre — se anima igual, solo cambia qué se llama al terminar.
  const handleClose = (fn = onClose) => {
    if (closing) return;
    setClosing(true);
    setTimeout(fn, CLOSE_ANIM_MS);
  };
  return [closing, handleClose];
}
