'use client';

import { useEffect, useRef, useState } from 'react';

const DONE = new Set(['Done', 'Cancelada', 'Cancelado']);
const PENDING_LABEL = { Backlog: 'en backlog', 'Not started': 'por hacer', 'In progress': 'en curso', 'In Review': 'en revisión' };

function firstLine(message) {
  return String(message ?? '').split('\n')[0];
}

function fmtDay(iso) {
  if (!iso) return '';
  // Las fechas sin hora (AAAA-MM-DD) se leen como día local, no UTC.
  const d = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? new Date(`${iso}T12:00:00`) : new Date(iso);
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: d.getFullYear() === new Date().getFullYear() ? undefined : 'numeric' });
}

function fmtDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

// Formalizar commits: el desarrollador sube sus commits como siempre y después, acá, los asocia a
// las tareas que resuelven. Kai propone tareas, resumen y descripción; la persona valida.
export default function KaiNextProjectCommits({ tenant, projectId }) {
  const [repo, setRepo] = useState('');
  const [branch, setBranch] = useState('');
  const [data, setData] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [loading, setLoading] = useState(true);

  const [selected, setSelected] = useState([]);
  const [taskIds, setTaskIds] = useState([]);
  const [summary, setSummary] = useState('');
  const [description, setDescription] = useState('');
  const [taskFilter, setTaskFilter] = useState('');
  // Por defecto solo las hechas: un commit formaliza trabajo terminado.
  const [showPending, setShowPending] = useState(false);
  const [onlyPending, setOnlyPending] = useState(true);
  const [proposing, setProposing] = useState(false);
  const [proposeError, setProposeError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [notice, setNotice] = useState(null);
  // Lo que la persona escribe a mano no se pisa con una propuesta nueva de Kai.
  const touched = useRef({ summary: false, description: false });
  const proposeSeq = useRef(0);

  const load = (nextRepo = repo, nextBranch = branch) => {
    setLoading(true);
    setLoadError(null);
    const qs = new URLSearchParams();
    if (nextRepo) qs.set('repo', nextRepo);
    if (nextBranch) qs.set('branch', nextBranch);
    fetch(`/api/kai-next/${tenant}/projects/${projectId}/commits?${qs}`)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || 'No se pudieron cargar los commits.');
        setData(d);
        if (d.repo) setRepo(d.repo);
        if (d.branch) setBranch(d.branch);
      })
      .catch((e) => setLoadError(e.message))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load('', ''); }, [tenant, projectId]); // eslint-disable-line react-hooks/exhaustive-deps

  const resetDraft = () => {
    setSelected([]);
    setTaskIds([]);
    setSummary('');
    setDescription('');
    setProposeError(null);
    touched.current = { summary: false, description: false };
  };

  const propose = async (shas, ids) => {
    const seq = ++proposeSeq.current;
    setProposing(true);
    setProposeError(null);
    try {
      const res = await fetch(`/api/kai-next/${tenant}/projects/${projectId}/commits`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'propose', repo, shas, taskIds: ids }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Kai no pudo proponer.');
      if (seq !== proposeSeq.current) return;
      const p = d.proposal;
      if (!touched.current.summary) setSummary(p.summary);
      if (!touched.current.description) setDescription(p.description);
    } catch (e) {
      if (seq === proposeSeq.current) setProposeError(e.message);
    } finally {
      if (seq === proposeSeq.current) setProposing(false);
    }
  };

  // Kai redacta solo cuando hay commits y tareas elegidos, y la selección se aquieta.
  useEffect(() => {
    if (!selected.length || !taskIds.length) { proposeSeq.current++; setProposing(false); return undefined; }
    const t = setTimeout(() => propose(selected, taskIds), 900);
    return () => clearTimeout(t);
  }, [selected.join(), taskIds.join()]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleCommit = (sha) => setSelected((prev) => (prev.includes(sha) ? prev.filter((s) => s !== sha) : [...prev, sha]));
  const toggleTask = (id) => {
    setTaskIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const formalize = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch(`/api/kai-next/${tenant}/projects/${projectId}/commits`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'formalize', repo, shas: selected, taskIds, summary, description }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'No se pudo formalizar.');
      const gh = d.formalization.github;
      setNotice(gh?.error
        ? `Formalizado en Kai. ${gh.error}`
        : `Formalizado en Kai y comentado en GitHub (${gh?.commented ?? 0} commit${gh?.commented === 1 ? '' : 's'}).`);
      resetDraft();
      load();
    } catch (e) {
      setSaveError(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading && !data) return <p className="knx-knowledge-empty">Cargando commits…</p>;
  if (loadError && !data) return <p className="knx-canvas-error">{loadError}</p>;
  if (!data?.repos?.length) {
    return <p className="knx-knowledge-empty">Este proyecto no tiene un repositorio conectado. Conéctalo arriba, en "Repositorios".</p>;
  }

  const commits = (data.commits ?? []).filter((c) => !onlyPending || !c.formalization || selected.includes(c.sha));
  const q = taskFilter.trim().toLowerCase();
  const isDone = (t) => t.status === 'Done';
  const tasks = (data.tasks ?? [])
    .filter((t) => (showPending ? !DONE.has(t.status) || isDone(t) : isDone(t)) || taskIds.includes(t.id))
    .filter((t) => !q || t.title.toLowerCase().includes(q) || (t.responsableName ?? '').toLowerCase().includes(q) || taskIds.includes(t.id));
  // Las elegidas van arriba; después las hechas, de la más reciente a la más
  // antigua; al final las pendientes (si se piden).
  const doneKey = (t) => (isDone(t) && t.doneAt ? String(t.doneAt) : '');
  tasks.sort((a, b) => Number(taskIds.includes(b.id)) - Number(taskIds.includes(a.id))
    || Number(isDone(b)) - Number(isDone(a))
    || doneKey(b).localeCompare(doneKey(a))
    || a.title.localeCompare(b.title));
  const canSave = selected.length > 0 && taskIds.length > 0 && summary.trim() && description.trim() && !saving;

  return (
    <div className="knx-commits">
      <div className="knx-commits-bar">
        <label className="knx-commits-picker">
          <span>Repositorio</span>
          <select value={repo} onChange={(e) => { setRepo(e.target.value); setBranch(''); resetDraft(); load(e.target.value, ''); }}>
            {data.repos.map((r) => <option key={r.fullName} value={r.fullName}>{r.fullName}</option>)}
          </select>
        </label>
        <label className="knx-commits-picker">
          <span>Rama</span>
          <select value={branch} onChange={(e) => { setBranch(e.target.value); resetDraft(); load(repo, e.target.value); }}>
            {(data.branches ?? []).map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
        </label>
        <button type="button" className="knx-canvas-mini" onClick={() => load()} disabled={loading}>{loading ? 'Actualizando…' : 'Actualizar'}</button>
      </div>
      {loadError && <p className="knx-canvas-error">{loadError}</p>}
      {notice && <p className="knx-commits-notice">{notice}</p>}

      <div className="knx-commits-grid">
        <section className="knx-commits-col">
          <div className="knx-commits-col-head">
            <span>Commits{selected.length ? ` · ${selected.length} elegido${selected.length === 1 ? '' : 's'}` : ''}</span>
            <label className="knx-commits-toggle">
              <input type="checkbox" checked={onlyPending} onChange={(e) => setOnlyPending(e.target.checked)} /> Solo sin formalizar
            </label>
          </div>
          <div className="knx-commits-list">
            {!commits.length && <p className="knx-knowledge-empty">No hay commits pendientes de formalizar en esta rama.</p>}
            {commits.map((c) => (
              <label key={c.sha} className={`knx-commit-row${selected.includes(c.sha) ? ' knx-commit-row--on' : ''}`}>
                <input type="checkbox" checked={selected.includes(c.sha)} onChange={() => toggleCommit(c.sha)} />
                <div className="knx-commit-main">
                  <div className="knx-commit-msg" title={c.message}>{firstLine(c.message)}</div>
                  <div className="knx-commit-meta">
                    <a href={c.url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>{c.shortSha}</a>
                    {' · '}{c.author}{' · '}{fmtDate(c.date)}
                  </div>
                  {c.formalization && (
                    <div className="knx-commit-formal">
                      Formalizado por {c.formalization.by}: {c.formalization.tasks.map((t) => t.title).join(', ')}
                    </div>
                  )}
                </div>
              </label>
            ))}
          </div>
        </section>

        <section className="knx-commits-col">
          <div className="knx-commits-col-head">
            <span>Tareas asociadas{taskIds.length ? ` · ${taskIds.length}` : ''}</span>
            {proposing && <span className="knx-commits-kai">Kai está redactando…</span>}
            {!proposing && selected.length > 0 && taskIds.length > 0 && (
              <button type="button" className="knx-canvas-mini" onClick={() => { touched.current = { summary: false, description: false }; propose(selected, taskIds); }}>
                Volver a redactar
              </button>
            )}
          </div>
          {!selected.length ? (
            <p className="knx-knowledge-empty">Elige uno o más commits y después las tareas que resuelven. Con eso Kai redacta el resumen y la descripción.</p>
          ) : (
            <>
              {proposeError && <p className="knx-canvas-error">{proposeError}</p>}
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input className="knx-canvas-meta-select" placeholder="Buscar tarea o responsable…" value={taskFilter} onChange={(e) => setTaskFilter(e.target.value)} />
                <label className="knx-commits-toggle"><input type="checkbox" checked={showPending} onChange={(e) => setShowPending(e.target.checked)} /> Incluir pendientes</label>
              </div>
              <div className="knx-commits-tasks">
                {!tasks.length && <p className="knx-knowledge-empty">{q ? 'Ninguna tarea coincide.' : showPending ? 'No hay tareas.' : 'No hay tareas hechas. Marca "Incluir pendientes" para ver el resto.'}</p>}
                {tasks.map((t) => (
                  <label key={t.id} className="knx-canvas-meta-checkbox knx-commits-task">
                    <input type="checkbox" checked={taskIds.includes(t.id)} onChange={() => toggleTask(t.id)} />
                    <span className="knx-canvas-meta-checkbox-box" />
                    <span className="knx-commits-task-title">
                      {t.title}
                      <span className="knx-commits-task-meta">
                        {t.responsableName ?? 'Sin responsable'}
                        {isDone(t) ? (t.doneAt ? ` · hecha el ${fmtDay(t.doneAt)}` : ' · hecha') : ` · ${PENDING_LABEL[t.status] ?? t.status}`}
                      </span>
                    </span>
                    {!isDone(t) && <span className="knx-commits-done-tag">Pendiente</span>}
                  </label>
                ))}
              </div>

              <div className="knx-commits-form">
                <input
                  className="knx-canvas-meta-select"
                  placeholder="Resumen (obligatorio)"
                  maxLength={120}
                  value={summary}
                  onChange={(e) => { touched.current.summary = true; setSummary(e.target.value); }}
                />
                <textarea
                  className="knx-canvas-meta-select"
                  rows={5}
                  placeholder="Descripción (obligatoria)"
                  value={description}
                  onChange={(e) => { touched.current.description = true; setDescription(e.target.value); }}
                />
                {saveError && <p className="knx-canvas-error">{saveError}</p>}
                <button type="button" className="knx-commits-submit" disabled={!canSave} onClick={formalize}>
                  {saving ? 'Formalizando…' : `Formalizar ${selected.length} commit${selected.length === 1 ? '' : 's'}`}
                </button>
                {!taskIds.length && <p className="knx-canvas-ficha-progress">Elige al menos una tarea.</p>}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
