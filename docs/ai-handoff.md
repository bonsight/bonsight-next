# AI Handoff — bonsight-next

> Bitácora operativa para continuidad entre sesiones de IA.  
> **Actualizar al terminar cada sesión de trabajo.**  
> Última actualización: 2026-09-03

---

## Snapshot local actual (2026-09-03)

**Epic activo:** Labs — Presupuesto por gastos con factura, Criterios de éxito estructurados, aporte editable.

Este es el snapshot más reciente y debe tratarse como referencia principal — todo lo que sigue debajo (Kai Admin Panel, 2026-07-10) es historia ya resuelta/en producción, no el trabajo actual.

**Estado del working tree ahora mismo:** 6 features de Labs completas localmente (build limpio), **sin commitear ni desplegar**. Correr `git status --short` en la raíz del repo para la lista exacta — a la fecha de este snapshot son:

```
M app/api/labs/[tenant]/experiments/[id]/details/route.js
M app/api/labs/[tenant]/experiments/[id]/partidas/[partidaId]/route.js
M app/labs/[tenant]/LabsClientTenant.jsx
M app/labs/labs.css
M lib/labs/contribution.js
M lib/labs/experiments.js
M lib/labs/reports.js
M lib/labs/summary.js
?? app/api/labs/[tenant]/experiments/[id]/partidas/[partidaId]/gastos/
```

**Qué hace cada feature (todas en proyectos civiles/experimentales de Labs):**

1. **Gastos con factura** — "Ejecutado" de una partida deja de ser un número editable a mano; ahora es la suma de gastos individuales (`lib/labs/experiments.js`: `addGasto`/`getGastosList`/`deleteGasto`), cada uno con monto + factura opcional subida a Drive (carpeta "Gastos", mismo mecanismo que los adjuntos de comentarios). Rutas nuevas: `.../partidas/[partidaId]/gastos` (POST) y `.../gastos/[gastoId]` (DELETE).
2. **Desglose planificado vs. agregado** — cada partida tiene `origen: 'inicial'` (viene del Excel al crear el proyecto) o `'agregada'` (creada después con "+ Nueva partida"). El banner de totales en Presupuesto muestra ambos desgloses. Botón "Ver todos los gastos" con modal consolidado de todo el proyecto.
3. **Criterios de éxito estructurados** — en Crear/Editar proyecto (experimental), reemplaza el textarea libre por filas Nombre + operador (>, <, =, ≥, ≤) + valor + unidad. `formatSuccessCriterion` (en `lib/labs/experiments.js`, server; duplicada en el cliente por ser server-only) formatea a texto para los prompts de IA, soporta el formato viejo (string suelto) también.
4. **Nueva Prueba precargada** — los campos de una Prueba nueva arrancan con los Criterios de éxito del proyecto (nombre + operador + valor + unidad ya cargados), editable/ampliable. Cualquier campo numérico puede tener su propio "criterio de paso" — la IA (`lib/labs/contribution.js`) lo usa como señal principal para decidir tag éxito/parcial/fallo, no solo el tono del texto.
5. **Aportar con campos editables** — en el paso de confirmación (después de que la IA interpreta texto/evidencia), cada campo es ahora un `<input>` editable en vez de texto de solo lectura — se puede completar a mano lo que la IA no sacó, o corregir lo que sacó mal, antes de confirmar.
6. **Fix de contraste** — `.mode-card` (cards de selección de prueba en Aportar) es un `<button>` sin `color` propio, heredaba negro del navegador. Ya tiene `color:var(--labs-cream)`.

**Próximo paso:** el usuario todavía no confirmó subir esto a prod — falta probarlo localmente y decidir. Seguir el flujo estándar: `git status` → stage explícito (nunca `-A`) → commit con mensaje que explique el porqué → push a `main` → `vercel ls bonsight-next --prod` para confirmar Ready.

