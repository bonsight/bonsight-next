import { getBusinessProfile, updateBusinessProfile } from '@/lib/kai/tenants';
import { stringSimilarity } from '@/lib/kai/learnings';

const SIMILARITY_THRESHOLD = 0.78;
function isNearDuplicate(value, current) {
  return current.some((c) => typeof c === 'string' && stringSimilarity(value, c) >= SIMILARITY_THRESHOLD);
}

// Mismo Business Profile que ya leía Kai Legacy (kai:{tenant}:profile) — Kai Next ya lo MOSTRABA
// (ver lib/kai/bic.js, tarjeta "Memoria" en Fuentes) pero nunca lo escribía, porque esa escritura
// solo existía como truco de prompt ([KAI_UPDATE] parseado con regex) en app/api/kai/[tenant]/
// route.js, un producto que se está retirando. Acá es una tool real de Claude en vez de texto
// mágico — mismo schema de campos y misma lógica de merge, portada de applyKaiUpdates/
// resolveStakeholder de ese route, pero aplicada a un solo {field, value} por llamada (la tool
// se llama una vez por cada dato nuevo, no en batch).
const ARRAY_FIELDS = ['pains', 'risks', 'opportunities', 'technology', 'kpis', 'processes', 'initiatives', 'decisions'];
const OBJECTIVE_SUBFIELDS = ['shortTerm', 'mediumTerm', 'longTerm'];

export const UPDATE_BUSINESS_PROFILE_TOOL = {
  name: 'update_business_profile',
  description: 'Guarda un dato concreto de negocio en el Business Profile de este cliente (industria, modelo, un objetivo, un dolor, un riesgo, tecnología que usan, un KPI, un proceso, una decisión, una oportunidad, o una persona relevante). Es automático, el usuario no lo ve — úsala cuando el dato surja naturalmente en la charla, no hace falta preguntarlo de forma forzada.',
  input_schema: {
    type: 'object',
    properties: {
      field: {
        type: 'string',
        enum: [
          'general.industry', 'general.model', 'general.country', 'general.size', 'general.digitalMaturity',
          'objectives.shortTerm', 'objectives.mediumTerm', 'objectives.longTerm',
          'pains', 'risks', 'opportunities', 'technology', 'kpis', 'processes', 'initiatives', 'decisions',
          'stakeholders',
        ],
        description: 'Qué campo del perfil actualizar.',
      },
      value: {
        description: 'Para la mayoría de los campos, un string breve y concreto. Para "stakeholders", un objeto {name, role, notes} — notes es opcional.',
      },
    },
    required: ['field', 'value'],
  },
};

// Una persona puede aparecer mencionada varias veces con roles distintos — nunca se duplica: se
// normaliza el nombre (minúsculas, espacios colapsados) y si ya existe, se le suma el rol nuevo
// al registro existente en vez de crear una entrada aparte.
function resolveStakeholder(current, value) {
  const norm = (s) => String(s).toLowerCase().replace(/\s+/g, ' ').trim();

  let incoming;
  if (typeof value === 'string') {
    incoming = { name: value, roles: [], notes: '' };
  } else {
    incoming = {
      name: String(value?.name ?? '').trim(),
      roles: value?.role ? [String(value.role).trim()] : [],
      notes: String(value?.notes ?? '').trim(),
    };
  }
  if (!incoming.name) return current;

  const normalized = current.map((s) => (typeof s === 'string' ? { name: s, roles: [], notes: '' } : s));
  const idx = normalized.findIndex((s) => norm(s.name) === norm(incoming.name));
  if (idx >= 0) {
    const old = normalized[idx];
    const mergedRoles = [...new Set([...(old.roles ?? []), ...incoming.roles])];
    const updated = [...normalized];
    updated[idx] = { ...old, roles: mergedRoles, notes: incoming.notes || old.notes };
    return updated;
  }
  return [...normalized, { name: incoming.name, roles: incoming.roles, notes: incoming.notes }];
}

export async function executeUpdateBusinessProfileTool(input, { tenant }) {
  const { field, value } = input ?? {};
  if (!field || value === undefined) return { saved: false };

  const profile = await getBusinessProfile(tenant);
  const updateObj = {};

  if (field === 'stakeholders') {
    const current = Array.isArray(profile.stakeholders) ? profile.stakeholders : [];
    updateObj.stakeholders = resolveStakeholder(current, value);
  } else if (field.startsWith('general.')) {
    const subfield = field.split('.')[1];
    updateObj.general = { ...(profile.general ?? {}), [subfield]: value };
  } else if (field.startsWith('objectives.')) {
    const subfield = field.split('.')[1];
    if (OBJECTIVE_SUBFIELDS.includes(subfield)) {
      const obj = profile.objectives ?? {};
      const current = Array.isArray(obj[subfield]) ? obj[subfield] : [];
      if (!current.includes(value)) {
        updateObj.objectives = { ...obj, [subfield]: [...current, value] };
      }
    }
  } else if (ARRAY_FIELDS.includes(field)) {
    const current = Array.isArray(profile[field]) ? profile[field] : [];
    // Dedup por similitud (mismo criterio que lib/kai/learnings.js), no por string exacto —
    // sin esto, la misma idea redactada distinto se acumula como ítems separados.
    if (typeof value !== 'string' || !isNearDuplicate(value, current)) {
      updateObj[field] = [...current, value];
    }
  }

  if (!Object.keys(updateObj).length) return { saved: false };
  await updateBusinessProfile(tenant, updateObj);
  return { saved: true, field };
}
