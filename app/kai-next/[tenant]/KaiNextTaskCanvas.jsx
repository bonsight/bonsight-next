'use client';

import { useState } from 'react';
import { sortByOrder, dropsBefore, computeDropOrder } from '@/lib/kaiNext/dragOrder';

// Tablero Kanban con arrastrar y soltar (entre columnas cambia el estado; dentro de una columna
// reordena). Lo comparten las tareas de Proyectos (Seguimiento/Civil, KaiNextProjects.jsx) y las
// tareas sueltas de empresa (KaiNextEmpresas.jsx), para que se use igual en los dos lados.
function formatShortDate(iso) {
  if (!iso) return '—';
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', timeZone: 'UTC' });
}

function personName(people, id) {
  return people.find((p) => p.id === id)?.name || '—';
}

// Tarjeta simple del Kanban de tareas — mismo look que .knx-board-card, sin los campos
// específicos de Notion (tipo/severidad/"fuera de plan") que no existen en este modelo.
function TaskCanvasCard({ task, people, tipologias, tipologiaColorOf, draggable, onDragStart, onDragEnd, dragging, dropIndicator, onDragOverCard, onDrop, onOpen }) {
  const tipologiaName = task.tipologiaId ? tipologias?.find((t) => t.id === task.tipologiaId)?.name : null;
  return (
    <div
      className={`knx-board-card${dragging ? ' knx-board-card--dragging' : ''}${dropIndicator ? ` knx-board-card--over-${dropIndicator}` : ''}`}
      onClick={onOpen}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOverCard}
      onDrop={onDrop}
    >
      <p className="knx-board-card-title">{task.nombre}</p>
      {task.descripcion && <p className="knx-board-card-desc">{task.descripcion.length > 90 ? `${task.descripcion.slice(0, 90).trim()}…` : task.descripcion}</p>}
      {(task.prioridad || tipologiaName) && (
        <div className="knx-board-card-tags">
          {task.prioridad && <span className={`knx-board-tag knx-board-tag--priority-${task.prioridad.toLowerCase()}`}>{task.prioridad}</span>}
          {tipologiaName && (
            <span className="knx-board-tag">
              <span className="knx-tipologia-dot" style={{ background: tipologiaColorOf?.(task.tipologiaId) ?? undefined }} />
              {tipologiaName}
            </span>
          )}
        </div>
      )}
      {task.fechaInicio && (
        <div className="knx-board-card-dates">{formatShortDate(task.fechaInicio)} → {task.fechaFin ? formatShortDate(task.fechaFin) : '—'}</div>
      )}
      <div className="knx-board-card-foot">
        <span className="knx-board-card-resp">
          {(task.responsables ?? []).length ? task.responsables.map((id) => personName(people, id)).join(', ') : 'Sin asignar'}
        </span>
      </div>
    </div>
  );
}

// Kanban por estado (Por hacer/Haciendo/Terminado, + Backlog en Seguimiento) — alternativa más
// rápida de escanear que la Lista, y no depende de fechas cargadas como el Cronograma.
// Drag-and-drop entre columnas cambia el status real de la tarea (mismo setStatus que ya usan
// Lista/Cronograma); dentro de la misma columna, reordena (onReorder) sin tocar el status.
export default function KaiNextTaskCanvas({ tasks, people, tipologias = [], tipologiaColorOf, statuses, canManage, canMoveTask, onStatusChange, onReorder, onBackfill, selectedTaskId, onSelectTask }) {
  const [dragId, setDragId] = useState(null);
  const [dragOverCol, setDragOverCol] = useState(null);
  const [dragOverTaskId, setDragOverTaskId] = useState(null);
  const [dragOverBefore, setDragOverBefore] = useState(true);

  const clearDrag = () => { setDragId(null); setDragOverCol(null); setDragOverTaskId(null); };

  // Soltar sobre una tarjeta puntual: reordena dentro de su columna, y si además cambió de
  // columna, cambia el status en el mismo gesto (un solo PATCH, ver setStatus con order).
  const dropOnCard = (e, colId, colTasksSorted, overTask) => {
    e.preventDefault();
    e.stopPropagation();
    const taskId = dragId;
    const before = dragOverBefore;
    clearDrag();
    if (!taskId) return;
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    const { order, backfill } = computeDropOrder(colTasksSorted, taskId, overTask.id, before);
    backfill.forEach((b) => onBackfill(b.id, b.order));
    if (task.status !== colId) onStatusChange(taskId, colId, order);
    else if (order !== task.order) onReorder(taskId, order);
  };

  // Soltar en zona vacía de la columna (no sobre una tarjeta): va al final.
  const dropOnColumn = (e, colId, colTasksSorted) => {
    e.preventDefault();
    const taskId = dragId;
    clearDrag();
    if (!taskId) return;
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    const { order, backfill } = computeDropOrder(colTasksSorted, taskId, null, false);
    backfill.forEach((b) => onBackfill(b.id, b.order));
    if (task.status !== colId) onStatusChange(taskId, colId, order);
    else if (order !== task.order) onReorder(taskId, order);
  };

  return (
    <div className="knx-board-cols" style={{ gridTemplateColumns: `repeat(${statuses.length}, minmax(200px, 1fr))` }}>
      {statuses.map((col) => {
        const colTasks = sortByOrder(tasks.filter((t) => t.status === col.id));
        return (
          <div
            key={col.id}
            className={`knx-board-col${dragOverCol === col.id ? ' knx-board-col--over' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDragOverCol(col.id); }}
            onDragLeave={() => setDragOverCol((c) => (c === col.id ? null : c))}
            onDrop={(e) => dropOnColumn(e, col.id, colTasks)}
          >
            <div className="knx-board-col-head">{col.label} <span className="knx-canvas-group-count">{colTasks.length}</span></div>
            <div className="knx-board-col-cards">
              {colTasks.map((t) => (
                <TaskCanvasCard
                  key={t.id}
                  task={t}
                  people={people}
                  tipologias={tipologias}
                  tipologiaColorOf={tipologiaColorOf}
                  draggable={canMoveTask ? canMoveTask(t) : canManage}
                  onDragStart={() => setDragId(t.id)}
                  onDragEnd={clearDrag}
                  dragging={dragId === t.id}
                  dropIndicator={dragOverTaskId === t.id && dragId !== t.id ? (dragOverBefore ? 'top' : 'bottom') : null}
                  onDragOverCard={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setDragOverCol(col.id);
                    if (dragId === t.id) return;
                    setDragOverTaskId(t.id);
                    setDragOverBefore(dropsBefore(e, e.currentTarget));
                  }}
                  onDrop={(e) => dropOnCard(e, col.id, colTasks, t)}
                  onOpen={() => onSelectTask(t.id)}
                />
              ))}
              {!colTasks.length && <p className="knx-knowledge-empty">—</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
