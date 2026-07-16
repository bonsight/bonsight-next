import React from 'react';
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from '@react-pdf/renderer';

const C = {
  bg: '#0D1117',
  green: '#20C997',
  white: '#FFFFFF',
  text: '#111827',
  muted: '#6B7280',
  subtle: '#9CA3AF',
  surface: '#F9FAFB',
  border: '#E5E7EB',
  dark: '#1F2937',
};

const s = StyleSheet.create({
  coverPage: { backgroundColor: C.bg, padding: 0 },
  coverBar: { position: 'absolute', top: 0, right: 0, bottom: 0, width: 5, backgroundColor: C.green },
  coverBody: { padding: '60 64 60 60', flex: 1, justifyContent: 'space-between', minHeight: '100%' },
  coverBrand: { fontSize: 10, color: C.green, letterSpacing: 3, fontFamily: 'Helvetica-Bold', marginBottom: 60 },
  coverTitle: { fontSize: 30, color: C.white, fontFamily: 'Helvetica-Bold', lineHeight: 1.25, marginBottom: 14 },
  coverDesc: { fontSize: 13, color: C.subtle, fontFamily: 'Helvetica', lineHeight: 1.5 },
  coverFooter: { borderTopWidth: 1, borderTopColor: C.dark, paddingTop: 20, flexDirection: 'row', justifyContent: 'space-between', marginTop: 60 },
  coverFooterText: { fontSize: 11, color: C.subtle, fontFamily: 'Helvetica' },
  coverFooterAccent: { fontSize: 11, color: C.green, fontFamily: 'Helvetica' },

  page: { padding: '44 52 60 52', fontFamily: 'Helvetica', backgroundColor: C.white },

  hdr: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28, paddingBottom: 10, borderBottomWidth: 1.5, borderBottomColor: C.green },
  hdrBrand: { fontSize: 9, color: C.green, fontFamily: 'Helvetica-Bold', letterSpacing: 2 },
  hdrClient: { fontSize: 8, color: C.muted, fontFamily: 'Helvetica' },

  label: { fontSize: 8, color: C.green, letterSpacing: 2.5, fontFamily: 'Helvetica-Bold', marginBottom: 5, textTransform: 'uppercase' },
  h1: { fontSize: 18, color: C.text, fontFamily: 'Helvetica-Bold', marginBottom: 14 },
  h2: { fontSize: 13, color: C.text, fontFamily: 'Helvetica-Bold', marginBottom: 10, marginTop: 20 },
  para: { fontSize: 10, color: '#374151', lineHeight: 1.65, fontFamily: 'Helvetica', marginBottom: 10 },

  bulletRow: { flexDirection: 'row', marginBottom: 5 },
  bulletDot: { fontSize: 10, color: C.green, width: 14, fontFamily: 'Helvetica-Bold' },
  bulletText: { fontSize: 10, color: '#374151', flex: 1, lineHeight: 1.55, fontFamily: 'Helvetica' },

  table: { width: '100%', marginBottom: 18 },
  tHead: { flexDirection: 'row', backgroundColor: C.bg, borderRadius: 3 },
  tHeadCell: { flex: 1, paddingTop: 7, paddingBottom: 7, paddingLeft: 9, paddingRight: 9, fontSize: 8.5, color: C.white, fontFamily: 'Helvetica-Bold' },
  tRow: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: C.border },
  tRowAlt: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: C.border, backgroundColor: C.surface },
  tCell: { flex: 1, paddingTop: 6, paddingBottom: 6, paddingLeft: 9, paddingRight: 9, fontSize: 9, color: '#374151', fontFamily: 'Helvetica', lineHeight: 1.4 },
  tCellBold: { flex: 1, paddingTop: 6, paddingBottom: 6, paddingLeft: 9, paddingRight: 9, fontSize: 9, color: C.text, fontFamily: 'Helvetica-Bold', lineHeight: 1.4 },

  eventCard: { marginBottom: 22, paddingLeft: 12, borderLeftWidth: 2.5, borderLeftColor: C.green },
  eventName: { fontSize: 12, color: C.text, fontFamily: 'Helvetica-Bold', marginBottom: 3 },
  eventTrigger: { fontSize: 8.5, color: C.muted, fontFamily: 'Helvetica', marginBottom: 6 },
  eventDesc: { fontSize: 9.5, color: '#374151', fontFamily: 'Helvetica', lineHeight: 1.5, marginBottom: 8 },

  paramTable: { backgroundColor: C.surface, borderRadius: 3, padding: '7 10', marginBottom: 6 },
  paramRow: { flexDirection: 'row', marginBottom: 3 },
  paramName: { fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: C.text, width: 130 },
  paramDesc: { fontSize: 8.5, fontFamily: 'Helvetica', color: '#374151', flex: 1, lineHeight: 1.4 },
  paramEx: { fontSize: 8, fontFamily: 'Helvetica-Oblique', color: C.muted, width: 80, textAlign: 'right' },

  checkRow: { flexDirection: 'row', marginBottom: 7, alignItems: 'flex-start' },
  checkBox: { width: 11, height: 11, borderWidth: 1, borderColor: C.green, borderRadius: 2, marginRight: 9, marginTop: 1 },
  checkText: { fontSize: 10, color: '#374151', flex: 1, lineHeight: 1.45, fontFamily: 'Helvetica' },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12 },
  chip: { backgroundColor: '#ECFDF5', borderRadius: 3, paddingTop: 3, paddingBottom: 3, paddingLeft: 8, paddingRight: 8, fontSize: 8.5, color: '#065F46', fontFamily: 'Helvetica-Bold', marginRight: 6, marginBottom: 5 },

  footer: { position: 'absolute', bottom: 28, left: 52, right: 52, flexDirection: 'row', justifyContent: 'space-between' },
  footerText: { fontSize: 7.5, color: C.subtle, fontFamily: 'Helvetica' },
  footerPage: { fontSize: 7.5, color: C.subtle, fontFamily: 'Helvetica' },
});

