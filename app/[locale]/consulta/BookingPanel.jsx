'use client';

import { useEffect, useRef, useState } from 'react';

const WA_NUMBER = '13123509796';

const IconCheck = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12l5 5 9-10" />
  </svg>
);

// Offset (en minutos) de `zone` en el instante `date` — mismo cálculo que ya usa
// app/api/advisor/availability/route.js, portado acá para agrupar los slots por día CALENDARIO
// del visitante (no del host) sin asumir un offset fijo.
function tzOffsetMinutes(date, zone) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: zone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(date);
  const o = {};
  parts.forEach((p) => { o[p.type] = p.value; });
  return (Date.UTC(+o.year, +o.month - 1, +o.day, +o.hour, +o.minute, +o.second) - date.getTime()) / 60000;
}

function localDayKey(date, zone) {
  const shifted = new Date(date.getTime() + tzOffsetMinutes(date, zone) * 60000);
  return `${shifted.getUTCFullYear()}-${shifted.getUTCMonth()}-${shifted.getUTCDate()}`;
}

function startOfLocalDay(date, zone) {
  const offset = tzOffsetMinutes(date, zone);
  const shifted = new Date(date.getTime() + offset * 60000);
  shifted.setUTCHours(0, 0, 0, 0);
  return new Date(shifted.getTime() - offset * 60000);
}

