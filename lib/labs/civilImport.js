import * as XLSX from 'xlsx';

// Parseo dirigido por encabezados (no posicional) del Excel de cronograma+presupuesto que ya
// usa Sesuveca — un solo .xlsx con varias hojas. Best-effort: nunca lanza si algo no matchea,
// junta advertencias en vez de romper el import.

const GANTT_HEADER_TOKENS = ['tarea', 'responsable', 'progreso'];
const BUDGET_HEADER_TOKENS = ['etapas', 'descripcion', 'p. unit'];

function normHeader(s) {
  return String(s || '').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function findHeaderRow(rows, tokens) {
  for (let i = 0; i < rows.length; i++) {
    const normalized = (rows[i] || []).map(normHeader);
    const hasAll = tokens.every((tok) => normalized.some((cell) => cell === tok || cell.startsWith(tok)));
    if (hasAll) return i;
  }
  return -1;
}

function colIndex(headerRow, ...candidates) {
  const normalized = headerRow.map(normHeader);
  for (const cand of candidates) {
    const exact = normalized.indexOf(cand);
    if (exact !== -1) return exact;
  }
  for (const cand of candidates) {
    const partial = normalized.findIndex((c) => c.startsWith(cand));
    if (partial !== -1) return partial;
  }
  return -1;
}

function toISODate(cell) {
  if (cell instanceof Date) return cell.toISOString().slice(0, 10);
  const str = String(cell || '').trim();
  if (!str) return null;
  const m = str.match(/^(\d{4}-\d{2}-\d{2})/);
  if (m) return m[1];
  const parsed = new Date(str);
  return isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10);
}

function toNumber(cell) {
  // Number(" ") da 0, no NaN — hay que descartar celdas en blanco (o solo espacio) antes de
  // convertir, si no una fila de encabezado de etapa (celdas vacías) se cuela como partida.
  const str = String(cell ?? '').trim();
  if (!str) return null;
  // Columnas de moneda vienen formateadas ("S/.3,000.00") cuando se lee con raw:false (hace
  // falta para que las fechas salgan legibles). Sacar solo el símbolo con un filtro de
  // caracteres NO alcanza — el punto de "S/." queda y arma un número con dos puntos decimales
  // ("S/.3000.00" → ".3000.00"). Por eso se extrae con regex el primer número real de la
  // celda (ignorando cualquier prefijo no numérico) en vez de limpiar carácter por carácter.
  const cleaned = str.replace(/,/g, '');
  const match = cleaned.match(/-?\d+(?:\.\d+)?/);
  if (!match) return null;
  const n = Number(match[0]);
  return isNaN(n) ? null : n;
}

// Una fila es una TAREA real si tiene fecha inicio y fin. Sin fechas, es un encabezado de fase
// (ej. "OBRAS PRELIMINARES") — su nombre pasa a ser la `fase` de las tareas que le siguen.
function parseGanttSheet(rows, headerIdx) {
  const header = rows[headerIdx];
  const iNombre = colIndex(header, 'tarea');
  const iResponsable = colIndex(header, 'responsable');
  const iProgreso = colIndex(header, 'progreso');
  const iInicio = colIndex(header, 'fecha inicio');
  const iFin = colIndex(header, 'fecha fin');
  const iDuracion = colIndex(header, 'duracion');

  const tasks = [];
  let currentFase = '';
  for (let r = headerIdx + 1; r < rows.length; r++) {
    const row = rows[r] || [];
    const nombre = String(row[iNombre] || '').trim();
    if (!nombre) continue;
    const fechaInicio = toISODate(row[iInicio]);
    const fechaFin = toISODate(row[iFin]);
    if (!fechaInicio || !fechaFin) {
      currentFase = nombre;
      continue;
    }
    tasks.push({
      fase: currentFase,
      nombre,
      responsableNombre: String(row[iResponsable] || '').trim(),
      fechaInicio,
      fechaFin,
      duracionDias: toNumber(row[iDuracion]),
      progreso: toNumber(row[iProgreso]) || 0,
    });
  }
  return tasks;
}

