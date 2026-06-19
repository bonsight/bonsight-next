export default function InfoCard3Col({ data }) {
  const { known = [], toDiscover = [], nextStep = '' } = data;

  return (
    <div className="kai-info-card">
      <div className="kai-info-col">
        <div className="kai-info-col-header">
          <span>📋</span>
          <span>LO QUE SÉ</span>
        </div>
        <ul className="kai-info-list">
          {known.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      </div>

      <div className="kai-info-divider" />

      <div className="kai-info-col">
        <div className="kai-info-col-header">
          <span>❓</span>
          <span>LO QUE NECESITO DESCUBRIR</span>
        </div>
        <ol className="kai-info-list kai-info-list-numbered">
          {toDiscover.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ol>
      </div>

      <div className="kai-info-divider" />

      <div className="kai-info-col">
        <div className="kai-info-col-header">
          <span>🏁</span>
          <span>PRÓXIMO PASO</span>
        </div>
        <p className="kai-info-next-step">{nextStep}</p>
      </div>
    </div>
  );
}
