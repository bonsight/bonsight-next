export default function TransferCard() {
  return (
    <div className="kai-transfer-card">
      <span className="kai-transfer-icon">⟲</span>
      <p className="kai-transfer-text">
        Voy a pedirle a Aria que revise los datos para validar estas hipótesis.
        Te avisaré en cuanto tenga los insights.
      </p>
      <a href="/aria" className="kai-transfer-btn">
        Transferir análisis a Aria →
      </a>
    </div>
  );
}
