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

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// ── Experimentos ──────────────────────────────────────────────────────────
export async function listExperiments(tenant) {
  const ids = await kv.zrange(experimentsIndexKey(tenant), 0, -1, { rev: true });
  if (!ids.length) return [];
  const metas = await Promise.all(ids.map((id) => kv.get(experimentMetaKey(tenant, id))));
  return metas.filter(Boolean);
}

export async function createExperiment(tenant, { name, purpose, hypothesis, successCriteria, supervisorIds, code, type, hasBudget, budgetAmount, budgetCurrency }) {
  const id = generateId();
  const now = Date.now();
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
      const tests = (await kv.get(testsKey(tenant, m.id))) ?? [];
      return tests.some((t) => t.registradorIds?.includes(user.id)) ? m : null;
    })
  );
  return withVisibility.filter(Boolean);
}

export async function getExperiment(tenant, id) {
  const [meta, tests, executions, events, feedback, reports, documents] = await Promise.all([
    kv.get(experimentMetaKey(tenant, id)),
    kv.get(testsKey(tenant, id)),
    kv.get(executionsKey(tenant, id)),
    kv.get(eventsKey(tenant, id)),
    kv.get(feedbackKey(tenant, id)),
    kv.get(reportsKey(tenant, id)),
    kv.get(documentsKey(tenant, id)),
  ]);
  if (!meta) return null;
  return {
    meta,
    tests: tests ?? [],
    executions: executions ?? [],
    events: events ?? [],
    feedback: feedback ?? [],
    reports: reports ?? [],
    documents: documents ?? [],
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
  if (meta.aportesFolderId && meta.reportesFolderId && meta.documentosFolderId) {
    return { aportesFolderId: meta.aportesFolderId, reportesFolderId: meta.reportesFolderId, documentosFolderId: meta.documentosFolderId };
  }
  const driveConfig = await getDriveConfig(tenant);
  if (!driveConfig?.folderId) return null;

  // meta.xFolderId || ensureSubfolder(...) — idempotente incluso para proyectos que ya tenían
  // Aportes/Reportes de antes de que existiera Documentación, sin recrear lo que ya existe.
  const projectFolderId = meta.driveFolderId || await ensureSubfolder(driveConfig.folderId, meta.name);
  const aportesFolderId = meta.aportesFolderId || await ensureSubfolder(projectFolderId, 'Aportes');
  const reportesFolderId = meta.reportesFolderId || await ensureSubfolder(projectFolderId, 'Reportes');
  const documentosFolderId = meta.documentosFolderId || await ensureSubfolder(projectFolderId, 'Documentación');

  const current = (await kv.get(experimentMetaKey(tenant, meta.id))) ?? meta;
  await kv.set(experimentMetaKey(tenant, meta.id), { ...current, driveFolderId: projectFolderId, aportesFolderId, reportesFolderId, documentosFolderId });
  return { aportesFolderId, reportesFolderId, documentosFolderId };
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
export async function addFeedback(tenant, experimentId, { who, whoRole, targetType, targetId, targetLabel, text, visibility, suggestion }) {
  const feedback = (await kv.get(feedbackKey(tenant, experimentId))) ?? [];
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
    createdAt: new Date().toISOString(),
  };
  await kv.set(feedbackKey(tenant, experimentId), [entry, ...feedback]);
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
export async function addReportDraft(tenant, experimentId, { doc, periodFrom, periodTo }) {
  const reports = (await kv.get(reportsKey(tenant, experimentId))) ?? [];
  const entry = { id: generateId(), periodFrom, periodTo, doc, status: 'borrador', createdAt: new Date().toISOString() };
  await kv.set(reportsKey(tenant, experimentId), [entry, ...reports]);
  return entry;
}

export async function approveReport(tenant, experimentId, reportId) {
  const [reports, meta] = await Promise.all([
    kv.get(reportsKey(tenant, experimentId)),
    kv.get(experimentMetaKey(tenant, experimentId)),
  ]);
  const list = reports ?? [];
  const idx = list.findIndex((r) => r.id === reportId);
  if (idx === -1) throw new Error('Reporte no encontrado.');
  list[idx] = { ...list[idx], status: 'aprobado', approvedAt: new Date().toISOString() };

  // Solo el reporte APROBADO se sube — los borradores no ensucian el Drive del cliente.
  if (meta) {
    try {
      const drive = await ensureProjectDriveFolders(tenant, meta);
      if (drive) {
        const text = buildReportText(meta.name, list[idx], list[idx].doc);
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
