import { Redis } from '@upstash/redis';
import { getDriveConfig, ensureSubfolder, uploadFile, uploadTextAsDoc } from './googleDrive';

const kv = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

const experimentsIndexKey = (tenant) => `labs:${tenant}:experiments`;
const experimentMetaKey = (tenant, id) => `labs:${tenant}:experiment:${id}:meta`;
const testsKey = (tenant, id) => `labs:${tenant}:experiment:${id}:tests`;
const executionsKey = (tenant, id) => `labs:${tenant}:experiment:${id}:executions`;
const eventsKey = (tenant, id) => `labs:${tenant}:experiment:${id}:events`;
const feedbackKey = (tenant, id) => `labs:${tenant}:experiment:${id}:feedback`;
const reportsKey = (tenant, id) => `labs:${tenant}:experiment:${id}:reports`;
const metaHistoryKey = (tenant, id) => `labs:${tenant}:experiment:${id}:metaHistory`;
const documentsKey = (tenant, id) => `labs:${tenant}:experiment:${id}:documents`;
const tasksKey = (tenant, id) => `labs:${tenant}:experiment:${id}:tasks`;
const partidasKey = (tenant, id) => `labs:${tenant}:experiment:${id}:partidas`;

// projectKind que usan Cronograma/tareas — 'civil' suma Presupuesto (partidas) encima,
// 'seguimiento' es lo mismo sin eso. Todo lo que dependa de "¿tiene tareas con fase/fechas?"
// (no de "¿es específicamente obra civil?") debe leer esta lista, no comparar contra 'civil'.
export const TASK_TRACKING_KINDS = ['civil', 'seguimiento'];

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function normName(s) {
  return String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

// Arma Tareas y Partidas iniciales (import de Excel) y linkea cada Tarea a su Partida por
// coincidencia de nombre — ver brief: en la práctica siempre calzan 1 a 1.
function linkTasksToPartidas(rawTasks, rawPartidas) {
  const now = new Date().toISOString();
  const partidas = (Array.isArray(rawPartidas) ? rawPartidas : []).map((p) => {
    const cantidad = p.cantidad != null && p.cantidad !== '' ? Number(p.cantidad) : null;
    const precioUnitario = p.precioUnitario != null && p.precioUnitario !== '' ? Number(p.precioUnitario) : null;
    return {
      id: generateId(),
      etapa: p.etapa || '',
      descripcion: p.descripcion || '',
      cantidad,
      unidad: p.unidad || '',
      precioUnitario,
      importe: p.importe != null && p.importe !== '' ? Number(p.importe) : (cantidad != null && precioUnitario != null ? cantidad * precioUnitario : 0),
      ejecutado: p.ejecutado != null && p.ejecutado !== '' ? Number(p.ejecutado) : 0,
      proveedor: p.proveedor || '',
      comentarios: p.comentarios || '',
      createdAt: now,
      updatedAt: now,
    };
  });
  const partidaByName = new Map(partidas.map((p) => [normName(p.descripcion), p.id]));

  const tasks = (Array.isArray(rawTasks) ? rawTasks : []).map((t) => ({
    id: generateId(),
    fase: t.fase || '',
    nombre: t.nombre || '',
    responsable: t.responsable || null,
    fechaInicio: t.fechaInicio || null,
    fechaFin: t.fechaFin || null,
    duracionDias: t.duracionDias != null && t.duracionDias !== '' ? Number(t.duracionDias) : null,
    progreso: Number(t.progreso) >= 100 ? 100 : 0,
    partidaId: partidaByName.get(normName(t.nombre)) || null,
    createdAt: now,
    updatedAt: now,
  }));

  return { linkedTasks: tasks, linkedPartidas: partidas };
}

// ── Experimentos ──────────────────────────────────────────────────────────
export async function listExperiments(tenant) {
  const ids = await kv.zrange(experimentsIndexKey(tenant), 0, -1, { rev: true });
  if (!ids.length) return [];
  const metas = await Promise.all(ids.map((id) => kv.get(experimentMetaKey(tenant, id))));
  return metas.filter(Boolean);
}

export async function createExperiment(tenant, {
  name, purpose, hypothesis, successCriteria, supervisorIds, code, type, hasBudget, budgetAmount, budgetCurrency,
  projectKind, fechaInicioProyecto, fechaFinProyecto, tasks, partidas,
}) {
  const id = generateId();
  const now = Date.now();
  // projectKind es el interruptor de COMPORTAMIENTO (qué pestañas tiene el proyecto) — no
  // confundir con `type`, que sigue siendo la etiqueta libre ("Estructural", etc.) que ya
  // existía antes y el Director edita en Detalles. 'civil' y 'seguimiento' comparten
  // Cronograma/tareas — 'seguimiento' es lo mismo sin Presupuesto (ver TASK_TRACKING_KINDS).
  const kind = TASK_TRACKING_KINDS.includes(projectKind) ? projectKind : 'experimental';
  const isTaskTracking = TASK_TRACKING_KINDS.includes(kind);

  const { linkedTasks, linkedPartidas } = isTaskTracking
    ? linkTasksToPartidas(tasks, partidas)
    : { linkedTasks: [], linkedPartidas: [] };

  let fechaInicioFinal = isTaskTracking ? (fechaInicioProyecto || null) : null;
  let fechaFinFinal = isTaskTracking ? (fechaFinProyecto || null) : null;
  if (isTaskTracking && (!fechaInicioFinal || !fechaFinFinal) && linkedTasks.length) {
    const starts = linkedTasks.map((t) => t.fechaInicio).filter(Boolean).sort();
    const ends = linkedTasks.map((t) => t.fechaFin).filter(Boolean).sort();
    fechaInicioFinal = fechaInicioFinal || starts[0] || null;
    fechaFinFinal = fechaFinFinal || ends[ends.length - 1] || null;
  }

  const meta = {
    id,
    name: String(name || '').trim() || 'Proyecto sin título',
    purpose: purpose || '',
    hypothesis: hypothesis || '',
    successCriteria: Array.isArray(successCriteria) ? successCriteria : [],
    supervisorIds: Array.isArray(supervisorIds) ? supervisorIds : [],
    code: code || '',
    type: type || '',
    hasBudget: Boolean(hasBudget),
    budgetAmount: hasBudget && budgetAmount != null && budgetAmount !== '' ? Number(budgetAmount) : null,
    budgetCurrency: hasBudget ? (budgetCurrency || '') : '',
    projectKind: kind,
    fechaInicioProyecto: fechaInicioFinal,
    fechaFinProyecto: fechaFinFinal,
    status: 'activo',
    createdAt: new Date(now).toISOString(),
    updatedAt: new Date(now).toISOString(),
  };
  await Promise.all([
    kv.set(experimentMetaKey(tenant, id), meta),
    kv.zadd(experimentsIndexKey(tenant), { score: now, member: id }),
    kv.set(testsKey(tenant, id), []),
    kv.set(executionsKey(tenant, id), []),
    kv.set(eventsKey(tenant, id), []),
    kv.set(feedbackKey(tenant, id), []),
    kv.set(reportsKey(tenant, id), []),
    kv.set(documentsKey(tenant, id), []),
    kv.set(tasksKey(tenant, id), linkedTasks),
    kv.set(partidasKey(tenant, id), linkedPartidas),
  ]);
  return meta;
}

export async function getExperimentMeta(tenant, id) {
  return kv.get(experimentMetaKey(tenant, id));
}

// Qué proyectos puede VER cada rol — Director todos, Supervisor solo los que supervisa,
// Registrador solo los que tienen al menos una prueba donde está asignado.
export async function listExperimentsForUser(tenant, user) {
  const all = await listExperiments(tenant);
  if (user.role === 'Director') return all;
  if (user.role === 'Supervisor') return all.filter((m) => m.supervisorIds?.includes(user.id));

  const withVisibility = await Promise.all(
    all.map(async (m) => {
      if (TASK_TRACKING_KINDS.includes(m.projectKind)) {
        const tasks = (await kv.get(tasksKey(tenant, m.id))) ?? [];
        return tasks.some((t) => t.responsable === user.id) ? m : null;
      }
      const tests = (await kv.get(testsKey(tenant, m.id))) ?? [];
      return tests.some((t) => t.registradorIds?.includes(user.id)) ? m : null;
    })
  );
  return withVisibility.filter(Boolean);
}

export async function getExperiment(tenant, id) {
  const [meta, tests, executions, events, feedback, reports, documents, tasks, partidas] = await Promise.all([
    kv.get(experimentMetaKey(tenant, id)),
    kv.get(testsKey(tenant, id)),
    kv.get(executionsKey(tenant, id)),
    kv.get(eventsKey(tenant, id)),
    kv.get(feedbackKey(tenant, id)),
    kv.get(reportsKey(tenant, id)),
    kv.get(documentsKey(tenant, id)),
    kv.get(tasksKey(tenant, id)),
    kv.get(partidasKey(tenant, id)),
  ]);
  if (!meta) return null;
  const tasksList = tasks ?? [];
  const partidasList = partidas ?? [];
  const civilMetrics = TASK_TRACKING_KINDS.includes(meta.projectKind) ? computeCivilMetrics(tasksList, partidasList, meta) : null;
  const civilAlerts = civilMetrics ? computeCivilAlerts(tasksList, partidasList, civilMetrics) : [];
  return {
    meta,
    tests: tests ?? [],
    executions: executions ?? [],
    events: events ?? [],
    feedback: feedback ?? [],
    reports: reports ?? [],
    documents: documents ?? [],
    tasks: tasksList,
    partidas: partidasList,
    civilMetrics,
    civilAlerts,
  };
}

export async function setExperimentSupervisors(tenant, id, supervisorIds) {
  const meta = await kv.get(experimentMetaKey(tenant, id));
  if (!meta) throw new Error('Experimento no encontrado.');
  const next = { ...meta, supervisorIds: Array.isArray(supervisorIds) ? supervisorIds : [] };
  await kv.set(experimentMetaKey(tenant, id), next);
  return next;
}

// Código/tipo/presupuesto — a diferencia de supervisorIds, estos campos quedan con historial
// de cambios (quién, cuándo, qué cambió), consultable solo por el Director (ver route).
export async function updateProjectDetails(tenant, id, { code, type, hasBudget, budgetAmount, budgetCurrency }, changedBy) {
  const meta = await kv.get(experimentMetaKey(tenant, id));
  if (!meta) throw new Error('Experimento no encontrado.');

  const nextValues = {
    code: code ?? '',
    type: type ?? '',
    hasBudget: Boolean(hasBudget),
    budgetAmount: hasBudget && budgetAmount != null && budgetAmount !== '' ? Number(budgetAmount) : null,
    budgetCurrency: hasBudget ? (budgetCurrency ?? '') : '',
  };

  const defaults = { code: '', type: '', hasBudget: false, budgetAmount: null, budgetCurrency: '' };
  const changes = [];
  const next = { ...meta };
  for (const [field, newVal] of Object.entries(nextValues)) {
    const oldVal = meta[field] ?? defaults[field];
    if (oldVal !== newVal) {
      changes.push({ field, from: oldVal, to: newVal });
      next[field] = newVal;
    }
  }

  if (changes.length === 0) return { meta, entry: null };

  await kv.set(experimentMetaKey(tenant, id), next);

  const history = (await kv.get(metaHistoryKey(tenant, id))) ?? [];
  const entry = { id: generateId(), changedBy, changedAt: new Date().toISOString(), changes };
  await kv.set(metaHistoryKey(tenant, id), [entry, ...history]);

  return { meta: next, entry };
}

export async function getProjectDetailsHistory(tenant, id) {
  return (await kv.get(metaHistoryKey(tenant, id))) ?? [];
}

// ── Documentación del proyecto (cronogramas, presupuestos, otros adjuntos de referencia) —
// solo Director/Supervisor del proyecto suben y borran; no se analiza con IA, es solo
// almacenamiento + índice. Best-effort a Drive igual que la evidencia de aportes: si no hay
// repositorio conectado o falla la subida, el archivo queda igual en Redis (con su `data`).
export async function addProjectDocument(tenant, experimentId, { name, mimeType, data, category, uploadedBy, uploadedByRole }) {
  if (!name?.trim()) throw new Error('El nombre del archivo es requerido.');
  if (!data) throw new Error('El archivo es requerido.');

  const [meta, documents] = await Promise.all([
    kv.get(experimentMetaKey(tenant, experimentId)),
    kv.get(documentsKey(tenant, experimentId)),
  ]);
  if (!meta) throw new Error('Experimento no encontrado.');

  const doc = {
    id: generateId(),
    name: name.trim(),
    mimeType: mimeType || 'application/octet-stream',
    category: category || 'Otro',
    uploadedBy,
    uploadedByRole,
    data,
    driveFileId: null,
    driveUrl: null,
    createdAt: new Date().toISOString(),
  };

  try {
    const drive = await ensureProjectDriveFolders(tenant, meta);
    if (drive) {
      const uploaded = await uploadFile(drive.documentosFolderId, { name: doc.name, mimeType: doc.mimeType, data });
      doc.driveFileId = uploaded.id;
      doc.driveUrl = uploaded.webViewLink;
      delete doc.data;
    }
  } catch (err) {
    console.error(`[labs] no se pudo subir documento a Drive (${tenant}/${experimentId}):`, err.message);
  }

  await kv.set(documentsKey(tenant, experimentId), [doc, ...(documents ?? [])]);
  await addEvent(tenant, experimentId, {
    type: 'documento',
    actor: uploadedBy,
    title: `${uploadedBy} subió un documento — ${doc.name}`,
    body: doc.category,
  });
  await touchExperiment(tenant, experimentId);
  return doc;
}

export async function deleteProjectDocument(tenant, experimentId, documentId) {
  const documents = (await kv.get(documentsKey(tenant, experimentId))) ?? [];
  await kv.set(documentsKey(tenant, experimentId), documents.filter((d) => d.id !== documentId));
}

async function touchExperiment(tenant, id) {
  const now = Date.now();
  const meta = await kv.get(experimentMetaKey(tenant, id));
  if (meta) await kv.set(experimentMetaKey(tenant, id), { ...meta, updatedAt: new Date(now).toISOString() });
  await kv.zadd(experimentsIndexKey(tenant), { score: now, member: id });
}

// Historia — se agrega desde acá, nunca se escribe a mano.
async function addEvent(tenant, id, event) {
  const events = (await kv.get(eventsKey(tenant, id))) ?? [];
  const entry = { id: generateId(), date: new Date().toISOString(), ...event };
  await kv.set(eventsKey(tenant, id), [entry, ...events]);
  return entry;
}

// ── Integración con Drive (perezosa — crea carpetas la primera vez que hacen falta,
// no de antemano, y funciona tanto para proyectos nuevos como para proyectos que ya
// existían antes de conectar el repositorio). Si el tenant no tiene Drive conectado,
// devuelve null y quien llama simplemente no sube nada — nunca bloquea el flujo normal.
async function ensureProjectDriveFolders(tenant, meta) {
  if (meta.aportesFolderId && meta.reportesFolderId && meta.documentosFolderId && meta.comentariosFolderId) {
    return { aportesFolderId: meta.aportesFolderId, reportesFolderId: meta.reportesFolderId, documentosFolderId: meta.documentosFolderId, comentariosFolderId: meta.comentariosFolderId };
  }
  const driveConfig = await getDriveConfig(tenant);
  if (!driveConfig?.folderId) return null;

  // meta.xFolderId || ensureSubfolder(...) — idempotente incluso para proyectos que ya tenían
  // Aportes/Reportes de antes de que existiera Documentación (o Comentarios), sin recrear lo
  // que ya existe.
  const projectFolderId = meta.driveFolderId || await ensureSubfolder(driveConfig.folderId, meta.name);
  const aportesFolderId = meta.aportesFolderId || await ensureSubfolder(projectFolderId, 'Aportes');
  const reportesFolderId = meta.reportesFolderId || await ensureSubfolder(projectFolderId, 'Reportes');
  const documentosFolderId = meta.documentosFolderId || await ensureSubfolder(projectFolderId, 'Documentación');
  const comentariosFolderId = meta.comentariosFolderId || await ensureSubfolder(projectFolderId, 'Comentarios');

  const current = (await kv.get(experimentMetaKey(tenant, meta.id))) ?? meta;
  await kv.set(experimentMetaKey(tenant, meta.id), { ...current, driveFolderId: projectFolderId, aportesFolderId, reportesFolderId, documentosFolderId, comentariosFolderId });
  return { aportesFolderId, reportesFolderId, documentosFolderId, comentariosFolderId };
}

async function ensureTestDriveFolder(tenant, experimentId, test, aportesFolderId) {
  if (test.driveFolderId) return test.driveFolderId;
  const folderId = await ensureSubfolder(aportesFolderId, test.name);
  const tests = (await kv.get(testsKey(tenant, experimentId))) ?? [];
  await kv.set(testsKey(tenant, experimentId), tests.map((t) => (t.id === test.id ? { ...t, driveFolderId: folderId } : t)));
  return folderId;
}

// Para la subida resumible de video (ver /executions/video-upload-url) — necesitamos la
// carpeta de Drive de la prueba ANTES de que exista la ejecución, porque el navegador sube
// el archivo directo a Drive antes de mandar el aporte. Devuelve null si el tenant no tiene
// Drive conectado (ahí el route de arriba bloquea la subida de video con un mensaje claro).
export async function getOrCreateTestDriveFolder(tenant, experimentId, testId) {
  const [meta, tests] = await Promise.all([
    kv.get(experimentMetaKey(tenant, experimentId)),
    kv.get(testsKey(tenant, experimentId)),
  ]);
  if (!meta) throw new Error('Experimento no encontrado.');
  const test = (tests ?? []).find((t) => t.id === testId);
  if (!test) throw new Error('Prueba no encontrada.');
  const drive = await ensureProjectDriveFolders(tenant, meta);
  if (!drive) return null;
  return ensureTestDriveFolder(tenant, experimentId, test, drive.aportesFolderId);
}

// Mismo mecanismo que getOrCreateTestDriveFolder pero para adjuntos de comentarios (Cronograma
// / Presupuesto) — acá no hace falta una subcarpeta por tarea/partida, todos los adjuntos de
// comentarios de un proyecto comparten la carpeta "Comentarios" (el nombre del archivo ya
// identifica a qué tarea/partida pertenece, ver addFeedback).
export async function getOrCreateFeedbackDriveFolder(tenant, experimentId) {
  const meta = await kv.get(experimentMetaKey(tenant, experimentId));
  if (!meta) throw new Error('Experimento no encontrado.');
  const drive = await ensureProjectDriveFolders(tenant, meta);
  return drive?.comentariosFolderId ?? null;
}

function buildReportText(projectName, report, doc) {
  const period = `${new Date(report.periodFrom).toLocaleDateString('es-ES')} – ${new Date(report.periodTo).toLocaleDateString('es-ES')}`;
  const parts = [
    projectName,
    `Reporte · ${period}`,
    '',
    'RESUMEN',
    doc.summary,
    '',
    'QUÉ SE PROBÓ',
    ...doc.whatWasTested.map((w) => `- ${w}`),
    '',
    'RESULTADOS',
    doc.results,
    '',
    'APRENDIZAJES',
    doc.learnings,
  ];
  if (doc.highlightedFeedback) parts.push('', 'FEEDBACK DESTACADO', doc.highlightedFeedback);
  parts.push('', 'PRÓXIMOS PASOS SUGERIDOS', ...doc.nextSteps.map((n) => `- ${n}`));
  return parts.join('\n');
}

function buildCivilReportText(projectName, report) {
  const period = `${new Date(report.periodFrom).toLocaleDateString('es-ES')} – ${new Date(report.periodTo).toLocaleDateString('es-ES')}`;
  const m = report.metrics;
  const parts = [
    projectName,
    `Reporte de avance · ${period}`,
    '',
    'AVANCE GENERAL',
    `Financiero: ${m.pctFinanciero}% ejecutado (S/ ${m.totalEjecutado.toLocaleString('es-PE')} de S/ ${m.totalImporte.toLocaleString('es-PE')})`,
    `Tareas: ${m.pctTareas}% (${m.tareasTerminadas} de ${m.totalTareas})`,
    `Tiempo transcurrido: ${m.pctTiempo}%`,
    '',
    'AVANCE FINANCIERO POR ETAPA',
    ...report.breakdown.financialByEtapa.map((e) => `- ${e.etapa}: ${e.pct}% (S/ ${e.ejecutado.toLocaleString('es-PE')} de S/ ${e.importe.toLocaleString('es-PE')})`),
    '',
    'AVANCE DE TAREAS POR FASE',
    ...report.breakdown.tasksByFase.map((f) => `- ${f.fase}: ${f.pct}% (${f.done}/${f.total})`),
    '',
    'ANÁLISIS',
    report.analysis,
  ];
  if (report.photos?.length) parts.push('', `FOTOS ADJUNTAS: ${report.photos.length} (ver Drive)`);
  return parts.join('\n');
}

// ── Pruebas (cada una define su propio esquema de campos) ──────────────────
export async function createTest(tenant, experimentId, { name, icon, fields, registradorIds }) {
  if (!name?.trim()) throw new Error('El nombre de la prueba es requerido.');
  if (!Array.isArray(fields) || !fields.length) throw new Error('La prueba necesita al menos un campo.');
  const tests = (await kv.get(testsKey(tenant, experimentId))) ?? [];
  const test = {
    id: generateId(),
    name: name.trim(),
    icon: icon || '🧪',
    fields: fields.map((f) => ({ key: f.key, label: f.label, type: f.type || 'text' })),
    registradorIds: Array.isArray(registradorIds) ? registradorIds : [],
    createdAt: new Date().toISOString(),
  };
  await kv.set(testsKey(tenant, experimentId), [...tests, test]);
  await touchExperiment(tenant, experimentId);
  return test;
}

export async function getTests(tenant, experimentId) {
  return (await kv.get(testsKey(tenant, experimentId))) ?? [];
}

export async function setTestRegistradores(tenant, experimentId, testId, registradorIds) {
  const tests = (await kv.get(testsKey(tenant, experimentId))) ?? [];
  const idx = tests.findIndex((t) => t.id === testId);
  if (idx === -1) throw new Error('Prueba no encontrada.');
  tests[idx] = { ...tests[idx], registradorIds: Array.isArray(registradorIds) ? registradorIds : [] };
  await kv.set(testsKey(tenant, experimentId), tests);
  return tests[idx];
}

// ── Ejecuciones (aportes contra una prueba) ─────────────────────────────────
export async function addExecution(tenant, experimentId, { testId, contributor, role, values, tag, evidence, missingFields, note }) {
  const [tests, executions, meta] = await Promise.all([
    kv.get(testsKey(tenant, experimentId)),
    kv.get(executionsKey(tenant, experimentId)),
    kv.get(experimentMetaKey(tenant, experimentId)),
  ]);
  const test = (tests ?? []).find((t) => t.id === testId);
  if (!test) throw new Error('Prueba no encontrada.');

  const cleanEvidence = Array.isArray(evidence) ? evidence : [];

  const execution = {
    id: generateId(),
    testId,
    contributor,
    role,
    values: values || {},
    tag: tag || 'referencia',
    evidence: cleanEvidence,
    missingFields: Array.isArray(missingFields) ? missingFields : [],
    note: note || '',
    createdAt: new Date().toISOString(),
  };

  // Subida a Drive — best-effort: si el tenant no tiene repositorio conectado, o si Drive
  // falla por lo que sea, el aporte se guarda igual (la evidencia sigue viviendo en Redis).
  // Los videos ya llegan subidos (ver /executions/video-upload-url — van directo del navegador
  // a Drive por el límite de tamaño de body de Vercel), así que esos items ya traen
  // driveFileId/driveUrl y no hay que volver a subirlos, solo pasarlos tal cual.
  const pending = cleanEvidence.filter((att) => att.data && !att.driveFileId);
  if (pending.length && meta) {
    try {
      const drive = await ensureProjectDriveFolders(tenant, meta);
      if (drive) {
        const testFolderId = await ensureTestDriveFolder(tenant, experimentId, test, drive.aportesFolderId);
        const datePrefix = execution.createdAt.slice(0, 10);
        const uploaded = await Promise.all(
          pending.map((att, i) => uploadFile(testFolderId, {
            name: `${datePrefix}_${contributor}_${(att.name || `evidencia-${i + 1}`).trim()}`,
            mimeType: att.mimeType,
            data: att.data,
          }))
        );
        const uploadedById = new Map(pending.map((att, i) => [att, { driveFileId: uploaded[i].id, driveUrl: uploaded[i].webViewLink }]));
        execution.evidence = cleanEvidence.map((att) => (uploadedById.has(att) ? { ...att, ...uploadedById.get(att) } : att));
      }
    } catch (err) {
      console.error(`[labs] no se pudo subir evidencia a Drive (${tenant}/${experimentId}):`, err.message);
    }
  }

  await kv.set(executionsKey(tenant, experimentId), [...(executions ?? []), execution]);
  await addEvent(tenant, experimentId, {
    type: 'aporte',
    actor: contributor,
    title: `${contributor} aportó — ${test.name}`,
    body: note || Object.entries(values || {}).map(([k, v]) => `${k}: ${v}`).join(' · '),
  });
  await touchExperiment(tenant, experimentId);
  return execution;
}

export async function validateExecution(tenant, experimentId, executionId, { by, note }) {
  const [executions, tests] = await Promise.all([
    kv.get(executionsKey(tenant, experimentId)),
    kv.get(testsKey(tenant, experimentId)),
  ]);
  const list = executions ?? [];
  const idx = list.findIndex((e) => e.id === executionId);
  if (idx === -1) throw new Error('Ejecución no encontrada.');
  list[idx] = { ...list[idx], validatedBy: by, validatedAt: new Date().toISOString(), validationNote: note || '' };
  await kv.set(executionsKey(tenant, experimentId), list);

  const test = (tests ?? []).find((t) => t.id === list[idx].testId);
  await addEvent(tenant, experimentId, {
    type: 'validacion',
    actor: by,
    title: `${by} validó una ejecución${test ? ' — ' + test.name : ''}`,
    body: note || '',
  });
  await touchExperiment(tenant, experimentId);
  return list[idx];
}

// ── Feedback ─────────────────────────────────────────────────────────────
// targetType: 'proyecto' | 'prueba' | 'aporte'. targetId: null para 'proyecto', testId o
// executionId según corresponda. targetLabel ya viene armado por quien llama (route), que es
// quien tiene el experimento cargado para resolver el nombre de la prueba o el aporte.
export async function addFeedback(tenant, experimentId, { who, whoRole, targetType, targetId, targetLabel, text, visibility, suggestion, attachments }) {
  const [feedback, meta] = await Promise.all([
    kv.get(feedbackKey(tenant, experimentId)),
    kv.get(experimentMetaKey(tenant, experimentId)),
  ]);
  const cleanAttachments = Array.isArray(attachments) ? attachments : [];
  const entry = {
    id: generateId(),
    who,
    whoRole,
    targetType: targetType || 'proyecto',
    targetId: targetId ?? null,
    targetLabel: targetLabel || 'Proyecto general',
    text,
    visibility: visibility || 'Todo el equipo',
    suggestion: suggestion || null,
    attachments: cleanAttachments,
    createdAt: new Date().toISOString(),
  };

  // Subida a Drive — mismo patrón best-effort que addExecution (ver ahí el porqué). Los videos
  // ya llegan subidos vía /feedback/video-upload-url (resumable, directo del navegador a
  // Drive), así que acá solo suben foto/PDF/Word/Excel que todavía viajan en base64. Esto es
  // lo que convierte cada comentario en evidencia real de si una tarea/partida se cumplió o
  // no: queda en Drive, con fecha, autor y a qué tarea corresponde en el nombre del archivo.
  const pending = cleanAttachments.filter((att) => att.data && !att.driveFileId);
  if (pending.length && meta) {
    try {
      const drive = await ensureProjectDriveFolders(tenant, meta);
      if (drive) {
        const datePrefix = entry.createdAt.slice(0, 10);
        const uploaded = await Promise.all(
          pending.map((att, i) => uploadFile(drive.comentariosFolderId, {
            name: `${datePrefix}_${entry.targetLabel}_${who}_${(att.name || `adjunto-${i + 1}`).trim()}`,
            mimeType: att.mimeType,
            data: att.data,
          }))
        );
        const uploadedById = new Map(pending.map((att, i) => [att, { driveFileId: uploaded[i].id, driveUrl: uploaded[i].webViewLink }]));
        entry.attachments = cleanAttachments.map((att) => (uploadedById.has(att) ? { ...att, ...uploadedById.get(att) } : att));
      }
    } catch (err) {
      console.error(`[labs] no se pudo subir adjunto de comentario a Drive (${tenant}/${experimentId}):`, err.message);
    }
  }

  await kv.set(feedbackKey(tenant, experimentId), [entry, ...(feedback ?? [])]);
  await addEvent(tenant, experimentId, {
    type: 'feedback',
    actor: who,
    title: `${who} dejó feedback sobre ${entry.targetLabel}`,
    body: text,
  });
  await touchExperiment(tenant, experimentId);
  return entry;
}

export async function dismissFeedbackSuggestion(tenant, experimentId, feedbackId) {
  const feedback = (await kv.get(feedbackKey(tenant, experimentId))) ?? [];
  const idx = feedback.findIndex((f) => f.id === feedbackId);
  if (idx === -1) throw new Error('Feedback no encontrado.');
  feedback[idx] = { ...feedback[idx], suggestion: null };
  await kv.set(feedbackKey(tenant, experimentId), feedback);
  return feedback[idx];
}

// ── Reportes ─────────────────────────────────────────────────────────────
// kind: 'experimental' (doc con summary/whatWasTested/...) o 'civil' (metrics/breakdown/
// analysis/photos, ver computeCivilReportBreakdown). generatedBy queda para mostrar en la UI
// quién lo armó — el Director aprueba, pero el Supervisor es quien lo generó.
export async function addReportDraft(tenant, experimentId, { kind, doc, metrics, breakdown, analysis, photos, generatedBy, periodFrom, periodTo }) {
  const reports = (await kv.get(reportsKey(tenant, experimentId))) ?? [];
  const entry = {
    id: generateId(),
    kind: kind === 'civil' ? 'civil' : 'experimental',
    periodFrom,
    periodTo,
    generatedBy: generatedBy || null,
    doc: doc || null,
    metrics: metrics || null,
    breakdown: breakdown || null,
    analysis: analysis || null,
    photos: Array.isArray(photos) ? photos : [],
    status: 'borrador',
    createdAt: new Date().toISOString(),
  };
  await kv.set(reportsKey(tenant, experimentId), [entry, ...reports]);
  return entry;
}

// Solo se puede editar mientras está en borrador — una vez enviado, el Director ya lo está
// viendo, así que el texto no se mueve debajo suyo (si hace falta corregir algo, el
// Supervisor genera un borrador nuevo, que queda arriba en el historial).
export async function updateReportDraft(tenant, experimentId, reportId, { analysis, doc }) {
  const reports = (await kv.get(reportsKey(tenant, experimentId))) ?? [];
  const idx = reports.findIndex((r) => r.id === reportId);
  if (idx === -1) throw new Error('Reporte no encontrado.');
  if (reports[idx].status !== 'borrador') throw new Error('Este reporte ya fue enviado — no se puede editar.');
  const next = { ...reports[idx] };
  if (next.kind === 'civil') {
    if (analysis !== undefined) next.analysis = analysis;
  } else if (doc) {
    next.doc = { ...next.doc, ...doc };
  }
  reports[idx] = next;
  await kv.set(reportsKey(tenant, experimentId), reports);
  return next;
}

export async function submitReport(tenant, experimentId, reportId) {
  const reports = (await kv.get(reportsKey(tenant, experimentId))) ?? [];
  const idx = reports.findIndex((r) => r.id === reportId);
  if (idx === -1) throw new Error('Reporte no encontrado.');
  if (reports[idx].status !== 'borrador') throw new Error('Este reporte ya fue enviado.');
  reports[idx] = { ...reports[idx], status: 'enviado', submittedAt: new Date().toISOString() };
  await kv.set(reportsKey(tenant, experimentId), reports);
  await addEvent(tenant, experimentId, { type: 'reporte', actor: null, title: 'Reporte enviado a Director', body: '' });
  await touchExperiment(tenant, experimentId);
  return reports[idx];
}

export async function approveReport(tenant, experimentId, reportId) {
  const [reports, meta] = await Promise.all([
    kv.get(reportsKey(tenant, experimentId)),
    kv.get(experimentMetaKey(tenant, experimentId)),
  ]);
  const list = reports ?? [];
  const idx = list.findIndex((r) => r.id === reportId);
  if (idx === -1) throw new Error('Reporte no encontrado.');
  if (list[idx].status !== 'enviado') throw new Error('El Supervisor todavía no envió este reporte.');
  list[idx] = { ...list[idx], status: 'aprobado', approvedAt: new Date().toISOString() };

  // Solo el reporte APROBADO se sube — los borradores no ensucian el Drive del cliente.
  if (meta) {
    try {
      const drive = await ensureProjectDriveFolders(tenant, meta);
      if (drive) {
        const text = list[idx].kind === 'civil'
          ? buildCivilReportText(meta.name, list[idx])
          : buildReportText(meta.name, list[idx], list[idx].doc);
        const filename = `${list[idx].approvedAt.slice(0, 10)}_Reporte-aprobado`;
        const uploaded = await uploadTextAsDoc(drive.reportesFolderId, filename, text);
        list[idx].driveFileId = uploaded.id;
        list[idx].driveUrl = uploaded.webViewLink;
      }
    } catch (err) {
      console.error(`[labs] no se pudo subir el reporte a Drive (${tenant}/${experimentId}):`, err.message);
    }
  }

  await kv.set(reportsKey(tenant, experimentId), list);
  await addEvent(tenant, experimentId, {
    type: 'reporte',
    actor: null,
    title: 'Reporte aprobado y compartido',
    body: `Período ${list[idx].periodFrom} – ${list[idx].periodTo}`,
  });
  await touchExperiment(tenant, experimentId);
  return list[idx];
}

// ── Cronograma (Tareas) — solo proyectos type=civil ─────────────────────────
export async function getTasksList(tenant, experimentId) {
  return (await kv.get(tasksKey(tenant, experimentId))) ?? [];
}

export async function addTask(tenant, experimentId, { fase, nombre, responsable, fechaInicio, fechaFin, duracionDias, partidaId }) {
  if (!nombre?.trim()) throw new Error('El nombre de la tarea es requerido.');
  const tasks = await getTasksList(tenant, experimentId);
  const now = new Date().toISOString();
  const task = {
    id: generateId(),
    fase: fase || '',
    nombre: nombre.trim(),
    responsable: responsable || null,
    fechaInicio: fechaInicio || null,
    fechaFin: fechaFin || null,
    duracionDias: duracionDias != null && duracionDias !== '' ? Number(duracionDias) : null,
    progreso: 0,
    // status alimenta la vista Canvas (Por hacer/Haciendo/Terminado) — progreso sigue siendo
    // binario para Lista/Gantt/métricas, los dos se sincronizan en los toggles (ver
    // setTaskProgreso/setTaskStatus) para que ninguna vista quede desactualizada.
    status: 'todo',
    partidaId: partidaId || null,
    createdAt: now,
    updatedAt: now,
  };
  await kv.set(tasksKey(tenant, experimentId), [...tasks, task]);
  await touchExperiment(tenant, experimentId);
  return task;
}

export async function updateTask(tenant, experimentId, taskId, patch) {
  const tasks = await getTasksList(tenant, experimentId);
  const idx = tasks.findIndex((t) => t.id === taskId);
  if (idx === -1) throw new Error('Tarea no encontrada.');
  const next = { ...tasks[idx] };
  for (const field of ['fase', 'nombre', 'responsable', 'fechaInicio', 'fechaFin', 'partidaId', 'status']) {
    if (patch[field] !== undefined) next[field] = patch[field];
  }
  if (patch.duracionDias !== undefined) next.duracionDias = patch.duracionDias != null && patch.duracionDias !== '' ? Number(patch.duracionDias) : null;
  next.updatedAt = new Date().toISOString();
  tasks[idx] = next;
  await kv.set(tasksKey(tenant, experimentId), tasks);
  await touchExperiment(tenant, experimentId);
  return next;
}

// Limpia también los comentarios que apuntaban a esta tarea — si no, quedan huérfanos en
// Redis sin ningún lugar de la UI donde volver a mostrarse.
export async function deleteTask(tenant, experimentId, taskId) {
  const tasks = await getTasksList(tenant, experimentId);
  const next = tasks.filter((t) => t.id !== taskId);
  if (next.length === tasks.length) throw new Error('Tarea no encontrada.');
  const feedback = (await kv.get(feedbackKey(tenant, experimentId))) ?? [];
  const nextFeedback = feedback.filter((f) => !(f.targetType === 'tarea' && f.targetId === taskId));
  await Promise.all([
    kv.set(tasksKey(tenant, experimentId), next),
    kv.set(feedbackKey(tenant, experimentId), nextFeedback),
  ]);
  await touchExperiment(tenant, experimentId);
}

export async function setTaskProgreso(tenant, experimentId, taskId, progreso, by) {
  const tasks = await getTasksList(tenant, experimentId);
  const idx = tasks.findIndex((t) => t.id === taskId);
  if (idx === -1) throw new Error('Tarea no encontrada.');
  const done = Number(progreso) >= 100;
  // Sincroniza status para que Canvas no quede desactualizado — pierde el matiz "Haciendo"
  // (pasa directo a "Por hacer"), es la única pérdida de info al togglear desde Lista/Gantt.
  tasks[idx] = { ...tasks[idx], progreso: done ? 100 : 0, status: done ? 'done' : 'todo', updatedAt: new Date().toISOString() };
  await kv.set(tasksKey(tenant, experimentId), tasks);
  await addEvent(tenant, experimentId, {
    type: 'tarea',
    actor: by,
    title: `${by} marcó "${tasks[idx].nombre}" como ${done ? 'terminada' : 'pendiente'}`,
    body: '',
  });
  await touchExperiment(tenant, experimentId);
  return tasks[idx];
}

const TASK_STATUSES = ['todo', 'doing', 'done'];

// Espejo de setTaskProgreso pero para el Canvas (3 estados) — sincroniza progreso al revés
// (done ⇔ 100, cualquier otro ⇔ 0) para que Lista/Gantt/métricas sigan viendo lo mismo que
// antes de que existiera esta vista.
export async function setTaskStatus(tenant, experimentId, taskId, status, by) {
  if (!TASK_STATUSES.includes(status)) throw new Error('Estado inválido.');
  const tasks = await getTasksList(tenant, experimentId);
  const idx = tasks.findIndex((t) => t.id === taskId);
  if (idx === -1) throw new Error('Tarea no encontrada.');
  const done = status === 'done';
  tasks[idx] = { ...tasks[idx], status, progreso: done ? 100 : 0, updatedAt: new Date().toISOString() };
  await kv.set(tasksKey(tenant, experimentId), tasks);
  await addEvent(tenant, experimentId, {
    type: 'tarea',
    actor: by,
    title: `${by} movió "${tasks[idx].nombre}" a ${status === 'todo' ? 'Por hacer' : status === 'doing' ? 'Haciendo' : 'Terminado'}`,
    body: '',
  });
  await touchExperiment(tenant, experimentId);
  return tasks[idx];
}

// ── Presupuesto (Partidas) — solo proyectos type=civil ──────────────────────
export async function getPartidasList(tenant, experimentId) {
  return (await kv.get(partidasKey(tenant, experimentId))) ?? [];
}

export async function addPartida(tenant, experimentId, { etapa, descripcion, cantidad, unidad, precioUnitario, proveedor, comentarios }) {
  if (!descripcion?.trim()) throw new Error('La descripción de la partida es requerida.');
  const partidas = await getPartidasList(tenant, experimentId);
  const now = new Date().toISOString();
  const cant = cantidad != null && cantidad !== '' ? Number(cantidad) : null;
  const precio = precioUnitario != null && precioUnitario !== '' ? Number(precioUnitario) : null;
  const partida = {
    id: generateId(),
    etapa: etapa || '',
    descripcion: descripcion.trim(),
    cantidad: cant,
    unidad: unidad || '',
    precioUnitario: precio,
    importe: cant != null && precio != null ? cant * precio : 0,
    ejecutado: 0,
    proveedor: proveedor || '',
    comentarios: comentarios || '',
    createdAt: now,
    updatedAt: now,
  };
  await kv.set(partidasKey(tenant, experimentId), [...partidas, partida]);
  await touchExperiment(tenant, experimentId);
  return partida;
}

export async function updatePartida(tenant, experimentId, partidaId, patch) {
  const partidas = await getPartidasList(tenant, experimentId);
  const idx = partidas.findIndex((p) => p.id === partidaId);
  if (idx === -1) throw new Error('Partida no encontrada.');
  const next = { ...partidas[idx] };
  for (const field of ['etapa', 'descripcion', 'unidad', 'proveedor', 'comentarios']) {
    if (patch[field] !== undefined) next[field] = patch[field];
  }
  for (const field of ['cantidad', 'precioUnitario', 'ejecutado']) {
    if (patch[field] !== undefined) next[field] = patch[field] != null && patch[field] !== '' ? Number(patch[field]) : null;
  }
  if (patch.cantidad !== undefined || patch.precioUnitario !== undefined) {
    next.importe = next.cantidad != null && next.precioUnitario != null ? next.cantidad * next.precioUnitario : next.importe;
  }
  next.updatedAt = new Date().toISOString();
  partidas[idx] = next;
  await kv.set(partidasKey(tenant, experimentId), partidas);
  await touchExperiment(tenant, experimentId);
  return next;
}

// ── Métricas y alertas civiles — siempre calculadas, nunca escritas a mano ──
export function computeCivilMetrics(tasks, partidas, meta) {
  const totalTareas = tasks.length;
  const tareasTerminadas = tasks.filter((t) => t.progreso >= 100).length;
  const pctTareas = totalTareas ? Math.round((tareasTerminadas / totalTareas) * 100) : 0;

  const totalImporte = partidas.reduce((s, p) => s + (p.importe || 0), 0);
  const totalEjecutado = partidas.reduce((s, p) => s + (p.ejecutado || 0), 0);
  const pctFinanciero = totalImporte ? Math.round((totalEjecutado / totalImporte) * 100) : 0;

  let pctTiempo = 0;
  if (meta.fechaInicioProyecto && meta.fechaFinProyecto) {
    const start = new Date(meta.fechaInicioProyecto).getTime();
    const end = new Date(meta.fechaFinProyecto).getTime();
    if (end > start) {
      const now = Date.now();
      const elapsed = Math.min(end, Math.max(start, now)) - start;
      pctTiempo = Math.round((elapsed / (end - start)) * 100);
    }
  }

  return { totalTareas, tareasTerminadas, pctTareas, totalImporte, totalEjecutado, pctFinanciero, pctTiempo };
}

// Desglose por etapa (partidas) y por fase (tareas) — mismo espíritu que las tablas "% AVANCE
// por ÁREAS/PARTIDAS" de los reportes que ya arma el equipo a mano en Excel. Vive acá (no en
// reports.js) porque es aritmética sobre los mismos datos que computeCivilMetrics, no algo que
// dependa de IA.
export function computeCivilReportBreakdown(tasks, partidas) {
  const byEtapa = [];
  for (const p of partidas) {
    const key = p.etapa || 'Sin etapa';
    let g = byEtapa.find((x) => x.etapa === key);
    if (!g) { g = { etapa: key, importe: 0, ejecutado: 0 }; byEtapa.push(g); }
    g.importe += p.importe || 0;
    g.ejecutado += p.ejecutado || 0;
  }
  const financialByEtapa = byEtapa.map((g) => ({ ...g, pct: g.importe ? Math.round((g.ejecutado / g.importe) * 100) : 0 }));

  const byFase = [];
  for (const t of tasks) {
    const key = t.fase || 'Sin fase';
    let g = byFase.find((x) => x.fase === key);
    if (!g) { g = { fase: key, total: 0, done: 0 }; byFase.push(g); }
    g.total += 1;
    if (t.progreso >= 100) g.done += 1;
  }
  const tasksByFase = byFase.map((g) => ({ ...g, pct: g.total ? Math.round((g.done / g.total) * 100) : 0 }));

  return { financialByEtapa, tasksByFase };
}

export function computeCivilAlerts(tasks, partidas, metrics) {
  const alerts = [];
  const now = Date.now();
  for (const t of tasks) {
    if (t.progreso < 100 && t.fechaFin && new Date(t.fechaFin).getTime() < now) {
      alerts.push({ type: 'tarea_vencida', taskId: t.id, message: `"${t.nombre}" venció el ${String(t.fechaFin).slice(0, 10)} sin terminar.` });
    }
  }
  for (const p of partidas) {
    if (p.importe > 0 && p.ejecutado > p.importe) {
      alerts.push({ type: 'sobrecosto', partidaId: p.id, message: `"${p.descripcion}" — ejecutado supera lo presupuestado.` });
    }
  }
  if (metrics.totalTareas > 0 && metrics.pctTiempo - metrics.pctTareas > 25) {
    alerts.push({ type: 'desvio_cronograma', message: `${metrics.pctTiempo}% del tiempo transcurrido vs. solo ${metrics.pctTareas}% de tareas terminadas.` });
  }
  return alerts;
}
