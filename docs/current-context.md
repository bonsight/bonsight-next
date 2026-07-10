# Contexto actual — bonsight-next

Fecha de snapshot: 2026-07-10

## Resumen ejecutivo

El repositorio `bonsight-next` es una app Next.js que concentra varias experiencias de producto en un mismo monorepo:

- Bonsight / advisor y chat widget
- Kai (agente interno y panel multi-tenant para clientes)
- Aria (analista digital con acceso protegido)
- Quiniela (admin, seguimiento, overview, resultados y proyección)

La rama activa es `main` y el último commit local/remote es `921a767`.

## Áreas activas del proyecto

### 1. Kai
- Panel admin multi-tenant en `/kai/admin`
- Vistas cliente en `/kai/[tenant]`
- Gestión de tenants y perfiles de negocio
- Chat por tenant con memoria y contexto

### 2. Aria
- Acceso protegido mediante `ARIA_ACCESS_CODE`
- Rutas bajo `/aria` y `/api/aria`
- Integración con contexto de negocio y memoria compartida

### 3. Quiniela
- Admin y overview para resultados globales
- Seguimiento por participante y tabla de posiciones
- Lógica de resultados en vivo, proyección y estado de partidos

## Archivos clave a revisar primero

- `app/api/aria/[tenant]/route.js`
- `app/api/kai/[tenant]/route.js`
- `app/kai/admin/[tenant]/TenantDetail.jsx`
- `app/kai/kai.css`
- `app/quiniela/overview/page.jsx`
- `lib/kai/scoring.js`
- `lib/quiniela.js`
- `docs/ai-handoff.md`
- `docs/architecture-decisions.md`
- `docs/project-state.json`

## Variables de entorno importantes

```bash
OPENAI_API_KEY
ANTHROPIC_API_KEY
KV_REST_API_URL
KV_REST_API_TOKEN
ARIA_ACCESS_CODE
KAI_ACCESS_CODE
```

## Comandos útiles para trabajar localmente

```bash
npm install
npm run dev
# o, si se necesita escuchar en la red local:
HOST=0.0.0.0 npm run dev
```

## Estado del working tree al tomar este snapshot

Al momento de este snapshot, hay cambios locales en varias áreas del proyecto, especialmente Kai, Aria y Quiniela. Este documento sirve como punto de entrada para continuar sin perder contexto.

## Nota de continuidad

Para continuar una sesión posterior, revisar primero este archivo y luego los documentos de handoff:

- `docs/ai-handoff.md`
- `docs/architecture-decisions.md`
- `docs/project-state.json`
