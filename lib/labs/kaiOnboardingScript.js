// Guion de Kai — Fase 1 (onboarding activo), projectKind "experimental", los 3 roles.
// Transcripción de ~/Downloads/kaionboardingexperimental.md, pasada a tú neutro y sin
// promesas de tiempo/cantidad (ver ~/Downloads/promptgeneradoronboardingkai (5).md,
// sección "Aplica la constitución de Kai").
//
// `anchor` es el valor de un atributo data-kai-anchor ya presente en el DOM — algunos pasos
// del Registrador (elegir prueba, grabar, revisar) ocurren todos dentro de la vista "Aportar"
// sin que haya un sub-elemento propio para cada uno todavía, así que comparten el ancla de la
// pestaña — el tooltip queda pineado ahí en vez de perseguir cada campo interno.
export const KAI_ONBOARDING_SCRIPT = {
  experimental: {
    Director: {
      steps: [
        {
          id: 'bienvenida',
          anchor: 'create-experiment',
          text: 'Hola, soy Kai. Un proyecto Experimental es distinto a un seguimiento normal: aquí vas a probar una hipótesis con datos reales. Te ayudo a montarlo.',
          ctaLabel: 'Vamos',
        },
        {
          id: 'objetivo',
          anchor: 'field-objective',
          text: 'Cuéntame qué quieres probar o descubrir con este experimento.',
        },
        {
          id: 'hipotesis',
          anchor: 'field-hypothesis',
          text: 'Ahora la hipótesis: ¿qué esperas que pase? Esto es lo que le va a dar sentido a todo lo que se registre después.',
        },
        {
          id: 'criterio-exito',
          anchor: 'field-success-criteria',
          text: 'Define cómo vas a saber si funcionó — un número, no una sensación. Puedes agregar más de uno.',
        },
        {
          id: 'asignar-supervisor',
          anchor: 'field-supervisor',
          text: '¿Quién va a estar a cargo del día a día del experimento? Esa persona va a poder crear pruebas y validar lo que se registre. Cuando termines, dale a "Crear proyecto →".',
        },
        {
          id: 'crear-prueba',
          anchor: 'nav-pruebas',
          text: 'Ahora definamos qué se va a medir. Una Prueba es el formato que tus Registradores van a completar cada vez — tú eliges los campos.',
        },
        {
          id: 'asignar-registradores',
          anchor: 'field-test-registradores',
          text: '¿Quién va a estar registrando esto en el terreno? Asígnalos aquí para que la vean en su lista.',
        },
        {
          id: 'entender-resumen',
          anchor: 'nav-resumen',
          text: 'Aquí vas a tener qué está pasando con tu experimento — qué salió bien, qué no, sin que tengas que leer cada aporte.',
        },
        {
          id: 'cierre',
          anchor: 'nav-resumen',
          text: 'Tu experimento está armado. En cuanto tu equipo empiece a aportar, esto se va a empezar a llenar solo.',
          ctaLabel: 'Listo',
        },
      ],
    },
    Supervisor: {
      steps: [
        {
          id: 'bienvenida',
          anchor: 'nav-resumen',
          text: 'Hola, soy Kai. Te asignaron a este experimento como Supervisor — aquí te muestro de qué vas a estar a cargo.',
          ctaLabel: 'Vamos',
        },
        {
          id: 'ver-resumen',
          anchor: 'nav-resumen',
          text: 'Esta síntesis se genera sola con lo que se va registrando — mírala antes de entrar al detalle, te ahorra tiempo.',
        },
        {
          id: 'crear-prueba',
          anchor: 'nav-pruebas',
          // Este paso se salta si el experimento ya tiene Pruebas — ver lib/labs/kaiOnboarding.js
          text: 'Si el Director todavía no cargó ninguna Prueba, puedes crearla tú: defines los campos y quién la completa.',
        },
        {
          id: 'aportar',
          anchor: 'nav-aportar',
          text: 'Tú también puedes aportar directo, igual que un Registrador — grabas por voz o escribes, y adjuntas evidencia.',
        },
        {
          id: 'cierre',
          anchor: 'nav-resumen',
          text: 'Ya tienes lo básico. Validar aportes, dejar feedback y generar reportes te los voy a mostrar apenas tengan sentido, no ahora.',
          ctaLabel: 'Listo',
        },
      ],
    },
    Registrador: {
      waiting: {
        anchor: 'nav-aportar',
        text: 'Hola, soy Kai. Todavía no tienes ninguna Prueba asignada — en cuanto tu Supervisor te asigne una, la vas a ver aquí y vamos a arrancar.',
      },
      steps: [
        {
          id: 'bienvenida',
          anchor: 'nav-resumen',
          text: 'Hola, soy Kai. Tu trabajo aquí es simple: cuéntame qué encontraste y yo te ayudo a dejarlo bien registrado.',
          ctaLabel: 'Vamos',
        },
        {
          id: 'elegir-prueba',
          anchor: 'nav-aportar',
          text: 'Elige la prueba que estás completando ahora mismo.',
        },
        {
          id: 'registrar-aporte',
          anchor: 'nav-aportar',
          text: 'Cuéntamelo como se lo dirías a un compañero — por voz o escrito, como te resulte más fácil. Si tienes una foto o video, súmalo.',
        },
        {
          id: 'revisar-interpretacion',
          anchor: 'nav-aportar',
          text: 'Ya interpreté lo que me contaste y lo acomodé en los campos de la prueba. Revisa que esté bien antes de confirmar — yo puedo equivocarme.',
        },
        {
          id: 'ver-historia',
          anchor: 'nav-historia',
          text: 'Cada cosa que registras queda aquí, en orden. Es tu respaldo de lo que hiciste.',
        },
        {
          id: 'cierre',
          anchor: 'nav-aportar',
          text: 'Ya hiciste tu primer aporte. La próxima vez que tengas algo para contar, entra directo a Aportar.',
          ctaLabel: 'Listo',
        },
      ],
    },
  },
};

