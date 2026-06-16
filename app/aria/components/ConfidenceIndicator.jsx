export default function ConfidenceIndicator({ confidence }) {
  if (!confidence) return null;

  const { level, label, basis, percentage } = confidence;
  const badgeClass = `aria-badge aria-badge-${(label || '').toLowerCase()}`;
  const pct = percentage ?? (level || 0) * 20;

  return (
    <div className="aria-card aria-confidence">
      <div className="aria-confidence-header">
        <p className="aria-card-title">Confianza</p>
        <div className="aria-confidence-score">
          <span className={badgeClass}>{label} · {pct}%</span>
          <div className="aria-confidence-bar">
            <div className="aria-confidence-bar-fill" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>
      {basis && <p className="aria-confidence-basis">{basis}</p>}
    </div>
  );
}
