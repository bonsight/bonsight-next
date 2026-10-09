import { notFound } from 'next/navigation';
import { getReport } from '@/lib/kai/reports';

const EJE_LABELS = { bloqueo_critico: 'Bloqueo crítico', oportunidad_clave: 'Oportunidad clave' };
const IMPACT_LABELS = { alto: 'Alto', medio: 'Medio', bajo: 'Bajo' };

export async function generateMetadata({ params }) {
  const { id } = await params;
  const report = await getReport(id);
  return {
    title: report ? `Reporte · ${report.tenantName}` : 'Reporte no encontrado',
    robots: { index: false, follow: false },
  };
}

function formatDate(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default async function KaiNextReportPage({ params }) {
  const { id } = await params;
  const report = await getReport(id);
  if (!report) notFound();

  const midLongTerm = [...(report.objectives?.mediumTerm ?? []), ...(report.objectives?.longTerm ?? [])];

  return (
    <div className="knx-report-page">
      <div className="knx-report-inner">
        <div className="knx-report-top">
          <span className="knx-report-brand">Kai</span>
          <span className="knx-report-date">Generado el {formatDate(report.createdAt)}</span>
        </div>

        <h1 className="knx-report-title">{report.tenantName}</h1>
        <p className="knx-report-subtitle">Reporte de solo lectura — generado desde Kai Next, página Empresa.</p>

        {report.score != null && (
          <div className="knx-empresa-score knx-report-score">
            <div className="knx-empresa-score-label">Madurez del perfil</div>
            <div className="knx-empresa-score-row">
              <span className="knx-empresa-score-pct">{report.score}%</span>
            </div>
          </div>
        )}

        {report.diagnosis && (report.diagnosis.problema_principal || report.diagnosis.oportunidad_principal) && (
          <section className="knx-report-section">
            <h2>Diagnóstico</h2>
            {report.diagnosis.problema_principal && (
              <p><strong>Problema principal:</strong> {report.diagnosis.problema_principal}</p>
            )}
            {report.diagnosis.oportunidad_principal && (
              <p><strong>Oportunidad principal:</strong> {report.diagnosis.oportunidad_principal}</p>
            )}
            {report.diagnosis.impacto && <p className="knx-report-muted">{report.diagnosis.impacto}</p>}
          </section>
        )}

        {report.ejes?.length > 0 && (
          <section className="knx-report-section">
            <h2>Ejes estratégicos</h2>
            <div className="knx-ejes-grid">
              {report.ejes.map((eje, i) => (
                <div className="knx-eje-card" key={i}>
                  <span className={`knx-badge-tag knx-badge-tag--${eje.categoria === 'bloqueo_critico' ? 'critico' : 'oportunidad'}`}>
                    {EJE_LABELS[eje.categoria] ?? eje.categoria}
                  </span>
                  <h3>{eje.titulo}</h3>
                  <p>{eje.descripcion}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {report.priorities?.length > 0 && (
          <section className="knx-report-section">
            <h2>Prioridades de esa semana</h2>
            <div className="knx-priorities-pills">
              {report.priorities.map((p, i) => (
                <span key={i} className={p.done ? 'knx-priority-pill knx-priority-pill--done' : 'knx-priority-pill'}>
                  <span className="knx-priority-text">{p.text}</span>
                </span>
              ))}
            </div>
          </section>
        )}

        {(report.objectives?.shortTerm?.length > 0 || midLongTerm.length > 0 || report.kpis?.length > 0) && (
          <section className="knx-report-section knx-align-card">
            <h2>Objetivos y métricas</h2>
            <div className="knx-align-grid">
              <div>
                <span className="knx-align-col-label">Corto plazo</span>
                <ul>{(report.objectives?.shortTerm ?? []).map((o, i) => <li key={i}>{o}</li>)}</ul>
              </div>
              <div>
                <span className="knx-align-col-label">Mediano / largo plazo</span>
                <ul>{midLongTerm.map((o, i) => <li key={i}>{o}</li>)}</ul>
              </div>
              {report.kpis?.length > 0 && (
                <div className="knx-align-kpis">
                  <span className="knx-align-col-label">KPIs a monitorear</span>
                  <div className="knx-align-kpi-list">{report.kpis.map((k, i) => <span key={i}>• {k}</span>)}</div>
                </div>
              )}
            </div>
          </section>
        )}

        {report.learnings?.length > 0 && (
          <section className="knx-report-section">
            <h2>Hallazgos recientes</h2>
            <div className="knx-learning-list">
              {report.learnings.map((l, i) => (
                <div className="knx-learning-row knx-report-learning-row" key={i}>
                  <div className="knx-learning-row-main">
                    <span className="knx-learning-row-text">{l.content}</span>
                  </div>
                  {l.impact && <span className={`knx-impact-badge knx-impact-badge--${l.impact}`}>{IMPACT_LABELS[l.impact] ?? l.impact}</span>}
                </div>
              ))}
            </div>
          </section>
        )}

        <p className="knx-report-footer">Generado por Kai — reporte de solo lectura, no requiere sesión.</p>
      </div>
    </div>
  );
}