// Civil y seguimiento comparten el mismo guion de Fase 1 (seguimiento es literalmente civil
// sin Presupuesto ni import de Excel — ver lib/labs/experiments.js#TASK_TRACKING_KINDS y los
// comentarios propios del código sobre isTaskTrackingKind()) — un solo objeto, referenciado
// desde las dos claves, con los pasos que no aplican a un tipo marcados para saltear en
// lib/labs/kaiOnboarding.js (getDirectorSkipStepIds para Director, skipStepIds inline para
// Supervisor) en vez de duplicar el guion.
const TASK_TRACKING_SCRIPT = {
  Director: {
    steps: [
      {
        id: 'bienvenida',
        anchor: 'create-experiment',
        text: 'Hola, soy Kai. Acá el foco es un cronograma de tareas con fechas, no una hipótesis — te ayudo a montarlo.',
        ctaLabel: 'Vamos',
      },
      {
        id: 'elegir-tipo',
        // Se saltea solo si el tenant tiene un único tipo de proyecto habilitado (el selector
        // ni siquiera se renderiza) — ver getDirectorSkipStepIds.
        anchor: 'field-kind',
        text: 'Elige qué tipo de proyecto es este — Civil suma control de presupuesto, Seguimiento es solo tareas con fechas.',
      },
      {
        id: 'cargar-excel',
        // Solo civil — se saltea en seguimiento.
        anchor: 'field-excel-import',
        text: 'Si ya tienes el Excel de cronograma y presupuesto, súbelo aquí — se interpreta solo. Revisa antes de crear el proyecto.',
      },
      {
        id: 'asignar-supervisor',
        anchor: 'field-supervisor',
        text: '¿Quién va a estar a cargo del día a día? Esa persona va a poder crear y editar tareas.',
      },
      {
        id: 'cargar-tarea-manual',
        // Solo seguimiento — en civil las tareas ya vinieron del Excel, se saltea.
        anchor: 'create-task',
        postCreation: true,
        text: 'Tu proyecto todavía no tiene tareas — cárgalas aquí, una por una, con fecha y responsable.',
      },
      {
        id: 'entender-resumen',
        anchor: 'nav-resumen',
        text: 'Aquí vas a tener qué está pasando con el proyecto sin tener que revisar tarea por tarea.',
      },
      {
        id: 'cierre',
        anchor: 'nav-resumen',
        text: 'Tu proyecto está armado. A medida que se carguen tareas y avances, esto se va a ir llenando solo.',
        ctaLabel: 'Listo',
      },
    ],
  },
  Supervisor: {
    steps: [
      {
        id: 'bienvenida',
        anchor: 'nav-resumen',
        text: 'Hola, soy Kai. Te asignaron a este proyecto como Supervisor — aquí te muestro de qué vas a estar a cargo.',
        ctaLabel: 'Vamos',
      },
      {
        id: 'ver-resumen',
        anchor: 'nav-resumen',
        text: 'Esta síntesis se genera sola con lo que se va actualizando — mírala antes de entrar al detalle.',
      },
      {
        id: 'cronograma',
        anchor: 'nav-cronograma',
        text: 'Aquí llevas las tareas — en Lista, Gantt o Canvas, la vista que prefieras. Los comentarios puntuales van directo en cada tarea, no hay una pestaña de Feedback aparte.',
      },
      {
        id: 'presupuesto',
        // Solo civil — se saltea en seguimiento (no tiene esta pestaña).
        anchor: 'nav-presupuesto',
        text: 'Aquí controlas las partidas y lo ejecutado contra cada una — los gastos se cargan con factura adjunta.',
      },
      {
        id: 'cierre',
        anchor: 'nav-resumen',
        text: 'Ya tienes el flujo: miras el Resumen, llevas las tareas en Cronograma, y comentas directo en cada una. El resto lo vas a ir descubriendo sobre la marcha.',
        ctaLabel: 'Listo',
      },
    ],
  },
  Registrador: {
    waiting: {
      anchor: 'nav-cronograma',
      text: 'Hola, soy Kai. Todavía no tienes ninguna tarea asignada — en cuanto te asignen una, la vas a ver aquí.',
    },
    steps: [
      {
        id: 'bienvenida',
        anchor: 'nav-resumen',
        text: 'Hola, soy Kai. Tu trabajo aquí es simple: cuando termines una tarea, marca el avance.',
        ctaLabel: 'Vamos',
      },
      {
        id: 'cronograma',
        anchor: 'nav-cronograma',
        text: 'Aquí están tus tareas — al terminar una, marca el check para que quede al 100%. No puedes crear ni editar, solo actualizar tu propio avance.',
      },
      {
        id: 'cierre',
        anchor: 'nav-resumen',
        text: 'Ya sabes cómo actualizar tus tareas. La próxima vez que termines algo, entra directo a Cronograma.',
        ctaLabel: 'Listo',
      },
    ],
  },
};

