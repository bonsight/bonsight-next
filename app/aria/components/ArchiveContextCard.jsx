'use client';

const RELEVANCE_LABEL = {
  high:   'Alta coincidencia',
  medium: 'Media coincidencia',
  low:    'Coincidencia encontrada',
};

export default function ArchiveContextCard({ match, onAccept, onIgnore, loading }) {
  const relevanceLabel = RELEVANCE_LABEL[match.relevance ?? 'low'];

  return (
    <div className="aria-archive-card">
      <div className="aria-archive-card-hdr">
        <span className="aria-archive-card-icon">📚</span>
        <span className="aria-archive-card-label">Memoria encontrada</span>
        <span className="aria-archive-card-relevance">{relevanceLabel}</span>
      </div>

      {match.entities?.length > 0 && (
        <div className="aria-archive-card-match">
          <span className="aria-archive-card-match-label">Coincidencia:</span>
          {match.entities.slice(0, 3).map((e) => (
            <span key={e} className="aria-archive-card-match-entity">{e}</span>
          ))}
        </div>
      )}

      <div className="aria-archive-card-body">
        <p className="aria-archive-card-title">
          {match.emoji} {match.title}
        </p>
        <p className="aria-archive-card-meta">{match.area} · {match.date}</p>
        {match.summary && (
          <p className="aria-archive-card-summary">{match.summary}</p>
        )}
        {match.tags?.length > 0 && (
          <div className="aria-archive-card-tags">
            {match.tags.slice(0, 5).map((tag) => (
              <span key={tag} className="aria-archive-card-tag">{tag}</span>
            ))}
          </div>
        )}
      </div>

      <div className="aria-archive-card-actions">
        <button
          className="aria-archive-btn aria-archive-btn--accept"
          onClick={() => onAccept(match)}
          disabled={loading}
        >
          Usar contexto
        </button>
        <button
          className="aria-archive-btn aria-archive-btn--ignore"
          onClick={onIgnore}
          disabled={loading}
        >
          Ignorar
        </button>
      </div>
    </div>
  );
}
