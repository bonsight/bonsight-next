const BONSIGHT_SCRIPT = [
  { type: 'assistant', content: 'Hola Rafa, ¿en qué estamos hoy?' },
  { type: 'user',      content: 'Quiero hablar sobre cómo escalar Bonsight sin que todo dependa de mí.' },
  { type: 'session_start', focus: 'Entender los cuellos de botella de escalabilidad y cómo el proceso de discovery depende del fundador', label: 'Operaciones', estimatedMinutes: '3-5' },
  { type: 'assistant', content: '¿En qué parte del trabajo sientes más esa dependencia?' },
  { type: 'user',      content: 'En el discovery. El proceso de entender al cliente lo conduzco yo. No está documentado y es casi imposible de delegar.' },
  {
    type: 'separator', insightType: 'dolor',
    bullets: ['El proceso de discovery está concentrado en el fundador. Sin su presencia, la calidad de la primera sesión con el cliente no puede garantizarse ni replicarse.'],
  },
  { type: 'assistant', content: '¿Qué pasaría si mañana entra un cliente nuevo y tú no puedes estar en esa primera sesión?' },
  { type: 'user',      content: 'Honestamente, no tenemos a nadie que pueda conducir esa conversación al nivel que se necesita hoy.' },
  {
    type: 'separator', insightType: 'aprendizaje',
    bullets: ['El conocimiento estratégico de Bonsight es implícito: vive en cómo el fundador hace las preguntas. No está en procesos, lo que hace la escalabilidad casi imposible hoy.'],
  },
  { type: 'assistant', content: '¿Cómo describirías el valor que Bonsight le genera a un cliente en las primeras cuatro semanas?' },
  { type: 'user',      content: 'Claridad. Salimos de la niebla y priorizamos. Pero me cuesta comunicarlo así de simple cuando lo venden otros.' },
  {
    type: 'separator', insightType: 'oportunidad',
    bullets: ['Si el proceso de discovery se sistematiza, Bonsight puede escalar sin depender de la disponibilidad del fundador — y comunicar su valor de forma consistente en cualquier conversación.'],
  },
  { type: 'assistant', content: 'Llevo tiempo viendo cómo construyes Kai y Aria exactamente para resolver esto. ¿En qué parte del proceso están usando el producto con los clientes de Bonsight?' },
  { type: 'user',      content: 'Ese es el reto ahora. Avanzamos mucho en el producto. Lo que falta es usarlo nosotros primero — ser el caso de uso 0 — antes de escalar con más clientes.' },
];

const XYZ_RETAIL_SCRIPT = [
  { type: 'assistant', content: 'Hola, ¿con quién tengo el gusto de hablar?' },
  { type: 'user',      content: 'Soy María, CEO de Empresa XYZ.' },
  { type: 'assistant', content: 'Hola María. ¿En qué momento están hoy como empresa?' },
  { type: 'user',      content: 'Somos una cadena de retail. Pasamos de 4 a 12 tiendas en dos años. El crecimiento fue rápido y ahora la operación se nos está saliendo de control.' },
  { type: 'session_start', focus: 'Entender los desafíos operativos de la cadena de tiendas y la gestión descentralizada del inventario', label: 'Operaciones', estimatedMinutes: '3-5' },
  { type: 'assistant', content: '¿Qué parte de la operación sientes que más se está escapando?' },
  { type: 'user',      content: 'El inventario. Cada tienda lo maneja diferente. No hay un proceso estándar y todo depende de que cada gerente sepa lo que hace.' },
  {
    type: 'separator', insightType: 'dolor',
    bullets: ['La gestión de inventario está descentralizada y depende del criterio individual de cada gerente. Sin estandarización, el crecimiento aumenta el riesgo operativo en lugar de reducirlo.'],
  },
  { type: 'assistant', content: '¿Ese conocimiento que tiene cada gerente está documentado en algún lugar?' },
  { type: 'user',      content: 'No. Si un gerente se va, nos llevaría semanas entender cómo manejaban su tienda. Ya nos pasó una vez.' },
  {
    type: 'separator', insightType: 'aprendizaje',
    bullets: ['El know-how operativo de cada tienda vive en las personas, no en la organización. Cada salida implica una pérdida de conocimiento difícil de recuperar.'],
  },
  { type: 'assistant', content: '¿Qué diferencia a Empresa XYZ de otras cadenas de retail en tu categoría?' },
  { type: 'user',      content: 'El precio, supongo. Aunque ya hay competidores bajando precios también. No tenemos claro qué más nos diferencia.' },
  {
    type: 'separator', insightType: 'oportunidad',
    bullets: ['Definir una propuesta de valor más allá del precio daría a Empresa XYZ una ventaja sostenible frente a competidores con mayor capacidad de descuento.'],
  },
  { type: 'assistant', content: 'Veo tres temas conectados: operación sin estándar, conocimiento concentrado en personas y propuesta de valor difusa. ¿Cuál genera hoy el mayor riesgo para el negocio?' },
  { type: 'user',      content: 'La operación. Si seguimos abriendo tiendas sin procesos definidos, vamos a explotar.' },
];

