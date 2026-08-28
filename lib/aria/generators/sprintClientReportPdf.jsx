import React from 'react';
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from '@react-pdf/renderer';

const C = {
  bg: '#0D1117', green: '#20C997', white: '#FFFFFF', text: '#111827',
  muted: '#6B7280', subtle: '#9CA3AF', border: '#E5E7EB',
};

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
  hdr: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, paddingBottom: 10, borderBottomWidth: 1.5, borderBottomColor: C.green },
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

  metricsStrip: { flexDirection: 'row', marginTop: 22, paddingTop: 14, borderTopWidth: 1, borderTopColor: C.border },
  metricItem: { marginRight: 30 },
  metricValue: { fontSize: 15, color: C.text, fontFamily: 'Helvetica-Bold' },
  metricLabel: { fontSize: 7.5, color: C.muted, fontFamily: 'Helvetica', marginTop: 2 },

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

function ContentPage({ data }) {
  return (
    <Page size="A4" style={s.page}>
      <Hdr clienteName={data.clienteName} />

      <Text style={s.label}>Resumen ejecutivo</Text>
      {data.resumenEjecutivo.split('\n\n').filter(Boolean).map((p, i) => <Text key={i} style={s.para}>{p}</Text>)}

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

      {data.valorEntregado.length > 0 && (
        <>
          <View style={s.divider} />
          <Text style={s.h1}>Valor entregado a {data.clienteName}</Text>
          {data.valorEntregado.map((v, i) => (
            <View key={i} style={s.bulletRow}>
              <Text style={s.bulletDot}>→</Text>
              <Text style={s.bulletText}>{v}</Text>
            </View>
          ))}
        </>
      )}

      {data.metrics && (
        <View style={s.metricsStrip} wrap={false}>
          <View style={s.metricItem}><Text style={s.metricValue}>{data.metrics.completadas}</Text><Text style={s.metricLabel}>Tareas completadas</Text></View>
          <View style={s.metricItem}><Text style={s.metricValue}>{data.metrics.total}</Text><Text style={s.metricLabel}>Tareas trabajadas</Text></View>
          <View style={s.metricItem}><Text style={s.metricValue}>{data.metrics.sprints}</Text><Text style={s.metricLabel}>Sprints incluidos</Text></View>
        </View>
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