function Hdr({ client }) {
  return (
    <View style={s.hdr} fixed>
      <Text style={s.hdrBrand}>BONSIGHT · ARIA</Text>
      <Text style={s.hdrClient}>{[client?.name, client?.website].filter(Boolean).join('  ·  ')}</Text>
    </View>
  );
}

function Ftr({ title }) {
  return (
    <View style={s.footer} fixed>
      <Text style={s.footerText}>{title}</Text>
      <Text style={s.footerPage} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
    </View>
  );
}

function CoverPage({ data }) {
  const subtitle = data.client ? [data.client.name, data.client.industry].filter(Boolean).join(' · ') : '';
  return (
    <Page size="A4" style={s.coverPage}>
      <View style={s.coverBar} />
      <View style={s.coverBody}>
        <View>
          <Text style={s.coverBrand}>BONSIGHT · ARIA</Text>
          <Text style={s.coverTitle}>{data.title ?? 'Guía de Medición'}</Text>
          {subtitle ? <Text style={s.coverDesc}>{subtitle}</Text> : null}
          {data.executiveSummary ? (
            <Text style={{ ...s.coverDesc, marginTop: 20 }}>{data.executiveSummary.slice(0, 300)}</Text>
          ) : null}
        </View>
        <View style={s.coverFooter}>
          <View>
            {data.client?.name ? <Text style={s.coverFooterText}>{data.client.name}</Text> : null}
            {data.client?.website ? <Text style={s.coverFooterAccent}>{data.client.website}</Text> : null}
          </View>
          <Text style={s.coverFooterText}>
            {data.date ?? new Date().toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })}
          </Text>
        </View>
      </View>
    </Page>
  );
}

function SummaryPage({ data }) {
  return (
    <Page size="A4" style={s.page}>
      <Hdr client={data.client} />
      <Text style={s.label}>Resumen ejecutivo</Text>
      <Text style={s.h1}>Contexto del proyecto</Text>
      {data.executiveSummary ? <Text style={s.para}>{data.executiveSummary}</Text> : null}

      {data.businessObjectives?.length > 0 && (
        <View style={{ marginTop: 16 }}>
          <Text style={s.label}>Objetivos de negocio</Text>
          {data.businessObjectives.map((o, i) => (
            <View key={i} style={s.bulletRow}>
              <Text style={s.bulletDot}>→</Text>
              <Text style={s.bulletText}>{o}</Text>
            </View>
          ))}
        </View>
      )}

      {data.tools?.length > 0 && (
        <View style={{ marginTop: 20 }}>
          <Text style={s.label}>Herramientas de medición</Text>
          <View style={s.chipRow}>
            {data.tools.map((t, i) => <Text key={i} style={s.chip}>{t}</Text>)}
          </View>
        </View>
      )}
      <Ftr title={data.title ?? 'Guía de Medición'} />
    </Page>
  );
}

function EventsOverviewPage({ data }) {
  const events = data.events ?? [];
  if (!events.length) return null;
  return (
    <Page size="A4" style={s.page}>
      <Hdr client={data.client} />
      <Text style={s.label}>Plan de medición</Text>
      <Text style={s.h1}>Eventos GA4</Text>
      <View style={s.table}>
        <View style={s.tHead}>
          <Text style={{ ...s.tHeadCell, flex: 1.5 }}>Evento</Text>
          <Text style={{ ...s.tHeadCell, flex: 2 }}>Descripción</Text>
          <Text style={s.tHeadCell}>Trigger</Text>
        </View>
        {events.map((ev, i) => (
          <View key={i} style={i % 2 === 0 ? s.tRow : s.tRowAlt}>
            <Text style={{ ...s.tCellBold, flex: 1.5 }}>{ev.eventName}</Text>
            <Text style={{ ...s.tCell, flex: 2 }}>{ev.description}</Text>
            <Text style={s.tCell}>{ev.trigger}</Text>
          </View>
        ))}
      </View>
      <Ftr title={data.title ?? 'Guía de Medición'} />
    </Page>
  );
}

