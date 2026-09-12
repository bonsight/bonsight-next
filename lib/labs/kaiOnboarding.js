import { KAI_ONBOARDING_SCRIPT, KAI_PHASE2_SCRIPT } from './kaiOnboardingScript';

// Duplicado a propósito de lib/labs/experiments.js#taskResponsables (no se importa desde ahí):
// ese archivo es server-only (arrastra googleapis/Google Drive) y este módulo lo usa también
// un componente cliente (KaiOnboarding.jsx) — importarlo rompe el build del browser. Mismo
// criterio: tareas viejas guardaban `responsable` (string), ahora `responsables` (array).
function taskResponsables(task) {
  if (Array.isArray(task?.responsables)) return task.responsables;
  return task?.responsable ? [task.responsable] : [];
}

export function getKaiModuleKey(role, projectKind) {
  return `${role}:${projectKind}`;
}

// Decide qué paso de Fase 1 (si alguno) corresponde mostrarle a este usuario ahora mismo.
// No toca red ni DOM — devuelve el `anchor` a buscar, y es el componente (KaiOnboarding.jsx)
// el que chequea si ese elemento existe en la pantalla actual antes de renderizar el tooltip.
// Así se resuelve solo la secuencia entre distintas vistas/modales (ej. los pasos del Director
// que ocurren dentro de CreateExperimentModal) sin tener que modelar acá "en qué pantalla
// está" — si el ancla del paso actual no está en el DOM todavía, simplemente no aparece nada.
//
// Devuelve null (nada que mostrar), { type: 'waiting', ... } o { type: 'step', ... }.
export function getKaiOnboardingStep({ identity, experiments, experiment, projectKind = 'experimental', allowedProjectKinds }) {
  if (!identity?.role || !identity?.id) return null;
  const script = KAI_ONBOARDING_SCRIPT[projectKind]?.[identity.role];
  if (!script) return null;

  const moduleKey = getKaiModuleKey(identity.role, projectKind);
  const state = identity.kaiOnboarding?.[moduleKey] || {};
  if (state.phase1Done) return null;

  if (identity.role === 'Director') {
    const hasProjectOfKind = (experiments || []).some((e) => e.projectKind === projectKind);
    const rawIndex = state.stepIndex || 0;
    const skipStepIds = getDirectorSkipStepIds(projectKind, allowedProjectKinds);

    if (!hasProjectOfKind && rawIndex === 0) {
      // Recién arranca y no tiene ningún proyecto de este tipo — este es el trigger real.
      return buildStepResult({ script, state, moduleKey, skipStepIds });
    }

    if (hasProjectOfKind) {
      // El proyecto ya existe (se haya creado siguiendo cada paso de Kai o saltando alguno,
      // ej. clickeando "Crear proyecto →" directo) — no tiene sentido seguir empujando pasos
      // de ANTES de crear (objetivo/hipótesis/criterios/supervisor), ni mucho menos volver a
      // señalar "+ Crear proyecto": eso es lo que pasaba antes de este fix, cada vez que el
      // Director volvía a la lista de proyectos con el stepIndex guardado todavía atrás.
      // Si el paso guardado quedó desactualizado (apunta a antes de la creación), se adelanta
      // al primer paso posterior — nunca retrocede. `postCreation: true` en el dato del paso
      // (no un id hardcodeado) porque distintos projectKind tienen distinto primer paso
      // posterior a la creación (ej. "crear-prueba" en experimental, "cargar-tarea-manual" en
      // seguimiento — y en civil ese mismo paso se salta solo, cayendo directo a "cierre").
      const postCreationIndex = script.steps.findIndex((s) => s.postCreation);
      const effectiveIndex = Math.max(rawIndex, postCreationIndex);
      return buildStepResult({ script, state: { ...state, stepIndex: effectiveIndex }, moduleKey, skipStepIds });
    }

    // Ya dio el primer "Vamos" pero todavía no hay proyecto creado — sigue en medio de crearlo.
    return buildStepResult({ script, state, moduleKey, skipStepIds });
  }

  if (identity.role === 'Registrador') {
    const hasAssignedTest = (experiment?.tests || []).some((t) => (t.registradorIds || []).includes(identity.id))
      || (experiment?.tasks || []).some((t) => taskResponsables(t).includes(identity.id));
    if (!hasAssignedTest) {
      if (state.seenWaiting) return null;
      return { type: 'waiting', moduleKey, anchor: script.waiting.anchor, text: script.waiting.text };
    }
    return buildStepResult({ script, state, moduleKey });
  }

  if (identity.role === 'Supervisor') {
    if (!experiment) return null;
    // El paso de crear Prueba no aplica si el experimento ya tiene alguna — se saltea solo.
    // Presupuesto no aplica fuera de civil (seguimiento no lo tiene).
    const skipStepIds = [
      (experiment.tests || []).length > 0 ? 'crear-prueba' : null,
      projectKind !== 'civil' ? 'presupuesto' : null,
    ].filter(Boolean);
    return buildStepResult({ script, state, moduleKey, skipStepIds });
  }

  return null;
}