**Trabajo separado, no relacionado con lo anterior:** hay una rama `planning/kai-absorbe-aria` (pusheada, sin mergear) con **ADR-010** en `docs/architecture-decisions.md` — propuesta de fusión Kai+Aria (Kai absorbe skills/conexiones de Aria + export a Drive de Labs, sin apagar nada existente). Es solo visión, no se empezó a implementar. Retomar cuando el usuario lo pida explícitamente.

---

## Objetivo actual (histórico — 2026-07-10, ya resuelto)

**Epic:** Kai Admin Panel — sistema multi-tenant para gestión de clientes de Kai

Construir dentro de `bonsight-next` el admin panel de Kai (`kai.bonsight.co/admin`) y la interfaz cliente (`kai.bonsight.co/{slug}`), como extensión del agente Kai existente. **Este epic ya está completo y en producción** — Labs (un tercer producto, gestión de proyectos multi-tenant) se construyó después y es el foco actual, ver snapshot arriba.

---

## Snapshot local actual (2026-07-10)

Este handoff ya no debe tratarse como un resumen histórico únicamente. El estado real del repositorio en este momento incluye cambios locales activos en estas áreas:

- **Kai:** refinamientos del panel admin, detalle de tenant y estilos del chat.
- **Aria:** cambios en rutas y autenticación para el flujo tenant.
- **Quiniela:** mejoras en overview, seguimiento y lógica de resultados/proyección.
- **Docs:** se está consolidando este contexto para que la continuidad entre sesiones sea fiable.

El contenido anterior sigue siendo útil para contexto general, pero el snapshot local actual debe tomarse como referencia principal cuando se retoma el trabajo.

---

## Estado actual

**En progreso — ~60% completo.**

La estructura de datos y la UI del admin están construidas. Falta el endpoint de chat por tenant y pruebas de integración end-to-end.

---

## Trabajo completado (esta sesión + anteriores)

### Bonsight Advisor (COMPLETO — en producción)
- `app/[locale]/consulta/page.jsx` — página de chat full-screen, tema claro, brand Bonsight
- `components/ChatWidget.jsx` — widget flotante (FAB), tema claro, calls `/api/advisor`
- `app/api/advisor/route.js` — API stateless, gpt-4o-mini, extrae `<advisor-capture>` blocks, escribe a Business Memory
- `app/globals.css` — estilos `.chat-*` y `.consulta-*` totalmente reescritos, tema claro
- FAB: 70px outer ring (rgba green) → 54px inner circle blanco → isotipo SVG oficial
- Tooltip nudge: fondo `#111`, `border-radius: 14px 14px 4px 14px`
- **Commit en prod:** `c8a4e5e` — "feat: Bonsight Advisor — rebrand, tema claro y widget flotante"

### Business Memory Layer (COMPLETO)
- `lib/businessMemory.js` — capa compartida Kai↔Aria con Upstash Redis
  - `getBusinessProfile(tenantId)` / `setBusinessProfile(tenantId, data)`
  - `getBusinessMemory(tenantId)` / `updateBusinessMemory(tenantId, updates)`
  - Redis keys: `business:{tenantId}:profile`, `business:{tenantId}:memory`
  - Seed automático desde `lib/aria/clientProfile.js` para tenant `bonsight`

### Kai (agente interno Bonsight) — (COMPLETO, no en prod aún)
- `app/kai/page.jsx` — UI principal, autenticada, usa KaiChat component
- `app/kai/layout.jsx` — layout con dark theme, Inter font, `kai.css`
- `app/kai/kai.css` — design tokens dark: `#0D1117` bg, `#20C997` verde
- `app/kai/components/` — KaiChat.jsx, KaiAvatar.jsx, KaiMessage.jsx, HypothesisGrid.jsx, InfoCard3Col.jsx, ProfilePlanCard.jsx, TransferCard.jsx
- `app/api/kai/route.js` — API con auth, usa Business Memory, extrae `<kai-component>` blocks
- `lib/kai/memory.js` — persistencia de conversaciones (sorted set + JSON en Redis)
- `lib/kai/auth.js` — `isKaiAuthorized()` via cookie `kai_auth`
- `app/kai/login/` — página de login con formulario

