'use client';

// Modal propio en vez del confirm() nativo del navegador — mismo lenguaje visual que el resto
// de Kai Next. Compartido por cualquier acción destructiva (borrar chat, borrar fuente, etc.):
// quien lo usa solo maneja el estado de "qué se está por borrar", esto es puramente visual.
export default function KaiNextConfirmDialog({ open, title = 'Confirmar', message, confirmLabel = 'Eliminar', onConfirm, onCancel }) {
  if (!open) return null;
  return (
    <div className="knx-confirm-backdrop" onClick={onCancel}>
      <div className="knx-confirm-modal" onClick={(e) => e.stopPropagation()} role="alertdialog" aria-modal="true">
        <h3>{title}</h3>
        <p>{message}</p>
        <div className="knx-confirm-actions">
          <button type="button" className="knx-confirm-cancel" onClick={onCancel}>Cancelar</button>
          <button type="button" className="knx-confirm-danger" onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
