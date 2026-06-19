export default function HypothesisGrid({ data }) {
  const { hypotheses = [] } = data;

  return (
    <div className="kai-hypothesis-wrap">
      <div className="kai-hypothesis-label">HIPÓTESIS INICIALES</div>
      <div className="kai-hypothesis-grid">
        {hypotheses.map((h) => (
          <div key={h.number} className="kai-hypothesis-card">
            <div className="kai-hypothesis-header">
              <span className="kai-hypothesis-icon">{h.icon}</span>
              <span className="kai-hypothesis-title">
                {h.number}. {h.title}
              </span>
            </div>
            <p className="kai-hypothesis-desc">{h.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
