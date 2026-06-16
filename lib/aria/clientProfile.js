export const CLIENT_PROFILE = {
  client_id: 'bonsight',

  company: {
    name: 'Bonsight LLC',
    location: 'Orlando, Florida',
    website: 'https://www.bonsight.co',
    description: 'Consultora de tecnología, analítica, crecimiento y transformación digital.',
    industry: 'Consultoría B2B de growth, analítica y transformación digital.',
    business_model: 'Servicios B2B (agencia/consultoría) + productos propios en validación.',
    growth_stage:
      'Early Growth: empresa joven con oferta validada, primeros clientes y casos de éxito reales. En proceso de construir productos propios y modelos de ingresos recurrentes más allá de la consultoría tradicional.',
  },

  markets: ['USA', 'Perú', 'Chile', 'Colombia', 'España', 'LATAM'],

  services: {
    Kairo: 'Claridad estratégica y acompañamiento para empresas que necesitan ordenar decisiones, foco y ejecución.',
    Lumen: 'Estrategia de datos, crecimiento, CRO y medición digital.',
    Arke: 'Procesos de equipo, operación, liderazgo y estructura interna.',
  },

  products: [
    {
      name: 'Bonsight Website',
      paths: ['/es', '/en'],
      description: 'Sitio bilingüe con servicios, casos de estudio y rutas comerciales.',
      objective: 'Generar leads calificados y agendar discovery calls.',
    },
    {
      name: 'Kai',
      description: 'Chatbot conversacional embebido en el sitio de Bonsight.',
      objective:
        'Entender problemas y objetivos de negocio del visitante, identificar oportunidades de crecimiento, recomendar servicios de Bonsight, hacer discovery estructurado, reducir fricción comercial y acelerar el entendimiento del negocio. (Futuro: construir y mantener el CLIENT_PROFILE del cliente.)',
    },
    {
      name: 'Quiniela',
      path: '/quiniela',
      description: 'Aplicación beta de predicciones del Mundial 2026.',
      objective:
        'Awareness de marca Bonsight, generación de tráfico, captación de usuarios, demostrar capacidades de producto e IA de Bonsight Labs, y crear una experiencia compartible con exposición orgánica.',
    },
  ],

  conversions: {
    primary: [
      {
        name: 'Contact Form Submitted',
        description:
          'Formulario de contacto enviado en el sitio (incluye selección de servicio: Kairo/Lumen/Arke). Equivale a una solicitud de discovery call / lead calificado.',
        ga4_event: 'form_submit',
        ga4_event_params: { form_id: 'contact' },
      },
    ],
    secondary: [
      {
        name: 'Kai Conversation Started',
        description: 'El visitante envía al menos un mensaje al chatbot Kai.',
        ga4_event: 'chat_message_sent',
      },
      {
        name: 'Kai Widget Opened',
        description: 'El visitante abre el widget de Kai (paso previo a iniciar conversación).',
        ga4_event: 'widget_open',
      },
    ],
    not_yet_instrumented: [
      'Quiniela Registration / Quiniela Join — no hay eventos GA4 específicos para Quiniela todavía; solo se ve tráfico vía page_view/session_start en /quiniela.',
      'Newsletter Signup — no se encontró evento ni formulario de newsletter en el código actual.',
    ],
  },

  active_campaigns: [
    {
      name: 'Instagram Paid',
      channel: 'ig / paid',
      objective: 'Awareness y adquisición de usuarios para Quiniela.',
      landing_page: '/quiniela',
      markets: ['Argentina (sin confirmar — evidencia observacional, no documentada formalmente)'],
      success_metric: 'Tráfico y usuarios nuevos a Quiniela',
      status: 'active',
    },
    {
      name: 'LinkedIn Orgánico',
      channel: 'linkedin / organic',
      objective: 'Awareness de Bonsight, Kai y Quiniela.',
      landing_page: null,
      markets: ['LATAM', 'España', 'contactos profesionales'],
      success_metric: null,
      status: 'active',
    },
  ],

  business_goals: [
    'Generar leads calificados de startups y PYMEs en LATAM y USA.',
    'Posicionar a Bonsight como consultora digital premium.',
    'Expandir presencia en Colombia.',
    'Generar tráfico y engagement en la app de Quiniela.',
    'Convertir visitas en llamadas de discovery.',
  ],

  current_priorities: [
    'Mejorar conversión del sitio.',
    'Entender calidad de tráfico por país y canal.',
    'Medir adopción de Quiniela.',
    'Identificar oportunidades de CRO en páginas de servicios.',
    'Construir una experiencia de analítica consultiva, no solo reporting.',
  ],

  historical_context: {
    notes:
      'La mayor parte del tráfico histórico disponible corresponde a una etapa muy temprana del sitio, por lo que comparaciones históricas (mes a mes, periodo a periodo) deben interpretarse con cautela. Quiniela ha generado picos de tráfico que no necesariamente persiguen el mismo objetivo que la generación de leads tradicional (ver objetivo de Quiniela en "products") — no tratar esos picos como señal de crecimiento del negocio principal sin diferenciarlos.',
    notable_events: [
      { event: 'Lanzamiento del nuevo sitio web de Bonsight' },
      { event: 'Lanzamiento de Kai (chatbot)' },
      { event: 'Lanzamiento de Quiniela' },
    ],
  },

  ga4: {
    property_id: '538471138',
  },
};