KAI_ONBOARDING_SCRIPT.civil = TASK_TRACKING_SCRIPT;
KAI_ONBOARDING_SCRIPT.seguimiento = TASK_TRACKING_SCRIPT;

// Fase 2 (progresivo) — Director, Supervisor y Registrador. A diferencia de
// KAI_ONBOARDING_SCRIPT (una secuencia fija de pasos), esto es enseñanza puntual disparada por
// datos reales del experimento (ver lib/labs/kaiOnboarding.js#getKaiPhase2Step) — cada texto
// describe una situación que YA está pasando ahora, no un "cuando pase" hipotético.
export const KAI_PHASE2_SCRIPT = {
  experimental: {
    Director: {
      // El Director nunca aporta ni valida — su único evento post-creación es aprobar lo que
      // el Supervisor ya envió. No estaba en el guion original de Fase 1 (que solo cubre la
      // creación del proyecto), así que esto es enseñanza nueva, no un paso movido.
      'aprobar-reporte': 'El Supervisor envió un reporte — está esperando tu revisión para aprobarlo.',
    },
    Supervisor: {
      validar: 'Tienes al menos una ejecución sin validar — es un chequeo tuyo, no automático.',
      feedback: 'Ya hay aportes registrados — si algo necesita una aclaración o un ajuste, puedes dejarle feedback directo, para todo el equipo o solo para ti y el Director.',
      reporte: 'Ya hay contenido registrado — cuando quieras cerrar una etapa, puedes generar un borrador de reporte aquí. Se arma con lo que ya está cargado, tú lo ajustas y se lo envías al Director para que lo apruebe.',
    },
    Registrador: {
      'feedback-recibido': 'Tu Supervisor o Director te dejaron una aclaración sobre algo que registraste — la puedes ver aquí.',
    },
  },
};

// Civil y seguimiento comparten Fase 2 igual que comparten Fase 1 — mismo criterio (seguimiento
// es civil sin partidas, "sobrecosto" simplemente nunca tiene itemIds ahí, no hace falta un
// guion aparte). Sin Registrador: no hay pestaña Feedback en estos projectKind, ver
// lib/labs/kaiOnboarding.js#getPhase2Candidates.
const TASK_TRACKING_PHASE2_SCRIPT = {
  Director: {
    'aprobar-reporte': 'El Supervisor envió un reporte — está esperando tu revisión para aprobarlo.',
  },
  Supervisor: {
    'tarea-vencida': 'Tienes al menos una tarea vencida sin terminar — puede necesitar una fecha nueva o hablarlo con el responsable.',
    'sobrecosto': 'Al menos una partida ya ejecutó más de lo presupuestado.',
  },
};

KAI_PHASE2_SCRIPT.civil = TASK_TRACKING_PHASE2_SCRIPT;
KAI_PHASE2_SCRIPT.seguimiento = TASK_TRACKING_PHASE2_SCRIPT;
