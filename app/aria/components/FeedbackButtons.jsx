'use client';

import { useState } from 'react';

export default function FeedbackButtons() {
  const [feedback, setFeedback] = useState(null);

  return (
    <div className="aria-feedback">
      <button
        type="button"
        className={`aria-feedback-btn ${feedback === 'up' ? 'aria-feedback-btn-active' : ''}`}
        onClick={() => setFeedback((f) => (f === 'up' ? null : 'up'))}
        aria-label="Respuesta útil"
      >
        👍
      </button>
      <button
        type="button"
        className={`aria-feedback-btn ${feedback === 'down' ? 'aria-feedback-btn-active' : ''}`}
        onClick={() => setFeedback((f) => (f === 'down' ? null : 'down'))}
        aria-label="Respuesta no útil"
      >
        👎
      </button>
    </div>
  );
}
