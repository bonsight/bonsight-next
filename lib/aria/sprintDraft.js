import Anthropic from '@anthropic-ai/sdk';
import { getInvestigation } from '@/lib/aria/memory';
import { getBoardData, BONSIGHT_CLIENTE_ID } from '@/lib/aria/board';
import { listMeetingIndex } from '@/lib/kai/meetings';
import { getConversationMessages } from '@/lib/kai/memory';

const MODEL = 'claude-sonnet-4-6';

// Encuentra el mensaje de canvas más reciente de la investigación — ahí viven los
// grupos del workshop (categoria/responsable/involucrados/ficha se mutan in-place
// sobre ese mismo mensaje via updateCanvasInMessage, nunca se crea uno nuevo).
function findLatestCanvas(messages) {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i]?.canvas) return { canvas: messages[i].canvas, messageIndex: i };
  }
  return null;
}

// Junta todos los grupos con ficha guardada, de todas las preguntas del canvas.
function collectGroupsWithFicha(canvas) {
  const out = [];
  for (const q of canvas.questions ?? []) {
    for (const g of q.groups ?? []) {
      if (g.ficha) out.push({ questionId: q.questionId, group: g });
    }
  }
  return out;
}

async function loadSubstantiveMeetings(tenant) {
  const index = await listMeetingIndex(tenant);
  const substantive = index.filter((e) => e.hasSubstantiveContent !== false);
  const byConversation = new Map();
  for (const entry of substantive) {
    if (!byConversation.has(entry.conversationId)) byConversation.set(entry.conversationId, []);
    byConversation.get(entry.conversationId).push(entry.messageIndex);
  }

  const meetings = [];
  await Promise.all(
    [...byConversation.entries()].map(async ([conversationId, messageIndexes]) => {
      const messages = await getConversationMessages(tenant, conversationId);
      for (const messageIndex of messageIndexes) {
        const analysis = messages[messageIndex]?.meetingAnalysis;
        if (!analysis) continue;
        meetings.push({
          conversationId,
          messageIndex,
          title: analysis.meetingTitle || 'Reunión',
          analyzedAt: analysis.analyzedAt,
          summary: analysis.summary || '',
          tasks: (analysis.tasks ?? []).map((t) => ({ owner: t.owner, task: t.task, possibleOwners: t.possibleOwners })),
        });
      }
    })
  );
  return meetings;
}

