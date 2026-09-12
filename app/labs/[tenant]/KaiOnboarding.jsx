'use client';

import { useEffect, useRef, useState } from 'react';
import KaiAvatar from '@/app/kai/components/KaiAvatar';
import { getKaiOnboardingStep, getKaiPhase2Step, getKaiPhase3Nudge, getKaiModuleKey, getPhase2ItemIds } from '@/lib/labs/kaiOnboarding';
import '../kai-onboarding.css';

// Widget autocontenido, deliberadamente fuera de LabsClientTenant.jsx (que ya tiene ~3600
// líneas) — tiene su propia máquina de estados (qué paso, dónde anclarlo) y no comparte nada
// con el resto de los componentes salvo lectura de props.
//
// Se monta una sola vez en LabsClientTenant.jsx (tanto en la pantalla de ExperimentPicker
// como en la vista de un experimento abierto) y decide solo si tiene algo que mostrar. No
// hace falta pasarle refs de los elementos a los que apunta: busca en vivo por
// [data-kai-anchor="..."] — así funciona igual si el elemento vive en la página principal,
// dentro de un modal, o aparece recién cuando el usuario avanza un paso.
// Si el ancla real de un paso no está en pantalla — típicamente porque el modal que la
// contiene está cerrado (recién logueado, recargó la página a mitad del flujo) — Kai no
// desaparece en silencio: retrocede al botón que abre ese modal/tab, para que la persona
// pueda volver a llegar ahí. No se persiste ningún avance mientras se está en un ancla de
// respaldo — el paso guardado real recién avanza cuando su propia ancla aparece.
const ANCHOR_FALLBACK = {
  'field-objective': 'create-experiment',
  'field-hypothesis': 'create-experiment',
  'field-success-criteria': 'create-experiment',
  'field-supervisor': 'create-experiment',
  'field-test-registradores': 'create-test',
  'create-test': 'nav-pruebas',
  // Las pestañas nav-* solo existen una vez que hay un experimento abierto. Si el paso
  // guardado las necesita pero estamos en la lista de proyectos, primero probamos "entrar" al
  // proyecto que ya existe (lo más común: se creó pero se volvió a la lista sin terminar el
  // resto de la secuencia) — recién si tampoco hay ningún proyecto, caemos hasta el botón de
  // creación.
  'nav-pruebas': 'enter-experiment',
  'nav-resumen': 'enter-experiment',
  'enter-experiment': 'create-experiment',
  // Si además "create-experiment" está tapado (el modal ya está abierto, a mitad de
  // completarse), el siguiente escalón es señalar el botón real de submit — clickearlo con un
  // formulario incompleto no rompe nada (el propio modal lo ignora si falta el nombre).
  'create-experiment': 'submit-create-experiment',
};

// No alcanza con "tiene ancho y alto" — un botón detrás del overlay de un modal (ej.
// "+ Crear proyecto" mientras CreateExperimentModal está abierto) sigue midiendo su tamaño
// real aunque esté tapado, así que hay que confirmar que de verdad es lo que hay en su propio
// centro (elementFromPoint), no algo del modal por encima.
function isTrulyVisible(el) {
  const r = el.getBoundingClientRect();
  if (r.width <= 0 || r.height <= 0) return false;
  const cx = r.left + r.width / 2;
  const cy = r.top + r.height / 2;
  if (cx < 0 || cy < 0 || cx > window.innerWidth || cy > window.innerHeight) return false;
  const top = document.elementFromPoint(cx, cy);
  return !!top && (top === el || el.contains(top) || top.contains(el));
}

// Las pestañas de navegación existen dos veces en el DOM (.sidenav para desktop, .mobile-tabs
// para pantallas chicas — labs.css:165,671 — mutuamente excluyentes según el ancho), así que
// el mismo data-kai-anchor matchea dos elementos. document.querySelector siempre devuelve el
// primero en el DOM sin importar si está oculto (display:none mide 0x0) — hay que quedarse con
// el que de verdad se ve.
function findVisibleAnchor(name) {
  const els = document.querySelectorAll(`[data-kai-anchor="${name}"]`);
  for (const el of els) {
    if (isTrulyVisible(el)) return el;
  }
  return null;
}

function resolveAnchor(startAnchor) {
  let current = startAnchor;
  let hops = 0;
  while (current && hops < 5) {
    const el = findVisibleAnchor(current);
    if (el) return { anchor: current, el, isFallback: current !== startAnchor };
    current = ANCHOR_FALLBACK[current];
    hops += 1;
  }
  return null;
}