// Los ids 'elegir-tipo'/'cargar-excel'/'cargar-tarea-manual' solo existen en el guion de
// Director de civil/seguimiento — para experimental esta lista siempre queda vacía o con ids
// que no matchean ningún paso real (buildStepResult los ignora sin problema).
function getDirectorSkipStepIds(projectKind, allowedProjectKinds) {
  const singleKindTenant = Array.isArray(allowedProjectKinds) && allowedProjectKinds.length === 1;
  return [
    singleKindTenant ? 'elegir-tipo' : null, // el selector de tipo ni siquiera se renderiza
    projectKind !== 'civil' ? 'cargar-excel' : null,
    projectKind !== 'seguimiento' ? 'cargar-tarea-manual' : null,
  ].filter(Boolean);
}

function buildStepResult({ script, state, moduleKey, skipStepIds = [] }) {
  const steps = script.steps;
  let index = state.stepIndex || 0;
  while (index < steps.length && skipStepIds.includes(steps[index].id)) index += 1;
  if (index >= steps.length) return null;
  return { type: 'step', moduleKey, step: steps[index], stepIndex: index, total: steps.length };
}

// Fase 2 (progresivo) — a diferencia de getKaiOnboardingStep (secuencia fija por stepIndex),
// esto reacciona a datos reales del experimento: enseña cada cosa una sola vez, en cuanto la
// situación que la motiva existe de verdad. Solo arranca después de que Fase 1 quedó atrás
// (completada o descartada con "Ahora no") — evita dos sistemas de enseñanza compitiendo a la
// vez.
export function getKaiPhase2Step({ identity, experiment, projectKind = 'experimental' }) {
  if (!identity?.role || !experiment) return null;
  // Preferencia global de la persona (ver lib/labs/users.js#setKaiAvisos) — "apagados" corta
  // Fase 2 y 3; Fase 1 (getKaiOnboardingStep) nunca se filtra por esto, es orientación inicial,
  // no un aviso recurrente.
  if ((identity.kaiOnboarding?.avisos || 'activados') === 'apagados') return null;
  const moduleKey = getKaiModuleKey(identity.role, projectKind);
  const state = identity.kaiOnboarding?.[moduleKey] || {};
  if (!state.phase1Done) return null;

  const script = KAI_PHASE2_SCRIPT[projectKind]?.[identity.role];
  if (!script) return null;

  const seen = state.phase2Seen || {};

  // Orden intencional dentro de cada rol — si varias condiciones ya son ciertas a la vez, se
  // enseña de a una, la de mayor prioridad de flujo primero, nunca dos tooltips compitiendo.
  for (const { id, anchor, itemIds } of getPhase2Candidates(identity.role, experiment, projectKind)) {
    if (itemIds.length > 0 && !seen[id]) {
      return { type: 'phase2', id, moduleKey, anchor, text: script[id] };
    }
  }
  return null;
}