function buildPrompt({ groups, proyectos, iniciativas, meetings, talento }) {
  const proyectosBlock = proyectos.length
    ? proyectos.map((p) => `- id:${p.id} — "${p.name}"`).join('\n')
    : '(sin proyectos existentes para este cliente)';

  const iniciativasBlock = iniciativas.length
    ? iniciativas.map((i) => `- id:${i.id} — "${i.name}" (proyecto: ${i.proyectoId ?? 'sin proyecto'})`).join('\n')
    : '(sin iniciativas existentes)';

  const talentoBlock = talento.length
    ? talento.map((t) => `- "${t.name}"`).join('\n')
    : '(sin equipo registrado en Talento)';

  const meetingsBlock = meetings.length
    ? meetings
        .map(
          (m) =>
            `- ref:${m.conversationId}:${m.messageIndex} — "${m.title}" (${m.analyzedAt})\n  Resumen: ${m.summary}\n  Tareas ya extraídas: ${m.tasks.map((t) => `[dueño: ${t.owner ?? '?'}${t.possibleOwners?.length ? `, posibles: ${t.possibleOwners.join('/')}` : ''}] ${t.task}`).join(' | ') || '(ninguna)'}`
        )
        .join('\n')
    : '(sin reuniones con contenido sustantivo)';

  const groupsBlock = groups
    .map(({ questionId, group }) => {
      const f = group.ficha;
      return `### Grupo id:${group.id} (pregunta:${questionId}) — "${group.name}"
Consolidado del workshop: ${group.consolidatedText || '(sin texto)'}
Ficha de objetivos (consolidada de ${f.participantCount ?? '?'} participantes: ${(f.participantNames ?? []).join(', ')}):
- Objetivo: ${f.objetivo}
- Problema/situación actual: ${f.problema}
- Por qué es prioritario ahora: ${f.prioridad}
- Cómo se ve el éxito: ${f.exito}
- Restricciones: ${f.restricciones}`;
    })
    .join('\n\n');

  return `Sos el asistente de planificación de sprints de Bonsight. Vas a convertir agrupaciones de un workshop interno (cada una con su ficha de objetivos ya consolidada) en tareas de sprint concretas, resolviendo además a qué Proyecto e Iniciativa de Notion pertenece cada agrupación.

PROYECTOS EXISTENTES (cliente Bonsight):
${proyectosBlock}

INICIATIVAS EXISTENTES:
${iniciativasBlock}

REUNIONES DE KAI CON CONTENIDO SUSTANTIVO (para vincular, si aplica):
${meetingsBlock}

EQUIPO (Talento — para proponer responsable, si hay señal clara):
${talentoBlock}

AGRUPACIONES A PROCESAR:
${groupsBlock}

Para cada agrupación:
1. **Proyecto**: elegí el proyecto existente que mejor coincida (mismo tema/cliente recurrente), o proponé uno nuevo si ninguno encaja. Si es de un proyecto existente, usá su id tal cual. Si es nuevo, id debe ser null y dale un nombre corto y claro.
2. **Iniciativa**: igual, mirando iniciativas dentro del proyecto elegido (o coherente con el proyecto nuevo si aplica).
3. **Tareas**: descomponé la agrupación (ficha + consolidado + tareas de reuniones vinculadas, si hay) en 2-6 tareas ejecutables y concretas — no repitas la iniciativa completa como una sola tarea. Para cada tarea asigná prioridad Alta/Media/Baja con este criterio: Alta si la ficha menciona urgencia explícita en "por qué es prioritario ahora" O si el mismo punto aparece repetido en la ficha y en tareas de reuniones vinculadas; Media si aparece en una sola fuente sin urgencia explícita; Baja si es una mención secundaria o "nice to have". Además, proponé un responsable (nombre exacto de la lista de EQUIPO de arriba) SOLO si hay una señal clara — por ejemplo la tarea viene directo de una tarea de reunión con dueño explícito, o la ficha/consolidado menciona a esa persona en relación directa con ese punto. Si no hay señal clara, dejalo sin asignar — no adivines.
4. **Reunión vinculada**: de la lista de reuniones de arriba, elegí la que mejor corresponda temáticamente a esta agrupación (por ref conversationId:messageIndex), o null si ninguna aplica con confianza razonable. No inventes vínculos débiles.

Respondé ÚNICAMENTE con JSON válido, sin texto antes ni después, sin markdown:
{
  "groups": [
    {
      "groupId": "string",
      "proyecto": { "id": "string o null", "name": "string", "reason": "string" },
      "iniciativa": { "id": "string o null", "name": "string", "reason": "string" },
      "tasks": [ { "title": "string", "priority": "Alta|Media|Baja", "responsable": "nombre exacto del EQUIPO o null", "reason": "string" } ],
      "meeting": { "conversationId": "string", "messageIndex": 0, "reason": "string" } o null
    }
  ],
  "recommendedSprintCount": 1,
  "sprintPackagingReason": "string"
}`;
}

