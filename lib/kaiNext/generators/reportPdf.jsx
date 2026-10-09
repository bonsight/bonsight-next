import React from 'react';
import { Document, Page, Text, View, Svg, Path, Circle, StyleSheet, renderToBuffer } from '@react-pdf/renderer';

// Mismo patrón que lib/aria/generators/pdf.jsx (CoverPage + ContentPages, Hdr/Ftr fijos) pero
// para el contrato genérico de bloques de Kai Next (components[]: kpi_grid/insight_banner/
// chart/data_table/pinned_card — el mismo shape que ya arma present_analysis, ver
// lib/kaiNext/tools/presentAnalysis.js) en vez del schema fijo de "guía de medición" de Aria.
const C = {
  deep: '#085041',
  primary: '#3F9461',
  soft: '#A8D7BB',
  softBg: '#E8F4EE',
  text: '#0B1020',
  muted: '#6B7A74',
  border: '#E2E9E5',
  white: '#FFFFFF',
  danger: '#8A2E25',
  dangerBg: '#FBE9E7',
};

const s = StyleSheet.create({
  coverPage: { backgroundColor: C.deep, padding: 0 },
  coverBar: { position: 'absolute', top: 0, right: 0, bottom: 0, width: 5, backgroundColor: C.primary },
  coverBody: { padding: '60 64 60 60', flex: 1, justifyContent: 'space-between', minHeight: '100%' },
  coverBrand: { fontSize: 10, color: C.soft, letterSpacing: 3, fontFamily: 'Helvetica-Bold', marginBottom: 60 },
  coverTitle: { fontSize: 28, color: C.white, fontFamily: 'Helvetica-Bold', lineHeight: 1.25, marginBottom: 14 },
  coverDesc: { fontSize: 12.5, color: C.soft, fontFamily: 'Helvetica', lineHeight: 1.55 },
  coverFooter: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.15)', paddingTop: 20, flexDirection: 'row', justifyContent: 'space-between', marginTop: 60 },
  coverFooterText: { fontSize: 11, color: C.soft, fontFamily: 'Helvetica' },

  page: { padding: '40 48 56 48', fontFamily: 'Helvetica', backgroundColor: C.white },
  hdr: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22, paddingBottom: 9, borderBottomWidth: 1.5, borderBottomColor: C.primary },
  hdrBrand: { fontSize: 9, color: C.deep, fontFamily: 'Helvetica-Bold', letterSpacing: 2 },
  hdrTitle: { fontSize: 8, color: C.muted, fontFamily: 'Helvetica' },
  footer: { position: 'absolute', bottom: 26, left: 48, right: 48, flexDirection: 'row', justifyContent: 'space-between' },
  footerText: { fontSize: 7.5, color: C.muted, fontFamily: 'Helvetica' },

  block: { marginBottom: 18 },
  blockTitle: { fontSize: 12.5, color: C.text, fontFamily: 'Helvetica-Bold', marginBottom: 8 },
  summary: { fontSize: 10.5, color: '#374151', lineHeight: 1.6, marginBottom: 18 },
  source: { fontSize: 8.5, color: C.muted, fontFamily: 'Helvetica', marginBottom: 20 },

  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 18 },
  kpiCard: { width: '25%', paddingRight: 10, marginBottom: 10 },
  kpiLabel: { fontSize: 8, color: C.muted, marginBottom: 2 },
  kpiValue: { fontSize: 15, color: C.text, fontFamily: 'Helvetica-Bold' },
  kpiChange: { fontSize: 8, color: C.primary, marginTop: 1 },
  kpiChangeDown: { fontSize: 8, color: C.danger, marginTop: 1 },

  insight: { flexDirection: 'row', marginBottom: 9, paddingLeft: 10, borderLeftWidth: 2.5 },
  insightCritical: { borderLeftColor: C.danger },
  insightSuccess: { borderLeftColor: C.primary },
  insightNeutral: { borderLeftColor: C.border },
  insightTag: { fontSize: 7, fontFamily: 'Helvetica-Bold', width: 60 },
  insightText: { fontSize: 9.5, color: '#374151', flex: 1, lineHeight: 1.5 },

  table: { width: '100%', marginBottom: 6 },
  tHead: { flexDirection: 'row', backgroundColor: C.deep },
  tHeadCell: { flex: 1, padding: '6 8', fontSize: 8, color: C.white, fontFamily: 'Helvetica-Bold' },
  tRow: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: C.border },
  tRowAlt: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: C.border, backgroundColor: C.softBg },
  tCell: { flex: 1, padding: '5 8', fontSize: 8.5, color: '#374151' },

  pinned: { borderWidth: 1, borderColor: C.border, borderRadius: 4, padding: 10, backgroundColor: '#F5F8F6' },
  pinnedTitle: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: C.text, marginBottom: 4 },
  pinnedDesc: { fontSize: 9, color: C.muted, lineHeight: 1.5 },
});