// Pasos que solo señalan un campo ya visible (no hay nada que "clickear", a diferencia de
// create-experiment o un nav-*) — pedir un click de "Vamos" ahí es fricción de más: si la
// persona ya empezó a completarlo, eso ya es la confirmación de que entendió. Cada función
// lee el DOM del propio contenedor anclado, sin acceso al estado de React del modal.
const FIELD_AUTO_ADVANCE = {
  'field-objective': (el) => !!el.querySelector('textarea')?.value.trim(),
  'field-hypothesis': (el) => !!el.querySelector('textarea')?.value.trim(),
  'field-success-criteria': (el) => {
    const labels = el.querySelectorAll('input[placeholder^="Nombre"]');
    const values = el.querySelectorAll('input[placeholder="Valor"]');
    return Array.from(labels).some((input, i) => input.value.trim() && values[i]?.value.trim());
  },
  'field-supervisor': (el) => !!el.querySelector('.labs-entry-role-btn.active'),
};

// Un solo campo (Objetivo, Hipótesis) puede avanzar apenas se empieza a escribir — no hay
// ambigüedad, hay una sola cosa que completar. Con más de un campo (Criterios: nombre + valor)
// reaccionar tecla por tecla es impredecible — puede saltar a mitad de palabra si el otro
// campo ya tenía contenido. Ahí se espera a "blur" (salir del campo), un evento discreto que
// la persona ejecuta a propósito. Supervisor no necesita entrada acá: son botones de toggle,
// no disparan "input" — el click ya es un evento completo y lo cubre el polling de respaldo.
const AUTO_ADVANCE_TRIGGER = {
  'field-objective': 'input',
  'field-hypothesis': 'input',
  'field-success-criteria': 'blur',
};

// Si el tenant todavía no tiene ningún Supervisor cargado, UserMultiSelect ya muestra su propio
// aviso ("Todavía no hay ningún Supervisor creado…") — pedirle igual a la persona que "elija
// uno" en ese estado no tiene sentido. Se detecta ese aviso (.empty-note, único dentro de este
// contenedor) y se reemplaza el texto del paso por uno que reconoce la situación real.
const FIELD_EMPTY_STATE_TEXT = {
  'field-supervisor': (el) => (
    el.querySelector('.empty-note')
      ? 'Todavía no tienes ningún Supervisor cargado — pídele al admin que cree uno. Por ahora puedes seguir sin asignarlo.'
      : null
  ),
};

// Kai no se adelanta a mostrar el primer campo del modal antes de que la persona haya puesto
// el Nombre — aunque el campo de Objetivo ya esté visible apenas se abre el modal, mostrar el
// tooltip ahí de entrada sugiere (sin querer) que hay que empezar por ese campo y no por
// Nombre, que está arriba. Se espera en silencio hasta que Nombre tenga contenido.
const STEP_PREREQUISITE = {
  'field-objective': () => {
    const el = document.querySelector('[data-kai-anchor="field-name"]');
    return !!el && el.value.trim().length > 0;
  },
};

// Un tooltip que aparece apenas carga la pantalla compite con que la persona todavía se está
// orientando — se lee como parte del loading, no como una observación de Kai. Este delay hace
// que solo se muestre si el ancla se sostiene visible un rato, no en el primer tick.
const REVEAL_DELAY_MS = 600;

// Dentro de un experimento abierto, el projectKind no es ambiguo (Supervisor/Registrador
// siempre operan así). El único caso ambiguo es el Director parado en la lista de proyectos,
// sin ninguno abierto todavía — ahí puede necesitar el onboarding de creación de cualquiera de
// los tipos que el tenant permita, el primero que no haya creado todavía. Se prueban en este
// orden fijo (nunca compiten dos avisos a la vez, se usa el primero que aplique).
const PROJECT_KIND_CANDIDATES = ['experimental', 'civil', 'seguimiento'];

function resolveDirectorPickerStep({ identity, experiments, tenantMeta }) {
  const allowedProjectKinds = tenantMeta?.allowedProjectKinds;
  const candidates = Array.isArray(allowedProjectKinds) && allowedProjectKinds.length
    ? PROJECT_KIND_CANDIDATES.filter((k) => allowedProjectKinds.includes(k))
    : PROJECT_KIND_CANDIDATES;
  for (const projectKind of candidates) {
    const step = getKaiOnboardingStep({ identity, experiments, experiment: null, projectKind, allowedProjectKinds });
    if (step) return step;
  }
  return null;
}

