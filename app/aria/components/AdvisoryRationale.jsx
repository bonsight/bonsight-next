export default function AdvisoryRationale({ justification, immediatePlan }) {
  if (!justification && !immediatePlan) return null;

  return (
    <div className="aria-card aria-advisory-rationale">
      {justification && (
        <div className="aria-advisory-block">
          <p className="aria-card-title">Justificación</p>
          <p className="aria-advisory-text">{justification}</p>
        </div>
      )}
      {immediatePlan && (
        <div className="aria-advisory-block aria-advisory-plan">
          <p className="aria-card-title">Próximo paso</p>
          <p className="aria-advisory-text">{immediatePlan}</p>
        </div>
      )}
    </div>
  );
}
