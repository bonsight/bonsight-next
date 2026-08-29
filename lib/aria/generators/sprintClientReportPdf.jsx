import React from 'react';
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from '@react-pdf/renderer';

const C = {
  bg: '#0D1117', green: '#20C997', white: '#FFFFFF', text: '#111827',
  muted: '#6B7280', subtle: '#9CA3AF', border: '#E5E7EB',
  amber: '#D97706', amberBg: '#FFFBEB', red: '#DC2626', redBg: '#FEF2F2', greenBg: '#ECFDF5',
};

const HEALTH_TONE = { good: C.green, warning: C.amber, critical: C.red };
const HEALTH_LABEL = { good: 'En orden', warning: 'Atención', critical: 'Crítico' };

const s = StyleSheet.create({
  coverPage: { backgroundColor: C.bg, padding: 0 },
  coverBar: { position: 'absolute', top: 0, right: 0, bottom: 0, width: 5, backgroundColor: C.green },
  coverBody: { padding: '60 64 60 60', flex: 1, justifyContent: 'space-between', minHeight: '100%' },
  coverBrand: { fontSize: 10, color: C.green, letterSpacing: 3, fontFamily: 'Helvetica-Bold', marginBottom: 60 },
  coverTitle: { fontSize: 25, color: C.white, fontFamily: 'Helvetica-Bold', lineHeight: 1.28, marginBottom: 14 },
  coverDesc: { fontSize: 12, color: C.subtle, fontFamily: 'Helvetica', lineHeight: 1.5 },
  coverFooter: { borderTopWidth: 1, borderTopColor: '#1F2937', paddingTop: 20, flexDirection: 'row', justifyContent: 'space-between', marginTop: 60 },
  coverFooterText: { fontSize: 11, color: C.subtle, fontFamily: 'Helvetica' },

  page: { padding: '44 52 60 52', fontFamily: 'Helvetica', backgroundColor: C.white },
  hdr: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingBottom: 10, borderBottomWidth: 1.5, borderBottomColor: C.green },
  hdrBrand: { fontSize: 9, color: C.green, fontFamily: 'Helvetica-Bold', letterSpacing: 2 },
  hdrMeta: { fontSize: 8, color: C.muted, fontFamily: 'Helvetica' },

  label: { fontSize: 8, color: C.green, letterSpacing: 2.5, fontFamily: 'Helvetica-Bold', marginBottom: 6, textTransform: 'uppercase' },
  h1: { fontSize: 15.5, color: C.text, fontFamily: 'Helvetica-Bold', marginBottom: 10 },
  h2: { fontSize: 12, color: C.text, fontFamily: 'Helvetica-Bold', marginBottom: 7, marginTop: 16 },
  para: { fontSize: 10, color: '#374151', lineHeight: 1.65, fontFamily: 'Helvetica', marginBottom: 8 },

  bulletRow: { flexDirection: 'row', marginBottom: 5 },
  bulletDot: { fontSize: 10, color: C.green, width: 14, fontFamily: 'Helvetica-Bold' },
  bulletText: { fontSize: 10, color: '#374151', flex: 1, lineHeight: 1.55, fontFamily: 'Helvetica' },

  divider: { height: 1, backgroundColor: C.border, marginTop: 18, marginBottom: 4 },

  // ── franja superior: métricas + salud, movidas arriba (antes iban al final) ──
  topStrip: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18, flexWrap: 'wrap' },
  metricsRow: { flexDirection: 'row' },
  metricItem: { marginRight: 26 },
  metricValue: { fontSize: 16, color: C.text, fontFamily: 'Helvetica-Bold' },
  metricLabel: { fontSize: 7, color: C.muted, fontFamily: 'Helvetica', marginTop: 2 },

  healthRow: { flexDirection: 'row', gap: 8 },
  healthPill: { flexDirection: 'row', alignItems: 'center', borderRadius: 3, paddingTop: 4, paddingBottom: 4, paddingLeft: 8, paddingRight: 8, marginLeft: 8 },
  healthDot: { width: 6, height: 6, borderRadius: 3, marginRight: 5 },
  healthText: { fontSize: 7.5, fontFamily: 'Helvetica-Bold' },

  // ── hitos ──
  hitosBox: { backgroundColor: C.greenBg, borderLeftWidth: 3, borderLeftColor: C.green, borderRadius: 2, padding: '12 14', marginBottom: 18 },
  hitosTitle: { fontSize: 9, color: '#065F46', fontFamily: 'Helvetica-Bold', marginBottom: 7, letterSpacing: 0.5 },
  hitoRow: { flexDirection: 'row', marginBottom: 4 },
  hitoDot: { fontSize: 9, color: '#065F46', width: 12, fontFamily: 'Helvetica-Bold' },
  hitoText: { fontSize: 9.5, color: '#065F46', flex: 1, lineHeight: 1.4, fontFamily: 'Helvetica' },

  // ── riesgos ──
  riesgoBox: { backgroundColor: C.amberBg, borderLeftWidth: 3, borderLeftColor: C.amber, borderRadius: 2, padding: '12 14', marginTop: 16, marginBottom: 4 },
  riesgoText: { fontSize: 9.5, color: '#92400E', flex: 1, lineHeight: 1.45, fontFamily: 'Helvetica' },
  riesgoDot: { fontSize: 9, color: '#92400E', width: 12, fontFamily: 'Helvetica-Bold' },

  footer: { position: 'absolute', bottom: 28, left: 52, right: 52, flexDirection: 'row', justifyContent: 'space-between' },
  footerText: { fontSize: 7.5, color: C.subtle, fontFamily: 'Helvetica' },
});

