export default function FollowUpChips({ followUps, onSelect, disabled }) {
  if (!Array.isArray(followUps) || followUps.length === 0) return null;

  return (
    <div className="aria-followups-section">
      <p className="aria-card-title">Próximas investigaciones</p>
      <div className="aria-followups">
        {followUps.map((item, i) => (
          <button
            key={i}
            type="button"
            className="aria-chip"
            onClick={() => onSelect?.(item.prompt)}
            disabled={disabled}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}
