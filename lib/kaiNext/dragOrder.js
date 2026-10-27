// Orden manual por drag & drop vertical, compartido por los 3 tableros Kanban de Kai Next
// (Sprints/Desarrollo sobre Notion vía lib/aria/board.js, Proyectos/Seguimiento sobre Redis vía
// lib/kaiNext/projects.js). Fractional ranking simple: la tarea nueva se guarda con un `order`
// a mitad de camino entre sus dos vecinas, así una sola escritura reordena sin tener que
// renumerar toda la columna. No se renormaliza con el tiempo (quedaría para una vuelta futura
// si el rango entre dos vecinas llega a colapsar — no pasa en el uso normal de un tablero).

// Orden estable: primero por `order` (nulls al final, son tareas de antes de este campo),
// empate por posición original en el array que llegó del backend.
export function sortByOrder(tasks) {
  return tasks
    .map((task, index) => ({ task, index }))
    .sort((a, b) => {
      const ao = a.task.order, bo = b.task.order;
      if (ao == null && bo == null) return a.index - b.index;
      if (ao == null) return 1;
      if (bo == null) return -1;
      return ao - bo || a.index - b.index;
    })
    .map((x) => x.task);
}

// `prevOrder`/`nextOrder` son el order de la tarea inmediatamente antes/después de donde se
// soltó (null en los bordes de la columna).
export function orderBetween(prevOrder, nextOrder) {
  if (prevOrder == null && nextOrder == null) return 0;
  if (prevOrder == null) return nextOrder - 1;
  if (nextOrder == null) return prevOrder + 1;
  return (prevOrder + nextOrder) / 2;
}

// A qué mitad de la tarjeta sobrevolada cayó el cursor — determina si se inserta antes o
// después de ella. Mismo criterio en los 3 tableros para que el drag se sienta igual en todos.
export function dropsBefore(e, element) {
  const rect = element.getBoundingClientRect();
  return e.clientY < rect.top + rect.height / 2;
}

// La mayoría de las tareas hoy tienen `order: null` (campo recién agregado). Dos problemas si
// se interpolara directo sobre eso:
//   1. orderBetween(null, null) siempre da 0, sin importar dónde se soltó.
//   2. Peor: sortByOrder trata CUALQUIER número real como "antes" que CUALQUIER null (nulls al
//      final) — entonces apenas la tarjeta arrastrada se guarda con un order real (p. ej. 1.5),
//      salta al principio de la columna, adelante de todas las que siguen en null, en vez de
//      quedarse entre sus dos vecinas (que siguen en null sin tocar).
// La solución real no es solo calcular un order consistente para la arrastrada — hay que
// migrar TAMBIÉN a sus vecinas de null a un order real en el mismo gesto (ver `backfill` abajo),
// así la columna entera queda con orders reales y el problema no vuelve a aparecer ahí.
function withEffectiveOrder(sortedTasks) {
  const maxReal = sortedTasks.reduce((max, t) => (typeof t.order === 'number' ? Math.max(max, t.order) : max), 0);
  let next = maxReal + 1;
  return sortedTasks.map((t) => (typeof t.order === 'number' ? t : { ...t, order: next++ }));
}

// Calcula el `order` para insertar `draggedId` en la posición marcada por `overId`/`before`
// dentro de `columnTasksSorted` (ya ordenada con sortByOrder, SIN filtrar la tarea arrastrada).
// `overId` null = soltar al final de la columna (zona vacía bajo la última tarjeta).
// Devuelve `{ order, backfill }`: `order` es el nuevo valor para la tarea arrastrada;
// `backfill` es la lista de vecinas que tenían `order: null` y ahora necesitan guardar el
// número real que se les asignó acá — sin persistirlas también, vuelven a colisionar con la
// próxima tarjeta que se arrastre en esta columna.
export function computeDropOrder(columnTasksSorted, draggedId, overId, before) {
  const restRaw = columnTasksSorted.filter((t) => t.id !== draggedId);
  const rest = withEffectiveOrder(restRaw);
  const backfill = rest
    .filter((t, i) => restRaw[i].order == null)
    .map((t) => ({ id: t.id, order: t.order }));

  if (!rest.length) return { order: 0, backfill };
  if (overId == null) return { order: orderBetween(rest[rest.length - 1].order, null), backfill };
  const overIndex = rest.findIndex((t) => t.id === overId);
  if (overIndex === -1) return { order: orderBetween(rest[rest.length - 1].order, null), backfill };
  if (before) {
    const prev = rest[overIndex - 1] ?? null;
    return { order: orderBetween(prev?.order ?? null, rest[overIndex].order), backfill };
  }
  const next = rest[overIndex + 1] ?? null;
  return { order: orderBetween(rest[overIndex].order, next?.order ?? null), backfill };
}