function buildTriagePrompt(groups) {
  const groupsBlock = groups
    .map(({ questionId, group }) => {
      const f = group.ficha;
      return `### Grupo id:${group.id} (pregunta:${questionId}) — "${group.name}"
Consolidado del workshop: ${group.consolidatedText || '(sin texto)'}
Ficha de objetivos (consolidada de ${f.participantCount ?? '?'} participantes: ${(f.participantNames ?? []).join(', ')}):
- Objetivo: ${f.objetivo}
- Problema/situación actual: ${f.problema}
- Por qué es prioritario ahora: ${f.prioridad}
- Cómo se ve el éxito: ${f.exito}
- Restricciones: ${f.restricciones}`;
    })
    .join('\n\n');

  return `Sos el asistente de triage de iniciativas de Bonsight. Antes de generar tareas de sprint, hay que decidir qué agrupaciones de un workshop interno conviene avanzar ahora. Para cada agrupación, estimá dos ejes:

- **Valor para Bonsight** (alto/medio/bajo): alto si el objetivo tiene impacto directo en ingresos/adopción/retención, el "cómo se ve el éxito" es concreto y medible, o coincidieron varios participantes en el punto; medio si el impacto es real pero indirecto; bajo si es cosmético o de alcance muy acotado.
- **Esfuerzo estimado** (alto/bajo): alto si la ficha menciona restricciones fuertes (dependencias, tiempo, recursos) o implica construir desde cero; bajo si es incremental sobre algo que ya existe.

Con esos dos ejes, ubicá cada agrupación en un cuadrante:
- "wins" (quick win): valor alto, esfuerzo bajo.
- "bets" (gran apuesta): valor alto, esfuerzo alto.
- "filler" (relleno): valor medio/bajo, esfuerzo bajo.
- "avoid" (evitar por ahora): valor bajo, esfuerzo alto.

Sugerí avanzar (suggested: true) las de cuadrante "wins" y "bets" — las de "filler" quedan a criterio (marcalas true solo si son rápidas y claramente vale la pena sumarlas), las de "avoid" van en false. Escribí un motivo de una sola línea por agrupación, concreto y basado en la ficha (ej. "mencionado por 3/3 participantes, cambios acotados a UI existente" en vez de algo genérico).

AGRUPACIONES:
${groupsBlock}

Respondé ÚNICAMENTE con JSON válido, sin texto antes ni después, sin markdown:
{
  "groups": [
    { "groupId": "string", "valor": "alto|medio|bajo", "esfuerzo": "alto|bajo", "quadrant": "wins|bets|filler|avoid", "suggested": true, "reason": "string" }
  ]
}`;
}

export async function generateSprintTriage(tenant, investigationId) {
  const investigation = await getInvestigation(tenant, investigationId);
  if (!investigation) throw new Error('Investigación no encontrada.');

  const found = findLatestCanvas(investigation.messages ?? []);
  if (!found) throw new Error('Esta investigación no tiene un canvas de workshop.');

  const groups = collectGroupsWithFicha(found.canvas);
  if (!groups.length) throw new Error('Todavía no hay ninguna ficha consolidada en este workshop.');

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 3072,
    messages: [{ role: 'user', content: buildTriagePrompt(groups) }],
  });
  const text = response.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n');
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '');
  const parsed = JSON.parse(cleaned);

  const QUADRANTS = new Set(['wins', 'bets', 'filler', 'avoid']);
  return {
    investigationId,
    groups: parsed.groups.map((g) => {
      const source = groups.find((x) => x.group.id === g.groupId);
      return {
        groupId: g.groupId,
        groupName: source?.group.name ?? g.groupId,
        valor: ['alto', 'medio', 'bajo'].includes(g.valor) ? g.valor : 'medio',
        esfuerzo: ['alto', 'bajo'].includes(g.esfuerzo) ? g.esfuerzo : 'alto',
        quadrant: QUADRANTS.has(g.quadrant) ? g.quadrant : 'filler',
        suggested: g.suggested !== false,
        reason: g.reason ?? '',
      };
    }),
  };
}