export function getDemoScript(tenantSlug) {
  return /bonsight/.test(tenantSlug) ? BONSIGHT_SCRIPT : XYZ_RETAIL_SCRIPT;
}

// ── Demo profiles ──────────────────────────────────────────────────────────

const BONSIGHT_DEMO_PROFILE = {
  general: {
    industry: 'Consultoría estratégica y tecnología',
    model: 'Servicios B2B — SaaS en construcción',
    size: 'Startup (< 10 personas)',
    country: 'México',
    digitalMaturity: 'Alta — producto digital propio',
  },
  objectives: {
    shortTerm: ['Validar Kai y Aria como caso de uso 0 con clientes de Bonsight'],
    mediumTerm: ['Sistematizar el proceso de discovery para escalar sin el fundador'],
    longTerm: ['Convertir Bonsight en plataforma replicable de consultoría aumentada'],
  },
  pains: [
    'El proceso de discovery depende completamente del fundador — no está documentado ni es delegable',
    'Dificultad para comunicar el valor de forma consistente cuando lo venden otros',
  ],
  risks: [
    'Escalabilidad bloqueada: sin el fundador, la calidad de la primera sesión no puede garantizarse',
    'El conocimiento estratégico es implícito — vive en cómo el fundador hace las preguntas',
  ],
  opportunities: [
    'Sistematizar el discovery con Kai para escalar sin depender del fundador',
    'Ser el caso de uso 0 del propio producto antes de escalar con más clientes',
  ],
  technology: ['Next.js', 'OpenAI GPT-4o', 'Upstash Redis', 'Vercel'],
  stakeholders: [{ name: 'Rafa', role: 'CEO / Fundador', id: 'rafa' }],
  processes: ['Discovery estratégico con cliente', 'Desarrollo de producto Kai + Aria'],
  initiatives: ['Lanzamiento Kai multi-tenant', 'Piloto con primeros clientes'],
  decisions: ['Ser el caso de uso 0 antes de escalar'],
  kpis: [],
};

const BONSIGHT_DEMO_LEARNINGS = [
  { id: 'dl1', content: 'El proceso de discovery está concentrado en el fundador. Sin su presencia, la calidad de la primera sesión no puede garantizarse ni replicarse.', area: 'operaciones', impact: 'alto', type: 'dolor',       createdAt: new Date(Date.now() - 7200000).toISOString() },
  { id: 'dl2', content: 'El conocimiento estratégico de Bonsight es implícito: vive en cómo el fundador hace las preguntas. No está en procesos, lo que hace la escalabilidad casi imposible hoy.',                             area: 'negocio',     impact: 'alto', type: 'aprendizaje', createdAt: new Date(Date.now() - 5400000).toISOString() },
  { id: 'dl3', content: 'Si el proceso de discovery se sistematiza, Bonsight puede escalar sin depender del fundador y comunicar su valor de forma consistente en cualquier conversación.',                                       area: 'negocio',     impact: 'alto', type: 'oportunidad', createdAt: new Date(Date.now() - 3600000).toISOString() },
  { id: 'dl4', content: 'El valor de Bonsight se percibe claramente al terminar una sesión (claridad + priorización), pero es difícil de comunicar antes de vivirlo.',                                                          area: 'marketing',   impact: 'medio', type: 'aprendizaje', createdAt: new Date(Date.now() - 1800000).toISOString() },
  { id: 'dl5', content: 'Kai y Aria están siendo construidos para resolver el problema de escalabilidad del propio Bonsight — lo que convierte al equipo en el cliente ideal para validar el producto.',                         area: 'negocio',     impact: 'alto', type: 'oportunidad', createdAt: new Date(Date.now() - 900000).toISOString() },
];