function Hdr({ clienteName }) {
  return (
    <View style={s.hdr} fixed>
      <Text style={s.hdrBrand}>BONSIGHT</Text>
      <Text style={s.hdrMeta}>{clienteName}</Text>
    </View>
  );
}

function Ftr({ title }) {
  return (
    <View style={s.footer} fixed>
      <Text style={s.footerText}>{title}</Text>
      <Text style={s.footerText} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
    </View>
  );
}

function CoverPage({ data }) {
  return (
    <Page size="A4" style={s.coverPage}>
      <View style={s.coverBar} />
      <View style={s.coverBody}>
        <View>
          <Text style={s.coverBrand}>BONSIGHT</Text>
          <Text style={s.coverTitle}>{data.titulo}</Text>
          <Text style={s.coverDesc}>{data.periodLabel}</Text>
        </View>
        <View style={s.coverFooter}>
          <Text style={s.coverFooterText}>{data.clienteName}</Text>
          <Text style={s.coverFooterText}>{data.generatedAtLabel}</Text>
        </View>
      </View>
    </Page>
  );
}

function HealthPill({ label, tone }) {
  const color = HEALTH_TONE[tone] || C.muted;
  return (
    <View style={[s.healthPill, { backgroundColor: `${color}1A` }]}>
      <View style={[s.healthDot, { backgroundColor: color }]} />
      <Text style={[s.healthText, { color }]}>{label}: {HEALTH_LABEL[tone] || tone}</Text>
    </View>
  );
}

function ContentPage({ data }) {
  return (
    <Page size="A4" style={s.page}>
      <Hdr clienteName={data.clienteName} />

      {(data.metrics || data.health) && (
        <View style={s.topStrip} wrap={false}>
          {data.metrics && (
            <View style={s.metricsRow}>
              <View style={s.metricItem}><Text style={s.metricValue}>{data.metrics.completadas}</Text><Text style={s.metricLabel}>Tareas completadas</Text></View>
              <View style={s.metricItem}><Text style={s.metricValue}>{data.metrics.total}</Text><Text style={s.metricLabel}>Tareas trabajadas</Text></View>
              <View style={s.metricItem}><Text style={s.metricValue}>{data.metrics.sprints}</Text><Text style={s.metricLabel}>Sprints incluidos</Text></View>
              <View style={s.metricItem}><Text style={s.metricValue}>{data.metrics.iniciativas}</Text><Text style={s.metricLabel}>Frentes de trabajo</Text></View>
            </View>
          )}
          {data.health && (
            <View style={s.healthRow}>
              <HealthPill label="Cronograma" tone={data.health.cronograma} />
              <HealthPill label="Calidad" tone={data.health.calidad} />
            </View>
          )}
        </View>
      )}

      <Text style={s.label}>Resumen ejecutivo</Text>
      {data.resumenEjecutivo.split('\n\n').filter(Boolean).map((p, i) => <Text key={i} style={s.para}>{p}</Text>)}

      {data.hitos?.length > 0 && (
        <View style={s.hitosBox} wrap={false}>
          <Text style={s.hitosTitle}>HITOS DEL PERÍODO</Text>
          {data.hitos.map((h, i) => (
            <View key={i} style={s.hitoRow}>
              <Text style={s.hitoDot}>•</Text>
              <Text style={s.hitoText}>{h}</Text>
            </View>
          ))}
        </View>
      )}

      {data.secciones.length > 0 && (
        <>
          <Text style={s.h1}>Principales avances y temas abordados</Text>
          {data.secciones.map((sec, i) => (
            <View key={i} wrap={false} style={{ marginBottom: 4 }}>
              <Text style={s.h2}>{sec.titulo}</Text>
              {sec.texto ? <Text style={s.para}>{sec.texto}</Text> : null}
              {sec.bullets.map((b, j) => (
                <View key={j} style={s.bulletRow}>
                  <Text style={s.bulletDot}>•</Text>
                  <Text style={s.bulletText}>{b}</Text>
                </View>
              ))}
            </View>
          ))}
        </>
      )}

      {data.riesgos?.length > 0 && (
        <View style={s.riesgoBox} wrap={false}>
          <Text style={s.hitosTitle}>RIESGOS Y OBSERVACIONES</Text>
          {data.riesgos.map((r, i) => (
            <View key={i} style={s.bulletRow}>
              <Text style={s.riesgoDot}>•</Text>
              <Text style={s.riesgoText}>{r}</Text>
            </View>
          ))}
        </View>
      )}

      {data.valorEntregado.length > 0 && (
        <>
          <View style={s.divider} />
          <Text style={s.h1}>Valor entregado a {data.clienteName}</Text>
          {data.valorEntregado.map((v, i) => (
            <View key={i} style={s.bulletRow}>
              <Text style={s.bulletDot}>•</Text>
              <Text style={s.bulletText}>{v}</Text>
            </View>
          ))}
        </>
      )}

      {data.proximosPasos?.length > 0 && (
        <>
          <Text style={s.h2}>Próximos pasos</Text>
          {data.proximosPasos.map((n, i) => (
            <View key={i} style={s.bulletRow}>
              <Text style={s.bulletDot}>•</Text>
              <Text style={s.bulletText}>{n}</Text>
            </View>
          ))}
        </>
      )}

      <Ftr title={data.titulo} />
    </Page>
  );
}

function SprintClientReportDoc({ data }) {
  return (
    <Document title={data.titulo} author="Bonsight">
      <CoverPage data={data} />
      <ContentPage data={data} />
    </Document>
  );
}

export async function generateSprintClientReportPDF(data) {
  return renderToBuffer(<SprintClientReportDoc data={data} />);
}
