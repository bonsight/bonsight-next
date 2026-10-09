import Anthropic from '@anthropic-ai/sdk';
import { isAuthorizedForTenant, getCurrentKaiNextAccess } from '@/lib/kaiNext/auth';
import { getTenantMeta } from '@/lib/kai/tenants';
import { getIntelligenceSources } from '@/lib/kai/intelligenceSources';
import { getDbSources, buildDbSourcesContext } from '@/lib/aria/databases';
import { getKaiNextMemory } from '@/lib/kaiNext/memory';
import {
  getConversation,
  createConversation,
  appendMessages,
  updateConversationTitle,
  listConversations,
  deleteConversation,
} from '@/lib/kaiNext/conversations';
import { buildSystemPrompt } from '@/lib/kaiNext/prompt';
import { indexAnalysis, deleteAnalysesForConversation } from '@/lib/kaiNext/analyses';
import { runAgenticLoop } from '@/lib/shared/agents/agenticLoop';
import { trackUsage } from '@/lib/kai/usage';
import { OFFICE_MIMES, extractTextFromBuffer } from '@/lib/fileExtract';
import { buildBIC, formatBICForPrompt } from '@/lib/kai/bic';
import { MODEL, TOOLS, DATA_TOOLS, TOOL_LABELS, anthropic, executeTool } from '@/lib/kaiNext/agentShared';
import { filterToolsByCapabilities, isSectionAllowed } from '@/lib/kaiNext/capabilities';
import { getLatestDraft, createActivityDraft, updateActivityDraft, lockActivity } from '@/lib/kai/activities';

const MAX_TOKENS = 8000;
const MAX_ITERATIONS = 3;

// Mismo patrón que app/api/aria/[tenant]/route.js: imágenes y PDF van como bloques nativos de
// Claude, documentos de oficina (docx/pptx/xlsx/csv) se extraen a texto primero.
async function buildUserContent(message, attachments) {
  if (!attachments?.length) return message;

  const blocks = [];
  for (const att of attachments) {
    if (att.mimeType?.startsWith('image/')) {
      blocks.push({ type: 'image', source: { type: 'base64', media_type: att.mimeType, data: att.data } });
    } else if (att.mimeType === 'application/pdf') {
      blocks.push({ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: att.data } });
    } else if (OFFICE_MIMES.has(att.mimeType)) {
      try {
        const buf = Buffer.from(att.data, 'base64');
        const text = await extractTextFromBuffer(buf, att.mimeType);
        if (text) blocks.push({ type: 'text', text: `[Documento adjunto: ${att.name}]\n\n${text}` });
      } catch { /* archivo ilegible, se omite */ }
    }
  }
  if (message?.trim()) blocks.push({ type: 'text', text: message });
  return blocks;
}

function ndjson(obj) {
  return new TextEncoder().encode(JSON.stringify(obj) + '\n');
}

// Mismo patrón que [KAI_UPDATE] en Kai Legacy: en vez de parsear el digest (que ya no existe
// como string único — ver lib/kaiNext/tools/knowledge.js) o confiar en que el texto mencione el
// nombre del documento, Kai declara explícitamente qué ids de query_knowledge usó. Se extrae del
// texto final y se quita antes de mostrarlo.
function extractKaiSources(text) {
  const match = text.match(/\[KAI_SOURCES\]([\s\S]*?)\[\/KAI_SOURCES\]/);
  const cleaned = text.replace(/\[KAI_SOURCES\][\s\S]*?\[\/KAI_SOURCES\]/, '').trim();
  if (!match) return { ids: [], cleaned: text };
  try {
    const ids = JSON.parse(match[1].trim());
    return { ids: Array.isArray(ids) ? ids.filter((id) => typeof id === 'string') : [], cleaned };
  } catch {
    return { ids: [], cleaned };
  }
}

// Mismo mecanismo que app/api/kai/[tenant]/route.js (extractActivityDraft/extractActivityLock)
// — Kai co-diseña la Activity conversando y declara el progreso con estos marcadores de texto
// (no son tools de Claude), ver ACTIVITIES_PROMPT_BLOCK en lib/kaiNext/prompt.js.
function extractActivityDraft(text) {
  const match = /\[ACTIVITY_DRAFT\]([\s\S]*?)\[\/ACTIVITY_DRAFT\]/.exec(text);
  const cleaned = text.replace(/\[ACTIVITY_DRAFT\][\s\S]*?\[\/ACTIVITY_DRAFT\]/g, '').trim();
  if (!match) return { activityDraft: null, cleaned };
  try { return { activityDraft: JSON.parse(match[1].trim()), cleaned }; }
  catch { return { activityDraft: null, cleaned }; }
}

