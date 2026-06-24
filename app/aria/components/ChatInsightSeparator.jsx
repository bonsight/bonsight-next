const SEP_CFG = {
  riesgo:        { icon: '⚠️', label: 'Riesgo identificado',       color: '#EF4444' },
  hallazgo:      { icon: '💡', label: 'Hallazgo detectado',        color: '#3B82F6' },
  recomendacion: { icon: '🎯', label: 'Recomendación prioritaria', color: '#8B5CF6' },
  oportunidad:   { icon: '🚀', label: 'Oportunidad detectada',     color: '#10B981' },
  analisis:      { icon: '📊', label: 'Análisis generado',         color: '#6B7280' },
};

export default function ChatInsightSeparator({ type = 'analisis' }) {
  const { icon, label, color } = SEP_CFG[type] ?? SEP_CFG.analisis;
  return (
    <div className="aria-chat-sep">
      <div className="aria-chat-sep-line" style={{ background: color }} />
      <span className="aria-chat-sep-label" style={{ color, borderColor: `${color}33` }}>
        {icon} {label}
      </span>
      <div className="aria-chat-sep-line" style={{ background: color }} />
    </div>
  );
}
