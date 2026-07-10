# AI Handoff — bonsight-next

> Bitácora operativa para continuidad entre sesiones de IA.  
> **Actualizar al terminar cada sesión de trabajo.**  
> Última actualización: 2026-07-10

---

## Objetivo actual

**Epic:** Kai Admin Panel — sistema multi-tenant para gestión de clientes de Kai

Construir dentro de `bonsight-next` el admin panel de Kai (`kai.bonsight.co/admin`) y la interfaz cliente (`kai.bonsight.co/{slug}`), como extensión del agente Kai existente.

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

## Prompt recomendado para continuar

```
Contexto: bonsight-next en /Users/itriagor/Documents/GitHub/bonsight-next

Lee antes de empezar:
- docs/architecture-decisions.md
- docs/ai-handoff.md  
- docs/project-state.json

El sistema Kai multi-tenant está completo localmente. El próximo paso es validar el flujo 
end-to-end y luego deployar.

Para probar localmente (kai.localhost:3000):
1. Ir a /kai/login con KAI_ACCESS_CODE
2. Ir a /kai/admin → crear un nuevo cliente
3. Verificar que aparece en el dashboard
4. Ir a /kai/admin/{slug} → ver tabs Perfil + Conversaciones
5. Ir a /kai/{slug} → enviar un mensaje → verificar que responde
6. Volver al admin → verificar que la conversación aparece en el tab

Para deploy: preguntar al usuario qué commits incluir antes de hacer git commit/push.
Los archivos nuevos están listados en "Archivos modificados" en este handoff.
```
