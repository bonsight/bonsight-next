import React from 'react';
import { Document, Page, Text, View, Image, StyleSheet, renderToBuffer } from '@react-pdf/renderer';

// Mismo patrón que lib/kaiNext/generators/reportPdf.jsx / lib/aria/generators/sprintClientReportPdf.jsx
// (CoverPage + ContentPage, Hdr/Ftr fijos), pero con la estética "paper" propia de Labs en vez
// de la oscura de Kai — portada clara, meters verde/ámbar/rojo, tipografía serif para títulos —
// para que el PDF se vea "tal cual" la sección Reportes en pantalla (ver app/labs/labs.css,
// variables --labs-*). Recibe el mismo shape que ya guarda lib/labs/experiments.js
// (addReportDraft): { kind, metrics, breakdown, analysis, doc, photos, periodFrom, periodTo,
// generatedBy, status, createdAt }, más el nombre del proyecto aparte.
const C = {
  ink: '#17140F',
  paper: '#F3EEDC',
  paper2: '#EAE2C8',
  paper3: '#E1D7B7',
  living: '#3F9E73',
  livingDeep: '#2C6E50',
  ember: '#C7852F',
  alert: '#B3492F',
  line: '#D9D0B4',
  muted: '#6B6552',
  white: '#FFFFFF',
};

const TONE_COLOR = { good: C.living, warning: C.ember, critical: C.alert };

const s = StyleSheet.create({
  coverPage: { backgroundColor: C.ink, padding: 0 },
  coverBar: { position: 'absolute', top: 0, right: 0, bottom: 0, width: 5, backgroundColor: C.living },
  coverBody: { padding: '60 64 60 60', flex: 1, justifyContent: 'space-between', minHeight: '100%' },
  coverBrand: { fontSize: 10, color: C.paper2, letterSpacing: 3, fontFamily: 'Helvetica-Bold', marginBottom: 60 },
  coverTitle: { fontSize: 26, color: C.white, fontFamily: 'Helvetica-Bold', lineHeight: 1.25, marginBottom: 10 },
  coverSub: { fontSize: 12, color: C.paper2, fontFamily: 'Helvetica', marginBottom: 20 },
  coverStatus: { fontSize: 9, color: C.living, fontFamily: 'Helvetica-Bold', letterSpacing: 1.5, marginBottom: 2 },
  coverFooter: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.15)', paddingTop: 20, flexDirection: 'row', justifyContent: 'space-between', marginTop: 60 },
  coverFooterText: { fontSize: 11, color: C.paper2, fontFamily: 'Helvetica' },

  page: { padding: '40 48 56 48', fontFamily: 'Helvetica', backgroundColor: C.paper },
  hdr: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22, paddingBottom: 9, borderBottomWidth: 1.5, borderBottomColor: C.living },
  hdrBrand: { fontSize: 9, color: C.ink, fontFamily: 'Helvetica-Bold', letterSpacing: 2 },
  hdrTitle: { fontSize: 8, color: C.muted, fontFamily: 'Helvetica' },
  footer: { position: 'absolute', bottom: 26, left: 48, right: 48, flexDirection: 'row', justifyContent: 'space-between' },
  footerText: { fontSize: 7.5, color: C.muted, fontFamily: 'Helvetica' },

  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 13, color: C.ink, fontFamily: 'Helvetica-Bold', marginBottom: 9 },
  prose: { fontSize: 10, color: C.ink, lineHeight: 1.6, marginBottom: 8 },
  bullet: { flexDirection: 'row', marginBottom: 4 },
  bulletDot: { width: 10, fontSize: 10, color: C.living },
  bulletText: { flex: 1, fontSize: 10, color: C.ink, lineHeight: 1.5 },

  meterRow: { marginBottom: 11 },
  meterTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 },
  meterLabel: { fontSize: 9.5, color: C.ink, fontFamily: 'Helvetica-Bold' },
  meterPct: { fontSize: 9.5, color: C.ink, fontFamily: 'Helvetica-Bold' },
  meterTrack: { height: 7, backgroundColor: C.paper3, borderRadius: 3.5 },
  meterSub: { fontSize: 8, color: C.muted, marginTop: 3 },

  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 },
  photoItem: { width: '31.5%', marginRight: '2.75%', marginBottom: 10 },
  photo: { width: '100%', height: 90, objectFit: 'cover', borderRadius: 3, borderWidth: 1, borderColor: C.line },
  photoCaption: { fontSize: 7, color: C.muted, marginTop: 3 },
});

