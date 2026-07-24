import React from 'react';
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from '@react-pdf/renderer';

const C = { purple: '#7C3AED', text: '#111827', muted: '#6B7280', subtle: '#9CA3AF', dark: '#1F2937' };

const s = StyleSheet.create({
  page: { padding: '48 52 60 52', fontFamily: 'Helvetica', backgroundColor: '#FFFFFF' },
  hdr: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, paddingBottom: 10, borderBottomWidth: 1.5, borderBottomColor: C.purple },
  hdrBrand: { fontSize: 9, color: C.purple, fontFamily: 'Helvetica-Bold', letterSpacing: 2 },
  hdrMeta: { fontSize: 8, color: C.muted, fontFamily: 'Helvetica' },

  title: { fontSize: 20, color: C.text, fontFamily: 'Helvetica-Bold', marginBottom: 14 },

  metaBlock: { marginBottom: 22, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  metaRow: { flexDirection: 'row', marginBottom: 6 },
  metaLabel: { fontSize: 7.5, color: C.muted, letterSpacing: 1, fontFamily: 'Helvetica-Bold', textTransform: 'uppercase', width: 120 },
  metaValue: { fontSize: 9.5, color: C.text, fontFamily: 'Helvetica', flex: 1 },
  participantItem: { flexDirection: 'row', marginBottom: 3 },
  participantDot: { fontSize: 9, color: C.purple, width: 10, fontFamily: 'Helvetica-Bold' },
  participantName: { fontSize: 9.5, color: C.text, fontFamily: 'Helvetica' },

  section: { marginBottom: 18, paddingLeft: 12, borderLeftWidth: 2.5, borderLeftColor: C.purple },
  sectionLabel: { fontSize: 8, color: C.purple, letterSpacing: 2, fontFamily: 'Helvetica-Bold', textTransform: 'uppercase', marginBottom: 6 },
  sectionText: { fontSize: 10.5, color: C.text, lineHeight: 1.6, fontFamily: 'Helvetica' },

  footer: { position: 'absolute', bottom: 28, left: 52, right: 52, flexDirection: 'row', justifyContent: 'space-between' },
  footerText: { fontSize: 7.5, color: C.subtle, fontFamily: 'Helvetica' },
});

const FIELDS = [
  { key: 'objetivo', label: 'Objetivo' },
  { key: 'problema', label: 'Problema / situación actual' },
  { key: 'prioridad', label: 'Por qué es prioritario ahora' },
  { key: 'exito', label: 'Cómo se ve el éxito' },
  { key: 'restricciones', label: 'Restricciones y condiciones' },
];

function FichaDoc({ data }) {
  return (
    <Document title={data.title} author="Bonsight · Aria">
      <Page size="A4" style={s.page}>
        <View style={s.hdr} fixed>
          <Text style={s.hdrBrand}>BONSIGHT · ARIA</Text>
          <Text style={s.hdrMeta}>{data.date ?? ''}</Text>
        </View>
        <Text style={s.title}>{data.title}</Text>
        <View style={s.metaBlock}>
          {data.subtitle && (
            <View style={s.metaRow}>
              <Text style={s.metaLabel}>Nombre actividad</Text>
              <Text style={s.metaValue}>{data.subtitle}</Text>
            </View>
          )}
          {data.date && (
            <View style={s.metaRow}>
              <Text style={s.metaLabel}>Fecha realizada</Text>
              <Text style={s.metaValue}>{data.date}</Text>
            </View>
          )}
          {data.participantNames?.length > 0 ? (
            <View style={s.metaRow}>
              <Text style={s.metaLabel}>Participantes</Text>
              <View style={{ flex: 1 }}>
                {data.participantNames.map((name, i) => (
                  <View key={i} style={s.participantItem}>
                    <Text style={s.participantDot}>—</Text>
                    <Text style={s.participantName}>{name}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : data.participantCount ? (
            <View style={s.metaRow}>
              <Text style={s.metaLabel}>Participantes</Text>
              <Text style={s.metaValue}>{data.participantCount}</Text>
            </View>
          ) : null}
        </View>
        {FIELDS.map((f) => (
          <View key={f.key} style={s.section} wrap={false}>
            <Text style={s.sectionLabel}>{f.label}</Text>
            <Text style={s.sectionText}>{data.ficha?.[f.key] || '—'}</Text>
          </View>
        ))}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>{data.title ?? 'Ficha'}</Text>
          <Text style={s.footerText} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}

export async function generateFichaPDF(data) {
  return renderToBuffer(<FichaDoc data={data} />);
}