### Kai Admin Panel — (EN PROGRESO)
- `lib/kai/tenants.js` — data layer multi-tenant (CRUD de tenants, business profiles)
  - Redis keys: `kai:tenants`, `kai:{slug}:meta`, `kai:{slug}:profile`
  - Funciones: `listTenantSlugs`, `createTenant`, `getTenantMeta`, `getBusinessProfile`, `updateBusinessProfile`, `getAllTenantsMeta`
- `app/api/kai/tenants/route.js` — GET (lista) + POST (crear tenant)
- `app/kai/admin/admin.css` — estilos completos del admin panel (sidebar, topbar, tabs, modales, forms)
- `app/kai/admin/layout.jsx` — Server Component, carga tenants, envuelve en AdminShell
- `app/kai/admin/AdminShell.jsx` — Client Component: sidebar con lista de tenants, modal "Nuevo cliente", navegación
- `app/kai/admin/page.jsx` — Dashboard: grid de tenants o empty state
- `app/kai/admin/[tenant]/TenantDetail.jsx` — Client Component: tabs (Perfil, Conversaciones, Documentos, Stakeholders)
- `app/kai/admin/[tenant]/page.jsx` — Server Component: fetch de meta + profile + conversations, render TenantDetail
- `app/kai/[tenant]/page.jsx` — Server Component: interfaz cliente, crea conversación al cargar
- `app/kai/[tenant]/KaiClientChat.jsx` — Client Component: chat dark theme para clientes externos

---

## Trabajo en progreso / Pendiente inmediato

### 1. Prueba end-to-end del flujo completo
- Crear un tenant via modal → verificar que se guarda en Redis
- Ver el tenant en el dashboard → navegar al detalle
- Abrir `/kai/{slug}` → enviar mensaje → verificar respuesta y que se guarda en conversaciones

### 2. Sistema de login para admin
**Decisión pendiente:** El login de Kai (`/kai/login`) ya existe y usa `KAI_ACCESS_CODE`. El admin comparte ese mismo mecanismo. No hay login separado para el admin hoy — quien tiene `KAI_ACCESS_CODE` accede a todo `/kai/*`.

---

## Próximos pasos (ordenados)

1. **Escribir `app/api/kai/[tenant]/route.js`** — endpoint de chat para clientes externos
2. **Prueba local completa** del flujo: create tenant → admin detail → cliente chat
3. **Deploy a Vercel** cuando el flujo esté validado (preguntar antes qué commits incluir)
4. **System prompt de Kai por tenant** — el usuario define el prompt cuando el sistema esté funcional
5. **Aria multi-tenant** — parametrizar `BUSINESS_ID` para que Aria soporte múltiples clientes (largo plazo)

---

## Riesgos y bloqueos

| Riesgo | Descripción | Mitigación |
|--------|-------------|------------|
| **Conflict de namespace Redis** | `lib/kai/tenants.js` usa `kai:{slug}:meta` y `kai:tenants`. El sistema antiguo usa `kai:{tenantId}:conversations` (sorted set). No hay colisión de claves, pero son namespaces adyacentes. | Revisar antes de crear tenant con slug `bonsight` via el nuevo sistema. |
| **admin vs [tenant] routing** | `app/kai/admin/` es un segmento estático — toma precedencia sobre `app/kai/[tenant]/`. Cualquier slug `admin` estaría reservado. | No crear tenant con slug `admin`, `login`, o cualquier ruta estática existente. Slugs reservados: `admin`, `login`, `components`. |
| **Auth admin** | El admin no tiene protección adicional más allá de `KAI_ACCESS_CODE`. Si un cliente tiene la cookie, podría acceder a `/kai/admin`. | Aceptable por ahora (equipo pequeño). Para futuro: separar `KAI_ADMIN_CODE` de `KAI_CLIENT_CODE`. |
| **Deploy pendiente** | Kai (admin + multi-tenant) no está en producción. `proxy.js` modificado localmente tampoco. | Ver "próximos pasos". |