const SEVERITY_LABEL = { critical: 'Atención', warning: 'Atención', success: 'Oportunidad', neutral: 'Contexto' };
const SEVERITY_STYLE = { critical: s.insightCritical, warning: s.insightCritical, success: s.insightSuccess, neutral: s.insightNeutral };

function Hdr({ title }) {
  return (
    <View style={s.hdr} fixed>
      <Text style={s.hdrBrand}>BONSIGHT · KAI</Text>
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

function CoverPage({ data }) {
  return (
    <Page size="A4" style={s.coverPage}>
      <View style={s.coverBar} />
      <View style={s.coverBody}>
        <View>
          <Text style={s.coverBrand}>BONSIGHT · KAI</Text>
          <Text style={s.coverTitle}>{data.title ?? 'Análisis'}</Text>
          {data.summary ? <Text style={s.coverDesc}>{data.summary.slice(0, 400)}</Text> : null}
        </View>
        <View style={s.coverFooter}>
          <Text style={s.coverFooterText}>{data.client?.name ?? ''}</Text>
          <Text style={s.coverFooterText}>{data.date ?? new Date().toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' })}</Text>
        </View>
      </View>
    </Page>
  );
}

function KpiGridBlock({ block }) {
  const items = Array.isArray(block.data) ? block.data : [];
  if (!items.length) return null;
  return (
    <View style={s.block}>
      {block.title ? <Text style={s.blockTitle}>{block.title}</Text> : null}
      <View style={s.kpiGrid}>
        {items.map((k, i) => (
          <View key={i} style={s.kpiCard}>
            <Text style={s.kpiLabel}>{k.label}</Text>
            <Text style={s.kpiValue}>{String(k.value)}</Text>
            {k.note ? <Text style={s.kpiChange}>{k.note}</Text> : k.change ? (
              <Text style={k.trend === 'down' ? s.kpiChangeDown : s.kpiChange}>
                {k.trend === 'up' ? '↑' : k.trend === 'down' ? '↓' : '→'} {k.change}
              </Text>
            ) : null}
          </View>
        ))}
      </View>
    </View>
  );
}

function InsightGroupBlock({ items }) {
  return (
    <View style={s.block}>
      <Text style={s.blockTitle}>Lectura de Kai</Text>
      {items.map((b, i) => (
        <View key={i} style={{ ...s.insight, ...(SEVERITY_STYLE[b.severity] ?? s.insightNeutral) }}>
          <Text style={s.insightTag}>{(SEVERITY_LABEL[b.severity] ?? 'Contexto').toUpperCase()}</Text>
          <Text style={s.insightText}>{b.description || b.title}</Text>
        </View>
      ))}
    </View>
  );
}

// Reusa la misma matemática de escalas que KaiNextAnalysisView.jsx (xScale/yScale/buildPath)
// para que el PDF dibuje la misma curva que ya se ve en pantalla — un solo cálculo, dos salidas.
function LineChartBlock({ block }) {
  const series = block.data?.series;
  if (!Array.isArray(series) || !series.length) return null;
  const WIDTH = 480, HEIGHT = 130, PAD = 10;
  const values = series.map((d) => d.value);
  const minValue = Math.min(0, ...values);
  const maxValue = Math.max(1, ...values);
  const lastIdx = Math.max(series.length - 1, 1);
  const innerW = WIDTH - PAD * 2;
  const innerH = HEIGHT - PAD * 2;
  const xScale = (i) => PAD + (i / lastIdx) * innerW;
  const yScale = (v) => PAD + innerH - ((v - minValue) / (maxValue - minValue || 1)) * innerH;
  const d = values.map((v, i) => `${i === 0 ? 'M' : 'L'} ${xScale(i)} ${yScale(v)}`).join(' ');
  const annotations = Array.isArray(block.data?.annotations) ? block.data.annotations : [];
  return (
    <View style={s.block}>
      {block.title ? <Text style={s.blockTitle}>{block.title}</Text> : null}
      <Svg width={WIDTH} height={HEIGHT}>
        <Path d={d} stroke={C.deep} strokeWidth={2} fill="none" />
        {annotations.map((a, i) => series[a.index] && (
          <Circle key={i} cx={xScale(a.index)} cy={yScale(series[a.index].value)} r={4} fill={C.text} />
        ))}
      </Svg>
      {annotations.map((a, i) => (
        <Text key={i} style={{ fontSize: 8, color: C.muted, marginTop: 4 }}>{a.note}{a.source ? ` · ${a.source}` : ''}</Text>
      ))}
    </View>
  );
}

function BarChartBlock({ block }) {
  const series = block.data?.series;
  if (!Array.isArray(series) || !series.length) return null;
  const maxValue = Math.max(1, ...series.map((d) => d.value));
  return (
    <View style={s.block}>
      {block.title ? <Text style={s.blockTitle}>{block.title}</Text> : null}
      {series.map((d, i) => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 5 }}>
          <Text style={{ width: 90, fontSize: 8, color: C.muted }}>{d.label}</Text>
          <View style={{ flex: 1, height: 7, backgroundColor: '#F5F8F6', borderRadius: 3 }}>
            <View style={{ width: `${(d.value / maxValue) * 100}%`, height: 7, backgroundColor: d.tone === 'alt' ? C.deep : C.primary, borderRadius: 3 }} />
          </View>
          <Text style={{ width: 50, fontSize: 8, color: C.text, textAlign: 'right', fontFamily: 'Helvetica-Bold' }}>{String(d.value)}</Text>
        </View>
      ))}
    </View>
  );
}

