'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// ── Status badges ─────────────────────────────────────────────────────────────

const STATUS_MAP = {
  abierto:     'warning',
  pendiente:   'warning',
  'en riesgo': 'danger',
  anulado:     'danger',
  rechazado:   'danger',
  cerrado:     'success',
  completado:  'success',
  procesado:   'success',
  aprobado:    'success',
};

function normStatus(text) {
  return String(text ?? '').trim().toLowerCase();
}

function StatusBadge({ value }) {
  const variant = STATUS_MAP[normStatus(value)] ?? 'neutral';
  return <span className={`aria-status aria-status--${variant}`}>{value}</span>;
}

function childrenToText(children) {
  if (typeof children === 'string') return children;
  if (Array.isArray(children)) return children.map(childrenToText).join('');
  if (children?.props?.children != null) return childrenToText(children.props.children);
  return '';
}

function tryStatus(children) {
  const raw = childrenToText(children);
  // strip leading emojis and whitespace
  const cleaned = raw.replace(/^[☀-➿\u{1F000}-\u{1FFFF}\s]+/u, '').trim();
  return normStatus(cleaned) in STATUS_MAP ? cleaned : null;
}

// ── Number highlighting ───────────────────────────────────────────────────────

const NUM_RE = /(\d[\d,\.]*\s*%?)/g;

function applyNums(text) {
  NUM_RE.lastIndex = 0;
  if (!NUM_RE.test(text)) return text;
  NUM_RE.lastIndex = 0;
  const parts = [];
  let last = 0, k = 0, m;
  while ((m = NUM_RE.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    parts.push(<span key={k++} className="aria-num">{m[0]}</span>);
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

function withNums(children) {
  if (typeof children === 'string') {
    const r = applyNums(children);
    return Array.isArray(r) ? r : children;
  }
  if (!Array.isArray(children)) return children;
  const out = [];
  children.forEach((child, i) => {
    if (typeof child === 'string') {
      const r = applyNums(child);
      if (Array.isArray(r)) {
        r.forEach((p, j) => {
          if (typeof p === 'string') out.push(p);
          else out.push(<span key={`n${i}-${j}`} className="aria-num">{p.props.children}</span>);
        });
      } else {
        out.push(child);
      }
    } else {
      out.push(child);
    }
  });
  return out;
}

// ── Custom React components ───────────────────────────────────────────────────

const C = {
  h1: ({ children }) => <div className="aria-h1">{children}</div>,
  h2: ({ children }) => <div className="aria-h2">{children}</div>,
  h3: ({ children }) => <div className="aria-h3">{children}</div>,
  h4: ({ children }) => <div className="aria-h4">{children}</div>,

  hr: () => <div className="aria-divider" />,

  p:      ({ children }) => <p className="aria-msg-para">{withNums(children)}</p>,
  strong: ({ children }) => <strong className="aria-bold">{children}</strong>,
  em:     ({ children }) => <em className="aria-em">{children}</em>,

  ul: ({ children }) => <div className="aria-list">{children}</div>,
  ol: ({ children }) => <div className="aria-list aria-list--ordered">{children}</div>,
  li: ({ children }) => (
    <div className="aria-list-item">
      <span className="aria-list-dot" />
      <span className="aria-list-item-body">{children}</span>
    </div>
  ),

  code: ({ inline, children }) =>
    inline
      ? <code className="aria-code-inline">{children}</code>
      : <pre className="aria-code-block"><code>{children}</code></pre>,

  blockquote: ({ children }) => <blockquote className="aria-blockquote">{children}</blockquote>,

  table: ({ children }) => (
    <div className="aria-table-wrap">
      <table className="aria-table">{children}</table>
    </div>
  ),
  thead:  ({ children }) => <thead className="aria-table-head">{children}</thead>,
  tbody:  ({ children }) => <tbody>{children}</tbody>,
  tr:     ({ children }) => <tr className="aria-table-row">{children}</tr>,
  th:     ({ children }) => <th className="aria-table-th">{children}</th>,
  td:     ({ children }) => {
    const status = tryStatus(children);
    return (
      <td className="aria-table-td">
        {status ? <StatusBadge value={status} /> : withNums(children)}
      </td>
    );
  },
};

// ── Public API ────────────────────────────────────────────────────────────────

export function renderMessage(text) {
  if (!text) return null;
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={C}>
      {text}
    </ReactMarkdown>
  );
}

export function parseInline(text) {
  const r = applyNums(String(text ?? ''));
  return Array.isArray(r) ? r : [text];
}