function Hdr({ title }) {
  return (
    <View style={s.hdr} fixed>
      <Text style={s.hdrBrand}>BONSIGHT · LABS</Text>
      <Text style={s.hdrTitle}>{title}</Text>
    </View>
  );
}

function Ftr() {
  return (
    <View style={s.footer} fixed>
      <Text style={s.footerText} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
    </View>
  );
}

const STATUS_LABEL = { borrador: 'BORRADOR', enviado: 'ESPERANDO REVISIÓN', aprobado: 'APROBADO' };

function CoverPage({ projectName, report, period }) {
  return (
    <Page size="A4" style={s.coverPage}>
      <View style={s.coverBar} />
      <View style={s.coverBody}>
        <View>
          <Text style={s.coverBrand}>BONSIGHT · LABS</Text>
          <Text style={s.coverStatus}>{STATUS_LABEL[report.status] || report.status.toUpperCase()}</Text>
          <Text style={s.coverTitle}>Reporte de {projectName}</Text>
          <Text style={s.coverSub}>{period}</Text>
        </View>
        <View style={s.coverFooter}>
          <Text style={s.coverFooterText}>{report.generatedBy ? `Generado por ${report.generatedBy}` : 'Generado por IA'}</Text>
          <Text style={s.coverFooterText}>{new Date(report.createdAt).toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' })}</Text>
        </View>
      </View>
    </Page>
  );
}

function money(n) {
  return `S/ ${Number(n || 0).toLocaleString('es-PE')}`;
}

function Meter({ label, pct, tone = 'good', sublabel }) {
  const clamped = Math.max(0, Math.min(100, pct));
  return (
    <View style={s.meterRow} wrap={false}>
      <View style={s.meterTop}>
        <Text style={s.meterLabel}>{label}</Text>
        <Text style={s.meterPct}>{pct}%</Text>
      </View>
      <View style={s.meterTrack}>
        <View style={{ width: `${clamped}%`, height: 7, backgroundColor: TONE_COLOR[tone] || C.living, borderRadius: 3.5 }} />
      </View>
      {sublabel ? <Text style={s.meterSub}>{sublabel}</Text> : null}
    </View>
  );
}

function Bullets({ items }) {
  return items.map((t, i) => (
    <View key={i} style={s.bullet}>
      <Text style={s.bulletDot}>·</Text>
      <Text style={s.bulletText}>{t}</Text>
    </View>
  ));
}

// Fuente de imagen: SOLO data URI (base64) o previewUrl ya resuelto como tal — nunca driveUrl
// (es un link a la UI de Drive, no una URL de imagen cruda; @react-pdf/renderer no puede
// renderizarlo). Mismo criterio que ReportPhotoGrid en LabsClientTenant.jsx.
function photoSrc(p) {
  if (p.previewUrl?.startsWith('data:')) return p.previewUrl;
  if (p.data) return `data:${p.mimeType || 'image/jpeg'};base64,${p.data}`;
  return null;
}

function PhotoGrid({ photos }) {
  const usable = (photos || []).map((p) => ({ ...p, src: photoSrc(p) })).filter((p) => p.src);
  if (!usable.length) return null;
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>Evidencia fotográfica</Text>
      <View style={s.photoGrid}>
        {usable.map((p, i) => (
          <View key={i} style={s.photoItem} wrap={false}>
            <Image src={p.src} style={s.photo} />
            <Text style={s.photoCaption}>{p.from || p.name || ''}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function CivilBody({ report }) {
  const m = report.metrics || {};
  const overBudget = m.totalEjecutado > m.totalImporte;
  const scheduleSlip = m.pctTiempo - m.pctTareas > 25;
  return (
    <>
      <View style={s.section}>
        <Text style={s.sectionTitle}>Avance general</Text>
        {m.totalImporte > 0 && (
          <Meter
            label="Financiero" pct={m.pctFinanciero} tone={overBudget ? 'critical' : 'good'}
            sublabel={`${money(m.totalEjecutado)} de ${money(m.totalImporte)} ejecutado${overBudget ? ' — supera lo presupuestado' : ''}`}
          />
        )}
        <Meter
          label="Tareas" pct={m.pctTareas} tone={scheduleSlip ? 'warning' : 'good'}
          sublabel={`${m.tareasTerminadas} de ${m.totalTareas} terminadas${scheduleSlip ? ' — por detrás del tiempo transcurrido' : ''}`}
        />
        <Meter label="Tiempo transcurrido" pct={m.pctTiempo} tone="good" />
      </View>

      {report.breakdown?.financialByEtapa?.length > 0 && (
        <View style={s.section}>
          <Text style={s.sectionTitle}>Avance financiero por etapa</Text>
          {report.breakdown.financialByEtapa.map((e) => (
            <Meter key={e.etapa} label={e.etapa} pct={e.pct} tone={e.ejecutado > e.importe ? 'critical' : 'good'} sublabel={`${money(e.ejecutado)} de ${money(e.importe)}`} />
          ))}
        </View>
      )}

      {report.breakdown?.tasksByFase?.length > 0 && (
        <View style={s.section}>
          <Text style={s.sectionTitle}>Avance de tareas por fase</Text>
          {report.breakdown.tasksByFase.map((f) => (
            <Meter key={f.fase} label={f.fase} pct={f.pct} tone="good" sublabel={`${f.done}/${f.total} tareas`} />
          ))}
        </View>
      )}

      <View style={s.section}>
        <Text style={s.sectionTitle}>Análisis</Text>
        {(report.analysis || '').split('\n\n').filter(Boolean).map((p, i) => <Text key={i} style={s.prose}>{p}</Text>)}
      </View>
    </>
  );
}

function ExperimentalBody({ report }) {
  const d = report.doc || {};
  return (
    <>
      <View style={s.section}>
        <Text style={s.sectionTitle}>Resumen</Text>
        <Text style={s.prose}>{d.summary}</Text>
      </View>
      {d.whatWasTested?.length > 0 && (
        <View style={s.section}>
          <Text style={s.sectionTitle}>Qué se probó</Text>
          <Bullets items={d.whatWasTested} />
        </View>
      )}
      <View style={s.section}>
        <Text style={s.sectionTitle}>Resultados</Text>
        <Text style={s.prose}>{d.results}</Text>
      </View>
      <View style={s.section}>
        <Text style={s.sectionTitle}>Aprendizajes</Text>
        <Text style={s.prose}>{d.learnings}</Text>
      </View>
      {d.highlightedFeedback && (
        <View style={s.section}>
          <Text style={s.sectionTitle}>Feedback destacado</Text>
          <Text style={s.prose}>{d.highlightedFeedback}</Text>
        </View>
      )}
      {d.nextSteps?.length > 0 && (
        <View style={s.section}>
          <Text style={s.sectionTitle}>Próximos pasos sugeridos</Text>
          <Bullets items={d.nextSteps} />
        </View>
      )}
    </>
  );
}

function ContentPage({ projectName, report }) {
  return (
    <Page size="A4" style={s.page}>
      <Hdr title={`Reporte de ${projectName}`} />
      {report.kind === 'civil' ? <CivilBody report={report} /> : <ExperimentalBody report={report} />}
      <PhotoGrid photos={report.photos} />
      <Ftr />
    </Page>
  );
}

function LabsReport({ projectName, report, period }) {
  return (
    <Document title={`Reporte de ${projectName}`} author="Bonsight · Labs">
      <CoverPage projectName={projectName} report={report} period={period} />
      <ContentPage projectName={projectName} report={report} />
    </Document>
  );
}

export async function generateLabsReportPDF({ projectName, report }) {
  const period = `${new Date(report.periodFrom).toLocaleDateString('es-ES')} – ${new Date(report.periodTo).toLocaleDateString('es-ES')}`;
  return renderToBuffer(<LabsReport projectName={projectName} report={report} period={period} />);
}