const XYZ_DEMO_PROFILE = {
  general: {
    industry: 'Retail',
    model: 'Cadena de tiendas físicas',
    size: 'Mediana empresa (12 tiendas)',
    country: 'México',
    digitalMaturity: 'Baja — operación manual sin sistemas centralizados',
  },
  objectives: {
    shortTerm: ['Estandarizar la gestión de inventario en todas las tiendas'],
    mediumTerm: ['Documentar procesos clave para reducir dependencia en gerentes', 'Definir propuesta de valor diferenciada'],
    longTerm: [],
  },
  pains: [
    'Gestión de inventario descentralizada: cada tienda lo maneja diferente sin estándar',
    'Know-how operativo concentrado en gerentes — cuando uno sale, el conocimiento se va con él',
  ],
  risks: [
    'Crecimiento sin procesos: abrir más tiendas con la operación actual amplifica el riesgo de colapso',
    'Alta rotación de gerentes sin protocolos documentados genera pérdida de conocimiento crítico',
  ],
  opportunities: [
    'Estandarizar la gestión de inventario daría consistencia operativa en las 12 tiendas',
    'Definir una propuesta de valor más allá del precio crearía ventaja sostenible frente a competidores',
  ],
  technology: [],
  stakeholders: [{ name: 'María', role: 'CEO', id: 'maria' }],
  processes: ['Gestión de inventario por tienda (sin estándar)', 'Incorporación de nuevos gerentes'],
  initiatives: ['Estandarización operativa', 'Apertura de nuevas tiendas'],
  decisions: ['Priorizar estandarización operativa antes de abrir más tiendas'],
  kpis: ['Rotación de inventario', 'Merma por tienda'],
};

const XYZ_DEMO_LEARNINGS = [
  { id: 'dl1', content: 'La gestión de inventario está descentralizada y depende del criterio individual de cada gerente. Sin estandarización, el crecimiento aumenta el riesgo operativo en lugar de reducirlo.',              area: 'operaciones', impact: 'alto', type: 'dolor',       createdAt: new Date(Date.now() - 7200000).toISOString() },
  { id: 'dl2', content: 'El know-how operativo de cada tienda vive en las personas, no en la organización. Cada salida de un gerente implica una pérdida de conocimiento difícil de recuperar.',                                area: 'personas',    impact: 'alto', type: 'aprendizaje', createdAt: new Date(Date.now() - 5400000).toISOString() },
  { id: 'dl3', content: 'Definir una propuesta de valor más allá del precio daría a Empresa XYZ una ventaja sostenible frente a competidores con mayor capacidad de descuento.',                                               area: 'marketing',   impact: 'medio', type: 'oportunidad', createdAt: new Date(Date.now() - 3600000).toISOString() },
];

export function getDemoProfile(tenantSlug) {
  return /bonsight/.test(tenantSlug) ? BONSIGHT_DEMO_PROFILE : XYZ_DEMO_PROFILE;
}

export function getDemoLearnings(tenantSlug) {
  return /bonsight/.test(tenantSlug) ? BONSIGHT_DEMO_LEARNINGS : XYZ_DEMO_LEARNINGS;
}

// ── Demo progression (animated counters) ──────────────────────────────────
// Each entry triggers when session_start or a separator is revealed.
// patch: profile fields to deep-merge into the live demoProfile state.
// learning: learning object to push into learnings state (or null).

const now = () => new Date().toISOString();