function EventDetailPages({ data }) {
  const events = (data.events ?? []).filter((e) => e.parameters?.length > 0);
  if (!events.length) return null;
  return events.map((ev, i) => (
    <Page key={i} size="A4" style={s.page}>
      <Hdr client={data.client} />
      <Text style={s.label}>Detalle de evento</Text>
      <View style={s.eventCard}>
        <Text style={s.eventName}>{ev.eventName}</Text>
        <Text style={s.eventTrigger}>Trigger: {ev.trigger}</Text>
        {ev.description ? <Text style={s.eventDesc}>{ev.description}</Text> : null}
      </View>
      <Text style={{ ...s.label, marginTop: 4, marginBottom: 10 }}>Parámetros</Text>
      <View style={s.table}>
        <View style={s.tHead}>
          <Text style={s.tHeadCell}>Parámetro</Text>
          <Text style={{ ...s.tHeadCell, flex: 2 }}>Descripción</Text>
          <Text style={s.tHeadCell}>Ejemplo</Text>
        </View>
        {ev.parameters.map((p, j) => (
          <View key={j} style={j % 2 === 0 ? s.tRow : s.tRowAlt}>
            <Text style={s.tCellBold}>{p.name}</Text>
            <Text style={{ ...s.tCell, flex: 2 }}>{p.description}</Text>
            <Text style={s.tCell}>{p.example ?? ''}</Text>
          </View>
        ))}
      </View>
      <Ftr title={data.title ?? 'Guía de Medición'} />
    </Page>
  ));
}

function DimensionsPage({ data }) {
  const dims = data.dimensions ?? [];
  if (!dims.length) return null;
  return (
    <Page size="A4" style={s.page}>
      <Hdr client={data.client} />
      <Text style={s.label}>Configuración</Text>
      <Text style={s.h1}>Dimensiones personalizadas</Text>
      <View style={s.table}>
        <View style={s.tHead}>
          <Text style={s.tHeadCell}>Dimensión</Text>
          <Text style={{ ...s.tHeadCell, flex: 2 }}>Descripción</Text>
          <Text style={s.tHeadCell}>Valores posibles</Text>
        </View>
        {dims.map((d, i) => (
          <View key={i} style={i % 2 === 0 ? s.tRow : s.tRowAlt}>
            <Text style={s.tCellBold}>{d.name}</Text>
            <Text style={{ ...s.tCell, flex: 2 }}>{d.description}</Text>
            <Text style={s.tCell}>{d.possibleValues ?? ''}</Text>
          </View>
        ))}
      </View>
      <Ftr title={data.title ?? 'Guía de Medición'} />
    </Page>
  );
}

function ImplementationPage({ data }) {
  const notes = data.implementationNotes ?? [];
  const qa = data.qaChecklist ?? [];
  if (!notes.length && !qa.length) return null;
  return (
    <Page size="A4" style={s.page}>
      <Hdr client={data.client} />
      {notes.length > 0 && (
        <View>
          <Text style={s.label}>Implementación</Text>
          <Text style={s.h1}>Notas técnicas</Text>
          {notes.map((n, i) => (
            <View key={i} style={s.bulletRow}>
              <Text style={s.bulletDot}>→</Text>
              <Text style={s.bulletText}>{n}</Text>
            </View>
          ))}
        </View>
      )}
      {qa.length > 0 && (
        <View style={{ marginTop: notes.length ? 28 : 0 }}>
          <Text style={s.label}>QA & Validación</Text>
          <Text style={s.h1}>Checklist de verificación</Text>
          {qa.map((item, i) => (
            <View key={i} style={s.checkRow}>
              <View style={s.checkBox} />
              <Text style={s.checkText}>{item}</Text>
            </View>
          ))}
        </View>
      )}
      <Ftr title={data.title ?? 'Guía de Medición'} />
    </Page>
  );
}

function MeasurementGuide({ data }) {
  return (
    <Document title={data.title} author="Bonsight · Aria">
      <CoverPage data={data} />
      <SummaryPage data={data} />
      <EventsOverviewPage data={data} />
      <EventDetailPages data={data} />
      <DimensionsPage data={data} />
      <ImplementationPage data={data} />
    </Document>
  );
}

export async function generateMeasurementPDF(data) {
  return renderToBuffer(<MeasurementGuide data={data} />);
}
