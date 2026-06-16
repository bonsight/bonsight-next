const ICONS = {
  'trend-up': (
    <>
      <polyline points="3 17 9 11 13 15 21 7" />
      <polyline points="15 7 21 7 21 13" />
    </>
  ),
  'trend-down': (
    <>
      <polyline points="3 7 9 13 13 9 21 17" />
      <polyline points="15 17 21 17 21 11" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
    </>
  ),
  'bar-chart': (
    <>
      <rect x="4" y="12" width="3" height="8" fill="currentColor" stroke="none" />
      <rect x="10.5" y="6" width="3" height="14" fill="currentColor" stroke="none" />
      <rect x="17" y="9" width="3" height="11" fill="currentColor" stroke="none" />
    </>
  ),
  alert: (
    <>
      <path d="M12 3 L22 20 L2 20 Z" />
      <line x1="12" y1="9" x2="12" y2="14" />
      <circle cx="12" cy="17" r="0.6" fill="currentColor" stroke="none" />
    </>
  ),
  lightbulb: (
    <>
      <path d="M12 2a6 6 0 0 0-4 10.5c.6.5 1 1.2 1 2v.5h6v-.5c0-.8.4-1.5 1-2A6 6 0 0 0 12 2z" />
      <line x1="9.5" y1="18" x2="14.5" y2="18" />
      <line x1="10" y1="21" x2="14" y2="21" />
    </>
  ),
};

function InsightIcon({ icon }) {
  return (
    <svg
      className="aria-insight-icon"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {ICONS[icon] || ICONS['bar-chart']}
    </svg>
  );
}

function groupByCategory(insights) {
  const groups = [];
  const indexByCategory = new Map();

  for (const insight of insights) {
    if (!insight.category) return null;

    let group = indexByCategory.get(insight.category);
    if (!group) {
      group = { category: insight.category, items: [] };
      indexByCategory.set(insight.category, group);
      groups.push(group);
    }
    group.items.push(insight);
  }

  return groups;
}

function InsightItems({ items }) {
  return (
    <ul className="aria-insights-list">
      {items.map((insight, i) => (
        <li key={i} className="aria-insight-item">
          <InsightIcon icon={insight.icon} />
          <span>{insight.text}</span>
        </li>
      ))}
    </ul>
  );
}

export default function InsightsList({ insights }) {
  if (!Array.isArray(insights) || insights.length === 0) return null;

  const groups = groupByCategory(insights);

  if (!groups) {
    return (
      <div className="aria-card aria-insights">
        <p className="aria-card-title">Aria detectó</p>
        <InsightItems items={insights} />
      </div>
    );
  }

  return (
    <div className="aria-insights">
      <p className="aria-card-title">Aria detectó</p>
      <div className="aria-insights-grid">
        {groups.map((group) => (
          <div key={group.category} className="aria-insight-card">
            <p className="aria-insight-card-label">{group.category}</p>
            <InsightItems items={group.items} />
          </div>
        ))}
      </div>
    </div>
  );
}
