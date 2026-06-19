import { Redis } from '@upstash/redis';
import { getBusinessProfile, updateBusinessProfile } from './tenants';

const kv = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

const key = (tenant) => `kai:${tenant}:aria_suggestions`;

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export async function addAriaSuggestion(tenant, { field, value, confidence = 0.5, investigationId }) {
  const suggestion = {
    id: generateId(),
    field,
    value,
    confidence,
    source: 'aria',
    investigationId: investigationId ?? null,
    status: 'pending',
    createdAt: new Date().toISOString(),
    validatedAt: null,
    validatedBy: null,
  };
  const current = (await kv.get(key(tenant))) ?? [];
  // Deduplicate: skip if same field+value already pending
  const isDupe = current.some((s) => s.field === field && s.value === value && s.status === 'pending');
  if (isDupe) return null;
  await kv.set(key(tenant), [...current, suggestion]);
  return suggestion;
}

export async function listAriaSuggestions(tenant, status = null) {
  const all = (await kv.get(key(tenant))) ?? [];
  return status ? all.filter((s) => s.status === status) : all;
}

export async function updateSuggestionStatus(tenant, id, status, validatedBy = null) {
  const all = (await kv.get(key(tenant))) ?? [];
  const updated = all.map((s) =>
    s.id === id
      ? { ...s, status, validatedAt: new Date().toISOString(), validatedBy }
      : s
  );
  await kv.set(key(tenant), updated);
}

// Apply a suggestion to the Business Profile (used by admin accept + Kai validate)
export async function applySuggestionToProfile(tenant, suggestion) {
  const { field, value } = suggestion;
  const profile = await getBusinessProfile(tenant);

  const arrayFields = [
    'pains', 'risks', 'opportunities', 'technology',
    'kpis', 'stakeholders', 'processes', 'initiatives', 'decisions', 'recommendations',
  ];

  const updateObj = {};

  if (arrayFields.includes(field)) {
    const current = Array.isArray(profile[field]) ? profile[field] : [];
    if (!current.includes(value)) {
      updateObj[field] = [...current, value];
    }
  } else if (field === 'objectives') {
    const obj = profile.objectives ?? {};
    const current = Array.isArray(obj.shortTerm) ? obj.shortTerm : [];
    if (!current.includes(value)) {
      updateObj.objectives = { ...obj, shortTerm: [...current, value] };
    }
  }

  if (Object.keys(updateObj).length) {
    await updateBusinessProfile(tenant, updateObj);
  }
}