// Cada candidato trae `itemIds` (los IDs reales involucrados — ejecuciones, reportes,
// feedback) en vez de un booleano: Fase 2 solo mira si hay al menos uno (`itemIds.length > 0`),
// Fase 3 los usa para el dedup por contenido (ver getKaiPhase3Nudge) — mismos triggers de
// datos reales, una sola fuente de verdad para las dos fases.
function getPhase2Candidates(role, experiment, projectKind = 'experimental') {
  if (role === 'Supervisor' && (projectKind === 'civil' || projectKind === 'seguimiento')) {
    // Reusa computeCivilAlerts (lib/labs/experiments.js) tal cual llega en el experiment —
    // desvio_cronograma queda afuera a propósito: es una métrica del proyecto entero, sin id de
    // item propio, no encaja en el dedup por contenido que usa Fase 3 (ver plan).
    const alerts = experiment.civilAlerts || [];
    return [
      { id: 'tarea-vencida', anchor: 'nav-cronograma', itemIds: alerts.filter((a) => a.type === 'tarea_vencida').map((a) => a.taskId) },
      { id: 'sobrecosto', anchor: 'nav-presupuesto', itemIds: alerts.filter((a) => a.type === 'sobrecosto').map((a) => a.partidaId) },
    ];
  }
  if (role === 'Supervisor') {
    const executions = experiment.executions || [];
    return [
      { id: 'validar', anchor: 'nav-pruebas', itemIds: executions.filter((e) => !e.validatedBy).map((e) => e.id) },
      { id: 'feedback', anchor: 'nav-feedback', itemIds: executions.map((e) => e.id) },
      { id: 'reporte', anchor: 'nav-reportes', itemIds: executions.map((e) => e.id) },
    ];
  }
  // El Director nunca aporta ni valida — su único evento post-creación es aprobar lo que el
  // Supervisor ya envió (report.status === 'enviado', ver experiments.js#approveReport). Igual
  // en los 3 projectKind, no hace falta filtrar.
  if (role === 'Director') {
    const reports = experiment.reports || [];
    return [
      { id: 'aprobar-reporte', anchor: 'nav-reportes', itemIds: reports.filter((r) => r.status === 'enviado').map((r) => r.id) },
    ];
  }
  // Mismo criterio que FeedbackReceived (LabsClientTenant.jsx) — el Registrador solo ve
  // feedback con visibilidad "Todo el equipo", nunca el "Privado a Supervisor". Sin equivalente
  // en civil/seguimiento (no hay pestaña Feedback ahí) — se deja sin candidatos a propósito.
  if (role === 'Registrador' && projectKind === 'experimental') {
    const feedback = experiment.feedback || [];
    return [
      { id: 'feedback-recibido', anchor: 'nav-feedback', itemIds: feedback.filter((f) => f.visibility === 'Todo el equipo').map((f) => f.id) },
    ];
  }
  return [];
}

// Fase 3 (modo discreto) — mismos triggers que Fase 2, pero en vez de "una sola vez para
// siempre" es "una vez por cada situación concreta nueva": se guarda qué IDs ya se
// reconocieron (phase3Dismissed) y el aviso solo reaparece si hay al menos un ID que no
// estaba en ese conjunto — dedup por contenido, no por tiempo (ver plan: no se inventa un
// umbral de "cada cuánto" porque no existe en el producto).
export function getKaiPhase3Nudge({ identity, experiment, projectKind = 'experimental' }) {
  if (!identity?.role || !experiment) return null;
  // "Reducidos" ya corta acá (deja Fase 2 intacta, apaga solo lo recurrente); "apagados" corta
  // las dos fases (ver el mismo chequeo en getKaiPhase2Step).
  const avisos = identity.kaiOnboarding?.avisos || 'activados';
  if (avisos === 'apagados' || avisos === 'reducidos') return null;
  const moduleKey = getKaiModuleKey(identity.role, projectKind);
  const state = identity.kaiOnboarding?.[moduleKey] || {};
  if (!state.phase1Done) return null;

  const script = KAI_PHASE2_SCRIPT[projectKind]?.[identity.role];
  if (!script) return null;

  const dismissed = state.phase3Dismissed || {};
  for (const { id, anchor, itemIds } of getPhase2Candidates(identity.role, experiment, projectKind)) {
    if (itemIds.length === 0) continue;
    const alreadySeen = new Set(dismissed[id] || []);
    if (itemIds.some((itemId) => !alreadySeen.has(itemId))) {
      return { type: 'phase3', id, moduleKey, anchor, text: script[id], itemIds };
    }
  }
  return null;
}

// Snapshot a sembrar en phase3Dismissed apenas se reconoce el aviso equivalente de Fase 2 —
// sin esto, cerrar Fase 2 dispararía de inmediato Fase 3 mostrando exactamente lo mismo.
export function getPhase2ItemIds(role, experiment, id, projectKind = 'experimental') {
  return getPhase2Candidates(role, experiment, projectKind).find((c) => c.id === id)?.itemIds || [];
}