export default function KaiOnboarding({ tenant, tenantMeta, identity, experiments, experiment, onIdentityUpdate }) {
  const [resolved, setResolved] = useState(null);
  const [dismissed, setDismissed] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const tipRef = useRef(null);

  // Adentro de un experimento, el tipo es el suyo propio; en la lista de proyectos (sin
  // experimento abierto) solo el Director puede tener algo que mostrar, y hay que resolver
  // cuál de los tipos permitidos le corresponde (ver resolveDirectorPickerStep).
  const currentProjectKind = experiment?.meta?.projectKind || null;
  const result = experiment
    ? (getKaiOnboardingStep({ identity, experiments, experiment, projectKind: currentProjectKind })
      ?? getKaiPhase2Step({ identity, experiment, projectKind: currentProjectKind }))
    : (identity?.role === 'Director' ? resolveDirectorPickerStep({ identity, experiments, tenantMeta }) : null);
  const anchor = result?.anchor || result?.step?.anchor || null;

  // El FAB (modo discreto) vive independiente del tooltip anclado de arriba — aparece apenas
  // Fase 1 terminó para este rol+módulo, y sigue ahí quieto aunque haya (o no) un tooltip de
  // Fase 1/2 activo en ese momento. Nunca compiten dos avisos a la vez: Fase 3 ni se calcula
  // si ya hay un `result` de Fase 1/2 mostrándose. Requiere un experimento abierto (mismo
  // criterio que Fase 2/3), así que el projectKind acá siempre es el del experimento actual.
  const moduleKeyForRole = identity?.role && currentProjectKind ? getKaiModuleKey(identity.role, currentProjectKind) : null;
  const phase1Done = !!(moduleKeyForRole && identity.kaiOnboarding?.[moduleKeyForRole]?.phase1Done);
  const showFab = phase1Done && !!experiment;
  const phase3 = !result ? getKaiPhase3Nudge({ identity, experiment, projectKind: currentProjectKind }) : null;

  const [phase3Revealed, setPhase3Revealed] = useState(false);
  useEffect(() => {
    setPhase3Revealed(false);
    if (!phase3) return undefined;
    const timer = setTimeout(() => setPhase3Revealed(true), REVEAL_DELAY_MS);
    return () => clearTimeout(timer);
  }, [phase3?.id]);

  // Toggle manual del FAB — clickearlo mientras hay un aviso visible lo cierra (sin "verlo"
  // como reconocido, eso solo lo hace "Entendido"); si aparece un aviso nuevo, vuelve a
  // aparecer solo aunque el anterior se haya cerrado a mano.
  const [fabToggle, setFabToggle] = useState(true);
  useEffect(() => { setFabToggle(true); }, [phase3?.id]);
  const bubbleVisible = phase3Revealed && fabToggle;

  // Un paso/estado nuevo (avanzó, o cambió de rol/experimento) vuelve a habilitar el tooltip —
  // "dismissed" es solo para la sesión de un mismo paso, no un flag global.
  const resultKey = result ? `${result.moduleKey}:${result.type}:${result.step?.id || result.id || 'waiting'}` : null;
  const lastKeyRef = useRef(resultKey);
  if (resultKey !== lastKeyRef.current) {
    lastKeyRef.current = resultKey;
    if (dismissed) setDismissed(false);
  }

  const patch = async (moduleKey, patchBody) => {
    onIdentityUpdate((prev) => ({
      ...prev,
      kaiOnboarding: {
        ...(prev.kaiOnboarding || {}),
        [moduleKey]: { ...(prev.kaiOnboarding?.[moduleKey] || {}), ...patchBody },
      },
    }));
    try {
      await fetch(`/api/labs/${tenant}/users/me/onboarding`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ moduleKey, patch: patchBody }),
      });
    } catch {
      // Si falla la persistencia, en el peor caso el onboarding vuelve a aparecer en el
      // próximo login — no es motivo para romper la sesión actual por esto.
    }
  };

  // Refs para que el polling del efecto siempre lea el resultado/estado más reciente sin
  // tener que recrear el intervalo en cada tecla que alguien tipea (el efecto solo depende de
  // "anchor", que no cambia mientras se está completando un mismo paso).
  const resultRef = useRef(result);
  resultRef.current = result;
  const dismissedRef = useRef(dismissed);
  dismissedRef.current = dismissed;
  const autoAdvancedRef = useRef(null);

  const advanceStep = (r) => {
    const nextIndex = r.stepIndex + 1;
    const isLast = nextIndex >= r.total;
    patch(r.moduleKey, isLast ? { stepIndex: nextIndex, phase1Done: true } : { stepIndex: nextIndex });
    if (isLast) setDismissed(true);
  };

  useEffect(() => {
    if (!anchor) { setResolved(null); return undefined; }
    // "eventType" distingue quién disparó el chequeo — 'poll' (el intervalo de respaldo)
    // siempre puede disparar el auto-avance; 'input'/'blur' solo si coinciden con lo que ese
    // paso específico espera (ver AUTO_ADVANCE_TRIGGER) — así "Objetivo" avanza al tipear pero
    // "Criterios" espera a que salgas del campo, sin que ninguno de los dos tenga que saberlo
    // el uno del otro.
    const update = (eventType = 'poll') => {
      let next = resolveAnchor(anchor);
      // Si el ancla real ya está visible pero todavía no se cumple su prerrequisito (ej.
      // "Nombre" vacío antes de mostrar el paso de Objetivo), se espera en silencio — no es
      // "no encontrado" (no cae al fallback), es "todavía no, pero ya está a la vista".
      if (next && !next.isFallback && STEP_PREREQUISITE[next.anchor]?.() === false) next = null;
      setResolved(next);

      const r = resultRef.current;
      const autoCheck = next && !next.isFallback && r?.type === 'step' ? FIELD_AUTO_ADVANCE[next.anchor] : null;
      const requiredTrigger = autoCheck ? AUTO_ADVANCE_TRIGGER[next.anchor] : null;
      const triggerMatches = eventType === 'poll' || !requiredTrigger || eventType === requiredTrigger;
      if (autoCheck && triggerMatches && !dismissedRef.current && autoCheck(next.el)) {
        const dedupeKey = `${r.moduleKey}:${r.step.id}`;
        if (autoAdvancedRef.current !== dedupeKey) {
          autoAdvancedRef.current = dedupeKey;
          advanceStep(r);
        }
      }
    };
    update();
    // "Escribiste algo" (input) y "saliste del campo" (blur, no burbujea — se escucha en fase
    // de captura) sí tienen eventos reales — se escuchan por delegación en el document, sin
    // tocar el onChange de cada campo del modal. Lo que NO tiene un evento propio es "el modal
    // ya se abrió" o "cambió de tab" — para eso sigue el polling liviano de respaldo.
    const onInput = () => update('input');
    const onBlur = () => update('blur');
    const interval = setInterval(update, 400);
    document.addEventListener('input', onInput, true);
    document.addEventListener('blur', onBlur, true);
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      clearInterval(interval);
      document.removeEventListener('input', onInput, true);
      document.removeEventListener('blur', onBlur, true);
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [anchor]);

  // Delay de aparición: "resolved" puede quedar disponible en el primer tick (400ms o menos),
  // pero recién se muestra si se sostiene por REVEAL_DELAY_MS — evita que compita con la carga
  // de la pantalla. Si lo que hay para mostrar cambia (otro ancla, o pasa a fallback/deja de
  // serlo) antes de que se cumpla el delay, se reinicia el conteo para ese estado nuevo.
  const revealKey = resolved ? `${resolved.anchor}:${resolved.isFallback}` : null;
  useEffect(() => {
    setRevealed(false);
    if (!revealKey) return undefined;
    const timer = setTimeout(() => setRevealed(true), REVEAL_DELAY_MS);
    return () => clearTimeout(timer);
  }, [revealKey]);

  // La posición/flecha ya apuntan al elemento correcto, pero eso no alcanza para que se lea
  // sin ambigüedad — un nav-item con el fondo de "vista activa" (ej. Resumen, si es donde está
  // parada la persona) puede leerse como "el señalado" aunque Kai en realidad apunte a otra
  // pestaña (ej. Pruebas). El resaltado propio saca esa ambigüedad, sin depender del estado de
  // "activo" de la navegación.
  useEffect(() => {
    if (!revealed || !resolved?.el) return undefined;
    const el = resolved.el;
    el.classList.add('kai-onb-highlight');
    return () => el.classList.remove('kai-onb-highlight');
  }, [revealed, resolved?.el]);

  const showAnchoredTip = !!result && !dismissed && !!resolved && revealed;
  if (!showAnchoredTip && !showFab) return null;

  const handleWaitingAck = () => {
    patch(result.moduleKey, { seenWaiting: true });
    setDismissed(true);
  };

  // A diferencia del resto de los patches (merge superficial dentro de kaiOnboarding[moduleKey]
  // — ver patch() arriba), phase2Seen/phase3Dismissed necesitan un merge un nivel más profundo:
  // si se reemplazaran enteros, marcar "validar" visto borraría que "feedback" ya se había
  // marcado antes. Además de marcar Fase 2 vista, se siembra phase3Dismissed con el snapshot
  // actual de IDs pendientes — si no, Fase 3 se dispararía de inmediato mostrando lo mismo que
  // Fase 2 recién cerró.
  const handlePhase2Ack = () => {
    const moduleData = identity.kaiOnboarding?.[result.moduleKey] || {};
    const currentSeen = moduleData.phase2Seen || {};
    const currentDismissed = moduleData.phase3Dismissed || {};
    const itemIds = getPhase2ItemIds(identity.role, experiment, result.id, currentProjectKind);
    patch(result.moduleKey, {
      phase2Seen: { ...currentSeen, [result.id]: true },
      phase3Dismissed: { ...currentDismissed, [result.id]: itemIds },
    });
    setDismissed(true);
  };

  // Fase 3: se reconoce guardando exactamente los IDs que se mostraron ahora — si aparece un
  // ID nuevo más adelante (otro aporte sin validar, otro reporte enviado), el aviso vuelve a
  // dispararse; los que ya se vieron acá no vuelven a contar.
  const handlePhase3Ack = () => {
    const currentDismissed = identity.kaiOnboarding?.[phase3.moduleKey]?.phase3Dismissed || {};
    patch(phase3.moduleKey, { phase3Dismissed: { ...currentDismissed, [phase3.id]: phase3.itemIds } });
    setFabToggle(false);
  };

  const handleFabClick = () => {
    if (phase3) setFabToggle((v) => !v);
  };

  let tipJSX = null;
  if (showAnchoredTip) {
  const rect = resolved.el.getBoundingClientRect();

  // Pasos como "create-experiment" o cualquier "nav-*" apuntan a un botón/tab real — "Vamos"
  // ahí no es solo "entendido", es "hacé el siguiente paso por mí": si no lo clickeamos
  // nosotros, la persona ve desaparecer el tooltip sin que pase nada visible y no sabe que
  // tiene que clickear el mismo botón que Kai le estaba señalando. Los anchors "field-*" son
  // solo informativos (apuntan a campos ya visibles dentro de un modal abierto), esos no se
  // clickean.
  const isActionableAnchor = (a) => a === 'create-experiment' || a === 'create-test' || a === 'submit-create-experiment' || a === 'enter-experiment' || a?.startsWith('nav-');

  // Sigue disponible como override manual incluso en los pasos con auto-avance (ej. si el
  // campo ya tenía contenido de antes y el chequeo no llegó a dispararse en el primer tick).
  const handleAdvance = () => {
    if (isActionableAnchor(resolved.anchor)) resolved.el.click();
    advanceStep(result);
  };

  // Solo reabre el modal/tab que hace falta para volver a ver el paso real — no toca el
  // progreso guardado, así que al reabrirlo el paso correcto aparece solo en el próximo tick.
  const handleOpenFallback = () => resolved.el.click();

  // "Ahora no" en cualquier paso cierra el onboarding para siempre en este rol+módulo — no se
  // le vuelve a forzar la secuencia completa (ver constitución de Kai). El FAB de Fase 3 sigue
  // disponible después (si `showFab` aplica), así que Kai "queda disponible" aunque este paso
  // puntual no se retome.
  const handleDismissStep = () => {
    patch(result.moduleKey, { phase1Done: true });
    setDismissed(true);
  };

  const isWaiting = result.type === 'waiting';
  const isPhase2 = result.type === 'phase2';
  const emptyStateText = !resolved.isFallback && !isWaiting && !isPhase2 ? FIELD_EMPTY_STATE_TEXT[resolved.anchor]?.(resolved.el) : null;
  const text = resolved.isFallback
    ? 'Sigue por acá para continuar.'
    : (isWaiting || isPhase2 ? result.text : (emptyStateText || result.step.text));
  // Pasos consecutivos pueden compartir ancla (ej. "bienvenida" y "ver-resumen" del Supervisor
  // apuntan los dos a Resumen) — sin esto, el texto cambia en el mismo lugar sin ninguna señal
  // de que es un mensaje nuevo. La key fuerza que React remonte el <p> (retriggerea el fade de
  // kai-onb-tip-text) cada vez que el contenido real cambia, aunque la posición no se mueva.
  const contentKey = resolved.isFallback ? 'fallback' : (isWaiting || isPhase2 ? (result.id || 'waiting') : result.step.id);

  // Preferimos el costado derecho — abajo, en campos de modal que ocupan casi todo el ancho,
  // el tooltip termina tapando el siguiente campo. Si no entra a la derecha (poco espacio o
  // mobile), cae debajo como respaldo.
  //
  // Para las pestañas del sidenav, "a la derecha del botón" no alcanza: el botón de cada
  // pestaña es angosto (no ocupa todo el ancho de la columna), así que el tooltip terminaba
  // cayendo todavía dentro del menú y tapando las pestañas de abajo. Ahí hay que despejar el
  // sidenav completo, no solo el botón — el punto de referencia horizontal pasa a ser el
  // borde derecho del menú, aunque la altura se siga alineando con el botón señalado.
  const sidenavEl = resolved.anchor?.startsWith('nav-') ? resolved.el.closest('.sidenav') : null;
  const clearanceRect = sidenavEl ? sidenavEl.getBoundingClientRect() : rect;

  const TIP_WIDTH = 280;
  const GAP = 14;
  const fitsOnRight = window.innerWidth - clearanceRect.right - GAP - TIP_WIDTH > 0;
  const side = fitsOnRight ? 'right' : 'bottom';
  const top = fitsOnRight
    ? rect.top + window.scrollY
    : clearanceRect.bottom + window.scrollY + 10;
  const left = fitsOnRight
    ? clearanceRect.right + window.scrollX + GAP
    : Math.min(Math.max(rect.left + window.scrollX, 12), window.innerWidth - TIP_WIDTH - 12);

  tipJSX = (
    <div ref={tipRef} className={`kai-onb-tip kai-onb-tip--${side}`} style={{ top, left }} role="dialog" aria-label="Kai">
      <div className="kai-onb-tip-arrow" />
      <div className="kai-onb-tip-header">
        <KaiAvatar size={20} />
        <span className="kai-onb-tip-name">Kai</span>
      </div>
      <p key={contentKey} className="kai-onb-tip-text">{text}</p>
      <div className="kai-onb-tip-actions">
        {resolved.isFallback ? (
          <button type="button" className="kai-onb-btn-go" onClick={handleOpenFallback}>Abrir</button>
        ) : isWaiting ? (
          <button type="button" className="kai-onb-btn-go" onClick={handleWaitingAck}>Entendido</button>
        ) : isPhase2 ? (
          <button type="button" className="kai-onb-btn-go" onClick={handlePhase2Ack}>Entendido</button>
        ) : (
          <>
            <button type="button" className="kai-onb-btn-go" onClick={handleAdvance}>{result.step.ctaLabel || 'Vamos'}</button>
            <button type="button" className="kai-onb-btn-skip" onClick={handleDismissStep}>Ahora no</button>
          </>
        )}
      </div>
    </div>
  );
  }

  return (
    <>
      {tipJSX}
      {showFab && (
        <div className="kai-fab-wrap">
          {bubbleVisible && phase3 && (
            <div className="kai-fab-nudge" role="dialog" aria-label="Kai">
              <div className="kai-onb-tip-header">
                <KaiAvatar size={20} />
                <span className="kai-onb-tip-name">Kai</span>
              </div>
              <p key={phase3.id} className="kai-onb-tip-text">{phase3.text}</p>
              <div className="kai-onb-tip-actions">
                <button type="button" className="kai-onb-btn-go" onClick={handlePhase3Ack}>Entendido</button>
              </div>
            </div>
          )}
          <button type="button" className="kai-fab" onClick={handleFabClick} aria-label="Kai">
            <KaiAvatar size={26} />
            {!!phase3 && <span className="kai-fab-dot" />}
          </button>
        </div>
      )}
    </>
  );
}
