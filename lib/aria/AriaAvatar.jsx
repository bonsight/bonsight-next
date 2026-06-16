export default function AriaAvatar({ size = 32, animate = false }) {
  return (
    <svg
      className={`aria-avatar${animate ? ' aria-avatar-animate' : ''}`}
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="20" cy="20" r="18" stroke="rgba(255,255,255,0.08)" />

      <line x1="20" y1="20" x2="9" y2="12" stroke="#2563EB" strokeOpacity="0.35" strokeWidth="0.75" />
      <line x1="20" y1="20" x2="31" y2="10" stroke="#7C3AED" strokeOpacity="0.35" strokeWidth="0.75" />
      <line x1="20" y1="20" x2="10" y2="29" stroke="#06B6D4" strokeOpacity="0.35" strokeWidth="0.75" />
      <line x1="20" y1="20" x2="30" y2="28" stroke="#2563EB" strokeOpacity="0.35" strokeWidth="0.75" />
      <line x1="20" y1="20" x2="22" y2="6" stroke="#7C3AED" strokeOpacity="0.35" strokeWidth="0.75" />

      <circle cx="9" cy="12" r="2" fill="#2563EB" />
      <circle cx="31" cy="10" r="1.6" fill="#7C3AED" />
      <circle cx="10" cy="29" r="1.8" fill="#06B6D4" />
      <circle cx="30" cy="28" r="1.6" fill="#2563EB" />
      <circle cx="22" cy="6" r="1.4" fill="#7C3AED" />

      <circle className="aria-avatar-glow" cx="20" cy="20" r="8" fill="#67e8f9" opacity="0.35" />
      <circle cx="20" cy="20" r="3" fill="#f8fafc" />
    </svg>
  );
}
