import React from 'react';
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from '@react-pdf/renderer';

// Port directo de lib/aria/generators/workshopCanvas.jsx — misma estructura (portada +
// una página por pregunta, con sus grupos e iniciativas) con la paleta de Kai Next en vez
// de la de Aria (ver lib/kaiNext/generators/reportPdf.jsx para los mismos tokens deep/primary).
const C = {
  deep: '#085041',
  primary: '#3F9461',
  soft: '#A8D7BB',
  white: '#FFFFFF',
  text: '#111827',
  muted: '#6B7A74',
  dark: '#1F2937',
};

const s = StyleSheet.create({
  coverPage: { backgroundColor: C.deep, padding: 0 },
  coverBar: { position: 'absolute', top: 0, right: 0, bottom: 0, width: 5, backgroundColor: C.primary },
  coverBody: { padding: '60 64 60 60', flex: 1, justifyContent: 'space-between', minHeight: '100%' },
  coverBrand: { fontSize: 10, color: C.soft, letterSpacing: 3, fontFamily: 'Helvetica-Bold', marginBottom: 60 },
  coverTitle: { fontSize: 28, color: C.white, fontFamily: 'Helvetica-Bold', lineHeight: 1.25, marginBottom: 14 },
  coverDesc: { fontSize: 12.5, color: C.soft, fontFamily: 'Helvetica', lineHeight: 1.5 },
  coverStats: { flexDirection: 'row', marginTop: 30 },
  coverStat: { marginRight: 30 },
  coverStatNum: { fontSize: 22, color: C.white, fontFamily: 'Helvetica-Bold' },
  coverStatLabel: { fontSize: 9, color: C.soft, fontFamily: 'Helvetica', marginTop: 2 },
  coverFooter: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.15)', paddingTop: 20, marginTop: 60 },
  coverFooterText: { fontSize: 11, color: C.soft, fontFamily: 'Helvetica' },

  page: { padding: '44 52 60 52', fontFamily: 'Helvetica', backgroundColor: C.white },
  hdr: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, paddingBottom: 10, borderBottomWidth: 1.5, borderBottomColor: C.primary },
  hdrBrand: { fontSize: 9, color: C.deep, fontFamily: 'Helvetica-Bold', letterSpacing: 2 },
  hdrClient: { fontSize: 8, color: C.muted, fontFamily: 'Helvetica' },

  label: { fontSize: 8, color: C.deep, letterSpacing: 2.5, fontFamily: 'Helvetica-Bold', marginBottom: 5, textTransform: 'uppercase' },
  questionTitle: { fontSize: 15, color: C.text, fontFamily: 'Helvetica-Bold', marginBottom: 16, marginTop: 6 },

  groupCard: { marginBottom: 18, paddingLeft: 12, borderLeftWidth: 2.5, borderLeftColor: C.primary },
  groupName: { fontSize: 12, color: C.text, fontFamily: 'Helvetica-Bold', marginBottom: 4 },
  groupMeta: { fontSize: 8.5, color: C.muted, fontFamily: 'Helvetica', marginBottom: 6 },
  groupConsolidated: { fontSize: 9.5, color: '#374151', fontFamily: 'Helvetica-Oblique', lineHeight: 1.5, marginBottom: 8 },

  itemRow: { flexDirection: 'row', marginBottom: 4 },
  itemDot: { fontSize: 9, color: C.primary, width: 12, fontFamily: 'Helvetica-Bold' },
  itemText: { fontSize: 9.5, color: '#374151', flex: 1, lineHeight: 1.5, fontFamily: 'Helvetica' },
  itemParticipant: { fontFamily: 'Helvetica-Bold', color: C.text },

  fichaBox: { marginTop: 6, padding: 8, backgroundColor: '#F5F8F6', borderRadius: 3 },
  fichaLabel: { fontSize: 7.5, color: C.deep, fontFamily: 'Helvetica-Bold', letterSpacing: 1.5, marginBottom: 4, textTransform: 'uppercase' },
  fichaField: { fontSize: 9, color: '#374151', marginBottom: 3, lineHeight: 1.4 },
  fichaFieldLabel: { fontFamily: 'Helvetica-Bold', color: C.text },

  footer: { position: 'absolute', bottom: 28, left: 52, right: 52, flexDirection: 'row', justifyContent: 'space-between' },
  footerText: { fontSize: 7.5, color: C.muted, fontFamily: 'Helvetica' },
});

