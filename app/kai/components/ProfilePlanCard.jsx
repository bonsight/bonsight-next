function Tag({ children, color = 'default' }) {
  return (
    <span className={`kai-profile-tag kai-profile-tag-${color}`}>{children}</span>
  );
}

function Section({ label, items, icon }) {
  if (!items?.length) return null;
  return (
    <div className="kai-profile-section">
      <div className="kai-profile-section-label">
        {icon && <span>{icon}</span>}
        <span>{label}</span>
      </div>
      <ul className="kai-profile-section-list">
        {items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function MaturityBadge({ level }) {
  if (!level) return null;
  const color =
    level === 'Alta' ? 'green' :
    level === 'Media' ? 'yellow' :
    level === 'En transición' ? 'blue' : 'gray';
  return <Tag color={color}>{level}</Tag>;
}

export default function ProfilePlanCard({ data }) {
  // Support both old schema (profile + plan) and new schema (flat fields)
  const isNewSchema = data?.objetivos || data?.dolores;

  if (isNewSchema) {
    return <NewProfileCard data={data} />;
  }

  // Legacy schema fallback
  const { profile = {}, plan = [] } = data;
  const profileRows = [
    ['Empresa', profile.empresa],
    ['Mercado', profile.mercado],
    ['Objetivo', profile.objetivo],
    profile.problema ? ['Problema percibido', profile.problema] : null,
  ].filter(Boolean);

  return (
    <div className="kai-profile-card">
      <div className="kai-profile-col">
        <div className="kai-profile-col-header">PERFIL PRELIMINAR</div>
        <table className="kai-profile-table">
          <tbody>
            {profileRows.map(([label, value]) => (
              <tr key={label}>
                <td className="kai-profile-label">{label}</td>
                <td className="kai-profile-value">{value}</td>
              </tr>
            ))}
            {profile.hipotesis?.length > 0 && (
              <tr>
                <td className="kai-profile-label">Hipótesis</td>
                <td>
                  <div className="kai-profile-tags">
                    {profile.hipotesis.map((tag) => (
                      <Tag key={tag}>{tag}</Tag>
                    ))}
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="kai-profile-divider" />

      <div className="kai-profile-col">
        <div className="kai-profile-col-header">PLAN</div>
        <div className="kai-plan-steps">
          {plan.map((step) => (
            <div key={step.step} className="kai-plan-step">
              <div className="kai-plan-step-row">
                <span className="kai-plan-step-icon">{step.icon}</span>
                <span className="kai-plan-step-title">{step.step}. {step.title}</span>
              </div>
              <p className="kai-plan-step-desc">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function NewProfileCard({ data }) {
  const {
    empresa,
    sector,
    objetivos = [],
    dolores = [],
    madurez_digital,
    tecnologia = [],
    oportunidades = [],
    proximos_pasos = [],
  } = data;

  return (
    <div className="kai-profile-new-card">
      {/* Header */}
      <div className="kai-profile-new-header">
        <div>
          <div className="kai-profile-new-empresa">{empresa}</div>
          {sector && <div className="kai-profile-new-sector">{sector}</div>}
        </div>
        <MaturityBadge level={madurez_digital} />
      </div>

      <div className="kai-profile-new-body">
        {/* Left column */}
        <div className="kai-profile-new-col">
          <Section label="Objetivos" icon="🎯" items={objetivos} />
          <Section label="Dolores" icon="⚠️" items={dolores} />
          {tecnologia.length > 0 && (
            <div className="kai-profile-section">
              <div className="kai-profile-section-label">
                <span>⚙️</span>
                <span>Tecnología</span>
              </div>
              <div className="kai-profile-tags">
                {tecnologia.map((t) => (
                  <Tag key={t} color="tech">{t}</Tag>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="kai-profile-divider" />

        {/* Right column */}
        <div className="kai-profile-new-col">
          <Section label="Oportunidades detectadas" icon="💡" items={oportunidades} />
          <Section label="Próximos pasos sugeridos" icon="🗺️" items={proximos_pasos} />
        </div>
      </div>
    </div>
  );
}