---

## Variables de entorno requeridas

```
OPENAI_API_KEY          # Kai + Advisor
ANTHROPIC_API_KEY       # Aria
KV_REST_API_URL         # Upstash Redis
KV_REST_API_TOKEN       # Upstash Redis
ARIA_ACCESS_CODE        # Auth Aria
KAI_ACCESS_CODE         # Auth Kai (interno + admin)
```

---

## Archivos modificados (no commiteados — todo el sistema Kai multi-tenant)

```
lib/kai/tenants.js                          NUEVO  — data layer CRUD
app/api/kai/tenants/route.js                NUEVO  — GET lista + POST crear
app/api/kai/[tenant]/route.js               NUEVO  — chat por tenant (auth + OpenAI + memory)
app/kai/admin/admin.css                     NUEVO  — estilos admin panel
app/kai/admin/layout.jsx                    NUEVO  — Server Component, carga tenants
app/kai/admin/AdminShell.jsx                NUEVO  — Client Component sidebar + modal
app/kai/admin/page.jsx                      NUEVO  — dashboard grid de tenants
app/kai/admin/[tenant]/TenantDetail.jsx     NUEVO  — Client Component tabs (Perfil, Convs, ...)
app/kai/admin/[tenant]/page.jsx             NUEVO  — Server Component, fetch meta+profile+convs
app/kai/[tenant]/page.jsx                   NUEVO  — interfaz cliente (dark, inicia conversación)
app/kai/[tenant]/KaiClientChat.jsx          NUEVO  — Client Component chat dark theme
docs/architecture-decisions.md              NUEVO
docs/ai-handoff.md                          NUEVO
docs/project-state.json                     NUEVO
docs/ai-workflow.md                         NUEVO
```

---

## Prompt recomendado para continuar (2026-09-03)

```
Contexto: bonsight-next en /Users/itriagor/Documents/GitHub/bonsight-next

Lee antes de empezar:
- docs/ai-handoff.md (sección "Snapshot local actual" arriba de todo)
- docs/project-state.json
- docs/architecture-decisions.md (ADR-010 si se retoma la fusión Kai+Aria)

Hay 6 features de Labs completas localmente (build limpio) pero sin commitear ni
desplegar — correr `git status --short` para confirmar la lista exacta de archivos.
Son: gastos con factura en Presupuesto, desglose planificado/agregado + gastos
consolidados, Criterios de éxito estructurados (operador + valor), Nueva Prueba
precargada con esos criterios, campos editables en el paso de confirmar un aporte,
y un fix de contraste de texto.

Próximo paso: probar localmente (labs.localhost:3000/{tenant}) y preguntarle al
usuario si confirma subir a prod. Si confirma, seguir el flujo estándar: git status
→ stage explícito de archivos (nunca git add -A) → commit con mensaje que explique
el porqué → push a main → `vercel ls bonsight-next --prod` para confirmar Ready.

Aparte, sin relación con lo anterior: hay una rama `planning/kai-absorbe-aria`
(pusheada, no mergeada) con la propuesta de fusión Kai+Aria — solo tocarla si el
usuario lo pide explícitamente, no está en el flujo de trabajo actual.
```

### Prompt histórico (2026-07-10 — Kai Admin, ya resuelto)

```
Contexto: bonsight-next en /Users/itriagor/Documents/GitHub/bonsight-next

El sistema Kai multi-tenant está completo localmente. El próximo paso es validar el flujo 
end-to-end y luego deployar.

Para probar localmente (kai.localhost:3000):
1. Ir a /kai/login con KAI_ACCESS_CODE
2. Ir a /kai/admin → crear un nuevo cliente
3. Verificar que aparece en el dashboard
4. Ir a /kai/admin/{slug} → ver tabs Perfil + Conversaciones
5. Ir a /kai/{slug} → enviar un mensaje → verificar que responde
6. Volver al admin → verificar que la conversación aparece en el tab
```