const FICHA_FIELDS = [
  { key: 'objetivo', label: 'Objetivo' },
  { key: 'problema', label: 'Problema' },
  { key: 'prioridad', label: 'Prioridad' },
  { key: 'exito', label: 'Éxito' },
  { key: 'restricciones', label: 'Restricciones' },
];

function Hdr({ title }) {
  return (
    <View style={s.hdr} fixed>
      <Text style={s.hdrBrand}>BONSIGHT · KAI</Text>
      <Text style={s.hdrClient}>{title}</Text>
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
  const stats = [
    { label: 'Iniciativas', value: data.summary?.totalItems },
    { label: 'Grupos', value: data.summary?.groupCount },
    { label: 'Participantes', value: data.summary?.participantCount },
    { label: 'Preguntas', value: data.summary?.questionCount },
  ].filter((st) => st.value != null);

  return (
    <Page size="A4" style={s.coverPage}>
      <View style={s.coverBar} />
      <View style={s.coverBody}>
        <View>
          <Text style={s.coverBrand}>BONSIGHT · KAI</Text>
          <Text style={s.coverTitle}>{data.title ?? 'Activity'}</Text>
          <Text style={s.coverDesc}>Consolidado de iniciativas</Text>
          {stats.length > 0 && (
            <View style={s.coverStats}>
              {stats.map((st, i) => (
                <View key={i} style={s.coverStat}>
                  <Text style={s.coverStatNum}>{st.value}</Text>
                  <Text style={s.coverStatLabel}>{st.label}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
        <View style={s.coverFooter}>
          <Text style={s.coverFooterText}>{data.date ?? ''}</Text>
        </View>
      </View>
    </Page>
  );
}

function QuestionPage({ data, question, index }) {
  return (
    <Page size="A4" style={s.page}>
      <Hdr title={data.title} />
      <Text style={s.label}>Pregunta {index + 1}</Text>
      <Text style={s.questionTitle}>{question.questionText}</Text>
      {(question.groups ?? []).map((g, gi) => (
        <View key={gi} style={s.groupCard} wrap={false}>
          <Text style={s.groupName}>{g.name}</Text>
          {(g.area || g.responsable) ? (
            <Text style={s.groupMeta}>
              {g.area ? `Categoría: ${g.area}` : ''}{g.area && g.responsable ? ' · ' : ''}{g.responsable ? `Responsable: ${g.responsable}` : ''}
            </Text>
          ) : null}
          {g.consolidatedText ? <Text style={s.groupConsolidated}>{g.consolidatedText}</Text> : null}
          {(g.items ?? []).map((it, ii) => (
            <View key={ii} style={s.itemRow}>
              <Text style={s.itemDot}>—</Text>
              <Text style={s.itemText}>
                <Text style={s.itemParticipant}>{it.participant}: </Text>
                {it.text}
              </Text>
            </View>
          ))}
          {g.ficha ? (
            <View style={s.fichaBox}>
              <Text style={s.fichaLabel}>Ficha consolidada{g.ficha.participantCount ? ` · ${g.ficha.participantCount} respuestas` : ''}</Text>
              {FICHA_FIELDS.map((f) => g.ficha[f.key] ? (
                <Text key={f.key} style={s.fichaField}>
                  <Text style={s.fichaFieldLabel}>{f.label}: </Text>
                  {g.ficha[f.key]}
                </Text>
              ) : null)}
            </View>
          ) : null}
        </View>
      ))}
      <Ftr title={data.title ?? 'Activity'} />
    </Page>
  );
}

function WorkshopCanvasDoc({ data }) {
  const questions = data.questions ?? [];
  return (
    <Document title={data.title} author="Bonsight · Kai">
      <CoverPage data={data} />
      {questions.map((q, i) => (
        <QuestionPage key={i} data={data} question={q} index={i} />
      ))}
    </Document>
  );
}

export async function generateActivityCanvasPDF(data) {
  return renderToBuffer(<WorkshopCanvasDoc data={data} />);
}
