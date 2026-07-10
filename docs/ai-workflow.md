# AI Workflow — Reglas operativas del proyecto

> Este documento define el protocolo que debe seguir cualquier IA (Claude Code, Cursor, VS Code Chat, Copilot, etc.) al trabajar en `bonsight-next`.  
> El objetivo es garantizar continuidad, evitar trabajo duplicado y mantener decisiones consistentes entre sesiones.

---

## Fuentes de verdad (en orden de prioridad)

1. **El código** — lo que está en el repo es lo que existe
2. `docs/architecture-decisions.md` — decisiones estructurales permanentes
3. `docs/ai-handoff.md` — estado operativo actual y trabajo en progreso
4. `docs/project-state.json` — estado del epic actual (machine-readable)
5. `docs/current-context.md` — snapshot local y contexto de continuidad para la sesión actual

**Nunca asumir contexto únicamente desde el chat.** Si hay ambigüedad entre lo que dice el chat y lo que dice el código o los docs, el código manda.

---

## Objetivos de la carpeta docs

La carpeta `docs/` debe cumplir tres objetivos obligatorios:

1. **Capturar el estado real del proyecto**: qué está cambiado, qué módulos están activos y qué está en progreso.
2. **Guardar un checkpoint útil**: un snapshot claro al que pueda volver otra sesión o otro agente.
3. **Dejar instrucciones operativas**: qué leer, qué validar y qué hacer a continuación para no perder contexto.

Si un documento no cumple alguno de estos tres objetivos, debe actualizarse o reemplazarse.

---

## Protocolo obligatorio al INICIAR una tarea

Antes de escribir una sola línea de código:

1. **Lee** `docs/architecture-decisions.md`
2. **Lee** `docs/ai-handoff.md`
3. **Lee** `docs/project-state.json`
4. Verifica que los archivos que vas a modificar existen en la ruta que esperas
5. Confirma con el usuario si hay ambigüedad sobre el scope de la tarea

---

## Protocolo obligatorio al TERMINAR una tarea

Al final de cada sesión de trabajo que produzca cambios:

1. **Actualiza** `docs/ai-handoff.md`:
   - Mueve tareas completadas a "Trabajo completado"
   - Actualiza "Trabajo en progreso" y "Próximos pasos"
   - Actualiza la lista de archivos modificados
   - Actualiza la fecha en el header
   - Actualiza el prompt recomendado para continuar

2. **Actualiza** `docs/project-state.json`:
   - `completed[]` — agrega lo que se terminó
   - `in_progress[]` — actualiza lo que queda en curso
   - `next_steps[]` — actualiza los pasos inmediatos
   - `blockers[]` — actualiza bloqueos
   - `last_updated_by` — identifica el agente (ej: `"claude-sonnet-4-6"`)
   - `last_updated_at` — timestamp ISO 8601

3. Si se tomó una **decisión arquitectónica nueva**:
   - Agrega un ADR a `docs/architecture-decisions.md`
   - Usa el siguiente ID disponible (`ADR-NNN`)
   - Incluye: Fecha, Estado, Contexto, Decisión, Consecuencias

---

## Reglas de trabajo

### Sobre el código
- **Leer antes de editar.** Siempre usar Read antes de Edit en archivos existentes.
- **No refactorizar fuera del scope.** Si la tarea es agregar una feature, no limpiar código no relacionado.
- **Verificar rutas de importación.** Este proyecto usa `@/` como alias para la raíz (configurado en jsconfig.json).
- **No crear archivos `.md` innecesarios.** Solo los docs en `docs/` y este sistema.

### Sobre commits y deploys
- **Nunca hacer commit/push sin preguntar al usuario qué cambios incluir.**
- **Nunca asumir que "sí" a un commit anterior autoriza el siguiente.**
- Cuando se pide un commit, listar explícitamente qué archivos se incluirán y esperar confirmación.

### Sobre la arquitectura
- **No crear nuevos agentes sin ADR.** Cualquier nuevo sistema (agent, API route importante, nueva capa de datos) debe registrarse en `architecture-decisions.md`.
- **Respetar los namespaces de Redis.** Ver ADR-005 para la estructura de claves. No inventar nuevos namespaces sin documentarlos.
- **No cambiar el modelo de IA de un agente sin consultar.** Los modelos están en ADR-008.

### Sobre slugs reservados (Kai multi-tenant)
Estos slugs NO pueden usarse como identificadores de tenant:
- `admin`
- `login`
- `components`
- cualquier futura ruta estática bajo `app/kai/`

---

## Estructura del proyecto (referencia rápida)

```
bonsight-next/
├── app/
│   ├── [locale]/          # Sitio público (es/en) — Advisor, servicios, cases
│   │   └── consulta/      # Bonsight Advisor page
│   ├── api/
│   │   ├── advisor/       # Advisor API (stateless, GPT-4o-mini)
│   │   ├── aria/          # Aria API + investigations
│   │   ├── kai/           # Kai APIs
│   │   │   ├── route.js   # Kai interno (TENANT_ID='bonsight')
│   │   │   ├── tenants/   # CRUD multi-tenant
│   │   │   └── [tenant]/  # Chat por tenant
│   │   └── ...
│   ├── aria/              # Aria UI (aria.bonsight.co)
│   ├── kai/               # Kai UI (kai.bonsight.co)
│   │   ├── page.jsx       # Kai interno Bonsight
│   │   ├── admin/         # Admin panel
│   │   ├── [tenant]/      # Interfaz cliente externo
│   │   ├── login/         # Login page
│   │   └── components/    # Componentes Kai
│   └── globals.css        # Estilos globales + .chat-* + .consulta-*
├── components/
│   ├── ChatWidget.jsx     # Widget flotante Advisor (bonsight.co)
│   ├── Navbar.jsx
│   └── Analytics.jsx
├── lib/
│   ├── businessMemory.js  # Capa compartida Kai↔Aria (Redis)
│   ├── aria/              # Auth, memory, GA4, prompts, markdown
│   └── kai/               # Auth, memory, tenants
├── docs/                  # Este sistema de continuidad AI
├── proxy.js               # Middleware: routing por subdominio + i18n
└── next.config.js
```

---

## Contexto de producto (no técnico)

**Bonsight LLC** es una consultora de estrategia digital con sede en Chicago. Opera con un ecosistema de tres agentes de IA:

- **Advisor**: captura leads en el sitio público. Conversación corta, lleva a Calendly/WhatsApp.
- **Kai**: consultor estratégico que hace discovery empresarial profundo. Construye el perfil de cada cliente en Business Memory. Audiencia: equipo Bonsight + clientes con acceso.
- **Aria**: Business Intelligence partner. Lee el perfil de Business Memory y analiza datos de GA4. Genera investigaciones con insights accionables. Audiencia: clientes con acceso.

El flujo es: **Advisor** capta → **Kai** descubre → **Aria** analiza.

---

## Contacto del proyecto

- Email del dueño del proyecto: `rafa@bonsight.co`
- Repo: `/Users/itriagor/Documents/GitHub/bonsight-next`
- Deploy: Vercel (bonsight.co + subdominios)