function extractActivityLock(text) {
  const match = /\[ACTIVITY_LOCK\]([\s\S]*?)\[\/ACTIVITY_LOCK\]/.exec(text);
  const cleaned = text.replace(/\[ACTIVITY_LOCK\][\s\S]*?\[\/ACTIVITY_LOCK\]/g, '').trim();
  if (!match) return { activityLock: null, cleaned };
  try { return { activityLock: JSON.parse(match[1].trim()), cleaned }; }
  catch { return { activityLock: null, cleaned }; }
}

export async function POST(req, { params }) {
  const { tenant } = await params;
  if (!(await isAuthorizedForTenant(tenant))) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }

  const { message, conversationId, attachments, ref } = await req.json();
  if ((!message || typeof message !== 'string') && !attachments?.length) {
    return Response.json({ error: 'Falta el mensaje.' }, { status: 400 });
  }

  const meta = await getTenantMeta(tenant);
  if (!meta) return Response.json({ error: 'Tenant no encontrado.' }, { status: 404 });
  // Rollout por persona (ver lib/kaiNext/capabilities.js) — no por tenant: cada usuario del
  // cliente trae su propio access.kaiNextSections/kaiNextCapabilities.
  const kaiNextAccess = await getCurrentKaiNextAccess(tenant);
  if (!isSectionAllowed(kaiNextAccess, 'chat')) {
    return Response.json({ error: 'El chat no está habilitado para tu usuario.' }, { status: 403 });
  }

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const [intelligenceSources, dbSources, memory, bic] = await Promise.all([
          getIntelligenceSources(tenant),
          getDbSources(tenant),
          getKaiNextMemory(tenant),
          buildBIC(tenant),
        ]);
        // Memoria siempre activa (Business Profile + aprendizajes de discovery) — mismo
        // buildBIC/formatBICForPrompt que ya usan Kai y Aria, sin pedir el knowledge_digest
        // acá porque eso ya es una tool aparte (query_knowledge) y duplicaría contexto.
        const bicText = formatBICForPrompt({ ...bic, knowledge_digest: null });

        let convoId = conversationId;
        let priorMessages = [];
        let activeRef = null;
        if (convoId) {
          const existing = await getConversation(tenant, convoId);
          if (existing) {
            priorMessages = existing.messages;
            activeRef = existing.meta?.activeRef ?? null;
          } else {
            convoId = null;
          }
        }
        if (!convoId) {
          // `ref` (type/refId/label) solo llega en el primer mensaje, desde un activador de la
          // página Empresa (?ref=...) — ver KaiNextEmpresa.jsx. Queda guardado en la conversación
          // para que, aunque el intercambio se extienda varios turnos, Kai siga sabiendo sobre
          // qué ítem puede llamar mark_resolved.
          const created = await createConversation(tenant, 'bonsight-team', ref ?? null);
          convoId = created.id;
          activeRef = created.meta.activeRef ?? null;
        }

        const sourceStatus = (id) => intelligenceSources.find((s) => s.id === id)?.status;
        const system = buildSystemPrompt({
          tenantName: meta.name,
          ga4Status: sourceStatus('ga4'),
          searchConsoleStatus: sourceStatus('search_console'),
          googleAdsStatus: sourceStatus('google_ads'),
          dbSourcesContext: buildDbSourcesContext(dbSources),
          bicText,
          memory,
          activeRef,
        });

        const userContent = await buildUserContent(message ?? '', attachments);
        const conversation = [
          ...priorMessages.map((m) => ({ role: m.role, content: m.content })),
          { role: 'user', content: userContent },
        ];

        // Traza de qué consultó Kai para esta respuesta — a diferencia del estado en vivo
        // ("Consultando..."), esto se persiste junto con el mensaje para que la evidencia
        // quede visible después, no solo mientras el loop corre.
        let lastSourceResult = null;
        const toolTrace = [];
        // Documentos que query_knowledge realmente devolvió esta vuelta (ya filtrados por
        // relevancia al tema, ver lib/kaiNext/tools/knowledge.js) — la cita en el chat se arma
        // desde ACÁ, no desde que el modelo se acuerde de reportarlo en el texto (eso resultó
        // poco confiable: a veces el bloque [KAI_SOURCES] simplemente no aparecía).
        const knowledgeDocsSeen = new Map();
        // present_analysis es una tool de SALIDA, no de consulta — isStopTool corta el loop ahí
        // mismo (runAgenticLoop ya soporta este patrón) y el payload real se captura acá, no del
        // tool_result (que solo recibe `{ok:true}`, ver executePresentAnalysisTool).
        let presentation = null;
        // generate_pdf_report/generate_excel_report — mismo patrón de Aria (ver
        // app/api/aria/[tenant]/route.js): el input completo de la tool ES el documento, se
        // junta acá tal como Kai lo armó, y se renderiza como tarjeta de descarga en el chat
        // (KaiNextDocumentCard) sin volver a tocarlo hasta que el usuario pide descargarlo.
        const documents = [];
        // Rollout por tiers (ver lib/kaiNext/capabilities.js) — recorta el tools[] a lo que
        // este tenant tiene habilitado antes de ofrecérselo al modelo, no es solo una sugerencia
        // en el prompt: si una capacidad está apagada, Claude ni puede intentar llamarla.
        const allowedTools = filterToolsByCapabilities(TOOLS, kaiNextAccess);
        const { finalText, callLogs, usage } = await runAgenticLoop({
          anthropic,
          model: MODEL,
          maxTokens: MAX_TOKENS,
          maxIterations: MAX_ITERATIONS,
          system,
          messages: conversation,
          tools: allowedTools,
          context: { tenant, intelligenceSources, dbSources },
          executeTool,
          isStopTool: (name) => name === 'present_analysis',
          onToolStart: (name) => {
            controller.enqueue(ndjson({ type: 'tool_start', name, label: TOOL_LABELS[name] ?? name }));
          },
          onToolUse: (name, input, result) => {
            if (DATA_TOOLS.has(name) && !result.error) {
              lastSourceResult = { source: name, ...result };
              toolTrace.push({ tool: name, label: TOOL_LABELS[name]?.replace(/^Consultando /, '') ?? name, period: result.period ?? null });
            } else if (name === 'query_knowledge' && !result.error) {
              // Sin SourceTable para esto (no es tabular) — igual queda en el resumen colapsado
              // ("Consultó X y Y"); las citas específicas por documento van aparte, ver abajo.
              toolTrace.push({ tool: name, label: TOOL_LABELS[name]?.replace(/^Consultando /, '') ?? name, period: null });
              for (const d of result.documents ?? []) {
                knowledgeDocsSeen.set(d.id, { id: d.id, name: d.name, type: d.type, url: d.url, date: d.date });
              }
            } else if (name === 'present_analysis') {
              presentation = input;
            } else if (name === 'generate_pdf_report') {
              documents.push({ format: 'pdf', ...input });
            } else if (name === 'generate_excel_report') {
              documents.push({ format: 'excel', ...input });
            }
          },
        });

        // El bloque [KAI_SOURCES] (si el modelo lo agregó) sirve para ACOTAR cuáles de los
        // documentos devueltos realmente sostienen la respuesta — pero si no aparece, o cita
        // algo que no matchea ninguno de los que se le pasaron, se muestra todo lo que trajo
        // query_knowledge esta vuelta en vez de perder la cita por completo.
        const { ids: citedIds, cleaned: afterSources } = extractKaiSources(finalText);
        let citedSources = [...knowledgeDocsSeen.values()];
        if (citedIds.length) {
          const seenList = [...knowledgeDocsSeen.values()];
          const narrowed = citedIds
            .map((cited) => knowledgeDocsSeen.get(cited)
              ?? seenList.find((d) => d.name?.toLowerCase() === cited.toLowerCase()))
            .filter(Boolean);
          if (narrowed.length) citedSources = narrowed;
        }

        // Activity Design: Kai declara el progreso con [ACTIVITY_DRAFT]/[ACTIVITY_LOCK] en vez
        // de una tool — solo se procesa si la conversación nació desde "+ Nueva actividad" (ver
        // activeRef.type en createConversation/KaiNextActivities.jsx). getLatestDraft encuentra
        // el draft ya creado en un turno anterior de ESTA MISMA conversación (mismo patrón que
        // Kai Legacy), así turno a turno se va actualizando el mismo registro en vez de crear uno
        // nuevo cada vez.
        let activityDraft = null;
        let activityStart = null;
        let cleanedText = afterSources;
        if (activeRef?.type === 'activity_design') {
          const { activityDraft: draftFields, cleaned: afterDraft } = extractActivityDraft(cleanedText);
          const { activityLock: lockFields, cleaned: afterLock } = extractActivityLock(afterDraft);
          cleanedText = afterLock;

          let current = await getLatestDraft(tenant, convoId);
          if (draftFields) {
            current = current
              ? await updateActivityDraft(tenant, current.id, draftFields)
              : await createActivityDraft(tenant, { ...draftFields, conversationId: convoId });
            activityDraft = current;
          }
          if (lockFields?.questions?.length && current) {
            activityStart = await lockActivity(tenant, current.id, lockFields.questions);
          }
        }

        trackUsage({
          tenant,
          product: 'kai-next',
          feature: 'chat',
          model: MODEL,
          inputTokens: usage.inputTokens,
          outputTokens: usage.outputTokens,
        }).catch(() => null);

        const attachmentMeta = attachments?.length
          ? attachments.map((a) => ({ name: a.name, mimeType: a.mimeType }))
          : undefined;

        await appendMessages(tenant, convoId, [
          { role: 'user', content: message ?? '', attachments: attachmentMeta },
          { role: 'assistant', content: cleanedText, sourceResult: lastSourceResult, toolTrace, citedSources, presentation, documents, activityDraft, activityStart },
        ]);
        if (priorMessages.length === 0) {
          updateConversationTitle(tenant, convoId, (message || attachments?.[0]?.name || 'Nuevo chat').slice(0, 60)).catch(() => null);
        }
        if (presentation) {
          // messageIndex: el mensaje assistant queda justo después del user que se acaba de
          // appendear — mismo orden 0-based que lee getConversation().messages.
          indexAnalysis(tenant, {
            conversationId: convoId,
            messageIndex: priorMessages.length + 1,
            viewId: presentation.view_id,
            summary: presentation.summary,
            createdAt: new Date().toISOString(),
          }).catch(() => null);
        }

        const toolsUsed = [...new Set(callLogs.flatMap((l) => l.toolCalls ?? []))];
        controller.enqueue(ndjson({
          type: 'done',
          reply: cleanedText,
          conversationId: convoId,
          sourceResult: lastSourceResult,
          toolTrace,
          citedSources,
          presentation,
          documents,
          activityDraft,
          activityStart,
          toolsUsed,
        }));
      } catch (err) {
        console.error(`kai-next tenant [${tenant}] error:`, err);
        let reply = 'Algo salió mal. Intenta de nuevo en un momento.';
        if (err instanceof Anthropic.RateLimitError) {
          reply = 'Kai Next está procesando muchas solicitudes. Prueba de nuevo en unos segundos.';
        } else if (/credit balance|insufficient_quota/.test(err?.message || '')) {
          reply = 'Kai Next no puede responder ahora mismo por un problema de configuración.';
        }
        controller.enqueue(ndjson({ type: 'error', reply }));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, { headers: { 'Content-Type': 'application/x-ndjson; charset=utf-8' } });
}

export async function GET(req, { params }) {
  const { tenant } = await params;
  if (!(await isAuthorizedForTenant(tenant))) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }
  const conversationId = new URL(req.url).searchParams.get('conversationId');
  if (conversationId) {
    const convo = await getConversation(tenant, conversationId);
    return convo ? Response.json(convo) : Response.json({ error: 'No encontrado.' }, { status: 404 });
  }
  return Response.json({ conversations: await listConversations(tenant) });
}

export async function DELETE(req, { params }) {
  const { tenant } = await params;
  if (!(await isAuthorizedForTenant(tenant))) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }
  const conversationId = new URL(req.url).searchParams.get('conversationId');
  if (!conversationId) return Response.json({ error: 'Falta conversationId.' }, { status: 400 });
  await Promise.all([
    deleteConversation(tenant, conversationId),
    deleteAnalysesForConversation(tenant, conversationId),
  ]);
  return Response.json({ ok: true });
}