export default function BookingPanel({
  messages, locale, duration = 30, purpose = null,
  title: panelTitle, lead: panelLead, hostNote: panelHostNote,
  prefill = {}, fixedSummary = null,
}) {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const en = locale === 'en';

  const fmtDay = new Intl.DateTimeFormat(en ? 'en' : 'es', { weekday: 'short', timeZone: tz });
  const fmtNum = new Intl.DateTimeFormat(en ? 'en' : 'es', { day: 'numeric', timeZone: tz });
  const fmtMon = new Intl.DateTimeFormat(en ? 'en' : 'es', { month: 'long', timeZone: tz });
  const fmtLong = new Intl.DateTimeFormat(en ? 'en' : 'es', { weekday: 'long', day: 'numeric', month: 'long', timeZone: tz });
  const fmtTime = new Intl.DateTimeFormat(en ? 'en' : 'es', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: tz });

  const [slots, setSlots] = useState(null); // null = cargando
  const [loadErr, setLoadErr] = useState(false);
  const [weekOffset, setWeekOffset] = useState(0);
  const [selDay, setSelDay] = useState(null);
  const [selSlot, setSelSlot] = useState(null);
  const [step, setStep] = useState(1);
  const [summary, setSummary] = useState(fixedSummary || '');
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [form, setForm] = useState({ name: prefill.name || '', email: prefill.email || '', company: prefill.company || '' });
  const [formErr, setFormErr] = useState(null);
  const [booking, setBooking] = useState(false);
  const [bookErr, setBookErr] = useState(null);
  const [done, setDone] = useState(null);
  const nameRef = useRef(null);

  useEffect(() => {
    fetch(`/api/advisor/availability?duration=${duration}`)
      .then((r) => r.json())
      .then((d) => setSlots((d.slots ?? []).map((s) => new Date(s))))
      .catch(() => setLoadErr(true));
  }, [duration]);

  const today = startOfLocalDay(new Date(), tz);

  function weekDays(offset) {
    const start = new Date(today);
    const dow = start.getDay(); // 0 dom
    start.setDate(start.getDate() - ((dow + 6) % 7) + (dow === 0 || dow === 6 ? 7 : 0) + offset * 7);
    const arr = [];
    for (let i = 0; i < 5; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      arr.push(d);
    }
    return arr;
  }

  function slotsForDay(d) {
    if (!slots) return [];
    const key = localDayKey(d, tz);
    return slots.filter((s) => localDayKey(s, tz) === key).sort((a, b) => a - b);
  }

  function label(t) {
    const s = fmtLong.format(t);
    const cap = s.charAt(0).toUpperCase() + s.slice(1);
    const end = new Date(t.getTime() + duration * 60000);
    return `${cap} · ${fmtTime.format(t)}–${fmtTime.format(end)}`;
  }

  const days = weekDays(weekOffset);
  const weekLabel = (() => {
    const s = fmtMon.format(days[0]);
    return s.charAt(0).toUpperCase() + s.slice(1);
  })();

  const goStep2 = async () => {
    if (!selSlot) return;
    setStep(2);
    if (fixedSummary !== null) {
      setTimeout(() => nameRef.current?.focus(), 50);
      return;
    }
    setSummaryLoading(true);
    try {
      const res = await fetch('/api/advisor/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages }),
      });
      const data = await res.json();
      setSummary(data.summary || '');
    } catch {
      setSummary('');
    } finally {
      setSummaryLoading(false);
      setTimeout(() => nameRef.current?.focus(), 50);
    }
  };

  const submitBooking = async (e) => {
    e.preventDefault();
    setFormErr(null);
    if (!form.name.trim()) { setFormErr(en ? 'Enter your name.' : 'Escribe tu nombre.'); return; }
    if (!/^\S+@\S+\.\S+$/.test(form.email)) { setFormErr(en ? 'Enter a valid email.' : 'Escribe un email válido.'); return; }

    setBooking(true);
    setBookErr(null);
    try {
      const startDateTime = selSlot.toISOString();
      const endDateTime = new Date(selSlot.getTime() + duration * 60000).toISOString();
      const res = await fetch('/api/advisor/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startDateTime, endDateTime, name: form.name, email: form.email, company: form.company, summary, timeZone: tz, purpose }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409) {
          setSlots((prev) => (prev ?? []).filter((s) => s.getTime() !== selSlot.getTime()));
          setSelSlot(null);
          setStep(1);
          setBookErr(data.error);
        } else {
          setBookErr(data.error || (en ? 'Something went wrong.' : 'Algo salió mal.'));
        }
        return;
      }
      setDone({ start: new Date(data.start), meetLink: data.meetLink });
      setStep(3);
    } catch {
      setBookErr(en ? 'Something went wrong. Try again.' : 'Algo salió mal. Intenta de nuevo.');
    } finally {
      setBooking(false);
    }
  };

  const downloadIcs = () => {
    if (!done) return;
    const f = (d) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const end = new Date(done.start.getTime() + duration * 60000);
    const ics = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Bonsight//Advisor//ES', 'BEGIN:VEVENT',
      `UID:${Date.now()}@bonsight.co`, `DTSTAMP:${f(new Date())}`, `DTSTART:${f(done.start)}`, `DTEND:${f(end)}`,
      `SUMMARY:${purpose || 'Llamada de discovery'} · Bonsight`,
      'DESCRIPTION:Con el equipo de Bonsight. El enlace de Google Meet va en la invitación.',
      'END:VEVENT', 'END:VCALENDAR',
    ].join('\r\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
    a.download = 'bonsight-discovery.ics';
    a.click();
  };

  if (step === 3 && done) {
    return (
      <div className="consulta-book">
        <div className="consulta-book-done">
          <span className="consulta-book-check"><IconCheck /></span>
          <h2>{en ? 'Meeting scheduled' : 'Reunión agendada'}</h2>
          <p className="consulta-book-lead">{en ? `We sent the invitation to ${form.email}.` : `Te mandamos la invitación a ${form.email}.`}</p>
          <div className="consulta-book-card">
            <div><span>{en ? 'When' : 'Cuándo'}</span><b>{label(done.start)}</b></div>
            <div><span>{en ? 'With' : 'Con'}</span>Bonsight</div>
            <div><span>{en ? 'Where' : 'Dónde'}</span>Google Meet</div>
          </div>
          <div className="consulta-book-actions">
            <button type="button" className="consulta-book-btn-line" onClick={downloadIcs}>{en ? 'Add to my calendar' : 'Agregar a mi calendario'}</button>
            <a className="consulta-book-btn-line" href={`https://wa.me/${WA_NUMBER}`} target="_blank" rel="noopener noreferrer">{en ? 'Message on WhatsApp' : 'Escribir por WhatsApp'}</a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="consulta-book">
      <p className="consulta-book-kicker">{en ? 'Next step' : 'Próximo paso'}</p>

      {step === 1 && (
        <>
          <h2>{panelTitle || (en ? 'Schedule your discovery call' : 'Agenda tu llamada de discovery')}</h2>
          <p className="consulta-book-lead">{panelLead || (en ? '30 minutes to understand your case and see how we can help.' : '30 minutos para entender tu caso y ver cómo podemos ayudarte.')}</p>

          <div className="consulta-book-host">
            <span className="consulta-book-ph">B</span>
            <div><b>Bonsight</b><span>{panelHostNote || (en ? '30 min · Google Meet · free' : '30 min · Google Meet · sin costo')}</span></div>
          </div>

          {loadErr && <p className="consulta-book-empty">{en ? "Couldn't load availability." : 'No se pudo cargar la disponibilidad.'}</p>}
          {bookErr && <p className="consulta-book-err">{bookErr}</p>}

          {!loadErr && (
            <div className="consulta-book-pick">
              <div>
                <p className="consulta-book-lbl">{en ? 'Pick a day' : 'Elige un día'}</p>
                <div className="consulta-book-days">
                  {days.map((d) => {
                    const n = slotsForDay(d).length;
                    const isSel = selDay && d.getTime() === selDay.getTime();
                    return (
                      <button
                        key={d.toISOString()}
                        type="button"
                        className="consulta-book-day"
                        disabled={n === 0}
                        aria-pressed={isSel}
                        onClick={() => { setSelDay(d); setSelSlot(null); }}
                      >
                        <small>{fmtDay.format(d).replace('.', '')}</small>
                        <b>{fmtNum.format(d)}</b>
                        <em>{n ? (en ? `${n} open` : `${n} libres`) : '—'}</em>
                      </button>
                    );
                  })}
                </div>
                <div className="consulta-book-weeknav">
                  <button type="button" disabled={weekOffset === 0} onClick={() => { setWeekOffset((w) => w - 1); setSelDay(null); setSelSlot(null); }} aria-label={en ? 'Previous week' : 'Semana anterior'}>←</button>
                  <span>{weekLabel}</span>
                  <button type="button" disabled={weekOffset >= 2} onClick={() => { setWeekOffset((w) => w + 1); setSelDay(null); setSelSlot(null); }} aria-label={en ? 'Next week' : 'Semana siguiente'}>→</button>
                </div>
              </div>
              <div>
                <p className="consulta-book-lbl">{en ? 'Available times' : 'Horarios disponibles'}</p>
                {!selDay ? (
                  <div className="consulta-book-empty">{en ? 'Pick a day to see times.' : 'Elige un día para ver los horarios.'}</div>
                ) : slots === null ? (
                  <div className="consulta-book-empty">{en ? 'Loading…' : 'Cargando…'}</div>
                ) : (
                  <div className="consulta-book-slots">
                    {slotsForDay(selDay).map((t) => (
                      <button
                        key={t.toISOString()}
                        type="button"
                        className="consulta-book-slot"
                        aria-pressed={selSlot && selSlot.getTime() === t.getTime()}
                        onClick={() => setSelSlot(t)}
                      >
                        {fmtTime.format(t)}
                      </button>
                    ))}
                  </div>
                )}
                <p className="consulta-book-tz">{en ? `Times in your local timezone (${tz.replace(/_/g, ' ')}).` : `Horarios en tu hora local (${tz.replace(/_/g, ' ')}).`}</p>
              </div>
            </div>
          )}

          <div className="consulta-book-bar">
            <span className="consulta-book-sel">{selSlot ? <b>{label(selSlot)}</b> : (selDay ? (en ? 'Pick a time.' : 'Elige un horario.') : (en ? 'Pick a day and a time.' : 'Elige un día y un horario.'))}</span>
            <button type="button" className="consulta-book-btn-green" disabled={!selSlot} onClick={goStep2}>{en ? 'Continue →' : 'Continuar →'}</button>
          </div>
        </>
      )}

      {step === 2 && (
        <form onSubmit={submitBooking}>
          <div className="consulta-book-summary-line">
            <span>{label(selSlot)}</span>
            <button type="button" onClick={() => setStep(1)}>{en ? 'Change' : 'Cambiar'}</button>
          </div>
          <div className="consulta-book-form">
            <div>
              <label htmlFor="bp-name">{en ? 'Name *' : 'Nombre *'}</label>
              <input id="bp-name" ref={nameRef} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder={en ? 'Your name' : 'Tu nombre'} required />
            </div>
            <div>
              <label htmlFor="bp-email">{en ? 'Email *' : 'Email *'}</label>
              <input id="bp-email" type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="tu@empresa.com" required />
            </div>
            <div className="consulta-book-full">
              <label htmlFor="bp-company">{en ? 'Company' : 'Empresa'}</label>
              <input id="bp-company" value={form.company} onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))} placeholder={en ? 'Your company name' : 'Nombre de tu empresa'} />
            </div>
            <div className="consulta-book-full">
              <label htmlFor="bp-summary">{en ? "What we talked about" : 'Lo que conversamos'}</label>
              <textarea id="bp-summary" value={summaryLoading ? (en ? 'Summarizing…' : 'Resumiendo…') : summary} onChange={(e) => setSummary(e.target.value)} disabled={summaryLoading} />
            </div>
            <div className="consulta-book-ctx">{fixedSummary !== null
              ? (en ? 'You can edit it: this is what the team will read before the call.' : 'Puedes editarla: es lo que el equipo leerá antes de la llamada.')
              : (en ? 'The Advisor summarized the conversation. You can edit it: this is what the host will read before the call.' : 'El Advisor resumió la conversación. Puedes editarla: es lo que el equipo leerá antes de la llamada.')}</div>
          </div>
          {formErr && <p className="consulta-book-err">{formErr}</p>}
          {bookErr && <p className="consulta-book-err">{bookErr}</p>}
          <div className="consulta-book-bar">
            <span className="consulta-book-sel">{en ? "You'll get the invitation by email." : 'Te llegará la invitación al correo.'}</span>
            <button type="submit" className="consulta-book-btn-green" disabled={booking}>{booking ? (en ? 'Scheduling…' : 'Agendando…') : (en ? 'Confirm meeting' : 'Confirmar reunión')}</button>
          </div>
        </form>
      )}
    </div>
  );
}
