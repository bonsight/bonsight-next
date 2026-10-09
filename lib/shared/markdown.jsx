'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Renderer de markdown genérico, parametrizado por prefijo de clase CSS — extraído del patrón
// de lib/aria/markdown.jsx (sin importar de ahí: esa versión trae badges de estado atados al
// vocabulario del Sprint board de Aria, que no aplica acá). El resaltado automático de números
// es opcional (off por default): resaltar cada cifra le quita peso a lo que el propio texto ya
// decide destacar con negrita — el color solo debería marcar lo que el autor eligió, no todo.
const NUM_RE = /(\d[\d,\.]*\s*%?)/g;

function applyNums(text, prefix) {
  NUM_RE.lastIndex = 0;
  if (!NUM_RE.test(text)) return text;
  NUM_RE.lastIndex = 0;
  const parts = [];
  let last = 0, k = 0, m;
  while ((m = NUM_RE.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    parts.push(<span key={k++} className={`${prefix}-num`}>{m[0]}</span>);
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

function withNums(children, prefix) {
  if (typeof children === 'string') {
    const r = applyNums(children, prefix);
    return Array.isArray(r) ? r : children;
  }
  if (!Array.isArray(children)) return children;
  const out = [];
  children.forEach((child, i) => {
    if (typeof child === 'string') {
      const r = applyNums(child, prefix);
      if (Array.isArray(r)) {
        r.forEach((p, j) => {
          out.push(typeof p === 'string' ? p : <span key={`n${i}-${j}`} className={`${prefix}-num`}>{p.props.children}</span>);
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

function buildComponents(prefix, highlightNumbers) {
  const maybeNums = (children) => (highlightNumbers ? withNums(children, prefix) : children);
  return {
    h1: ({ children }) => <div className={`${prefix}-h1`}>{children}</div>,
    h2: ({ children }) => <div className={`${prefix}-h2`}>{children}</div>,
    h3: ({ children }) => <div className={`${prefix}-h3`}>{children}</div>,
    h4: ({ children }) => <div className={`${prefix}-h4`}>{children}</div>,
    hr: () => <div className={`${prefix}-divider`} />,
    p: ({ children }) => <p className={`${prefix}-msg-para`}>{maybeNums(children)}</p>,
    strong: ({ children }) => <strong className={`${prefix}-bold`}>{children}</strong>,
    em: ({ children }) => <em className={`${prefix}-em`}>{children}</em>,
    ul: ({ children }) => <div className={`${prefix}-list`}>{children}</div>,
    ol: ({ children }) => <div className={`${prefix}-list ${prefix}-list--ordered`}>{children}</div>,
    li: ({ children }) => (
      <div className={`${prefix}-list-item`}>
        <span className={`${prefix}-list-dot`} />
        <span className={`${prefix}-list-item-body`}>{children}</span>
      </div>
    ),
    // react-markdown v9+ ya no pasa un prop `inline` al renderer de `code` (cambio de API
    // frente a versiones viejas) — bloques de ``` y código `inline` llegan indistinguibles acá.
    // La forma correcta de diferenciarlos es no intentarlo en `code`: un bloque de código
    // siempre es `<pre><code>`, así que basta con estilizar `pre` para el caso bloque y dejar
    // que `code` (que también se usa suelto para inline) tenga el estilo de inline por default.
    pre: ({ children }) => <pre className={`${prefix}-code-block`}>{children}</pre>,
    code: ({ children }) => <code className={`${prefix}-code-inline`}>{children}</code>,
    blockquote: ({ children }) => <blockquote className={`${prefix}-blockquote`}>{children}</blockquote>,
    table: ({ children }) => (
      <div className={`${prefix}-table-wrap`}>
        <table className={`${prefix}-table`}>{children}</table>
      </div>
    ),
    td: ({ children }) => <td>{maybeNums(children)}</td>,
  };
}

export function renderMessage(text, { prefix = 'md', highlightNumbers = false } = {}) {
  if (!text) return null;
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={buildComponents(prefix, highlightNumbers)}>
      {text}
    </ReactMarkdown>
  );
}
