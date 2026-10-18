'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import KaiNextSidebar from './KaiNextSidebar';
import KaiNextConfirmDialog from './KaiNextConfirmDialog';
import { useSidePanelClose } from '@/lib/kaiNext/useSidePanelClose';

// Pantalla propia en el sidebar (no un tab dentro de un Proyecto puntual) — agenda/registra/
// documenta reuniones del equipo de Proyecto de Desarrollo. El proyecto es OPCIONAL. Crea el
// evento real en el calendario de kai@bonsight.co (lib/kai/calendar.js) e invita de verdad por
// mail. No tiene nada que ver con "Reuniones" del Kai legacy (historial de llamadas analizadas
// por Twilio, feature totalmente distinta).
//
// "Que Kai tome notas" (auto-dial a la hora de la reunión) y la tarjeta de preparación/"Resumen
// listo" quedaron deliberadamente afuera de esta ronda — necesitan un scheduler (Vercel Cron)
// que hoy no existe en el repo, ver /Users/itriagor/.claude/plans/serene-spinning-mochi.md.

const TIPO_OPTIONS = [
  { id: 'equipo', label: 'Equipo', color: '#085041', chipBg: '#E8F4EE', border: '#3F9461' },
  { id: 'cliente', label: 'Cliente', color: '#24406B', chipBg: '#EAF0F8', border: '#4A6FA5' },
  { id: '1:1', label: '1:1', color: '#4C2F7A', chipBg: '#F1ECF8', border: '#8A63C7' },
  // No se crea desde el modal de agendar de acá — la arma el booking público del Advisor
  // (app/api/advisor/book/route.js) cuando un visitante de bonsight.co reserva una llamada.
  { id: 'prospecto', label: 'Prospecto', color: '#8A4B1F', chipBg: '#F7ECE1', border: '#C27A3C' },
];
const tipoInfo = (id) => TIPO_OPTIONS.find((t) => t.id === id) ?? TIPO_OPTIONS[0];

const AVATAR_PALETTE = ['#085041', '#4A6FA5', '#B7791F', '#2F8F8A', '#8A63C7', '#C2554B'];
function avatarColor(name) {
  const s = String(name || '');
  let hash = 0;
  for (let i = 0; i < s.length; i++) hash = (hash * 31 + s.charCodeAt(i)) % AVATAR_PALETTE.length;
  return AVATAR_PALETTE[Math.abs(hash)];
}
function initials(name = '') {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('') || '·';
}
function Avatar({ name, size = 24 }) {
  return (
    <span
      title={name}
      className="knx-meeting-avatar"
      style={{ width: size, height: size, background: avatarColor(name), fontSize: size * 0.4 }}
    >
      {initials(name)}
    </span>
  );
}

function fmtTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
}
function fmtDateTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}
function relTime(iso) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return 'recién';
  if (mins < 60) return `hace ${mins} min`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `hace ${hours}h`;
  return `hace ${Math.round(hours / 24)}d`;
}
function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function startOfWeek(d) {
  const date = new Date(d);
  const day = date.getDay(); // 0=domingo
  const diff = day === 0 ? -6 : 1 - day; // retrocede hasta el lunes
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}
function addDays(d, n) {
  const date = new Date(d);
  date.setDate(date.getDate() + n);
  return date;
}
function toDateInput(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Kai Next guarda UN solo evento (el "maestro") por reunión recurrente, no una fila por
// ocurrencia (ver addDevMeeting) — así que para pintarla en cada semana de la grilla hay que
// proyectar dónde cae la próxima ocurrencia a partir de la fecha original + la regla, en vez de
// filtrar por "¿el start guardado cae justo este día?". Devuelve el start/end de ESA ocurrencia
// puntual (mismo horario/duración, fecha distinta) o null si la reunión no cae ese día.
function occurrenceOn(meeting, day) {
  const start = new Date(meeting.start);
  const end = new Date(meeting.end);
  const diffDays = Math.round((startOfDayDate(day) - startOfDayDate(start)) / 86400000);
  let matches;
  if (!meeting.recurrence) {
    matches = diffDays === 0;
  } else if (meeting.recurrence.freq === 'WEEKLY') {
    matches = diffDays >= 0 && diffDays % (7 * (meeting.recurrence.interval || 1)) === 0;
  } else if (meeting.recurrence.freq === 'MONTHLY') {
    matches = diffDays >= 0 && day.getDate() === start.getDate();
  } else {
    matches = diffDays === 0;
  }
  if (!matches) return null;
  if (diffDays === 0) return { start, end };
  const occStart = new Date(start); occStart.setFullYear(day.getFullYear(), day.getMonth(), day.getDate());
  const occEnd = new Date(occStart.getTime() + (end - start));
  return { start: occStart, end: occEnd };
}
function startOfDayDate(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

// Cada 30min hasta 4 horas — el arrastre en la grilla semanal snapea a 30min, así que cualquier
// duración que resulte de un drag siempre tiene un option acá (antes solo había 30/60/90 y una
// selección de, por ej., 2 horas no tenía dónde mostrarse en el <select>).
const DURATION_OPTIONS = Array.from({ length: 16 }, (_, i) => (i + 1) * 30);
function durationLabel(min) {
  if (min < 60) return `${min} min`;
  const h = min / 60;
  return `${h % 1 === 0 ? h : h.toFixed(1)} hora${h !== 1 ? 's' : ''}`;
}

const REPEAT_OPTIONS = [
  { id: 'none', label: 'No se repite' },
  { id: 'weekly', label: 'Cada semana' },
  { id: 'biweekly', label: 'Cada 2 semanas' },
  { id: 'monthly', label: 'Cada mes' },
];

// Reemplaza el <input type="time"> nativo (el picker de columnas del navegador queda feo e
// inconsistente entre navegadores) por dos <select> simples, mismo look que el resto del form.
const TIME_HOURS = Array.from({ length: 17 }, (_, i) => String(i + 6).padStart(2, '0')); // 06..22
const TIME_MINUTES = ['00', '15', '30', '45'];
function TimeSelect({ value, onChange }) {
  const [h, m] = value ? value.split(':') : ['', ''];
  return (
    <div className="knx-time-select">
      <select value={h} onChange={(e) => onChange(`${e.target.value}:${m || '00'}`)}>
        <option value="" disabled>--</option>
        {TIME_HOURS.map((hh) => <option key={hh} value={hh}>{hh}</option>)}
      </select>
      <span>:</span>
      <select value={m} onChange={(e) => onChange(`${h || '09'}:${e.target.value}`)}>
        <option value="" disabled>--</option>
        {TIME_MINUTES.map((mm) => <option key={mm} value={mm}>{mm}</option>)}
      </select>
    </div>
  );
}

// Mismas zonas que ofrece el admin de Kai (TIMEZONE_OPTIONS en TenantDetail.jsx) — acá solo
// hace falta el label corto para mostrar junto a la hora, ej. "14:00 · Perú".
const TIMEZONE_LABELS = {
  'America/Mexico_City': 'México', 'America/Bogota': 'Colombia', 'America/Lima': 'Perú',
  'America/Caracas': 'Venezuela', 'America/Santiago': 'Chile', 'America/Argentina/Buenos_Aires': 'Argentina',
  'America/Sao_Paulo': 'Brasil', 'America/New_York': 'EE. UU. (Este)',
};
function localTimeFor(instant, timezone) {
  return instant.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit', timeZone: timezone });
}

const RESPONSE_LABELS = { accepted: 'Aceptó', declined: 'Rechazó', tentative: 'Tal vez', needsAction: 'Pendiente' };
const RESPONSE_CLASS = { accepted: 'knx-rsvp--ok', declined: 'knx-rsvp--no', tentative: 'knx-rsvp--maybe', needsAction: 'knx-rsvp--pending' };

// ── Lista plana (vista "Lista") — igual que la versión anterior de Meetings ─────────────────
// Mismas 3 reglas que ofrece el selector "Repetir" del modal de agendar — acá solo hace falta
// el label de vuelta, para mostrarlo en la vista Lista y en el panel de detalle.
function recurrenceLabel(recurrence) {
  if (!recurrence) return null;
  if (recurrence.freq === 'WEEKLY') return recurrence.interval > 1 ? `Cada ${recurrence.interval} semanas` : 'Cada semana';
  if (recurrence.freq === 'MONTHLY') return 'Cada mes';
  return null;
}

function MeetingCard({ meeting, onOpen }) {
  const info = tipoInfo(meeting.tipo);
  const repeat = recurrenceLabel(meeting.recurrence);
  return (
    <button type="button" className="knx-meeting-card" onClick={() => onOpen(meeting.id)}>
      <span className="knx-meeting-card-type" style={{ color: info.color, background: info.chipBg }}>{info.label}</span>
      <span className="knx-meeting-card-title">{meeting.title}{meeting.projectName && <span className="knx-canvas-ficha-progress"> · {meeting.projectName}</span>}</span>
      {repeat && <span className="knx-canvas-ficha-progress">↻ {repeat}</span>}
      <span className="knx-meeting-card-dates">{fmtDateTime(meeting.start)} → {fmtTime(meeting.end)}</span>
    </button>
  );
}

// ── Picker de asistentes: roster + externos en un solo input con chips ─────────────────────
function AttendeePicker({ roster, externalContacts = [], value, onChange, organizerName }) {
  const [query, setQuery] = useState('');
  const selectedEmails = new Set(value.map((a) => a.email));
  // Roster primero (gente de Bonsight, con avatar/cargo), después contactos externos ya usados
  // antes en reuniones tipo Cliente (ver rememberExternalContacts) — así la próxima vez que
  // agendes con el mismo cliente no hace falta tipear el email de nuevo.
  const candidates = [
    ...roster.map((p) => ({ ...p, isExternal: false })),
    ...externalContacts.filter((c) => !roster.some((p) => p.email === c.email)).map((c) => ({ ...c, isExternal: true })),
  ];
  const suggestions = query.trim()
    ? candidates.filter((p) => !selectedEmails.has(p.email) && (p.name?.toLowerCase().includes(query.toLowerCase()) || p.email?.toLowerCase().includes(query.toLowerCase()))).slice(0, 6)
    : [];
  const looksLikeEmail = /\S+@\S+\.\S+/.test(query.trim());

  const addPerson = (p) => { onChange([...value, { email: p.email, name: p.name, timezone: p.timezone ?? null, external: !!p.isExternal }]); setQuery(''); };
  const addExternal = () => {
    const email = query.trim();
    if (!looksLikeEmail || selectedEmails.has(email)) return;
    onChange([...value, { email, name: email.split('@')[0], external: true }]);
    setQuery('');
  };
  const remove = (email) => onChange(value.filter((a) => a.email !== email));

  return (
    <div className="knx-attendee-picker">
      <span className="knx-attendee-chip knx-attendee-chip--organizer">
        <Avatar name={organizerName} />
        {organizerName?.split(' ')[0] ?? 'Vos'}
        <span className="knx-attendee-organizer-badge">ORGANIZA</span>
      </span>
      {value.map((a) => (
        <span key={a.email} className="knx-attendee-chip">
          <Avatar name={a.name} />
          {a.name?.split(' ')[0] || a.email}
          <button type="button" aria-label="Quitar" onClick={() => remove(a.email)}>×</button>
        </span>
      ))}
      <div className="knx-attendee-input-wrap">
        <input
          placeholder="Agregar persona o correo"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addExternal(); } }}
        />
        {suggestions.length > 0 && (
          <div className="knx-attendee-suggestions">
            {suggestions.map((p) => (
              <button type="button" key={p.email} onClick={() => addPerson(p)}>
                <Avatar name={p.name} size={20} /> {p.name}
                {p.cargo ? ` · ${p.cargo}` : p.isExternal ? ' · externo' : ''}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Asistente de disponibilidad: freebusy real, solo gente de Bonsight (roster) ────────────
function AvailabilityAssistant({ tenant, internalAttendees, date, duration, onPickSlot, selectedSlot }) {
  const internalEmails = internalAttendees.map((a) => a.email);
  const [busyByEmail, setBusyByEmail] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!internalEmails.length || !date) { setBusyByEmail(null); return; }
    setLoading(true);
    const dayStart = new Date(`${date}T00:00:00`);
    const timeMin = new Date(dayStart); timeMin.setHours(7, 0, 0, 0);
    const timeMax = new Date(dayStart); timeMax.setHours(19, 0, 0, 0);
    fetch(`/api/kai-next/${tenant}/dev-meetings/freebusy`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emails: internalEmails, timeMin: timeMin.toISOString(), timeMax: timeMax.toISOString() }),
    })
      .then((r) => r.json())
      .then((d) => setBusyByEmail(d.busy ?? {}))
      .catch(() => setBusyByEmail(null))
      .finally(() => setLoading(false));
  }, [tenant, internalEmails.join(','), date]); // eslint-disable-line react-hooks/exhaustive-deps

  const suggestions = useMemo(() => {
    if (!busyByEmail || !date) return [];
    const allBusy = Object.values(busyByEmail).flatMap((b) => b.busy ?? []).map((b) => [new Date(b.start).getTime(), new Date(b.end).getTime()]);
    const slots = [];
    const dayBase = new Date(`${date}T00:00:00`);
    for (let h = 9; h <= 17 && slots.length < 3; h++) {
      const start = new Date(dayBase); start.setHours(h, 0, 0, 0);
      const end = new Date(start.getTime() + duration * 60000);
      const overlaps = allBusy.some(([bs, be]) => start.getTime() < be && end.getTime() > bs);
      if (!overlaps) slots.push({ start, end });
    }
    return slots;
  }, [busyByEmail, date, duration]);

  if (!internalEmails.length) {
    return <p className="knx-knowledge-empty">Elige asistentes de Bonsight para ver su disponibilidad.</p>;
  }
  if (!date) {
    return <p className="knx-knowledge-empty">Elige una fecha para ver horarios libres.</p>;
  }
  if (loading) return <p className="knx-knowledge-empty">Buscando horarios libres…</p>;

  return (
    <div className="knx-avail">
      <div className="knx-avail-slots">
        {suggestions.length === 0 && <p className="knx-knowledge-empty">Sin huecos libres de 1h entre las 9:00 y las 18:00 ese día.</p>}
        {suggestions.map((s, i) => {
          const picked = selectedSlot && selectedSlot.start.getTime() === s.start.getTime();
          return (
            <button type="button" key={i} className={`knx-avail-slot${picked ? ' knx-avail-slot--picked' : ''}`} onClick={() => onPickSlot(s)}>
              <span className="knx-avail-slot-time">{fmtTime(s.start.toISOString())}</span>
              <span className="knx-avail-slot-note">Todos libres</span>
            </button>
          );
        })}
      </div>
      {busyByEmail && (
        <div className="knx-avail-timeline">
          {internalAttendees.map(({ email, name }) => {
            const busy = busyByEmail[email]?.busy ?? [];
            const err = busyByEmail[email]?.error;
            return (
              <div key={email} className="knx-avail-row">
                <span className="knx-avail-row-label"><Avatar name={name} size={18} /> {name?.split(' ')[0] || email}</span>
                <span className="knx-avail-row-track">
                  {err && <span className="knx-avail-row-err">Sin datos</span>}
                  {!err && busy.map((b, i) => {
                    const dayStart = new Date(`${date}T07:00:00`).getTime();
                    const dayEnd = new Date(`${date}T19:00:00`).getTime();
                    const total = dayEnd - dayStart;
                    const left = Math.max(0, (new Date(b.start).getTime() - dayStart) / total) * 100;
                    const width = Math.max(1, (new Date(b.end).getTime() - new Date(b.start).getTime()) / total) * 100;
                    return <span key={i} className="knx-avail-busy-block" style={{ left: `${left}%`, width: `${width}%` }} />;
                  })}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Modal de agendar/reagendar ───────────────────────────────────────────────────────────────
function ScheduleMeetingModal({ tenant, roster, externalContacts, projects, organizerName, initialData, onClose, onCreated }) {
  const [title, setTitle] = useState(initialData?.title ?? '');
  const [tipo, setTipo] = useState(initialData?.tipo ?? 'equipo');
  const [description, setDescription] = useState(initialData?.description ?? '');
  const [attendees, setAttendees] = useState(initialData?.attendees ?? []);
  const [projectId, setProjectId] = useState(initialData?.projectId ?? '');
  const [withMeet, setWithMeet] = useState(true);
  const [date, setDate] = useState(initialData?.date ?? '');
  const [startTime, setStartTime] = useState(initialData?.startTime ?? '');
  const [duration, setDuration] = useState(initialData?.duration ?? 60);
  const [repeat, setRepeat] = useState(initialData?.repeat ?? 'none');
  const [saving, setSaving] = useState(false);
  const isEditing = !!initialData?.meetingId;
  const [err, setErr] = useState(null);

  const internalAttendees = attendees.filter((a) => !a.external);
  const endTime = useMemo(() => {
    if (!startTime) return '';
    const [h, m] = startTime.split(':').map(Number);
    const total = h * 60 + m + duration;
    return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
  }, [startTime, duration]);

  const pickSlot = (slot) => {
    setDate(toDateInput(slot.start));
    setStartTime(`${String(slot.start.getHours()).padStart(2, '0')}:${String(slot.start.getMinutes()).padStart(2, '0')}`);
  };

  const submit = async () => {
    setErr(null);
    if (!title.trim()) { setErr('Ponele un título a la reunión.'); return; }
    if (!date || !startTime) { setErr('Elige fecha y hora.'); return; }
    if (!attendees.length) { setErr('Agrega al menos un invitado.'); return; }
    setSaving(true);
    try {
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const res = await fetch(`/api/kai-next/${tenant}/dev-meetings`, {
        method: isEditing ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(isEditing ? { meetingId: initialData.meetingId } : {}),
          title: title.trim(), description, tipo, timeZone, withMeet, repeat,
          attendees: attendees.map((a) => ({ name: a.name, email: a.email })),
          projectId: projectId || null,
          startDateTime: `${date}T${startTime}:00`, endDateTime: `${date}T${endTime}:00`,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo agendar.');
      onCreated(data.meeting, isEditing);
    } catch (e) {
      setErr(e.message || 'No se pudo agendar.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="knx-meetings-modal-backdrop" onClick={onClose}>
      <div className="knx-meetings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="knx-meetings-modal-left">
          <h2>{isEditing ? 'Editar reunión' : 'Agendar reunión'}</h2>
          {err && <p className="knx-canvas-error">{err}</p>}
          <div className="knx-board-field">
            <label>Título</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Checkpoint semanal…" autoFocus />
          </div>
          <div className="knx-board-field">
            <label>Tipo</label>
            <div className="knx-meetings-tipo-pills">
              {TIPO_OPTIONS.map((t) => (
                <button
                  type="button" key={t.id}
                  className={`knx-meetings-tipo-pill${tipo === t.id ? ' knx-meetings-tipo-pill--active' : ''}`}
                  style={tipo === t.id ? { borderColor: t.border, background: t.chipBg } : undefined}
                  onClick={() => setTipo(t.id)}
                >
                  <span className="knx-meetings-tipo-dot" style={{ background: t.border }} />{t.label}
                </button>
              ))}
            </div>
          </div>
          <div className="knx-board-field">
            <label>Asistentes</label>
            <AttendeePicker roster={roster} externalContacts={externalContacts} value={attendees} onChange={setAttendees} organizerName={organizerName} />
          </div>
          {date && startTime && attendees.some((a) => a.timezone) && (
            <div className="knx-meetings-tz-list">
              {attendees.filter((a) => a.timezone).map((a) => (
                <span key={a.email}>
                  <Avatar name={a.name} size={18} /> {a.name?.split(' ')[0] || a.email} · <b>{localTimeFor(new Date(`${date}T${startTime}:00`), a.timezone)}</b>
                  <span className="knx-canvas-ficha-progress"> ({TIMEZONE_LABELS[a.timezone] ?? a.timezone})</span>
                </span>
              ))}
            </div>
          )}
          <div className="knx-board-field">
            <label>Proyecto</label>
            <select value={projectId} onChange={(e) => setProjectId(e.target.value)}>
              <option value="">Sin proyecto</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="knx-board-field">
            <label>Agenda</label>
            <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Temas a tratar (un punto por línea)" />
          </div>
          <label className="knx-meetings-meet-toggle">
            <input type="checkbox" checked={withMeet} onChange={(e) => setWithMeet(e.target.checked)} /> Que Kai agregue Google Meet
          </label>
        </div>
        <div className="knx-meetings-modal-right">
          <div className="knx-meetings-modal-right-head">
            <span>Elige el horario</span>
            <button type="button" className="knx-side-panel-close" aria-label="Cerrar" onClick={onClose}>×</button>
          </div>
          <div className="knx-board-field-row">
            <div className="knx-board-field">
              <label>Fecha</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="knx-board-field">
              <label>Hora</label>
              <TimeSelect value={startTime} onChange={setStartTime} />
            </div>
            <div className="knx-board-field">
              <label>Duración</label>
              <select value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
                {DURATION_OPTIONS.map((m) => <option key={m} value={m}>{durationLabel(m)}</option>)}
              </select>
            </div>
            <div className="knx-board-field">
              <label>Repetir</label>
              <select value={repeat} onChange={(e) => setRepeat(e.target.value)}>
                {REPEAT_OPTIONS.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
              </select>
            </div>
          </div>
          <AvailabilityAssistant
            tenant={tenant} internalAttendees={internalAttendees} date={date} duration={duration}
            onPickSlot={pickSlot}
            selectedSlot={startTime && date ? { start: new Date(`${date}T${startTime}:00`) } : null}
          />
          <div className="knx-meetings-modal-footer">
            {date && startTime && (
              <span className="knx-meetings-modal-footer-time">
                {withMeet ? 'Google Meet' : 'Sin Meet'} · {date} {startTime}–{endTime}
                {repeat !== 'none' && ` · ${REPEAT_OPTIONS.find((r) => r.id === repeat)?.label.toLowerCase()}`}
              </span>
            )}
            <span style={{ flexGrow: 1 }} />
            <button type="button" className="knx-canvas-mini" onClick={onClose}>Cancelar</button>
            <button type="button" className="knx-new-chat" disabled={saving} onClick={submit}>
              {saving ? 'Guardando…' : isEditing ? 'Guardar cambios' : 'Agendar y enviar invitación'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Vista calendario semanal ──────────────────────────────────────────────────────────────
// Día completo (00:00–24:00), scrolleable, como Google Calendar — el body ya es overflow-y:auto
// (ver .knx-week-body), así que mostrar las 24 horas solo lo hace más alto, no rompe nada.
const HOUR_START = 0;
const HOUR_END = 24;
const PX_PER_HOUR = 56;
function hourLabel(h) {
  return new Date(2000, 0, 1, h).toLocaleTimeString('es', { hour: 'numeric', hour12: true });
}

function snapMinutes(offsetY) {
  const raw = (offsetY / PX_PER_HOUR) * 60 + HOUR_START * 60;
  return Math.round(raw / 30) * 30;
}

function WeekCalendarView({ meetings, weekStart, meOnly, userEmail, userName, onSelectMeeting, onCreateAt }) {
  const now = new Date();
  const days = [0, 1, 2, 3, 4].map((i) => addDays(weekStart, i));
  // Al abrir, el scroll arranca en horario laboral (8 AM) fijo — nunca en medianoche, pero
  // tampoco atado a la hora real de quien lo abre (si alguien entra de madrugada o a las 11pm,
  // anclarlo a "ahora" lo deja en un lugar incómodo; 8 AM es un default razonable siempre).
  const bodyRef = useRef(null);
  useEffect(() => {
    if (!bodyRef.current) return;
    bodyRef.current.scrollTop = 7 * PX_PER_HOUR;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // Arrastrar selecciona un rango (como Google Calendar) en vez de solo un bloque fijo de 30min
  // — el rect de la columna se captura una sola vez al apretar el mouse (no reactivo a `drag`,
  // para no desuscribir/resuscribir los listeners del documento en cada mousemove).
  const [drag, setDrag] = useState(null); // { day, startMin, endMin }
  const handleMouseDown = (e, d) => {
    if (e.target.closest('.knx-week-event') || !onCreateAt) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const startMin = snapMinutes(e.clientY - rect.top);
    let current = { day: d, startMin, endMin: startMin + 30 };
    setDrag(current);
    const onMove = (ev) => {
      const endMin = Math.max(current.startMin + 30, snapMinutes(ev.clientY - rect.top));
      current = { ...current, endMin };
      setDrag(current);
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      const hh = String(Math.floor(current.startMin / 60) % 24).padStart(2, '0');
      const mm = String(current.startMin % 60).padStart(2, '0');
      onCreateAt(current.day, `${hh}:${mm}`, current.endMin - current.startMin);
      setDrag(null);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  const visible = meetings.filter((m) => !meOnly || (m.attendees ?? []).some((a) => a.email === userEmail));

  return (
    <div className="knx-week">
      <div className="knx-week-header">
        <div />
        {days.map((d) => {
          const isToday = sameDay(d, now);
          return (
            <div key={d.toISOString()} className="knx-week-header-day">
              <span className="knx-week-header-dow" style={isToday ? { color: '#085041' } : undefined}>
                {d.toLocaleDateString('es', { weekday: 'short' }).replace('.', '')}
              </span>
              <span className={`knx-week-header-num${isToday ? ' knx-week-header-num--today' : ''}`}>{d.getDate()}</span>
            </div>
          );
        })}
      </div>
      <div className="knx-week-body" ref={bodyRef} style={{ height: (HOUR_END - HOUR_START) * PX_PER_HOUR }}>
        <div className="knx-week-hours">
          {/* Sin label en el borde de arriba (medianoche) ni el de abajo (medianoche del día
              siguiente) — mismo criterio que Google Calendar, el cuadro de la hora existe pero
              no lleva número ahí. */}
          {Array.from({ length: HOUR_END - HOUR_START - 1 }, (_, i) => HOUR_START + i + 1).map((h) => (
            <span key={h} className="knx-week-hour-label" style={{ top: (h - HOUR_START) * PX_PER_HOUR - 7 }}>{hourLabel(h)}</span>
          ))}
        </div>
        {days.map((d) => {
          const dayOccurrences = visible
            .map((m) => ({ m, occ: m.start ? occurrenceOn(m, d) : null }))
            .filter((x) => x.occ);
          const isToday = sameDay(d, now);
          const nowTop = ((now.getHours() + now.getMinutes() / 60) - HOUR_START) * PX_PER_HOUR;
          const daySelecting = drag && sameDay(drag.day, d) ? drag : null;
          return (
            <div
              key={d.toISOString()} className={`knx-week-col${onCreateAt ? ' knx-week-col--clickable' : ''}`}
              style={{ height: (HOUR_END - HOUR_START) * PX_PER_HOUR }}
              onMouseDown={(e) => handleMouseDown(e, d)}
            >
              {Array.from({ length: HOUR_END - HOUR_START + 1 }, (_, i) => (
                <div key={i} className="knx-week-gridline" style={{ top: i * PX_PER_HOUR }} />
              ))}
              {isToday && nowTop >= 0 && nowTop <= (HOUR_END - HOUR_START) * PX_PER_HOUR && (
                <div className="knx-week-now-line" style={{ top: nowTop }}><span /></div>
              )}
              {daySelecting && (
                <div
                  className="knx-week-drag-selection"
                  style={{
                    top: (daySelecting.startMin - HOUR_START * 60) / 60 * PX_PER_HOUR,
                    height: (daySelecting.endMin - daySelecting.startMin) / 60 * PX_PER_HOUR,
                  }}
                />
              )}
              {dayOccurrences.map(({ m, occ }) => {
                const { start, end } = occ;
                const top = Math.max(0, ((start.getHours() + start.getMinutes() / 60) - HOUR_START) * PX_PER_HOUR);
                const height = Math.max(20, ((end - start) / 3600000) * PX_PER_HOUR);
                const info = tipoInfo(m.tipo);
                const extra = (m.attendees?.length ?? 1) - 1;
                return (
                  <button
                    type="button" key={`${m.id}-${toDateInput(d)}`}
                    className="knx-week-event"
                    style={{ top, height, background: info.chipBg, borderLeftColor: info.border, color: info.color }}
                    onClick={() => onSelectMeeting(m.id)}
                  >
                    <span className="knx-week-event-title">{m.title}{m.recurrence && ' ↻'}</span>
                    {height > 40 && <span className="knx-week-event-time">{fmtTime(start.toISOString())} – {fmtTime(end.toISOString())}</span>}
                    {height > 55 && (
                      <span className="knx-week-event-foot">
                        <Avatar name={m.createdByName} size={16} />
                        <span className="knx-week-event-organizer">Organiza {m.createdByName?.split(' ')[0] ?? '—'}</span>
                        {extra > 0 && <span className="knx-week-event-extra">+{extra}</span>}
                      </span>
                    )}
                  </button>
                );
              })}
              {visible.flatMap((m) => (m.proposals ?? []).map((p) => ({ m, p })))
                .filter(({ p }) => p.date && sameDay(new Date(`${p.date}T00:00:00`), d))
                .map(({ m, p }) => {
                  const [ph, pm] = p.startTime.split(':').map(Number);
                  const top = Math.max(0, ((ph + pm / 60) - HOUR_START) * PX_PER_HOUR);
                  const height = Math.max(20, (p.duration / 60) * PX_PER_HOUR);
                  const mine = p.proposedByName === userName;
                  return (
                    <button
                      type="button" key={p.id}
                      className="knx-week-event knx-week-event--ghost"
                      style={{ top, height }}
                      onClick={() => onSelectMeeting(m.id)}
                    >
                      <span className="knx-week-event-title">{mine ? 'Tu propuesta' : `Propuesta de ${p.proposedByName?.split(' ')[0] ?? ''}`}</span>
                      {height > 40 && <span className="knx-week-event-time">{p.startTime}</span>}
                    </button>
                  );
                })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Panel de detalle (RSVP en vivo) ───────────────────────────────────────────────────────
// Para quien NO organizó la reunión — a diferencia de ScheduleMeetingModal (que edita el evento
// real), esto solo deja una propuesta pendiente (ver POST .../propose) para que el organizador
// la vea y decida. Form chico a propósito: no tiene sentido reabrir título/asistentes/proyecto
// para "proponer otra hora", solo importa CUÁNDO.
function ProposeTimeModal({ tenant, meeting, roster, onClose, onProposed }) {
  const meetingStart = new Date(meeting.start);
  const [date, setDate] = useState(toDateInput(meetingStart));
  const [startTime, setStartTime] = useState('');
  const [duration, setDuration] = useState(Math.round((new Date(meeting.end) - meetingStart) / 60000) || 60);
  const [motivo, setMotivo] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(null);

  // Mismos invitados de Bonsight que ya tiene la reunión (cruzados contra el roster por email) —
  // así "Horarios libres" se calcula contra la gente real, no contra quien está proponiendo.
  const internalAttendees = (meeting.attendees ?? [])
    .filter((a) => roster.some((p) => p.email === a.email))
    .map((a) => ({ email: a.email, name: a.name || a.email }));
  const externalCount = (meeting.attendees ?? []).length - internalAttendees.length;

  const pickSlot = (slot) => {
    setDate(toDateInput(slot.start));
    setStartTime(`${String(slot.start.getHours()).padStart(2, '0')}:${String(slot.start.getMinutes()).padStart(2, '0')}`);
  };

  const submit = async () => {
    setErr(null);
    if (!date || !startTime) { setErr('Elige fecha y hora.'); return; }
    setSaving(true);
    try {
      const res = await fetch(`/api/kai-next/${tenant}/dev-meetings/${meeting.id}/propose`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, startTime, duration, motivo }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo enviar la propuesta.');
      onProposed();
    } catch (e) {
      setErr(e.message || 'No se pudo enviar la propuesta.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="knx-meetings-modal-backdrop" onClick={onClose}>
      <div className="knx-meetings-modal knx-meetings-modal--small" onClick={(e) => e.stopPropagation()}>
        <div className="knx-meetings-modal-left" style={{ borderRight: 0 }}>
          <h2>Proponer otra hora</h2>
          <p className="knx-meeting-detail-meta">Hora actual: {fmtDateTime(meeting.start)} – {fmtTime(meeting.end)}</p>
          <div className="knx-meetings-tz-list">
            <span>
              <Avatar name={meeting.createdByName} size={18} /> <b>{meeting.createdByName ?? 'El organizador'}</b> organiza esta reunión. Tu propuesta le llega a él y él decide si la mueve.
            </span>
          </div>
          {err && <p className="knx-canvas-error">{err}</p>}

          <AvailabilityAssistant
            tenant={tenant} internalAttendees={internalAttendees} date={date} duration={duration}
            onPickSlot={pickSlot}
            selectedSlot={startTime && date ? { start: new Date(`${date}T${startTime}:00`) } : null}
          />

          <p className="knx-canvas-meta-field-label" style={{ marginTop: 4 }}>Elegir otra fecha y hora</p>
          <div className="knx-board-field-row">
            <div className="knx-board-field">
              <label>Fecha</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="knx-board-field">
              <label>Hora</label>
              <TimeSelect value={startTime} onChange={setStartTime} />
            </div>
            <div className="knx-board-field">
              <label>Duración</label>
              <select value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
                {DURATION_OPTIONS.map((m) => <option key={m} value={m}>{durationLabel(m)}</option>)}
              </select>
            </div>
          </div>
          <div className="knx-board-field">
            <label>Motivo (opcional)</label>
            <textarea rows={2} value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="¿Por qué propones otro horario?" />
          </div>
          <p className="knx-canvas-ficha-progress">
            {externalCount > 0 && `Los ${externalCount} invitados externos solo reciben el cambio si ${meeting.createdByName?.split(' ')[0] ?? 'el organizador'} lo acepta. `}
            Mientras tanto, tu asistencia queda como «Propuso otro horario».
          </p>
          <div className="knx-meetings-modal-footer" style={{ borderTop: 0 }}>
            <span style={{ flexGrow: 1 }} />
            <button type="button" className="knx-canvas-mini" onClick={onClose}>Cancelar</button>
            <button type="button" className="knx-new-chat" disabled={saving} onClick={submit}>
              {saving ? 'Enviando…' : 'Enviar propuesta'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function MeetingDetailPanel({ tenant, basePath, meetingId, userName, roster, onClose, onDeleted, onReschedule }) {
  const [closing, handleClose] = useSidePanelClose(onClose);
  const [meeting, setMeeting] = useState(undefined);
  const [removeConfirm, setRemoveConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [proposeOpen, setProposeOpen] = useState(false);
  const [resolvingId, setResolvingId] = useState(null);

  const load = () => {
    setMeeting(undefined);
    fetch(`/api/kai-next/${tenant}/dev-meetings/${meetingId}`).then((r) => r.json()).then((d) => setMeeting(d.meeting ?? null)).catch(() => setMeeting(null));
  };
  useEffect(load, [tenant, meetingId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Clic afuera del panel lo cierra — se excluyen eventos/tarjetas de reunión (clickear otra ya
  // navega directo a esa, no hace falta cerrar-y-reabrir) y los modals propios (Editar/Proponer),
  // que tienen su propio backdrop fullscreen por encima del panel.
  const panelRef = useRef(null);
  useEffect(() => {
    const onDocMouseDown = (e) => {
      if (e.target.closest('.knx-week-event') || e.target.closest('.knx-meeting-card') || e.target.closest('.knx-meetings-modal-backdrop')) return;
      if (panelRef.current && !panelRef.current.contains(e.target)) handleClose();
    };
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, [handleClose]);

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await fetch(`/api/kai-next/${tenant}/dev-meetings?meetingId=${meetingId}`, { method: 'DELETE' });
      handleClose(() => onDeleted(meetingId));
    } finally {
      setDeleting(false);
      setRemoveConfirm(false);
    }
  };

  // "Insight de Kai" en la tarjeta de propuesta del organizador — no es IA generativa, es un
  // freebusy real (mismo endpoint que el asistente de disponibilidad) contra la hora PROPUESTA,
  // resumido en una frase. Un fetch por propuesta pendiente, memoizado en `insights` para no
  // repetirlo en cada render.
  const [insights, setInsights] = useState({});
  useEffect(() => {
    if (!meeting?.proposals?.length) return;
    const internalAttendees = (meeting.attendees ?? []).filter((a) => roster.some((p) => p.email === a.email));
    const externalCount = (meeting.attendees ?? []).length - internalAttendees.length;
    meeting.proposals.forEach((p) => {
      if (insights[p.id] !== undefined) return;
      if (!internalAttendees.length) {
        setInsights((prev) => ({ ...prev, [p.id]: externalCount ? 'No veo el calendario de los invitados externos.' : null }));
        return;
      }
      const [h, m] = p.startTime.split(':').map(Number);
      const timeMin = new Date(`${p.date}T00:00:00`); timeMin.setHours(h, m, 0, 0);
      const timeMax = new Date(timeMin.getTime() + p.duration * 60000);
      fetch(`/api/kai-next/${tenant}/dev-meetings/freebusy`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emails: internalAttendees.map((a) => a.email), timeMin: timeMin.toISOString(), timeMax: timeMax.toISOString() }),
      }).then((r) => r.json()).then((d) => {
        const busyNames = internalAttendees.filter((a) => (d.busy?.[a.email]?.busy ?? []).length > 0).map((a) => a.name?.split(' ')[0] || a.email);
        let text = busyNames.length
          ? `${busyNames.join(', ')} no ${busyNames.length > 1 ? 'están' : 'está'} libre a esa hora.`
          : `A esa hora están libres los ${internalAttendees.length} de Bonsight.`;
        if (externalCount) text += ' No veo el calendario de los invitados externos.';
        setInsights((prev) => ({ ...prev, [p.id]: text }));
      }).catch(() => setInsights((prev) => ({ ...prev, [p.id]: null })));
    });
  }, [meeting, roster]); // eslint-disable-line react-hooks/exhaustive-deps

  const resolveProposal = async (proposalId, accept) => {
    setResolvingId(proposalId);
    try {
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      await fetch(`/api/kai-next/${tenant}/dev-meetings/${meetingId}/propose`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proposalId, accept, timeZone }),
      });
      load();
    } finally {
      setResolvingId(null);
    }
  };

  if (meeting === undefined) {
    return <div className="knx-side-panel"><p className="knx-knowledge-empty" style={{ padding: 20 }}>Cargando…</p></div>;
  }
  if (!meeting) {
    return <div className="knx-side-panel"><p className="knx-canvas-error" style={{ padding: 20 }}>No se pudo cargar la reunión.</p></div>;
  }
  const info = tipoInfo(meeting.tipo);
  // Dos caminos distintos, no el mismo botón con otro texto: si lo organizaste vos, "Editar"
  // cambia el evento real al toque (onReschedule → PATCH). Si te invitaron, "Proponer otra hora"
  // solo deja una propuesta pendiente (ProposeTimeModal → POST .../propose) — el organizador es
  // quien decide si se aplica de verdad al abrir el panel y aceptarla.
  const isOrganizer = !!meeting.createdByName && meeting.createdByName === userName;
  const proposals = meeting.proposals ?? [];

  return (
    <div className={`knx-side-panel${closing ? ' knx-side-panel--closing' : ''}`} ref={panelRef}>
      <div className="knx-side-panel-header">
        <span className="knx-meeting-detail-type" style={{ color: info.color, background: info.chipBg }}>{info.label}</span>
        <span style={{ marginLeft: 'auto' }} />
        <button type="button" className="knx-side-panel-close" onClick={() => handleClose()} aria-label="Cerrar">×</button>
      </div>
      <div className="knx-side-panel-thread knx-board-detail-body">
        <h2 className="knx-meeting-detail-title">{meeting.title}</h2>
        <p className="knx-meeting-detail-meta">{fmtDateTime(meeting.start)} – {fmtTime(meeting.end)}{recurrenceLabel(meeting.recurrence) && ` · ↻ ${recurrenceLabel(meeting.recurrence)}`}</p>
        {meeting.meetLink && <p className="knx-meeting-detail-meta">Google Meet</p>}

        <div className="knx-meeting-detail-organizer">
          <Avatar name={meeting.createdByName} size={36} />
          <span>
            <span className="knx-meeting-detail-organizer-label">Organizada por</span>
            <span className="knx-meeting-detail-organizer-name">{meeting.createdByName ?? 'Equipo Bonsight'}</span>
          </span>
        </div>

        {proposals.length > 0 && (
          <div className="knx-proposal-list">
            {proposals.map((p) => {
              const newStart = new Date(`${p.date}T${p.startTime}:00`);
              const newEndMin = Number(p.startTime.split(':')[0]) * 60 + Number(p.startTime.split(':')[1]) + p.duration;
              const newEndLabel = `${String(Math.floor(newEndMin / 60) % 24).padStart(2, '0')}:${String(newEndMin % 60).padStart(2, '0')}`;
              return (
                <div key={p.id} className="knx-proposal-card">
                  <div className="knx-proposal-head">
                    <Avatar name={p.proposedByName} size={28} />
                    <span>
                      <span className="knx-proposal-head-name">{p.proposedByName} propone otro horario</span>
                      <span className="knx-proposal-head-time">{relTime(p.createdAt)}</span>
                    </span>
                  </div>
                  <p className="knx-proposal-change">
                    <s>{fmtDateTime(meeting.start)}</s> → <b>{newStart.toLocaleDateString('es', { day: 'numeric', month: 'short' })} {p.startTime}–{newEndLabel}</b>
                  </p>
                  {p.motivo && <p className="knx-epica-notas" style={{ marginLeft: 0 }}>«{p.motivo}»</p>}
                  {insights[p.id] && (
                    <div className="knx-meeting-detail-organizer" style={{ padding: '7px 10px', gap: 7 }}>
                      <span className="knx-meeting-avatar" style={{ width: 18, height: 18, fontSize: 9, background: 'var(--knx-deep)' }}>K</span>
                      <span style={{ fontSize: 12 }}>{insights[p.id]}</span>
                    </div>
                  )}
                  {isOrganizer ? (
                    <div className="knx-proposal-actions">
                      <button type="button" className="knx-new-chat" disabled={resolvingId === p.id} onClick={() => resolveProposal(p.id, true)}>
                        {resolvingId === p.id ? 'Aplicando…' : 'Aceptar y mover'}
                      </button>
                      <button type="button" className="knx-canvas-mini" disabled={resolvingId === p.id} onClick={() => resolveProposal(p.id, false)}>Rechazar</button>
                    </div>
                  ) : (
                    <span className="knx-canvas-ficha-progress">Pendiente de que {meeting.createdByName?.split(' ')[0] ?? 'el organizador'} decida.</span>
                  )}
                  {isOrganizer && (
                    <button type="button" className="knx-proposal-counter-link" onClick={() => onReschedule(meeting)}>Proponer otra</button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8 }}>
          {meeting.meetLink && <a href={meeting.meetLink} target="_blank" rel="noreferrer" className="knx-new-chat">Unirse</a>}
          <button type="button" className="knx-canvas-mini" onClick={() => (isOrganizer ? onReschedule(meeting) : setProposeOpen(true))}>
            {isOrganizer ? 'Editar' : 'Proponer otra hora'}
          </button>
        </div>

        <div className="knx-board-field">
          <label>Asistentes</label>
          <ul className="knx-meeting-attendee-list">
            {(meeting.attendees ?? []).map((a) => {
              const proposal = proposals.find((p) => p.proposedByName === a.name);
              return (
                <li key={a.email}>
                  <Avatar name={a.name || a.email} size={22} /> {a.name || a.email}
                  {proposal ? (
                    <span className="knx-rsvp-badge knx-rsvp--maybe">Propuso otro horario</span>
                  ) : (
                    <span className={`knx-rsvp-badge ${RESPONSE_CLASS[a.responseStatus] ?? 'knx-rsvp--pending'}`}>{RESPONSE_LABELS[a.responseStatus] ?? 'Pendiente'}</span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>

        {meeting.description?.trim() && (
          <div className="knx-board-field">
            <label>Agenda</label>
            <ol className="knx-meeting-agenda-list">
              {meeting.description.split('\n').filter((l) => l.trim()).map((line, i) => <li key={i}>{line}</li>)}
            </ol>
          </div>
        )}

        {meeting.projectName && (
          <a className="knx-meeting-project-chip" href={`${basePath}/${tenant}/proyectos?p=${meeting.projectId}`}>
            📁 Proyecto: {meeting.projectName}
          </a>
        )}

        <button type="button" className="knx-delete-task-btn" onClick={() => setRemoveConfirm(true)}>Cancelar reunión</button>
      </div>

      <KaiNextConfirmDialog
        open={removeConfirm}
        title="¿Cancelar esta reunión?"
        message="Se borra el evento del calendario y se les avisa a todos los invitados por mail. No se puede deshacer."
        confirmLabel={deleting ? 'Cancelando…' : 'Cancelar reunión'}
        onConfirm={confirmDelete}
        onCancel={() => setRemoveConfirm(false)}
      />

      {proposeOpen && (
        <ProposeTimeModal
          tenant={tenant} meeting={meeting} roster={roster}
          onClose={() => setProposeOpen(false)}
          onProposed={() => { setProposeOpen(false); load(); }}
        />
      )}
    </div>
  );
}

export default function KaiNextMeetings({ tenant, tenantName, basePath, userName, userHandle, isTeamUser }) {
  const [loggingOut, setLoggingOut] = useState(false);
  const [chats, setChats] = useState([]);
  const [projects, setProjects] = useState([]);
  const [roster, setRoster] = useState([]);
  const [externalContacts, setExternalContacts] = useState([]);
  const [meetings, setMeetings] = useState(null);
  const [view, setView] = useState('semana'); // 'semana' | 'lista'
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [meOnly, setMeOnly] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalInitial, setModalInitial] = useState(null);
  const [selectedMeetingId, setSelectedMeetingId] = useState(null);

  useEffect(() => {
    fetch(`/api/kai-next/${tenant}`).then((r) => r.json()).then((d) => setChats(d.conversations ?? [])).catch(() => null);
    fetch(`/api/kai/${tenant}/team-roster`).then((r) => r.json()).then((d) => setRoster(d.roster ?? [])).catch(() => null);
    fetch(`/api/kai-next/${tenant}/dev-meetings/external-contacts`).then((r) => r.json()).then((d) => setExternalContacts(d.contacts ?? [])).catch(() => null);
    fetch(`/api/kai-next/${tenant}/projects`).then((r) => r.json())
      .then((d) => setProjects((d.projects ?? []).filter((p) => p.projectKind === 'desarrollo')))
      .catch(() => null);
  }, [tenant]);

  const loadMeetings = () => {
    fetch(`/api/kai-next/${tenant}/dev-meetings`).then((r) => r.json()).then((d) => setMeetings(d.meetings ?? []));
  };
  useEffect(() => { loadMeetings(); }, [tenant]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      if (isTeamUser) await fetch('/api/team/logout', { method: 'POST' });
      else await fetch(`/api/kai/${tenant}/tenant-users/me`, { method: 'DELETE' });
    } finally {
      window.location.href = `${basePath}/${tenant}`;
    }
  };
  const handleDeleteChat = async (id) => {
    await fetch(`/api/kai-next/${tenant}?conversationId=${id}`, { method: 'DELETE' });
    setChats((prev) => prev.filter((c) => c.id !== id));
  };

  const openSchedule = (initial) => { setModalInitial(initial ?? null); setModalOpen(true); };
  const onMeetingCreated = (meeting, wasEditing) => {
    setMeetings((prev) => (wasEditing
      ? (prev ?? []).map((m) => (m.id === meeting.id ? meeting : m))
      : [meeting, ...(prev ?? [])]));
    setModalOpen(false);
    setModalInitial(null);
    // Si era tipo Cliente, puede haber externos nuevos guardados — se refresca para que la
    // próxima vez que se abra el picker ya los sugiera sin tener que recargar la página.
    if (meeting.tipo === 'cliente') {
      fetch(`/api/kai-next/${tenant}/dev-meetings/external-contacts`).then((r) => r.json()).then((d) => setExternalContacts(d.contacts ?? [])).catch(() => null);
    }
  };
  const onMeetingDeleted = (id) => {
    setMeetings((prev) => (prev ?? []).filter((m) => m.id !== id));
    setSelectedMeetingId(null);
  };
  const REPEAT_BY_RECURRENCE = { 'WEEKLY-1': 'weekly', 'WEEKLY-2': 'biweekly', 'MONTHLY-1': 'monthly' };
  const handleReschedule = (meeting) => {
    const startDate = new Date(meeting.start);
    const endDate = new Date(meeting.end);
    openSchedule({
      meetingId: meeting.id,
      title: meeting.title, tipo: meeting.tipo, description: meeting.description,
      attendees: (meeting.attendees ?? []).map((a) => ({ email: a.email, name: a.name || a.email, external: !roster.some((p) => p.email === a.email) })),
      projectId: meeting.projectId ?? '',
      date: toDateInput(startDate), startTime: `${String(startDate.getHours()).padStart(2, '0')}:${String(startDate.getMinutes()).padStart(2, '0')}`,
      duration: Math.round((endDate - startDate) / 60000),
      repeat: meeting.recurrence ? (REPEAT_BY_RECURRENCE[`${meeting.recurrence.freq}-${meeting.recurrence.interval}`] ?? 'weekly') : 'none',
    });
    setSelectedMeetingId(null);
  };
  // Click (o arrastre, como Google Calendar) en un hueco vacío de la grilla semanal — abre el
  // modal de agendar con esa fecha/hora/duración ya cargadas, nada más (sin asistentes/tipo
  // precargados, eso lo completa quien agenda). Un click simple (sin arrastrar) manda 30min.
  const handleCreateAt = (day, time, duration) => {
    openSchedule({ date: toDateInput(day), startTime: time, duration: duration || 30 });
  };

  const today = new Date();
  const todaysMeetings = (meetings ?? []).filter((m) => m.start && sameDay(new Date(m.start), today)).sort((a, b) => a.start.localeCompare(b.start));
  const nextMeeting = todaysMeetings.find((m) => new Date(m.start) > today);
  const minutesToNext = nextMeeting ? Math.round((new Date(nextMeeting.start) - today) / 60000) : null;

  return (
    <div className="knx-shell">
      <KaiNextSidebar
        tenant={tenant} tenantName={tenantName} userName={userName} userHandle={userHandle}
        isTeamUser={isTeamUser} basePath={basePath} chats={chats}
        onDeleteChat={handleDeleteChat} onLogout={handleLogout} loggingOut={loggingOut} active="meetings"
      />
      <main className="knx-main">
        <div className="knx-analisis-page">
          <div className="knx-analisis-top">
            <div className="knx-analisis-head">
              <h1>Reuniones</h1>
              <p>
                {meetings === null ? 'Cargando…' : todaysMeetings.length
                  ? `Hoy tienes ${todaysMeetings.length} reunión${todaysMeetings.length !== 1 ? 'es' : ''}${minutesToNext != null ? ` · la próxima empieza en ${minutesToNext} min` : ''}`
                  : 'Sin reuniones hoy.'}
              </p>
            </div>
            <button type="button" className="knx-new-chat" onClick={() => openSchedule(null)}>+ Agendar reunión</button>
          </div>

          <div className="knx-meetings-toolbar">
            {view === 'semana' && (
              <div className="knx-meetings-week-nav">
                <button type="button" aria-label="Semana anterior" onClick={() => setWeekStart((w) => addDays(w, -7))}>‹</button>
                <button type="button" className="knx-canvas-mini" onClick={() => setWeekStart(startOfWeek(new Date()))}>Hoy</button>
                <button type="button" aria-label="Semana siguiente" onClick={() => setWeekStart((w) => addDays(w, 7))}>›</button>
                <span className="knx-meetings-week-range">
                  {weekStart.toLocaleDateString('es', { day: 'numeric', month: 'short' })} – {addDays(weekStart, 4).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              </div>
            )}
            <span style={{ flexGrow: 1 }} />
            <button type="button" className={`knx-filter-pill${!meOnly ? ' knx-filter-pill--active' : ''}`} onClick={() => setMeOnly(false)}>Todo el equipo</button>
            <button type="button" className={`knx-filter-pill${meOnly ? ' knx-filter-pill--active' : ''}`} onClick={() => setMeOnly(true)}>Solo las mías</button>
            <div className="knx-meetings-view-toggle">
              <button type="button" className={view === 'semana' ? 'knx-meetings-view-toggle--active' : ''} onClick={() => setView('semana')}>Semana</button>
              <button type="button" className={view === 'lista' ? 'knx-meetings-view-toggle--active' : ''} onClick={() => setView('lista')}>Lista</button>
            </div>
          </div>

          {view === 'semana' && (
            <div className="knx-meetings-legend">
              {TIPO_OPTIONS.map((t) => (
                <span key={t.id}><span className="knx-meetings-legend-dot" style={{ background: t.chipBg, borderLeft: `3px solid ${t.border}` }} />{t.label}</span>
              ))}
            </div>
          )}

          {meetings === null ? (
            <p className="knx-knowledge-empty">Cargando…</p>
          ) : view === 'semana' ? (
            <WeekCalendarView meetings={meetings} weekStart={weekStart} meOnly={meOnly} userEmail={userHandle} userName={userName} onSelectMeeting={setSelectedMeetingId} onCreateAt={handleCreateAt} />
          ) : !meetings.length ? (
            <p className="knx-knowledge-empty">Sin reuniones agendadas todavía.</p>
          ) : (
            <div className="knx-meeting-card-list">
              {meetings.filter((m) => !meOnly || (m.attendees ?? []).some((a) => a.email === userHandle)).map((m) => (
                <MeetingCard key={m.id} meeting={m} onOpen={setSelectedMeetingId} />
              ))}
            </div>
          )}
        </div>
      </main>

      {modalOpen && (
        <ScheduleMeetingModal
          tenant={tenant} roster={roster} externalContacts={externalContacts} projects={projects} organizerName={userName}
          initialData={modalInitial}
          onClose={() => { setModalOpen(false); setModalInitial(null); }}
          onCreated={onMeetingCreated}
        />
      )}

      {selectedMeetingId && (
        <MeetingDetailPanel
          tenant={tenant} basePath={basePath} meetingId={selectedMeetingId} userName={userName} roster={roster}
          onClose={() => setSelectedMeetingId(null)}
          onDeleted={onMeetingDeleted}
          onReschedule={handleReschedule}
        />
      )}
    </div>
  );
}