const BONSIGHT_DEMO_PROGRESSION = [
  {
    trigger: 'session_start',
    patch: {
      general: { industry: 'Consultoría estratégica y tecnología', model: 'Servicios B2B — SaaS en construcción', size: 'Startup (< 10 personas)', country: 'México', digitalMaturity: 'Alta — producto digital propio' },
      objectives: { shortTerm: ['Validar Kai y Aria como caso de uso 0 con clientes de Bonsight'], mediumTerm: ['Sistematizar el proceso de discovery para escalar sin el fundador'], longTerm: ['Convertir Bonsight en plataforma replicable de consultoría aumentada'] },
      technology: ['Next.js', 'OpenAI GPT-4o', 'Upstash Redis', 'Vercel'],
    },
    learning: null,
  },
  {
    trigger: 'separator',
    patch: {
      processes: ['Discovery estratégico con cliente', 'Desarrollo de producto Kai + Aria'],
      decisions: ['Ser el caso de uso 0 antes de escalar'],
      risks: ['Escalabilidad bloqueada: sin el fundador, la calidad de la primera sesión no puede garantizarse'],
    },
    learning: { id: 'dl1', content: 'El proceso de discovery está concentrado en el fundador. Sin su presencia, la calidad de la primera sesión no puede garantizarse ni replicarse.', area: 'operaciones', impact: 'alto', type: 'dolor' },
  },
  {
    trigger: 'separator',
    patch: {
      initiatives: ['Lanzamiento Kai multi-tenant', 'Piloto con primeros clientes'],
      stakeholders: [{ name: 'Rafa', role: 'CEO / Fundador', id: 'rafa' }],
    },
    learning: { id: 'dl2', content: 'El conocimiento estratégico de Bonsight es implícito: vive en cómo el fundador hace las preguntas. No está en procesos, lo que hace la escalabilidad casi imposible hoy.', area: 'negocio', impact: 'alto', type: 'aprendizaje' },
  },
  {
    trigger: 'separator',
    patch: {
      pains: ['El proceso de discovery depende completamente del fundador — no está documentado ni es delegable', 'Dificultad para comunicar el valor de forma consistente cuando lo venden otros'],
      opportunities: ['Sistematizar el discovery con Kai para escalar sin depender del fundador', 'Ser el caso de uso 0 del propio producto antes de escalar con más clientes'],
    },
    learning: { id: 'dl3', content: 'Si el proceso de discovery se sistematiza, Bonsight puede escalar sin depender del fundador y comunicar su valor de forma consistente en cualquier conversación.', area: 'marketing', impact: 'alto', type: 'oportunidad' },
  },
];

const XYZ_DEMO_PROGRESSION = [
  {
    trigger: 'session_start',
    patch: {
      general: { industry: 'Retail', model: 'Cadena de tiendas físicas', size: 'Mediana empresa (12 tiendas)', country: 'México', digitalMaturity: 'Baja — operación manual sin sistemas centralizados' },
      objectives: { shortTerm: ['Estandarizar la gestión de inventario en todas las tiendas'], mediumTerm: ['Documentar procesos clave para reducir dependencia en gerentes'], longTerm: [] },
    },
    learning: null,
  },
  {
    trigger: 'separator',
    patch: {
      processes: ['Gestión de inventario por tienda (sin estándar)', 'Incorporación de nuevos gerentes'],
      decisions: ['Priorizar estandarización operativa antes de abrir más tiendas'],
      risks: ['Crecimiento sin procesos: abrir más tiendas con la operación actual amplifica el riesgo de colapso'],
    },
    learning: { id: 'dl1', content: 'La gestión de inventario está descentralizada y depende del criterio individual de cada gerente. Sin estandarización, el crecimiento aumenta el riesgo operativo en lugar de reducirlo.', area: 'operaciones', impact: 'alto', type: 'dolor' },
  },
  {
    trigger: 'separator',
    patch: {
      initiatives: ['Estandarización operativa', 'Apertura de nuevas tiendas'],
      stakeholders: [{ name: 'María', role: 'CEO', id: 'maria' }],
    },
    learning: { id: 'dl2', content: 'El know-how operativo de cada tienda vive en las personas, no en la organización. Cada salida de un gerente implica una pérdida de conocimiento difícil de recuperar.', area: 'personas', impact: 'alto', type: 'aprendizaje' },
  },
  {
    trigger: 'separator',
    patch: {
      opportunities: ['Estandarizar la gestión de inventario daría consistencia operativa en las 12 tiendas', 'Definir una propuesta de valor más allá del precio crearía ventaja sostenible frente a competidores'],
      pains: ['Gestión de inventario descentralizada: cada tienda lo maneja diferente sin estándar', 'Know-how operativo concentrado en gerentes — cuando uno sale, el conocimiento se va con él'],
      kpis: ['Rotación de inventario', 'Merma por tienda'],
    },
    learning: { id: 'dl3', content: 'Definir una propuesta de valor más allá del precio daría a Empresa XYZ una ventaja sostenible frente a competidores con mayor capacidad de descuento.', area: 'marketing', impact: 'medio', type: 'oportunidad' },
  },
];

export function getDemoProgression(tenantSlug) {
  return /bonsight/.test(tenantSlug) ? BONSIGHT_DEMO_PROGRESSION : XYZ_DEMO_PROGRESSION;
}
