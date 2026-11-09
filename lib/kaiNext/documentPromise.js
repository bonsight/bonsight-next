// Detecta cuando Kai afirma haber generado un documento sin llamar la tool. Exige una afirmación
// concreta, no palabras sueltas: antes bastaba "general" junto a "documento" para activarlo, y
// una respuesta normal terminaba reemplazada por la reacción de Kai a la corrección oculta.
const DOC = '(?:pdf|excel|documento|archivo|reporte|informe)';
const NOT_NEGATED = '(?<!\\b(?:no|nunca)\\s(?:te\\s|lo\\s|la\\s)?)';

const PROMISE_PATTERNS = [
  new RegExp(`${NOT_NEGATED}(?:generé|he generado|acabo de generar|estoy generando|voy a generar|preparé|estoy preparando)[^.\\n]{0,80}${DOC}`, 'i'),
  new RegExp(`\\b${DOC}\\b[^.\\n]{0,60}${NOT_NEGATED}(?:está list[oa]|ya está|quedó list[oa]|se generó|está disponible para descargar)`, 'i'),
];
const PROMISE_WITHOUT_NOUN = new RegExp(`${NOT_NEGATED}(?:\\b(?:lo|la) (?:estoy generando|genero|generé|voy a generar)|ya está listo para descargar)`, 'i');
const MENTIONS_DOC = new RegExp(`\\b${DOC}\\b`, 'i');

export const NO_DOCUMENT_PROMISE = 'SIN_PROMESA';

export function soundsLikeDocumentPromise(text) {
  if (!text) return false;
  return PROMISE_PATTERNS.some((re) => re.test(text))
    || (PROMISE_WITHOUT_NOUN.test(text) && MENTIONS_DOC.test(text));
}
