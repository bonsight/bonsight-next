'use client';

import { useState } from 'react';

const CONFIDENCE_LABELS = { alta: 'Alta', media: 'Media', baja: 'Baja' };

// Emoji por grupo de responsable, en el orden en que van apareciendo — solo para
// diferenciar bloques a simple vista al pegarlo en WhatsApp/Slack, sin significado fijo.
const OWNER_COLORS = ['🔴', '🟢', '🟡', '🔵', '🟣', '🟠'];

function ownerGroupKey(t) {
  if (t.owner) return t.owner;
  if (t.possibleOwners?.length) return t.possibleOwners.join(' / ');
  return 'Sin responsable identificado';
}

// Formato WhatsApp (*negrita*) — pensado para copiar y pegar directo en un chat.
function buildCopyText({ meetingTitle, summary, decisions, tasks }) {
  const lines = [`*📋 Reunión: ${meetingTitle}*`, ''];

  if (summary) lines.push('*📝 Resumen*', '', summary, '');

  if (decisions.length) {
    lines.push('*✅ Decisiones*', '');
    for (const d of decisions) lines.push(`• *${d.title}*${d.reason ? ` — ${d.reason}` : ''}`);
    lines.push('');
  }

  if (tasks.length) {
    lines.push('*📌 Tareas*', '');
    const groups = new Map();
    for (const t of tasks) {
      const key = ownerGroupKey(t);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(t);
    }
    let colorIdx = 0;
    for (const [owner, ownerTasks] of groups) {
      lines.push(`${OWNER_COLORS[colorIdx % OWNER_COLORS.length]} *${owner}*`);
      colorIdx++;
      for (const t of ownerTasks) lines.push(`• ${t.task}${t.deadline ? ` *(${t.deadline})*` : ''}`);
      lines.push('');
    }
  }

  return lines.join('\n').trim();
}

export default function MeetingAnalysisCard({ analysis }) {
  const [copied, setCopied] = useState(false);

  if (!analysis) return null;
  const { meetingTitle, summary, decisions = [], tasks = [], hasSubstantiveContent = true } = analysis;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(buildCopyText({ meetingTitle, summary, decisions, tasks }));
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch { /* clipboard no disponible, no bloquea nada */ }
  };

  return (
    <div className="kai-meeting-card">
      <div className="kai-meeting-header">
        <span className={hasSubstantiveContent ? 'kai-actdash-badge' : 'kai-actdash-badge kai-actdash-badge--muted'}>
          {hasSubstantiveContent ? 'Reunión analizada' : 'Sin contenido'}
        </span>
        <h4 className="kai-meeting-title">{meetingTitle}</h4>
        <button type="button" className="kai-meeting-btn kai-meeting-copy-btn" onClick={handleCopy}>
          {copied ? '✓ Copiado' : '📋 Copiar'}
        </button>
      </div>

      {summary && (
        <div className="kai-meeting-section">
          {hasSubstantiveContent && <p className="kai-meeting-section-label">Resumen</p>}
          <p className="kai-meeting-summary">{summary}</p>
        </div>
      )}

      {decisions.length > 0 && (
        <div className="kai-meeting-section">
          <p className="kai-meeting-section-label">Decisiones</p>
          <ul className="kai-meeting-list">
            {decisions.map((d, i) => (
              <li key={i}><strong>{d.title}</strong>{d.reason ? ` — ${d.reason}` : ''}</li>
            ))}
          </ul>
        </div>
      )}

      {tasks.length > 0 && (
        <div className="kai-meeting-section">
          <p className="kai-meeting-section-label">Tareas</p>
          <ul className="kai-meeting-list">
            {tasks.map((t, i) => {
              const ownerLabel = t.owner
                ? t.owner
                : t.possibleOwners?.length
                  ? `¿${t.possibleOwners.join(' o ')}?`
                  : 'Sin responsable identificado';
              return (
                <li key={i} title={t.evidence || undefined}>
                  <strong>{ownerLabel}:</strong> {t.task}{t.deadline ? ` (${t.deadline})` : ''}
                  {t.confidence && (
                    <span className={`kai-meeting-tag kai-meeting-tag--confidence-${t.confidence}`}>
                      {CONFIDENCE_LABELS[t.confidence] ?? t.confidence}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
