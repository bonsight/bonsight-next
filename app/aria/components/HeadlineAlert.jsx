export default function HeadlineAlert({ headline }) {
  if (!headline) return null;

  const { status, title, impact } = headline;

  return (
    <div className={`aria-headline aria-headline-${status}`}>
      <span className="aria-headline-icon" aria-hidden="true" />
      <div>
        <p className="aria-headline-title">{title}</p>
        {impact && <p className="aria-headline-impact">{impact}</p>}
      </div>
    </div>
  );
}
