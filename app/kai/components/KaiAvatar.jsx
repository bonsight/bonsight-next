export default function KaiAvatar({ size = 36, state = 'idle' }) {
  const isThinking = state === 'thinking';

  return (
    <div
      className={`kai-avatar-wrap${isThinking ? ' kai-avatar-thinking' : ''}`}
      style={{ width: size, height: size, flexShrink: 0 }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 50 50"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Arms */}
        <line x1="25" y1="25" x2="25" y2="14" stroke="#20C997" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="25" y1="25" x2="13" y2="41" stroke="#20C997" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="25" y1="25" x2="37" y2="41" stroke="#20C997" strokeWidth="1.5" strokeLinecap="round" />

        {/* Satellite nodes */}
        <circle cx="25" cy="9" r="3.5" fill="#20C997" />
        <circle cx="11" cy="43" r="3.5" fill="#20C997" />
        <circle cx="39" cy="43" r="3.5" fill="#20C997" />

        {/* Center ring */}
        <circle cx="25" cy="25" r="7" stroke="#20C997" strokeWidth="2" />
        {/* Center dot */}
        <circle cx="25" cy="25" r="2.5" fill="#20C997" />
      </svg>
    </div>
  );
}