// Una fila es una PARTIDA real si tiene cantidad y precio unitario. Sin eso (aunque tenga
// descripción), es un encabezado de etapa (ej. "OBRAS CIVILES") o una fila de totales (IGV/TOTAL).
function parseBudgetSheet(rows, headerIdx) {
  const header = rows[headerIdx];
  const iCant = colIndex(header, 'cant');
  const iUnidad = colIndex(header, 'unidad');
  const iDescripcion = colIndex(header, 'descripcion');
  const iProveedor = colIndex(header, 'proveedor');
  const iPUnit = colIndex(header, 'p. unit', 'p.unit', 'punit');
  const iImporte = colIndex(header, 'importe');
  const iEjecutado = colIndex(header, 'ejecutado');
  const iComentarios = colIndex(header, 'comentarios');

  const partidas = [];
  let currentEtapa = '';
  // +2: se salta la fila de sub-unidades (S/., S/., CANT., IMPORTE) que suele venir justo
  // debajo del encabezado real en este formato.
  for (let r = headerIdx + 2; r < rows.length; r++) {
    const row = rows[r] || [];
    const descripcion = String(row[iDescripcion] || '').trim();
    if (!descripcion) continue;
    if (/^(igv|total)$/i.test(String(row[0] || '').trim())) continue;

    const cantidad = toNumber(row[iCant]);
    const precioUnitario = toNumber(row[iPUnit]);
    if (cantidad == null || precioUnitario == null) {
      currentEtapa = descripcion;
      continue;
    }
    const importe = toNumber(row[iImporte]);
    partidas.push({
      etapa: currentEtapa,
      descripcion,
      cantidad,
      unidad: String(row[iUnidad] || '').trim(),
      precioUnitario,
      importe: importe != null ? importe : cantidad * precioUnitario,
      ejecutado: toNumber(row[iEjecutado]) || 0,
      proveedor: String(row[iProveedor] || '').trim(),
      comentarios: String(row[iComentarios] || '').trim(),
    });
  }
  return partidas;
}

// buffer: Buffer del .xlsx. roster: lista de usuarios del tenant (lib/labs/users.js) — se usa
// para resolver el nombre de "responsable" del Excel contra un userId real (Supervisor o
// Registrador). Si no matchea a nadie (típicamente un contratista externo, que no usa Labs),
// la tarea queda sin responsable y se junta una advertencia para que el Director la asigne
// a mano en la vista previa.
export function parseCivilExcel(buffer, roster) {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  const warnings = [];

  let ganttRows = null;
  let ganttHeaderIdx = -1;
  let budgetRows = null;
  let budgetHeaderIdx = -1;

  for (const name of workbook.SheetNames) {
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[name], { header: 1, raw: false, defval: '' });
    if (ganttHeaderIdx === -1) {
      const idx = findHeaderRow(rows, GANTT_HEADER_TOKENS);
      if (idx !== -1) { ganttRows = rows; ganttHeaderIdx = idx; }
    }
    if (budgetHeaderIdx === -1) {
      const idx = findHeaderRow(rows, BUDGET_HEADER_TOKENS);
      if (idx !== -1) { budgetRows = rows; budgetHeaderIdx = idx; }
    }
  }

  if (ganttHeaderIdx === -1) warnings.push('No se encontró una hoja con el formato de Gantt (columnas TAREA/RESPONSABLE/PROGRESO) — revisá el cronograma manualmente.');
  if (budgetHeaderIdx === -1) warnings.push('No se encontró una hoja con el formato de presupuesto (columnas ETAPAS/DESCRIPCION/P. UNIT) — revisá el presupuesto manualmente.');

  const rawTasks = ganttHeaderIdx !== -1 ? parseGanttSheet(ganttRows, ganttHeaderIdx) : [];
  const partidas = budgetHeaderIdx !== -1 ? parseBudgetSheet(budgetRows, budgetHeaderIdx) : [];

  const norm = (s) => String(s || '').trim().toLowerCase();
  const tasks = rawTasks.map((t) => {
    const match = roster.find((u) => (
      (u.role === 'Supervisor' || u.role === 'Registrador') && u.active !== false
      && (norm(t.responsableNombre).includes(norm(u.name)) || norm(u.name).includes(norm(t.responsableNombre)))
      && norm(t.responsableNombre)
    ));
    if (!match && t.responsableNombre) {
      warnings.push(`Responsable "${t.responsableNombre}" (tarea "${t.nombre}") no se encontró en el equipo — asignalo manualmente.`);
    }
    const { responsableNombre, ...rest } = t;
    return { ...rest, responsable: match?.id || null, responsableNombreOriginal: responsableNombre };
  });

  if (!tasks.length && !partidas.length) {
    warnings.push('No se pudo interpretar ninguna tarea ni partida del archivo — revisá el formato.');
  }

  return { tasks, partidas, warnings };
}