function DataTableBlock({ block }) {
  const { columns, rows } = block;
  if (!Array.isArray(columns) || !columns.length || !Array.isArray(rows)) return null;
  return (
    <View style={s.block} wrap={false}>
      {block.title ? <Text style={s.blockTitle}>{block.title}</Text> : null}
      <View style={s.table}>
        <View style={s.tHead}>
          {columns.map((c) => <Text key={c.key} style={s.tHeadCell}>{c.label}</Text>)}
        </View>
        {rows.map((row, i) => (
          <View key={i} style={i % 2 === 0 ? s.tRow : s.tRowAlt}>
            {columns.map((c) => (
              <Text key={c.key} style={s.tCell}>
                {String(row[c.key] ?? '—')}{row._flag ? ` · ${row._flag.label}` : ''}
              </Text>
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}

function PinnedCardBlock({ block }) {
  if (!block.title && !block.description) return null;
  return (
    <View style={s.block}>
      <View style={s.pinned}>
        {block.title ? <Text style={s.pinnedTitle}>{block.title}</Text> : null}
        {block.description ? <Text style={s.pinnedDesc}>{block.description}</Text> : null}
      </View>
    </View>
  );
}

function renderBlock(block, key) {
  if (block.type === 'kpi_grid') return <KpiGridBlock key={key} block={block} />;
  if (block.type === 'chart') return block.chart_type === 'bar' ? <BarChartBlock key={key} block={block} /> : <LineChartBlock key={key} block={block} />;
  if (block.type === 'data_table') return <DataTableBlock key={key} block={block} />;
  if (block.type === 'pinned_card') return <PinnedCardBlock key={key} block={block} />;
  return null;
}

function ContentPage({ data }) {
  const blocks = data.components ?? [];
  const grouped = [];
  let i = 0;
  while (i < blocks.length) {
    if (blocks[i].type === 'insight_banner') {
      const group = [];
      while (i < blocks.length && blocks[i].type === 'insight_banner') { group.push(blocks[i]); i += 1; }
      grouped.push({ kind: 'lectura', items: group });
    } else {
      grouped.push({ kind: 'block', block: blocks[i] });
      i += 1;
    }
  }

  return (
    <Page size="A4" style={s.page}>
      <Hdr title={data.title ?? 'Análisis'} />
      {data.summary ? <Text style={s.summary}>{data.summary}</Text> : null}
      {data.data_source?.provider ? (
        <Text style={s.source}>
          {data.data_source.provider}{data.data_source.dataset ? ` · ${data.data_source.dataset}` : ''}
        </Text>
      ) : null}
      {grouped.map((g, i) => (g.kind === 'lectura'
        ? <InsightGroupBlock key={i} items={g.items} />
        : renderBlock(g.block, i)))}
      <Ftr />
    </Page>
  );
}

function KaiReport({ data }) {
  return (
    <Document title={data.title ?? 'Análisis'} author="Bonsight · Kai">
      <CoverPage data={data} />
      <ContentPage data={data} />
    </Document>
  );
}

export async function generateKaiReportPDF(data) {
  return renderToBuffer(<KaiReport data={data} />);
}