export async function generateSprintDraft(tenant, token, investigationId, groupIds) {
  const investigation = await getInvestigation(tenant, investigationId);
  if (!investigation) throw new Error('Investigación no encontrada.');

  const found = findLatestCanvas(investigation.messages ?? []);
  if (!found) throw new Error('Esta investigación no tiene un canvas de workshop.');

  let groups = collectGroupsWithFicha(found.canvas);
  if (groupIds?.length) {
    const allowed = new Set(groupIds);
    groups = groups.filter((g) => allowed.has(g.group.id));
  }
  if (!groups.length) throw new Error('Todavía no hay ninguna ficha consolidada en este workshop.');

  const [boardData, meetings] = await Promise.all([
    getBoardData(token, {}),
    loadSubstantiveMeetings(tenant),
  ]);

  const proyectos = boardData.proyectos.filter((p) => p.name?.trim() && p.clienteId === BONSIGHT_CLIENTE_ID);
  const proyectoIds = new Set(proyectos.map((p) => p.id));
  const iniciativas = boardData.iniciativas.filter((i) => i.name?.trim() && proyectoIds.has(i.proyectoId));
  const talento = boardData.talento.filter((t) => t.name?.trim());

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 8192,
    messages: [{ role: 'user', content: buildPrompt({ groups, proyectos, iniciativas, meetings, talento }) }],
  });
  const text = response.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n');
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '');
  const parsed = JSON.parse(cleaned);

  const proyectoById = new Map(proyectos.map((p) => [p.id, p]));
  const iniciativaById = new Map(iniciativas.map((i) => [i.id, i]));
  const meetingByRef = new Map(meetings.map((m) => [`${m.conversationId}:${m.messageIndex}`, m]));
  const talentoByName = new Map(talento.map((t) => [t.name.trim().toLowerCase(), t]));

  const resultGroups = parsed.groups.map((g) => {
    const source = groups.find((x) => x.group.id === g.groupId);
    const existingProyecto = g.proyecto?.id ? proyectoById.get(g.proyecto.id) : null;
    const existingIniciativa = g.iniciativa?.id ? iniciativaById.get(g.iniciativa.id) : null;
    const meetingRef = g.meeting ? `${g.meeting.conversationId}:${g.meeting.messageIndex}` : null;
    const meeting = meetingRef ? meetingByRef.get(meetingRef) : null;

    return {
      groupId: g.groupId,
      questionId: source?.questionId ?? null,
      groupName: source?.group.name ?? g.groupId,
      proyecto: {
        id: existingProyecto?.id ?? null,
        name: existingProyecto?.name ?? g.proyecto?.name ?? 'Sin nombre',
        isNew: !existingProyecto,
        reason: g.proyecto?.reason ?? '',
      },
      iniciativa: {
        id: existingIniciativa?.id ?? null,
        name: existingIniciativa?.name ?? g.iniciativa?.name ?? 'Sin nombre',
        isNew: !existingIniciativa,
        reason: g.iniciativa?.reason ?? '',
      },
      tasks: (g.tasks ?? []).map((t) => {
        const responsable = t.responsable ? talentoByName.get(String(t.responsable).trim().toLowerCase()) : null;
        return {
          title: t.title,
          priority: ['Alta', 'Media', 'Baja'].includes(t.priority) ? t.priority : 'Media',
          responsableId: responsable?.id ?? null,
          responsableName: responsable?.name ?? null,
          reason: t.reason ?? '',
          included: true,
        };
      }),
      meeting: meeting
        ? { conversationId: meeting.conversationId, messageIndex: meeting.messageIndex, title: meeting.title, reason: g.meeting?.reason ?? '' }
        : null,
    };
  });

  return {
    investigationId,
    groupCount: resultGroups.length,
    totalTasks: resultGroups.reduce((sum, g) => sum + g.tasks.length, 0),
    recommendedSprintCount: Number(parsed.recommendedSprintCount) || 1,
    sprintPackagingReason: parsed.sprintPackagingReason ?? '',
    groups: resultGroups,
    proyectos: proyectos.map((p) => ({ id: p.id, name: p.name })),
    iniciativas: iniciativas.map((i) => ({ id: i.id, name: i.name, proyectoId: i.proyectoId })),
    talento: talento.map((t) => ({ id: t.id, name: t.name })),
  };
}
